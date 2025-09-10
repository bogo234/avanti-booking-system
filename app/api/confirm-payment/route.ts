import { NextRequest, NextResponse } from 'next/server';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
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

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update booking with payment confirmation
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        paymentStatus: 'paid',
        paymentId: paymentIntent.id,
        paymentMethod: paymentIntent.payment_method,
        paidAt: new Date(),
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
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
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
