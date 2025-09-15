import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAuthToken, getUserRole } from '../../../../lib/firebase-admin';
import { z } from 'zod';

// Validation schemas
const AnalyticsQuerySchema = z.object({
  period: z.enum(['today', 'yesterday', 'week', 'month', 'quarter', 'year', 'custom']).default('week'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metrics: z.array(z.enum(['bookings', 'revenue', 'users', 'drivers', 'ratings', 'performance'])).optional()
});

// Rate limiting för analytics requests
const analyticsRequestAttempts = new Map<string, { count: number; resetTime: number }>();
const ANALYTICS_REQUEST_WINDOW = 60 * 1000; // 1 minute
const MAX_ANALYTICS_REQUESTS_PER_MINUTE = 20; // Begränsa för att undvika överbelastning

function checkAnalyticsRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = analyticsRequestAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    analyticsRequestAttempts.set(uid, { 
      count: 1, 
      resetTime: now + ANALYTICS_REQUEST_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_ANALYTICS_REQUESTS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// Hjälpfunktioner för datumberäkningar
function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date, end: Date;

  switch (period) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    
    case 'yesterday':
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      break;
    
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      break;
    
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now);
      break;
    
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      end = new Date(now);
      break;
    
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now);
      break;
    
    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('Start date and end date required for custom period');
      }
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      break;
    
    default:
      throw new Error('Invalid period');
  }

  return { start, end };
}

