import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getUserRole, getAdminDb } from '../../../lib/firebase-admin';

interface GeoPointLike {
  lat: number;
  lng: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(a: GeoPointLike, b: GeoPointLike): number {
  const R = 6371; // km
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    // AuthN/AuthZ: only admins can auto-assign
    const decoded = await verifyAuthToken(request.headers.get('authorization'));
    const role = await getUserRole(decoded.uid);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();

    // Load booking
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    const booking = bookingSnap.data() as any;

    if (booking.driver?.id) {
      return NextResponse.json({ error: 'Booking already has a driver' }, { status: 409 });
    }
    if (!booking.pickup?.coordinates?.lat || !booking.pickup?.coordinates?.lng) {
      return NextResponse.json({ error: 'Booking is missing pickup coordinates' }, { status: 400 });
    }

    // Find available drivers
    const driversSnap = await db
      .collection('drivers')
      .where('status', '==', 'available')
      .get();

    const pickupLoc: GeoPointLike = {
      lat: booking.pickup.coordinates.lat,
      lng: booking.pickup.coordinates.lng,
    };

    const candidates = driversSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .filter((d) => d.location && typeof d.location.lat === 'number' && typeof d.location.lng === 'number')
      .map((d) => ({
        id: d.id as string,
        name: d.name as string,
        phone: d.phone as string,
        car: d.car as string,
        licensePlate: d.licensePlate as string,
        location: d.location as GeoPointLike,
        distanceKm: haversineDistanceKm(pickupLoc, d.location as GeoPointLike),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No available drivers' }, { status: 409 });
    }

    const chosen = candidates[0];

    // Assign within a transaction to avoid races
    await db.runTransaction(async (tx) => {
      const freshBooking = await tx.get(bookingRef);
      if (!freshBooking.exists) throw new Error('Booking disappeared');
      const data = freshBooking.data() as any;
      if (data.driver?.id) throw new Error('Booking already assigned');

      const driverRef = db.collection('drivers').doc(chosen.id);
      const driverSnap = await tx.get(driverRef);
      if (!driverSnap.exists) throw new Error('Driver disappeared');
      const driverData = driverSnap.data() as any;
      if (driverData.status !== 'available') throw new Error('Driver no longer available');

      tx.update(driverRef, {
        status: 'busy',
        updatedAt: new Date(),
      });

      tx.update(bookingRef, {
        status: 'accepted',
        driver: {
          id: chosen.id,
          name: chosen.name,
          phone: chosen.phone,
          car: chosen.car,
          licensePlate: chosen.licensePlate,
          location: driverData.location || null,
        },
        updatedAt: new Date(),
      });
    });

    return NextResponse.json({
      success: true,
      driver: {
        id: chosen.id,
        name: chosen.name,
        phone: chosen.phone,
        car: chosen.car,
        licensePlate: chosen.licensePlate,
        distanceKm: chosen.distanceKm,
      },
    });
  } catch (error: any) {
    console.error('Auto-assign error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to auto-assign driver';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


