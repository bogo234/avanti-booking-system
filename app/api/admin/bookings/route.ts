import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAuthToken, getUserRole } from '../../../../lib/firebase-admin';
import { z } from 'zod';
import type { Query } from 'firebase-admin/firestore';

// Validation schemas
const BookingSearchSchema = z.object({
  query: z.string().optional(),
  status: z.enum(['waiting', 'accepted', 'on_way', 'arrived', 'started', 'completed', 'cancelled']).optional(),
  service: z.enum(['standard', 'premium', 'luxury']).optional(),
  driverId: z.string().optional(),
  customerId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

const BookingUpdateSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  updates: z.object({
    status: z.enum(['waiting', 'accepted', 'on_way', 'arrived', 'started', 'completed', 'cancelled']).optional(),
    driverId: z.string().optional(),
    price: z.number().min(0).optional(),
    adminNotes: z.string().max(1000).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
  })
});

// Rate limiting för admin actions
const adminBookingActionAttempts = new Map<string, { count: number; resetTime: number }>();
const ADMIN_BOOKING_ACTION_WINDOW = 60 * 1000; // 1 minute
const MAX_ADMIN_BOOKING_ACTIONS_PER_MINUTE = 100; // Hög gräns för admin

function checkAdminBookingActionRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = adminBookingActionAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    adminBookingActionAttempts.set(uid, { 
      count: 1, 
      resetTime: now + ADMIN_BOOKING_ACTION_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_ADMIN_BOOKING_ACTIONS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// Lightweight view model for admin search results
interface BookingSearchItem {
  id: string;
  customer?: { name?: string; email?: string; phone?: string };
  pickup?: { address?: string };
  destination?: { address?: string };
  driver?: { id?: string; name?: string };
  status?: string;
  service?: string;
  price?: number;
  createdAt?: any;
  updatedAt?: any;
  metadata?: any;
  [key: string]: any;
}

// GET - Hämta bokningar med avancerad sökning och filtrering
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Kontrollera att användaren är admin
    const userRole = await getUserRole(decodedToken.uid);
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimit = checkAdminBookingActionRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many admin actions',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      query: searchParams.get('query') || undefined,
      status: searchParams.get('status') as any,
      service: searchParams.get('service') as any,
      driverId: searchParams.get('driverId') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    };

    // Validera query parameters
    const validationResult = BookingSearchSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { query, status, service, driverId, customerId, dateFrom, dateTo, page, limit } = validationResult.data;
    const offset = (page - 1) * limit;

    const db = getAdminDb();

    // Bygg Firestore query
    let bookingsQuery: Query = db.collection('bookings');

    // Filtrera på status
    if (status) {
      bookingsQuery = bookingsQuery.where('status', '==', status);
    }

    // Filtrera på service
    if (service) {
      bookingsQuery = bookingsQuery.where('service', '==', service);
    }

    // Filtrera på förare
    if (driverId) {
      bookingsQuery = bookingsQuery.where('driver.id', '==', driverId);
    }

    // Filtrera på kund
    if (customerId) {
      bookingsQuery = bookingsQuery.where('customerId', '==', customerId);
    }

    // Datumfiltrering
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      bookingsQuery = bookingsQuery.where('createdAt', '>=', fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Inkludera hela dagen
      bookingsQuery = bookingsQuery.where('createdAt', '<=', toDate);
    }

    // Ordna efter skapelsedatum (nyast först)
    bookingsQuery = bookingsQuery.orderBy('createdAt', 'desc');

    // Hämta data
    const snapshot = await bookingsQuery.get();
    let bookings: BookingSearchItem[] = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
        updatedAt: data?.metadata?.updatedAt?.toDate?.()?.toISOString() || data?.metadata?.updatedAt
      } as BookingSearchItem;
    });

    // Textfiltrering (söker i adresser, kundnamn, etc.)
    if (query) {
      const searchTerm = query.toLowerCase();
      bookings = bookings.filter(booking => 
        (booking.customer?.name?.toLowerCase().includes(searchTerm)) ||
        (booking.customer?.email?.toLowerCase().includes(searchTerm)) ||
        (booking.customer?.phone?.includes(searchTerm)) ||
        (booking.pickup?.address?.toLowerCase().includes(searchTerm)) ||
        (booking.destination?.address?.toLowerCase().includes(searchTerm)) ||
        (booking.driver?.name?.toLowerCase().includes(searchTerm)) ||
        (booking.id.toLowerCase().includes(searchTerm))
      );
    }

    // Paginering
    const totalBookings = bookings.length;
    const paginatedBookings = bookings.slice(offset, offset + limit);

    // Beräkna statistik
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const allBookingsQuery = await db.collection('bookings').get();
    const allBookings: BookingSearchItem[] = allBookingsQuery.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        createdAt: data?.createdAt?.toDate?.() || new Date(data?.createdAt)
      } as BookingSearchItem;
    });

    const statistics = {
      total: allBookings.length,
      today: allBookings.filter(b => b.createdAt >= today).length,
      yesterday: allBookings.filter(b => b.createdAt >= yesterday && b.createdAt < today).length,
      thisWeek: allBookings.filter(b => b.createdAt >= thisWeek).length,
      thisMonth: allBookings.filter(b => b.createdAt >= thisMonth).length,
      byStatus: {
        waiting: allBookings.filter(b => b.status === 'waiting').length,
        accepted: allBookings.filter(b => b.status === 'accepted').length,
        on_way: allBookings.filter(b => b.status === 'on_way').length,
        arrived: allBookings.filter(b => b.status === 'arrived').length,
        started: allBookings.filter(b => b.status === 'started').length,
        completed: allBookings.filter(b => b.status === 'completed').length,
        cancelled: allBookings.filter(b => b.status === 'cancelled').length
      },
      byService: {
        standard: allBookings.filter(b => b.service === 'standard').length,
        premium: allBookings.filter(b => b.service === 'premium').length,
        luxury: allBookings.filter(b => b.service === 'luxury').length
      },
      revenue: {
        today: allBookings
          .filter(b => b.createdAt >= today && b.status === 'completed')
          .reduce((sum, b) => sum + (b.price || 0), 0),
        thisWeek: allBookings
          .filter(b => b.createdAt >= thisWeek && b.status === 'completed')
          .reduce((sum, b) => sum + (b.price || 0), 0),
        thisMonth: allBookings
          .filter(b => b.createdAt >= thisMonth && b.status === 'completed')
          .reduce((sum, b) => sum + (b.price || 0), 0)
      }
    };

    // Hämta aktiva förare för assignment
    const activeDriversQuery = await db.collection('users')
      .where('role', '==', 'driver')
      .where('driverStatus', '==', 'available')
      .get();

    const activeDrivers = activeDriversQuery.docs.map(doc => ({
      id: doc.id,
      name: doc.data().profile?.name || 'Förare',
      phone: doc.data().profile?.phone,
      car: doc.data().car,
      location: doc.data().location
    }));

    return NextResponse.json({
      success: true,
      bookings: paginatedBookings,
      pagination: {
        page,
        limit,
        total: totalBookings,
        totalPages: Math.ceil(totalBookings / limit),
        hasMore: offset + limit < totalBookings
      },
      statistics,
      activeDrivers,
      filters: {
        query: query || null,
        status: status || null,
        service: service || null,
        driverId: driverId || null,
        customerId: customerId || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null
      }
    });

  } catch (error: any) {
    console.error('Admin bookings GET error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// PUT - Uppdatera bokning
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Kontrollera att användaren är admin
    const userRole = await getUserRole(decodedToken.uid);
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimit = checkAdminBookingActionRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many admin actions',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = BookingUpdateSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { bookingId, updates } = validationResult.data;
    
    const db = getAdminDb();
    const now = new Date();

    // Kontrollera att bokningen existerar
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const currentBookingData = bookingDoc.data()!;

    // Bygg uppdateringsdata
    const updateData: any = {
      'metadata.updatedAt': now,
      'metadata.updatedBy': decodedToken.uid,
      'metadata.adminUpdated': true
    };

    // Uppdatera status
    if (updates.status && updates.status !== currentBookingData.status) {
      updateData.status = updates.status;
      updateData['metadata.statusChangedAt'] = now;
      updateData['metadata.statusChangedBy'] = decodedToken.uid;
      updateData['metadata.previousStatus'] = currentBookingData.status;
      updateData['metadata.adminStatusChange'] = true;
    }

    // Tilldela förare
    if (updates.driverId) {
      if (updates.driverId !== currentBookingData.driver?.id) {
        // Hämta förarens information
        const driverDoc = await db.collection('users').doc(updates.driverId).get();
        if (!driverDoc.exists) {
          return NextResponse.json(
            { error: 'Driver not found' },
            { status: 404 }
          );
        }

        const driverData = driverDoc.data()!;
        if (driverData.role !== 'driver') {
          return NextResponse.json(
            { error: 'User is not a driver' },
            { status: 400 }
          );
        }

        updateData.driver = {
          id: updates.driverId,
          name: driverData.profile?.name || 'Förare',
          phone: driverData.profile?.phone || '',
          car: driverData.car || 'Bil',
          licensePlate: driverData.licensePlate || ''
        };
        updateData['metadata.driverAssignedAt'] = now;
        updateData['metadata.driverAssignedBy'] = decodedToken.uid;
        updateData['metadata.adminDriverAssignment'] = true;

        // Om status inte specifikt sätts, sätt till 'accepted'
        if (!updates.status) {
          updateData.status = 'accepted';
        }
      }
    }

    // Uppdatera pris
    if (updates.price !== undefined && updates.price !== currentBookingData.price) {
      updateData.price = updates.price;
      updateData['metadata.priceChangedAt'] = now;
      updateData['metadata.priceChangedBy'] = decodedToken.uid;
      updateData['metadata.previousPrice'] = currentBookingData.price;
      updateData['metadata.adminPriceChange'] = true;
    }

    // Lägg till admin-anteckningar
    if (updates.adminNotes) {
      updateData.adminNotes = updates.adminNotes;
      updateData['metadata.adminNotesUpdatedAt'] = now;
    }

    // Sätt prioritet
    if (updates.priority) {
      updateData.priority = updates.priority;
      updateData['metadata.prioritySetAt'] = now;
      updateData['metadata.prioritySetBy'] = decodedToken.uid;
    }

    // Uppdatera bokningen
    await bookingRef.update(updateData);

    // Skicka notifikationer baserat på ändringar
    const notifications = [];

    // Notifiera kund om statusändring
    if (updates.status && currentBookingData.customerId) {
      let message = '';
      switch (updates.status) {
        case 'accepted':
          message = 'Din bokning har accepterats av en förare';
          break;
        case 'cancelled':
          message = 'Din bokning har avbrutits';
          break;
        case 'completed':
          message = 'Din resa är slutförd';
          break;
        default:
          message = `Din bokning har uppdaterats (${updates.status})`;
      }

      notifications.push({
        userId: currentBookingData.customerId,
        type: 'booking',
        title: 'Bokningsuppdatering',
        message: message,
        bookingId: bookingId,
        read: false,
        createdAt: now,
        source: 'admin'
      });
    }

    // Notifiera förare om tilldelning
    if (updates.driverId && updates.driverId !== currentBookingData.driver?.id) {
      notifications.push({
        userId: updates.driverId,
        type: 'booking',
        title: 'Ny bokning tilldelad',
        message: 'Du har fått en ny bokning tilldelad av admin',
        bookingId: bookingId,
        read: false,
        createdAt: now,
        source: 'admin'
      });
    }

    // Skicka notifikationer
    if (notifications.length > 0) {
      const batch = db.batch();
      notifications.forEach(notification => {
        const notificationRef = db.collection('notifications').doc();
        batch.set(notificationRef, notification);
      });
      
      try {
        await batch.commit();
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't fail the whole operation
      }
    }

    // Skapa audit log
    await db.collection('admin_audit_logs').add({
      adminId: decodedToken.uid,
      action: 'booking_update',
      targetBookingId: bookingId,
      changes: updates,
      previousData: {
        status: currentBookingData.status,
        driverId: currentBookingData.driver?.id,
        price: currentBookingData.price
      },
      timestamp: now,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Hämta uppdaterad bokningsdata
    const updatedBookingDoc = await bookingRef.get();
    const updatedBooking = { 
      id: updatedBookingDoc.id, 
      ...updatedBookingDoc.data(),
      createdAt: updatedBookingDoc.data()?.createdAt?.toDate?.()?.toISOString() || updatedBookingDoc.data()?.createdAt,
      updatedAt: updatedBookingDoc.data()?.metadata?.updatedAt?.toDate?.()?.toISOString() || updatedBookingDoc.data()?.metadata?.updatedAt
    };

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking,
      changes: Object.keys(updateData).filter(key => !key.startsWith('metadata')),
      notificationsSent: notifications.length
    });

  } catch (error: any) {
    console.error('Admin booking update error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// POST - Skapa ny bokning (admin override)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Kontrollera att användaren är admin
    const userRole = await getUserRole(decodedToken.uid);
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimit = checkAdminBookingActionRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many admin actions',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    // Detta är en placeholder för att skapa bokningar via admin
    // Implementera baserat på specifika behov
    return NextResponse.json({
      success: false,
      message: 'Admin booking creation not yet implemented',
      note: 'This endpoint is reserved for future admin booking creation functionality'
    });

  } catch (error: any) {
    console.error('Admin booking creation error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
