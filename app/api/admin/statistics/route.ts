import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, query, where, orderBy, startAt, endAt } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, 1y
    const type = searchParams.get('type') || 'all'; // all, bookings, users, drivers, revenue

    const now = new Date();
    let startDate = new Date();

    // Calculate start date based on period
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const statistics: any = {};

    // Get booking statistics
    if (type === 'all' || type === 'bookings') {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings = bookingsSnapshot.docs.map(doc => doc.data());

      statistics.bookings = {
        total: bookings.length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        pending: bookings.filter(b => b.status === 'waiting' || b.status === 'accepted').length,
        revenue: bookings
          .filter(b => b.status === 'completed' && b.paymentStatus === 'paid')
          .reduce((sum, b) => sum + (b.price || 0), 0)
      };
    }

    // Get user statistics
    if (type === 'all' || type === 'users') {
      const usersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => doc.data());

      statistics.users = {
        total: users.length,
        customers: users.filter(u => u.role === 'customer').length,
        drivers: users.filter(u => u.role === 'driver').length,
        admins: users.filter(u => u.role === 'admin').length
      };
    }

    // Get driver statistics
    if (type === 'all' || type === 'drivers') {
      const driversQuery = query(
        collection(db, 'drivers'),
        orderBy('createdAt', 'desc')
      );
      const driversSnapshot = await getDocs(driversQuery);
      const drivers = driversSnapshot.docs.map(doc => doc.data());

      statistics.drivers = {
        total: drivers.length,
        available: drivers.filter(d => d.status === 'available').length,
        busy: drivers.filter(d => d.status === 'busy').length,
        offline: drivers.filter(d => d.status === 'offline').length,
        averageRating: drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length || 0
      };
    }

    // Get revenue statistics
    if (type === 'all' || type === 'revenue') {
      const revenueQuery = query(
        collection(db, 'bookings'),
        where('paymentStatus', '==', 'paid'),
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );
      const revenueSnapshot = await getDocs(revenueQuery);
      const revenueBookings = revenueSnapshot.docs.map(doc => doc.data());

      statistics.revenue = {
        total: revenueBookings.reduce((sum, b) => sum + (b.price || 0), 0),
        average: revenueBookings.length > 0 
          ? revenueBookings.reduce((sum, b) => sum + (b.price || 0), 0) / revenueBookings.length 
          : 0,
        count: revenueBookings.length
      };
    }

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      statistics
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
