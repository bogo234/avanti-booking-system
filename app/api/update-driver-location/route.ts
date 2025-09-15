import { NextRequest, NextResponse } from 'next/server';
import { serverTimestamp } from 'firebase/firestore';
import { getAdminDb } from '../../../lib/firebase-admin';
import { verifyAuthToken, getUserRole } from '../../../lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { driverId, location, bookingId } = await request.json();

    // AuthZ: only the driver themself or admin can update
    const decoded = await verifyAuthToken(request.headers.get('authorization'));
    const role = (await getUserRole(decoded.uid)) || 'customer';
    const isSameDriver = decoded.uid === driverId;
    const isAdmin = role === 'admin';
    if (!isSameDriver && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!driverId || !location || !location.lat || !location.lng) {
      return NextResponse.json(
        { error: 'Driver ID och location krävs' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Update driver location in Firebase
    await adminDb.collection('drivers').doc(driverId).update({
      location: {
        lat: location.lat,
        lng: location.lng
      },
      updatedAt: new Date()
    });

    // If bookingId is provided, also update the booking with driver location
    if (bookingId) {
      await adminDb.collection('bookings').doc(bookingId).update({
        'driver.location': {
          lat: location.lat,
          lng: location.lng
        },
        updatedAt: new Date()
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Driver location updated successfully' 
    });

  } catch (error) {
    console.error('Error updating driver location:', error);
    return NextResponse.json(
      { error: 'Kunde inte uppdatera förarens position' },
      { status: 500 }
    );
  }
}