import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getUserRole, getAdminDb, isFirebaseAdminConfigured } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, bookingId } = await request.json();

    // Validation
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      );
    }

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
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

    // AuthZ: only booking owner, assigned driver or admin can confirm
    try {
      const decoded = await verifyAuthToken(request.headers.get('authorization'));
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

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update booking with comprehensive payment confirmation
      const adminDb = getAdminDb();
      const bookingRef = adminDb.collection('bookings').doc(bookingId);
      
      // Get payment method details
      const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod;
      const paymentMethodDetails = {
        type: paymentMethod?.type || 'unknown',
        card: paymentMethod?.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year
        } : null,
        billing_details: paymentMethod?.billing_details || null
      };

      await bookingRef.update({
        paymentStatus: 'paid',
        paymentId: paymentIntent.id,
        paymentMethod: paymentIntent.payment_method,
        paymentMethodDetails: paymentMethodDetails,
        paidAt: new Date(),
        amountPaid: paymentIntent.amount / 100, // Convert back to SEK
        currency: paymentIntent.currency,
        stripeCustomerId: paymentIntent.customer,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        paymentStatus: 'succeeded',
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert back to SEK
      });
    } else if (paymentIntent.status === 'requires_payment_method') {
      return NextResponse.json({
        success: false,
        paymentStatus: 'requires_payment_method',
        error: 'Payment method required',
      });
    } else if (paymentIntent.status === 'requires_confirmation') {
      return NextResponse.json({
        success: false,
        paymentStatus: 'requires_confirmation',
        error: 'Payment requires confirmation',
      });
    } else if (paymentIntent.status === 'processing') {
      return NextResponse.json({
        success: false,
        paymentStatus: 'processing',
        error: 'Payment is being processed',
      });
    } else if (paymentIntent.status === 'canceled') {
      // Update booking with cancellation
      const adminDb = getAdminDb();
      const bookingRef = adminDb.collection('bookings').doc(bookingId);
      await bookingRef.update({
        paymentStatus: 'canceled',
        paymentId: paymentIntent.id,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: false,
        paymentStatus: 'canceled',
        error: 'Payment was canceled',
      });
    } else {
      return NextResponse.json({
        success: false,
        paymentStatus: paymentIntent.status,
        error: `Payment status: ${paymentIntent.status}`,
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}