// GET - Hämta systemanalytik
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
    const rateLimit = checkAnalyticsRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many analytics requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      period: searchParams.get('period') as any || 'week',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      metrics: searchParams.get('metrics')?.split(',') as any || undefined
    };

    // Validera query parameters
    const validationResult = AnalyticsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { period, startDate, endDate, metrics } = validationResult.data;

    // Beräkna datumintervall
    const { start, end } = getDateRange(period, startDate, endDate);

    const db = getAdminDb();
    const now = new Date();

    // Grundläggande systemstatistik
    const analytics: any = {
      period: {
        name: period,
        start: start.toISOString(),
        end: end.toISOString()
      },
      timestamp: now.toISOString()
    };

    // Bokningsanalytik
    if (!metrics || metrics.includes('bookings')) {
      const bookingsQuery = await db.collection('bookings')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();

      const bookings = bookingsQuery.docs.map(doc => doc.data());

      analytics.bookings = {
        total: bookings.length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        active: bookings.filter(b => ['waiting', 'accepted', 'on_way', 'arrived', 'started'].includes(b.status)).length,
        byStatus: {
          waiting: bookings.filter(b => b.status === 'waiting').length,
          accepted: bookings.filter(b => b.status === 'accepted').length,
          on_way: bookings.filter(b => b.status === 'on_way').length,
          arrived: bookings.filter(b => b.status === 'arrived').length,
          started: bookings.filter(b => b.status === 'started').length,
          completed: bookings.filter(b => b.status === 'completed').length,
          cancelled: bookings.filter(b => b.status === 'cancelled').length
        },
        byService: {
          standard: bookings.filter(b => b.service === 'standard').length,
          premium: bookings.filter(b => b.service === 'premium').length,
          luxury: bookings.filter(b => b.service === 'luxury').length
        },
        // Trenddata per dag
        daily: []
      };

      // Beräkna daglig trend
      const dayMs = 24 * 60 * 60 * 1000;
      const days = Math.ceil((end.getTime() - start.getTime()) / dayMs);
      
      for (let i = 0; i < days; i++) {
        const dayStart = new Date(start.getTime() + i * dayMs);
        const dayEnd = new Date(dayStart.getTime() + dayMs - 1);
        
        const dayBookings = bookings.filter(b => {
          const bookingDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return bookingDate >= dayStart && bookingDate <= dayEnd;
        });

        analytics.bookings.daily.push({
          date: dayStart.toISOString().split('T')[0],
          total: dayBookings.length,
          completed: dayBookings.filter(b => b.status === 'completed').length,
          cancelled: dayBookings.filter(b => b.status === 'cancelled').length
        });
      }
    }

    // Intäktsanalytik
    if (!metrics || metrics.includes('revenue')) {
      const completedBookingsQuery = await db.collection('bookings')
        .where('status', '==', 'completed')
        .where('metadata.completedAt', '>=', start)
        .where('metadata.completedAt', '<=', end)
        .get();

      const completedBookings = completedBookingsQuery.docs.map(doc => doc.data());
      const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);

      analytics.revenue = {
        total: totalRevenue,
        average: completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0,
        byService: {
          standard: completedBookings.filter(b => b.service === 'standard').reduce((sum, b) => sum + (b.price || 0), 0),
          premium: completedBookings.filter(b => b.service === 'premium').reduce((sum, b) => sum + (b.price || 0), 0),
          luxury: completedBookings.filter(b => b.service === 'luxury').reduce((sum, b) => sum + (b.price || 0), 0)
        },
        // Daglig intäktstrend
        daily: []
      };

      // Beräkna daglig intäktstrend
      const dayMs = 24 * 60 * 60 * 1000;
      const days = Math.ceil((end.getTime() - start.getTime()) / dayMs);
      
      for (let i = 0; i < days; i++) {
        const dayStart = new Date(start.getTime() + i * dayMs);
        const dayEnd = new Date(dayStart.getTime() + dayMs - 1);
        
        const dayRevenue = completedBookings
          .filter(b => {
            const completedDate = b.metadata?.completedAt?.toDate?.() || new Date(b.metadata?.completedAt);
            return completedDate >= dayStart && completedDate <= dayEnd;
          })
          .reduce((sum, b) => sum + (b.price || 0), 0);

        analytics.revenue.daily.push({
          date: dayStart.toISOString().split('T')[0],
          revenue: dayRevenue
        });
      }
    }

    // Användaranalytik
    if (!metrics || metrics.includes('users')) {
      const usersQuery = await db.collection('users')
        .where('metadata.createdAt', '>=', start)
        .where('metadata.createdAt', '<=', end)
        .get();

      const newUsers = usersQuery.docs.map(doc => doc.data());

      // Hämta total användarstatistik
      const allUsersQuery = await db.collection('users').get();
      const allUsers = allUsersQuery.docs.map(doc => doc.data());

      analytics.users = {
        new: newUsers.length,
        total: allUsers.length,
        newByRole: {
          customers: newUsers.filter(u => u.role === 'customer').length,
          drivers: newUsers.filter(u => u.role === 'driver').length,
          admins: newUsers.filter(u => u.role === 'admin').length
        },
        totalByRole: {
          customers: allUsers.filter(u => u.role === 'customer').length,
          drivers: allUsers.filter(u => u.role === 'driver').length,
          admins: allUsers.filter(u => u.role === 'admin').length
        },
        byStatus: {
          active: allUsers.filter(u => u.status === 'active' || !u.status).length,
          suspended: allUsers.filter(u => u.status === 'suspended').length,
          banned: allUsers.filter(u => u.status === 'banned').length,
          deleted: allUsers.filter(u => u.status === 'deleted').length
        }
      };
    }

    // Föraranalytik
    if (!metrics || metrics.includes('drivers')) {
      const driversQuery = await db.collection('users')
        .where('role', '==', 'driver')
        .get();

      const drivers = driversQuery.docs.map(doc => doc.data());

      // Förarnas bokningar under perioden
      const driverBookingsQuery = await db.collection('bookings')
        .where('metadata.completedAt', '>=', start)
        .where('metadata.completedAt', '<=', end)
        .get();

      const driverBookings = driverBookingsQuery.docs.map(doc => doc.data());

      // Beräkna förarstatistik
      const driverStats = drivers.map(driver => {
        const driverBookingsInPeriod = driverBookings.filter(b => b.driver?.id === driver.id);
        const totalEarnings = driverBookingsInPeriod.reduce((sum, b) => sum + (b.price || 0), 0);
        const ratings = driverBookingsInPeriod.filter(b => b.rating > 0).map(b => b.rating);
        const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

        return {
          id: driver.id,
          name: driver.profile?.name || 'Förare',
          bookings: driverBookingsInPeriod.length,
          earnings: totalEarnings,
          averageRating: Math.round(averageRating * 10) / 10,
          status: driver.driverStatus || 'offline'
        };
      });

      analytics.drivers = {
        total: drivers.length,
        active: drivers.filter(d => d.driverStatus === 'available').length,
        busy: drivers.filter(d => d.driverStatus === 'busy').length,
        offline: drivers.filter(d => d.driverStatus === 'offline' || !d.driverStatus).length,
        topPerformers: driverStats
          .sort((a, b) => b.bookings - a.bookings)
          .slice(0, 10),
        averageBookingsPerDriver: driverStats.length > 0 
          ? driverStats.reduce((sum, d) => sum + d.bookings, 0) / driverStats.length 
          : 0
      };
    }

    // Ratingsanalytik
    if (!metrics || metrics.includes('ratings')) {
      const ratedBookingsQuery = await db.collection('bookings')
        .where('rating', '>', 0)
        .where('metadata.completedAt', '>=', start)
        .where('metadata.completedAt', '<=', end)
        .get();

      const ratedBookings = ratedBookingsQuery.docs.map(doc => doc.data());
      const ratings = ratedBookings.map(b => b.rating);

      analytics.ratings = {
        total: ratings.length,
        average: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0,
        distribution: {
          5: ratings.filter(r => r === 5).length,
          4: ratings.filter(r => r === 4).length,
          3: ratings.filter(r => r === 3).length,
          2: ratings.filter(r => r === 2).length,
          1: ratings.filter(r => r === 1).length
        },
        withFeedback: ratedBookings.filter(b => b.feedback && b.feedback.trim().length > 0).length
      };
    }

    // Prestandaanalytik
    if (!metrics || metrics.includes('performance')) {
      const allBookingsQuery = await db.collection('bookings')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();

      const allBookings = allBookingsQuery.docs.map(doc => doc.data());
      
      // Beräkna genomsnittliga väntetider
      const acceptedBookings = allBookings.filter(b => b.metadata?.acceptedAt);
      const avgWaitTime = acceptedBookings.length > 0 
        ? acceptedBookings.reduce((sum, b) => {
            const created = b.createdAt?.toDate?.() || new Date(b.createdAt);
            const accepted = b.metadata?.acceptedAt?.toDate?.() || new Date(b.metadata?.acceptedAt);
            return sum + (accepted.getTime() - created.getTime());
          }, 0) / acceptedBookings.length / 1000 / 60 // minuter
        : 0;

      // Beräkna genomsnittlig resetid
      const completedBookings = allBookings.filter(b => b.metadata?.completedAt && b.metadata?.acceptedAt);
      const avgTripTime = completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => {
            const accepted = b.metadata?.acceptedAt?.toDate?.() || new Date(b.metadata?.acceptedAt);
            const completed = b.metadata?.completedAt?.toDate?.() || new Date(b.metadata?.completedAt);
            return sum + (completed.getTime() - accepted.getTime());
          }, 0) / completedBookings.length / 1000 / 60 // minuter
        : 0;

      analytics.performance = {
        completionRate: allBookings.length > 0 
          ? (allBookings.filter(b => b.status === 'completed').length / allBookings.length) * 100 
          : 0,
        cancellationRate: allBookings.length > 0 
          ? (allBookings.filter(b => b.status === 'cancelled').length / allBookings.length) * 100 
          : 0,
        averageWaitTime: Math.round(avgWaitTime * 10) / 10, // minuter
        averageTripTime: Math.round(avgTripTime * 10) / 10, // minuter
        peakHours: calculatePeakHours(allBookings),
        busyDays: calculateBusyDays(allBookings)
      };
    }

    // Systemhälsa och metadata
    analytics.system = {
      generatedAt: now.toISOString(),
      dataFreshness: 'real-time',
      period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      requestedBy: decodedToken.uid
    };

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error: any) {
    console.error('Admin analytics GET error:', {
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
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Hjälpfunktioner för prestandaanalys
function calculatePeakHours(bookings: any[]): { hour: number; count: number }[] {
  const hourCounts: { [hour: number]: number } = {};
  
  bookings.forEach(booking => {
    const date = booking.createdAt?.toDate?.() || new Date(booking.createdAt);
    const hour = date.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  return Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calculateBusyDays(bookings: any[]): { day: string; count: number }[] {
  const dayCounts: { [day: string]: number } = {};
  
  bookings.forEach(booking => {
    const date = booking.createdAt?.toDate?.() || new Date(booking.createdAt);
    const dayName = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'][date.getDay()];
    dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
  });

  return Object.entries(dayCounts)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.count - a.count);
}
