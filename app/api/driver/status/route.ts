import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAuthToken, getUserRole } from '../../../../lib/firebase-admin';
import { z } from 'zod';

// Validation schemas
const StatusUpdateSchema = z.object({
  status: z.enum(['available', 'busy', 'offline']),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
    heading: z.number().optional(),
    speed: z.number().optional()
  }).optional()
});

const LocationUpdateSchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
    heading: z.number().optional(),
    speed: z.number().optional(),
    timestamp: z.number().optional()
  })
});

// Rate limiting för location updates
const locationUpdateAttempts = new Map<string, { count: number; resetTime: number }>();
const LOCATION_UPDATE_WINDOW = 60 * 1000; // 1 minute
const MAX_LOCATION_UPDATES_PER_MINUTE = 30; // Allow frequent location updates

function checkLocationUpdateRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = locationUpdateAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    locationUpdateAttempts.set(uid, { 
      count: 1, 
      resetTime: now + LOCATION_UPDATE_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_LOCATION_UPDATES_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// GET - Hämta förarens status och statistik
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

    const db = getAdminDb();
    
    // Hämta förarens profil och status
    const driverDoc = await db.collection('users').doc(decodedToken.uid).get();
    const driverData = driverDoc.data();
    
    if (!driverData) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    // Hämta dagens statistik
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookingsQuery = await db.collection('bookings')
      .where('driver.id', '==', decodedToken.uid)
      .where('metadata.completedAt', '>=', today)
      .where('metadata.completedAt', '<', tomorrow)
      .get();

    const todayEarnings = todayBookingsQuery.docs.reduce((sum, doc) => {
      return sum + (doc.data().price || 0);
    }, 0);

    // Hämta veckans statistik
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const weekBookingsQuery = await db.collection('bookings')
      .where('driver.id', '==', decodedToken.uid)
      .where('metadata.completedAt', '>=', weekStart)
      .get();

    const weekEarnings = weekBookingsQuery.docs.reduce((sum, doc) => {
      return sum + (doc.data().price || 0);
    }, 0);

    // Hämta månadens statistik
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const monthBookingsQuery = await db.collection('bookings')
      .where('driver.id', '==', decodedToken.uid)
      .where('metadata.completedAt', '>=', monthStart)
      .get();

    const monthEarnings = monthBookingsQuery.docs.reduce((sum, doc) => {
      return sum + (doc.data().price || 0);
    }, 0);

    // Hämta aktuell bokning
    const currentBookingQuery = await db.collection('bookings')
      .where('driver.id', '==', decodedToken.uid)
      .where('status', 'in', ['accepted', 'on_way', 'arrived', 'started'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    const currentBooking = currentBookingQuery.empty 
      ? null 
      : {
          id: currentBookingQuery.docs[0].id,
          ...currentBookingQuery.docs[0].data()
        };

    // Hämta senaste ratings
    const ratingsQuery = await db.collection('bookings')
      .where('driver.id', '==', decodedToken.uid)
      .where('rating', '>', 0)
      .orderBy('metadata.completedAt', 'desc')
      .limit(10)
      .get();

    const recentRatings = ratingsQuery.docs.map(doc => ({
      rating: doc.data().rating,
      feedback: doc.data().feedback,
      completedAt: doc.data().metadata?.completedAt
    }));

    const averageRating = recentRatings.length > 0
      ? recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length
      : 0;

    return NextResponse.json({
      success: true,
      driver: {
        id: decodedToken.uid,
        name: driverData.profile?.name || 'Förare',
        email: driverData.email,
        phone: driverData.profile?.phone,
        car: driverData.car || 'Bil',
        licensePlate: driverData.licensePlate || '',
        status: driverData.driverStatus || 'offline',
        location: driverData.location,
        rating: Math.round(averageRating * 10) / 10,
        totalRatings: recentRatings.length
      },
      statistics: {
        today: {
          bookings: todayBookingsQuery.size,
          earnings: todayEarnings
        },
        week: {
          bookings: weekBookingsQuery.size,
          earnings: weekEarnings
        },
        month: {
          bookings: monthBookingsQuery.size,
          earnings: monthEarnings
        }
      },
      currentBooking,
      recentRatings: recentRatings.slice(0, 5) // Senaste 5
    });

  } catch (error: any) {
    console.error('Driver status GET error:', {
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
      { error: 'Failed to fetch driver status' },
      { status: 500 }
    );
  }
}

// PUT - Uppdatera förarens status
export async function PUT(request: NextRequest) {
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

    const requestData = await request.json();
    
    // Validera input
    const validationResult = StatusUpdateSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { status, location } = validationResult.data;
    
    const db = getAdminDb();
    const now = new Date();
    
    const updateData: any = {
      driverStatus: status,
      'metadata.statusUpdatedAt': now,
      'metadata.updatedAt': now
    };

    // Uppdatera plats om den tillhandahålls
    if (location) {
      updateData.location = {
        ...location,
        updatedAt: now
      };
    }

    // Uppdatera förarens status
    await db.collection('users').doc(decodedToken.uid).update(updateData);

    // Om föraren går offline, avvisa eventuella väntande bokningar
    if (status === 'offline') {
      const pendingBookingsQuery = await db.collection('bookings')
        .where('driver.id', '==', decodedToken.uid)
        .where('status', 'in', ['accepted', 'on_way'])
        .get();

      const batch = db.batch();
      pendingBookingsQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'waiting',
          driver: null,
          'metadata.driverWentOffline': now,
          'metadata.updatedAt': now
        });
      });

      if (!pendingBookingsQuery.empty) {
        await batch.commit();
      }
    }

    // Audit log
    console.log(`Driver status updated: ${status}`, {
      driverId: decodedToken.uid,
      status,
      location: location ? `${location.lat},${location.lng}` : 'none',
      timestamp: now.toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status}`,
      status,
      updatedAt: now.toISOString()
    });

  } catch (error: any) {
    console.error('Driver status PUT error:', {
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
      { error: 'Failed to update driver status' },
      { status: 500 }
    );
  }
}

// POST - Uppdatera endast plats (för live tracking)
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

    // Rate limiting för location updates
    const rateLimit = checkLocationUpdateRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many location updates',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = LocationUpdateSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid location data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { location } = validationResult.data;
    
    const db = getAdminDb();
    const now = new Date();
    
    // Uppdatera förarens plats
    await db.collection('users').doc(decodedToken.uid).update({
      location: {
        ...location,
        updatedAt: now
      },
      'metadata.lastLocationUpdate': now
    });

    // Uppdatera plats i aktiva bokningar
    const activeBookingsQuery = await db.collection('bookings')
      .where('driver.id', '==', decodedToken.uid)
      .where('status', 'in', ['accepted', 'on_way', 'arrived', 'started'])
      .get();

    if (!activeBookingsQuery.empty) {
      const batch = db.batch();
      activeBookingsQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          'driver.location': {
            ...location,
            updatedAt: now
          }
        });
      });
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: 'Location updated',
      location: {
        ...location,
        updatedAt: now.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Driver location POST error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}
