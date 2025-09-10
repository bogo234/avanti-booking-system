import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { driverId, location, bookingId } = await request.json();

    if (!driverId || !location || !location.lat || !location.lng) {
      return NextResponse.json(
        { error: 'Driver ID och location krävs' },
        { status: 400 }
      );
    }

    // Update driver location in Firebase
    const driverRef = doc(db, 'drivers', driverId);
    await updateDoc(driverRef, {
      location: {
        lat: location.lat,
        lng: location.lng
      },
      updatedAt: serverTimestamp()
    });

    // If bookingId is provided, also update the booking with driver location
    if (bookingId) {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        'driver.location': {
          lat: location.lat,
          lng: location.lng
        },
        updatedAt: serverTimestamp()
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