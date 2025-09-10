import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe';
import Stripe from 'stripe';

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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to öre
      currency,
      metadata: {
        bookingId,
        customerEmail: customerEmail || '',
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
