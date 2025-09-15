import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAuthToken, getUserRole } from '../../../lib/firebase-admin';
import { z } from 'zod';

// Validation schemas
const SubmitRatingSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  rating: z.number().min(1).max(5),
  feedback: z.string().max(1000).optional(),
  categories: z.object({
    punctuality: z.number().min(1).max(5).optional(),
    cleanliness: z.number().min(1).max(5).optional(),
    communication: z.number().min(1).max(5).optional(),
    driving: z.number().min(1).max(5).optional(),
    courtesy: z.number().min(1).max(5).optional()
  }).optional()
});

const GetRatingsSchema = z.object({
  driverId: z.string().optional(),
  bookingId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  includeStats: z.boolean().default(false)
});

// Rate limiting för rating submissions
const ratingSubmissionAttempts = new Map<string, { count: number; resetTime: number }>();
const RATING_SUBMISSION_WINDOW = 60 * 1000; // 1 minute
const MAX_RATING_SUBMISSIONS_PER_MINUTE = 5; // Begränsa för att förhindra spam

function checkRatingSubmissionRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = ratingSubmissionAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    ratingSubmissionAttempts.set(uid, { 
      count: 1, 
      resetTime: now + RATING_SUBMISSION_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_RATING_SUBMISSIONS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// POST - Skicka in rating för en bokning
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkRatingSubmissionRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many rating submissions',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = SubmitRatingSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { bookingId, rating, feedback, categories } = validationResult.data;

    const db = getAdminDb();
    const now = new Date();

    // Kontrollera att bokningen existerar och tillhör användaren
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingData = bookingDoc.data()!;
    
    // Kontrollera att användaren är kunden för denna bokning
    if (bookingData.customerId !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'Access denied. You can only rate your own bookings.' },
        { status: 403 }
      );
    }

    // Kontrollera att bokningen är slutförd
    if (bookingData.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only rate completed bookings' },
        { status: 400 }
      );
    }

    // Kontrollera att bokningen inte redan är ratad
    if (bookingData.rating && bookingData.rating > 0) {
      return NextResponse.json(
        { error: 'This booking has already been rated' },
        { status: 400 }
      );
    }

    // Kontrollera att bokningen har en förare
    if (!bookingData.driver?.id) {
      return NextResponse.json(
        { error: 'No driver assigned to this booking' },
        { status: 400 }
      );
    }

    const driverId = bookingData.driver.id;

    // Uppdatera bokningen med rating
    const bookingUpdateData: any = {
      rating,
      feedback: feedback || null,
      'metadata.ratedAt': now,
      'metadata.ratedBy': decodedToken.uid,
      'metadata.updatedAt': now
    };

    if (categories) {
      bookingUpdateData.ratingCategories = categories;
    }

    await bookingRef.update(bookingUpdateData);

    // Skapa separat rating-dokument för statistik
    const ratingData = {
      bookingId,
      customerId: decodedToken.uid,
      driverId,
      rating,
      feedback: feedback || null,
      categories: categories || null,
      service: bookingData.service,
      tripDate: bookingData.createdAt,
      createdAt: now,
      metadata: {
        bookingPrice: bookingData.price,
        tripDuration: bookingData.metadata?.completedAt && bookingData.metadata?.acceptedAt 
          ? (bookingData.metadata.completedAt.toDate().getTime() - bookingData.metadata.acceptedAt.toDate().getTime()) / 1000 / 60 // minuter
          : null
      }
    };

    await db.collection('ratings').add(ratingData);

    // Uppdatera förarens samlade statistik
    await updateDriverRatingStats(db, driverId);

    // Skicka notifikation till föraren
    try {
      await db.collection('notifications').add({
        userId: driverId,
        type: 'rating',
        title: 'Nytt omdöme!',
        message: `Du har fått ${rating} stjärnor för din senaste resa${feedback ? ' med feedback' : ''}`,
        data: {
          bookingId,
          rating,
          feedback: feedback || null
        },
        priority: 'normal',
        read: false,
        createdAt: now,
        source: 'system'
      });
    } catch (notificationError) {
      console.error('Failed to send rating notification:', notificationError);
      // Don't fail the whole operation
    }

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully',
      rating: {
        bookingId,
        rating,
        feedback: feedback || null,
        categories: categories || null,
        submittedAt: now.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Rating submission error:', {
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
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}

