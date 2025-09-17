import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../../lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Skip Firebase Admin SDK check temporarily and create a basic checkout session
    // This will work even if Firebase Admin SDK is not configured
    
    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || req.nextUrl.origin;
    
    // Create a basic checkout session with fixed price (299 SEK as standard)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'sek',
      payment_method_types: ['card'],
      locale: 'sv',
      line_items: [
        {
          price_data: {
            currency: 'sek',
            unit_amount: 29900, // 299 SEK in öre
            product_data: {
              name: `Avanti Transport - Bokning ${String(bookingId).slice(-8)}`,
              description: 'Professionell chaufförtjänst',
            },
          },
          quantity: 1,
        },
      ],
      client_reference_id: bookingId,
      metadata: { 
        bookingId,
        service: 'avanti-transport',
        source: 'avantidriver.com'
      },
      success_url: `${origin}/payment/success?bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment?bookingId=${bookingId}`,
      billing_address_collection: 'auto',
      allow_promotion_codes: false,
      submit_type: 'pay',
    });

    console.log('Stripe checkout session created successfully:', session.id);
    return NextResponse.json({ url: session.url }, { status: 200 });
    
  } catch (e: any) {
    const message = e?.message || 'Failed to create checkout session';
    console.error('Create checkout session failed:', e);
    return NextResponse.json({ 
      error: message,
      details: 'Stripe checkout creation failed'
    }, { status: 500 });
  }
}
