import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getUserRole, getAdminDb } from '../../../../lib/firebase-admin';
import stripe, { 
  PaymentIntentManager, 
  StripeCustomerManager, 
  PriceCalculator,
  StripeErrorHandler,
  StripeConfig 
} from '../../../../lib/stripe-enhanced';
import { z } from 'zod';
import Stripe from 'stripe';

// Validation schemas
const CreatePaymentIntentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  amount: z.number().min(StripeConfig.minAmount).max(StripeConfig.maxAmount),
  currency: z.enum(StripeConfig.supportedCurrencies).default('sek'),
  serviceType: z.enum(['standard', 'premium', 'luxury']),
  customerEmail: z.string().email('Valid email is required'),
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().optional(),
  savePaymentMethod: z.boolean().default(false),
  confirmationMethod: z.enum(['automatic', 'manual']).default('automatic'),
  metadata: z.record(z.string()).optional()
});

const UpdatePaymentIntentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment Intent ID is required'),
  amount: z.number().min(StripeConfig.minAmount).max(StripeConfig.maxAmount).optional(),
  metadata: z.record(z.string()).optional(),
  description: z.string().max(200).optional()
});

// Rate limiting för payment intent operations
const paymentIntentAttempts = new Map<string, { count: number; resetTime: number }>();
const PAYMENT_INTENT_WINDOW = 60 * 1000; // 1 minute
const MAX_PAYMENT_INTENT_REQUESTS_PER_MINUTE = 10;

function checkPaymentIntentRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = paymentIntentAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    paymentIntentAttempts.set(uid, { 
      count: 1, 
      resetTime: now + PAYMENT_INTENT_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_PAYMENT_INTENT_REQUESTS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// POST - Skapa Payment Intent
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkPaymentIntentRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many payment requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = CreatePaymentIntentSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const {
      bookingId,
      amount,
      currency,
      serviceType,
      customerEmail,
      customerName,
      customerPhone,
      savePaymentMethod,
      confirmationMethod,
      metadata = {}
    } = validationResult.data;

    const db = getAdminDb();
    const userRole = await getUserRole(decodedToken.uid);

    // Kontrollera behörighet för bokningen
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingData = bookingDoc.data()!;
    
    // Kontrollera att användaren har rätt att betala för denna bokning
    const isOwner = bookingData.customerId === decodedToken.uid;
    const isAssignedDriver = bookingData.driver?.id === decodedToken.uid;
    const isAdmin = userRole === 'admin';
    
    if (!isOwner && !isAssignedDriver && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. You can only create payments for your own bookings.' },
        { status: 403 }
      );
    }

    // Kontrollera att bokningen inte redan är betald
    if (bookingData.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'This booking has already been paid' },
        { status: 400 }
      );
    }

    // Skapa eller hämta Stripe-kund
    let stripeCustomer: Stripe.Customer | undefined;
    try {
      stripeCustomer = await StripeCustomerManager.createOrRetrieveCustomer(
        customerEmail,
        customerName,
        customerPhone,
        decodedToken.uid
      );
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      // Continue without customer if creation fails
    }

    // Beräkna slutligt pris med serviceavgift och surge pricing
    const totalAmount = PriceCalculator.calculateTotalAmount(amount, serviceType);
    const surgeMultiplier = PriceCalculator.getSurgeMultiplier();
    const finalAmount = PriceCalculator.applySurgePricing(totalAmount, surgeMultiplier);

    // Skapa Payment Intent
    const paymentIntent = await PaymentIntentManager.createEnhancedPaymentIntent({
      amount: finalAmount,
      currency,
      customerId: stripeCustomer?.id,
      bookingId,
      serviceType,
      customerEmail,
      customerName,
      description: `Avanti ${serviceType} transport - Bokning ${bookingId.slice(-8)}`,
      metadata: {
        userId: decodedToken.uid,
        userRole: userRole || 'customer',
        originalAmount: amount.toString(),
        serviceFee: (totalAmount - amount).toString(),
        surgeMultiplier: surgeMultiplier.toString(),
        isPeakHour: PriceCalculator.isPeakHour().toString(),
        savePaymentMethod: savePaymentMethod.toString(),
        ...metadata
      }
    });

    // Uppdatera bokningen med payment intent information
    await bookingRef.update({
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      originalAmount: amount,
      totalAmount: finalAmount,
      serviceFee: totalAmount - amount,
      surgeMultiplier,
      currency,
      stripeCustomerId: stripeCustomer?.id,
      'metadata.paymentIntentCreatedAt': new Date(),
      'metadata.updatedAt': new Date()
    });

    // Skapa audit log
    await db.collection('payment_audit_logs').add({
      userId: decodedToken.uid,
      bookingId,
      action: 'payment_intent_created',
      paymentIntentId: paymentIntent.id,
      amount: finalAmount,
      currency,
      serviceType,
      metadata: {
        originalAmount: amount,
        serviceFee: totalAmount - amount,
        surgeMultiplier,
        stripeCustomerId: stripeCustomer?.id
      },
      timestamp: new Date(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Skicka notifikation om surge pricing
    if (surgeMultiplier > 1.0) {
      await db.collection('notifications').add({
        userId: decodedToken.uid,
        type: 'payment',
        title: 'Högtrafik-tillägg tillämpat',
        message: `Ett tillägg på ${Math.round((surgeMultiplier - 1) * 100)}% har tillämpats på grund av hög efterfrågan`,
        data: {
          bookingId,
          surgeMultiplier,
          originalAmount: amount,
          finalAmount
        },
        priority: 'normal',
        read: false,
        createdAt: new Date(),
        source: 'payment_system'
      });
    }

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: finalAmount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      },
      customer: stripeCustomer ? {
        id: stripeCustomer.id,
        email: stripeCustomer.email
      } : null,
      pricing: {
        originalAmount: amount,
        serviceFee: totalAmount - amount,
        surgeMultiplier,
        totalAmount: finalAmount,
        isPeakHour: PriceCalculator.isPeakHour()
      }
    });

  } catch (error: any) {
    console.error('Payment intent creation error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      const stripeError = StripeErrorHandler.handleStripeError(error);
      return NextResponse.json(
        { error: stripeError.message, code: stripeError.code },
        { status: stripeError.statusCode }
      );
    }
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

// PUT - Uppdatera Payment Intent
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkPaymentIntentRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many payment requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = UpdatePaymentIntentSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { paymentIntentId, amount, metadata, description } = validationResult.data;

    const db = getAdminDb();
    const userRole = await getUserRole(decodedToken.uid);

    // Hitta bokningen som tillhör detta payment intent
    const bookingsQuery = await db.collection('bookings')
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();

    if (bookingsQuery.empty) {
      return NextResponse.json(
        { error: 'Booking not found for this payment intent' },
        { status: 404 }
      );
    }

    const bookingDoc = bookingsQuery.docs[0];
    const bookingData = bookingDoc.data();

    // Kontrollera behörighet
    const isOwner = bookingData.customerId === decodedToken.uid;
    const isAssignedDriver = bookingData.driver?.id === decodedToken.uid;
    const isAdmin = userRole === 'admin';
    
    if (!isOwner && !isAssignedDriver && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Uppdatera Payment Intent
    const updates: any = {};
    if (amount) updates.amount = amount;
    if (metadata) updates.metadata = { ...bookingData.metadata, ...metadata };
    if (description) updates.description = description;

    const updatedPaymentIntent = await PaymentIntentManager.updatePaymentIntent(
      paymentIntentId,
      updates
    );

    // Uppdatera bokningen om beloppet ändrades
    if (amount) {
      await bookingDoc.ref.update({
        totalAmount: amount,
        'metadata.paymentIntentUpdatedAt': new Date(),
        'metadata.updatedAt': new Date()
      });
    }

    // Skapa audit log
    await db.collection('payment_audit_logs').add({
      userId: decodedToken.uid,
      bookingId: bookingDoc.id,
      action: 'payment_intent_updated',
      paymentIntentId,
      changes: updates,
      timestamp: new Date(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: updatedPaymentIntent.id,
        amount: updatedPaymentIntent.amount / 100,
        currency: updatedPaymentIntent.currency,
        status: updatedPaymentIntent.status,
        clientSecret: updatedPaymentIntent.client_secret
      }
    });

  } catch (error: any) {
    console.error('Payment intent update error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      const stripeError = StripeErrorHandler.handleStripeError(error);
      return NextResponse.json(
        { error: stripeError.message, code: stripeError.code },
        { status: stripeError.statusCode }
      );
    }
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update payment intent' },
      { status: 500 }
    );
  }
}

