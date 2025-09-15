import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import Stripe from 'stripe';
import { verifyAuthToken, getUserRole, getAdminDb, isFirebaseAdminConfigured } from '../../../lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'sek', bookingId, customerEmail } = await request.json();

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    if (amount > 100000) { // Max 100,000 SEK
      return NextResponse.json(
        { error: 'Amount exceeds maximum limit' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin SDK is configured
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { 
          error: 'Firebase Admin SDK is not configured. Please set up service account credentials.',
          details: 'Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY environment variables.'
        },
        { status: 500 }
      );
    }

    // AuthZ: only booking owner, assigned driver or admin
    let userId: string;
    try {
      const decoded = await verifyAuthToken(request.headers.get('authorization'));
      userId = decoded.uid;
      
      const role = (await getUserRole(decoded.uid)) || 'customer';
      const adminDb = getAdminDb();
      const bookingSnap = await adminDb.collection('bookings').doc(bookingId).get();
      
      if (!bookingSnap.exists) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      
      const bookingData = bookingSnap.data() as any;
      const isOwner = bookingData.customerId === decoded.uid;
      const isAssignedDriver = bookingData?.driver?.id === decoded.uid;
      const isAdmin = role === 'admin';
      
      if (!isOwner && !isAssignedDriver && !isAdmin) {
        return NextResponse.json({ error: 'Unauthorized access to booking' }, { status: 403 });
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed. Please ensure you are logged in.' },
        { status: 401 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to öre (smallest currency unit)
      currency,
      metadata: {
        bookingId,
        customerEmail: customerEmail || '',
        userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `Bokning ${bookingId.slice(-8)} - Avanti Taxi`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}