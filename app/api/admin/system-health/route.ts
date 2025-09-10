import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const healthChecks: any = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {}
    };

    // Check Firebase connection
    try {
      const testQuery = query(collection(db, 'users'), limit(1));
      await getDocs(testQuery);
      healthChecks.services.firebase = {
        status: 'healthy',
        responseTime: Date.now(),
        message: 'Firebase connection successful'
      };
    } catch (error) {
      healthChecks.services.firebase = {
        status: 'unhealthy',
        error: 'Firebase connection failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      healthChecks.status = 'degraded';
    }

    // Check recent bookings
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const recentBookings = bookingsSnapshot.docs.map(doc => doc.data());
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const recentBookingsCount = recentBookings.filter(booking => 
        booking.createdAt?.toDate?.() > oneHourAgo
      ).length;

      healthChecks.services.bookings = {
        status: 'healthy',
        recentBookings: recentBookingsCount,
        totalBookings: recentBookings.length,
        message: `${recentBookingsCount} bokningar senaste timmen`
      };
    } catch (error) {
      healthChecks.services.bookings = {
        status: 'unhealthy',
        error: 'Failed to fetch bookings',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      healthChecks.status = 'degraded';
    }

    // Check active drivers
    try {
      const driversQuery = query(
        collection(db, 'drivers'),
        where('status', 'in', ['available', 'busy'])
      );
      const driversSnapshot = await getDocs(driversQuery);
      const activeDrivers = driversSnapshot.docs.map(doc => doc.data());

      healthChecks.services.drivers = {
        status: 'healthy',
        activeDrivers: activeDrivers.length,
        availableDrivers: activeDrivers.filter(d => d.status === 'available').length,
        busyDrivers: activeDrivers.filter(d => d.status === 'busy').length,
        message: `${activeDrivers.length} aktiva förare`
      };
    } catch (error) {
      healthChecks.services.drivers = {
        status: 'unhealthy',
        error: 'Failed to fetch drivers',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      healthChecks.status = 'degraded';
    }

    // Check system performance
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    healthChecks.services.system = {
      status: 'healthy',
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      uptime: Math.round(uptime),
      nodeVersion: process.version,
      platform: process.platform
    };

    // Overall system status
    const unhealthyServices = Object.values(healthChecks.services).filter(
      (service: any) => service.status === 'unhealthy'
    );

    if (unhealthyServices.length > 0) {
      healthChecks.status = 'unhealthy';
    } else if (healthChecks.status === 'healthy') {
      healthChecks.status = 'healthy';
    }

    return NextResponse.json(healthChecks);
  } catch (error) {
    console.error('Error checking system health:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'System health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