// GET - Hämta ratings med filtrering och statistik
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    const { searchParams } = new URL(request.url);
    const queryParams = {
      driverId: searchParams.get('driverId') || undefined,
      bookingId: searchParams.get('bookingId') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      includeStats: searchParams.get('includeStats') === 'true'
    };

    // Validera query parameters
    const validationResult = GetRatingsSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { driverId, bookingId, limit, offset, includeStats } = validationResult.data;

    const db = getAdminDb();
    const userRole = await getUserRole(decodedToken.uid);

    // Kontrollera behörighet
    if (driverId) {
      // Om en specifik förare begärs, kontrollera behörighet
      if (userRole !== 'admin' && driverId !== decodedToken.uid) {
        // Kunder kan bara se ratings för förare som kört dem
        const customerBookingsQuery = await db.collection('bookings')
          .where('customerId', '==', decodedToken.uid)
          .where('driver.id', '==', driverId)
          .limit(1)
          .get();

        if (customerBookingsQuery.empty) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }
      }
    } else if (bookingId) {
      // Om en specifik bokning begärs, kontrollera ägarskap
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      if (!bookingDoc.exists) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      const bookingData = bookingDoc.data()!;
      if (userRole !== 'admin' && 
          bookingData.customerId !== decodedToken.uid && 
          bookingData.driver?.id !== decodedToken.uid) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    } else {
      // Om inga specifika filter, visa bara användarens egna ratings
      if (userRole === 'customer') {
        // Kunder ser ratings de gett
        const ratingsQuery = db.collection('ratings')
          .where('customerId', '==', decodedToken.uid);
      } else if (userRole === 'driver') {
        // Förare ser ratings de fått
        const ratingsQuery = db.collection('ratings')
          .where('driverId', '==', decodedToken.uid);
      } else if (userRole !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Bygg query
    let ratingsQuery = db.collection('ratings');

    if (driverId) {
      ratingsQuery = ratingsQuery.where('driverId', '==', driverId);
    }

    if (bookingId) {
      ratingsQuery = ratingsQuery.where('bookingId', '==', bookingId);
    }

    // Om inte admin och inga specifika filter, filtrera på användaren
    if (userRole !== 'admin' && !driverId && !bookingId) {
      if (userRole === 'customer') {
        ratingsQuery = ratingsQuery.where('customerId', '==', decodedToken.uid);
      } else if (userRole === 'driver') {
        ratingsQuery = ratingsQuery.where('driverId', '==', decodedToken.uid);
      }
    }

    // Ordna och begränsa
    ratingsQuery = ratingsQuery.orderBy('createdAt', 'desc');
    
    if (offset > 0) {
      const offsetSnapshot = await ratingsQuery.limit(offset).get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        ratingsQuery = ratingsQuery.startAfter(lastDoc);
      }
    }

    ratingsQuery = ratingsQuery.limit(limit);

    // Hämta ratings
    const snapshot = await ratingsQuery.get();
    const ratings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      tripDate: doc.data().tripDate?.toDate?.()?.toISOString() || doc.data().tripDate
    }));

    const response: any = {
      success: true,
      ratings,
      pagination: {
        offset,
        limit,
        hasMore: ratings.length === limit
      }
    };

    // Inkludera statistik om begärt
    if (includeStats && driverId) {
      const stats = await getDriverRatingStats(db, driverId);
      response.statistics = stats;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Ratings GET error:', {
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
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}

// Hjälpfunktion för att uppdatera förarens rating-statistik
async function updateDriverRatingStats(db: any, driverId: string) {
  try {
    // Hämta alla ratings för föraren
    const ratingsQuery = await db.collection('ratings')
      .where('driverId', '==', driverId)
      .get();

    const ratings = ratingsQuery.docs.map(doc => doc.data());
    
    if (ratings.length === 0) return;

    // Beräkna statistik
    const totalRatings = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
    
    const ratingDistribution = {
      5: ratings.filter(r => r.rating === 5).length,
      4: ratings.filter(r => r.rating === 4).length,
      3: ratings.filter(r => r.rating === 3).length,
      2: ratings.filter(r => r.rating === 2).length,
      1: ratings.filter(r => r.rating === 1).length
    };

    // Beräkna kategori-genomsnitt
    const categoryAverages: any = {};
    const categoryFields = ['punctuality', 'cleanliness', 'communication', 'driving', 'courtesy'];
    
    categoryFields.forEach(category => {
      const categoryRatings = ratings
        .filter(r => r.categories && r.categories[category])
        .map(r => r.categories[category]);
      
      if (categoryRatings.length > 0) {
        categoryAverages[category] = categoryRatings.reduce((sum, r) => sum + r, 0) / categoryRatings.length;
      }
    });

    // Senaste 30 dagarna
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRatings = ratings.filter(r => {
      const ratingDate = r.createdAt?.toDate?.() || new Date(r.createdAt);
      return ratingDate >= thirtyDaysAgo;
    });

    const recentAverage = recentRatings.length > 0
      ? recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length
      : averageRating;

    // Uppdatera förarens dokument
    const driverRef = db.collection('users').doc(driverId);
    await driverRef.update({
      'ratingStats.totalRatings': totalRatings,
      'ratingStats.averageRating': Math.round(averageRating * 100) / 100,
      'ratingStats.recentAverage': Math.round(recentAverage * 100) / 100,
      'ratingStats.distribution': ratingDistribution,
      'ratingStats.categoryAverages': categoryAverages,
      'ratingStats.lastUpdated': new Date(),
      'ratingStats.feedbackCount': ratings.filter(r => r.feedback && r.feedback.trim().length > 0).length
    });

  } catch (error) {
    console.error('Failed to update driver rating stats:', error);
  }
}

// Hjälpfunktion för att hämta förarens rating-statistik
async function getDriverRatingStats(db: any, driverId: string) {
  try {
    const driverDoc = await db.collection('users').doc(driverId).get();
    
    if (!driverDoc.exists) {
      return null;
    }

    const driverData = driverDoc.data();
    return driverData.ratingStats || {
      totalRatings: 0,
      averageRating: 0,
      recentAverage: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      categoryAverages: {},
      feedbackCount: 0
    };

  } catch (error) {
    console.error('Failed to get driver rating stats:', error);
    return null;
  }
}