// GET - Hämta Payment Intent status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('paymentIntentId');
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const userRole = await getUserRole(decodedToken.uid);

    // Hitta bokningen
    const bookingsQuery = await db.collection('bookings')
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();

    if (bookingsQuery.empty) {
      return NextResponse.json(
        { error: 'Booking not found for this payment intent' },
        { status: 404 }
      );
    }

    const bookingDoc = bookingsQuery.docs[0];
    const bookingData = bookingDoc.data();

    // Kontrollera behörighet
    const isOwner = bookingData.customerId === decodedToken.uid;
    const isAssignedDriver = bookingData.driver?.id === decodedToken.uid;
    const isAdmin = userRole === 'admin';
    
    if (!isOwner && !isAssignedDriver && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Hämta aktuell status från Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        clientSecret: paymentIntent.client_secret,
        paymentMethod: paymentIntent.payment_method,
        lastPaymentError: paymentIntent.last_payment_error
      },
      booking: {
        id: bookingDoc.id,
        paymentStatus: bookingData.paymentStatus,
        totalAmount: bookingData.totalAmount,
        serviceFee: bookingData.serviceFee,
        surgeMultiplier: bookingData.surgeMultiplier
      }
    });

  } catch (error: any) {
    console.error('Payment intent retrieval error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      const stripeError = StripeErrorHandler.handleStripeError(error);
      return NextResponse.json(
        { error: stripeError.message, code: stripeError.code },
        { status: stripeError.statusCode }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to retrieve payment intent' },
      { status: 500 }
    );
  }
}
