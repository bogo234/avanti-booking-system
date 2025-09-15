import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAuthToken, getUserRole } from '../../../../lib/firebase-admin';
import { z } from 'zod';

// Validation schemas
const BookingActionSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  action: z.enum(['accept', 'reject', 'start', 'arrive', 'complete']),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  notes: z.string().max(500).optional()
});

// Rate limiting för driver actions
const driverActionAttempts = new Map<string, { count: number; resetTime: number }>();
const DRIVER_ACTION_WINDOW = 60 * 1000; // 1 minute
const MAX_DRIVER_ACTIONS_PER_MINUTE = 10;

function checkDriverActionRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = driverActionAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    driverActionAttempts.set(uid, { 
      count: 1, 
      resetTime: now + DRIVER_ACTION_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_DRIVER_ACTIONS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// GET - Hämta bokningar för förare
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Kontrollera att användaren är förare
    const userRole = await getUserRole(decodedToken.uid);
    if (userRole !== 'driver') {
      return NextResponse.json(
        { error: 'Access denied. Driver role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'available', 'assigned', 'completed'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const db = getAdminDb();
    let bookingsQuery;

    if (status === 'available') {
      // Hämta tillgängliga bokningar (inte tilldelade)
      bookingsQuery = db.collection('bookings')
        .where('status', '==', 'waiting')
        .orderBy('createdAt', 'desc')
        .limit(limit);
    } else if (status === 'assigned') {
      // Hämta förarens tilldelade bokningar
      bookingsQuery = db.collection('bookings')
        .where('driver.id', '==', decodedToken.uid)
        .where('status', 'in', ['accepted', 'on_way', 'arrived', 'started'])
        .orderBy('createdAt', 'desc')
        .limit(limit);
    } else if (status === 'completed') {
      // Hämta förarens slutförda bokningar
      bookingsQuery = db.collection('bookings')
        .where('driver.id', '==', decodedToken.uid)
        .where('status', 'in', ['completed', 'cancelled'])
        .orderBy('createdAt', 'desc')
        .limit(limit);
    } else {
      // Default: alla bokningar för föraren
      bookingsQuery = db.collection('bookings')
        .where('driver.id', '==', decodedToken.uid)
        .orderBy('createdAt', 'desc')
        .limit(limit);
    }

    const snapshot = await bookingsQuery.get();
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Filtrera bort känslig kundinformation för vissa statusar
      customer: status === 'available' ? {
        name: 'Kund',
        phone: '***'
      } : doc.data().customer
    }));

    // Hämta förarens statistik
    const statsQuery = await db.collection('bookings')
      .where('driver.id', '==', decodedToken.uid)
      .where('status', '==', 'completed')
      .get();
    
    const completedBookings = statsQuery.size;
    const totalEarnings = statsQuery.docs.reduce((sum, doc) => {
      return sum + (doc.data().price || 0);
    }, 0);

    // Beräkna genomsnittlig rating
    const ratingsQuery = await db.collection('bookings')
      .where('driver.id', '==', decodedToken.uid)
      .where('rating', '>', 0)
      .get();
    
    const ratings = ratingsQuery.docs.map(doc => doc.data().rating);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;

    return NextResponse.json({
      success: true,
      bookings,
      statistics: {
        totalBookings: completedBookings,
        totalEarnings,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length
      },
      pagination: {
        count: bookings.length,
        hasMore: bookings.length === limit
      }
    });

  } catch (error: any) {
    console.error('Driver bookings GET error:', {
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

// POST - Utför åtgärd på bokning
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Kontrollera att användaren är förare
    const userRole = await getUserRole(decodedToken.uid);
    if (userRole !== 'driver') {
      return NextResponse.json(
        { error: 'Access denied. Driver role required.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimit = checkDriverActionRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many actions. Slow down.',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = BookingActionSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { bookingId, action, location, notes } = validationResult.data;
    
    const db = getAdminDb();
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingData = bookingDoc.data()!;
    const now = new Date();
    
    // Hämta förarens information
    const driverDoc = await db.collection('users').doc(decodedToken.uid).get();
    const driverData = driverDoc.data();
    
    if (!driverData) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    let updateData: any = {
      'metadata.updatedAt': now
    };

    let newStatus: string;
    let notificationMessage: string;

    switch (action) {
      case 'accept':
        if (bookingData.status !== 'waiting') {
          return NextResponse.json(
            { error: 'Booking is no longer available' },
            { status: 400 }
          );
        }
        
        newStatus = 'accepted';
        updateData.status = newStatus;
        updateData.driver = {
          id: decodedToken.uid,
          name: driverData.profile?.name || 'Förare',
          phone: driverData.profile?.phone || '',
          car: driverData.car || 'Bil',
          licensePlate: driverData.licensePlate || '',
          location: location
        };
        updateData['metadata.acceptedAt'] = now;
        
        notificationMessage = `Din bokning har accepterats av ${driverData.profile?.name || 'föraren'}`;
        break;

      case 'reject':
        if (bookingData.driver?.id !== decodedToken.uid) {
          return NextResponse.json(
            { error: 'Not authorized to reject this booking' },
            { status: 403 }
          );
        }
        
        newStatus = 'waiting'; // Återgå till väntande för andra förare
        updateData.status = newStatus;
        updateData.driver = null; // Ta bort förartilldelning
        updateData['metadata.rejectedBy'] = decodedToken.uid;
        updateData['metadata.rejectedAt'] = now;
        
        notificationMessage = 'Din bokning söker en ny förare';
        break;

      case 'start':
        if (bookingData.driver?.id !== decodedToken.uid) {
          return NextResponse.json(
            { error: 'Not authorized for this booking' },
            { status: 403 }
          );
        }
        
        if (!['accepted', 'arrived'].includes(bookingData.status)) {
          return NextResponse.json(
            { error: 'Cannot start booking in current status' },
            { status: 400 }
          );
        }
        
        newStatus = 'on_way';
        updateData.status = newStatus;
        if (location) {
          updateData['driver.location'] = location;
        }
        updateData['metadata.startedAt'] = now;
        
        notificationMessage = 'Föraren är på väg till dig';
        break;

      case 'arrive':
        if (bookingData.driver?.id !== decodedToken.uid) {
          return NextResponse.json(
            { error: 'Not authorized for this booking' },
            { status: 403 }
          );
        }
        
        if (bookingData.status !== 'on_way') {
          return NextResponse.json(
            { error: 'Cannot mark as arrived in current status' },
            { status: 400 }
          );
        }
        
        newStatus = 'arrived';
        updateData.status = newStatus;
        if (location) {
          updateData['driver.location'] = location;
        }
        updateData['metadata.arrivedAt'] = now;
        
        notificationMessage = 'Föraren har anlänt till upphämtningsplatsen';
        break;

      case 'complete':
        if (bookingData.driver?.id !== decodedToken.uid) {
          return NextResponse.json(
            { error: 'Not authorized for this booking' },
            { status: 403 }
          );
        }
        
        if (!['arrived', 'started'].includes(bookingData.status)) {
          return NextResponse.json(
            { error: 'Cannot complete booking in current status' },
            { status: 400 }
          );
        }
        
        newStatus = 'completed';
        updateData.status = newStatus;
        if (location) {
          updateData['driver.location'] = location;
        }
        updateData['metadata.completedAt'] = now;
        
        notificationMessage = 'Din resa är slutförd. Tack för att du valde Avanti!';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Lägg till anteckningar om det finns
    if (notes) {
      updateData.driverNotes = notes;
    }

    // Uppdatera bokningen
    await bookingRef.update(updateData);

    // Skicka notifikation till kunden (om det finns customer ID)
    if (bookingData.customerId) {
      try {
        await db.collection('notifications').add({
          userId: bookingData.customerId,
          type: 'booking',
          title: 'Bokningsuppdatering',
          message: notificationMessage,
          bookingId: bookingId,
          read: false,
          createdAt: now
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the whole operation for notification errors
      }
    }

    // Audit log
    console.log(`Driver action: ${action} on booking ${bookingId}`, {
      driverId: decodedToken.uid,
      action,
      newStatus,
      timestamp: now.toISOString(),
      location: location ? `${location.lat},${location.lng}` : 'none'
    });

    return NextResponse.json({
      success: true,
      message: `Booking ${action} successful`,
      booking: {
        id: bookingId,
        status: newStatus,
        updatedAt: now.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Driver booking action error:', {
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
      { error: 'Failed to process booking action' },
      { status: 500 }
    );
  }
}
