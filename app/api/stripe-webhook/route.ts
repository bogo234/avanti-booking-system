import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No stripe signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(failedPayment);
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentCanceled(canceledPayment);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      console.error('No bookingId found in payment intent metadata');
      return;
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      paymentStatus: 'paid',
      paymentId: paymentIntent.id,
      paymentMethod: paymentIntent.payment_method,
      paidAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Payment succeeded for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      console.error('No bookingId found in payment intent metadata');
      return;
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      paymentStatus: 'failed',
      paymentId: paymentIntent.id,
      paymentError: paymentIntent.last_payment_error?.message || 'Payment failed',
      updatedAt: new Date(),
    });

    console.log(`Payment failed for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      console.error('No bookingId found in payment intent metadata');
      return;
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      paymentStatus: 'canceled',
      paymentId: paymentIntent.id,
      updatedAt: new Date(),
    });

    console.log(`Payment canceled for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
}
