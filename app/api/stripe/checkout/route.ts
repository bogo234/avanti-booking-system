import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe';
import { verifyAuthToken, getUserRole, getAdminDb, isFirebaseAdminConfigured } from '../../../../lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    if (!isFirebaseAdminConfigured()) {
      const missingVars = [];
      if (!process.env.FIREBASE_PROJECT_ID) missingVars.push('FIREBASE_PROJECT_ID');
      if (!process.env.FIREBASE_CLIENT_EMAIL) missingVars.push('FIREBASE_CLIENT_EMAIL');
      if (!process.env.FIREBASE_PRIVATE_KEY) missingVars.push('FIREBASE_PRIVATE_KEY');
      
      return NextResponse.json({ 
        error: 'Firebase Admin SDK not configured',
        details: `Missing environment variables: ${missingVars.join(', ')}`,
        missingVars
      }, { status: 500 });
    }

    const decoded = await verifyAuthToken(req.headers.get('authorization'));
    const userId = decoded.uid;
    const role = (await getUserRole(userId)) || 'customer';

    const adminDb = getAdminDb();
    const snap = await adminDb.collection('bookings').doc(bookingId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = snap.data() as any;
    const isOwner = booking.customerId === userId;
    const isAssignedDriver = booking?.driver?.id === userId;
    const isAdmin = role === 'admin';
    if (!isOwner && !isAssignedDriver && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const unitAmount = Math.round(Number(booking.price) * 100);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Build payment method types dynamically from env flags
    const paymentMethodTypes: Array<'card' | 'klarna' | 'swish'> = ['card'];
    if (process.env.STRIPE_ENABLE_KLARNA === 'true') paymentMethodTypes.push('klarna');
    if (process.env.STRIPE_ENABLE_SWISH === 'true') paymentMethodTypes.push('swish');

    // Build a robust origin for redirect URLs
    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'sek',
      payment_method_types: paymentMethodTypes,
      locale: 'sv',
      line_items: [
        {
          price_data: {
            currency: 'sek',
            unit_amount: unitAmount,
            product_data: {
              name: `Bokning ${String(bookingId).slice(-8)}`,
              description: `${booking.pickup?.address || ''} → ${booking.destination?.address || ''}`.trim(),
            },
          },
          quantity: 1,
        },
      ],
      client_reference_id: bookingId,
      metadata: { bookingId, userId },
      customer_email: booking?.customerEmail || undefined,
      success_url: `${origin}/payment/success?bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment?bookingId=${bookingId}`,
      billing_address_collection: 'auto',
      allow_promotion_codes: false,
      submit_type: 'pay',
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    const message = e?.message || 'Failed to create checkout session';
    console.error('Create checkout session failed:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
