import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAdminDb } from '../../../../lib/firebase-admin';
import { 
  stripe, 
  getWebhookSecret, 
  StripeConfig,
  StripeErrorHandler 
} from '../../../../lib/stripe-enhanced';
import Stripe from 'stripe';
import { z } from 'zod';

// Webhook event validation schema
const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.enum(StripeConfig.webhookEvents),
  data: z.object({
    object: z.any()
  }),
  created: z.number()
});

// Rate limiting för webhook processing
const webhookProcessingAttempts = new Map<string, { count: number; resetTime: number }>();
const WEBHOOK_PROCESSING_WINDOW = 60 * 1000; // 1 minute
const MAX_WEBHOOK_PROCESSING_PER_MINUTE = 100; // Hög gräns för webhooks

function checkWebhookRateLimit(eventId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const attempts = webhookProcessingAttempts.get(eventId);
  
  if (!attempts || now > attempts.resetTime) {
    webhookProcessingAttempts.set(eventId, { 
      count: 1, 
      resetTime: now + WEBHOOK_PROCESSING_WINDOW 
    });
    return { allowed: true };
  }
  
  if (attempts.count >= MAX_WEBHOOK_PROCESSING_PER_MINUTE) {
    return { allowed: false, resetTime: attempts.resetTime };
  }
  
  attempts.count++;
  return { allowed: true };
}

// Idempotency tracking för att undvika dubbelbearbetning
const processedEvents = new Set<string>();
const EVENT_RETENTION_TIME = 24 * 60 * 60 * 1000; // 24 hours

function isEventProcessed(eventId: string): boolean {
  return processedEvents.has(eventId);
}

function markEventAsProcessed(eventId: string): void {
  processedEvents.add(eventId);
  
  // Clean up old events after retention time
  setTimeout(() => {
    processedEvents.delete(eventId);
  }, EVENT_RETENTION_TIME);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let eventId = 'unknown';
  
  try {
    // Get raw body and signature
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Stripe webhook: Missing signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      const webhookSecret = getWebhookSecret();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Stripe webhook: Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    eventId = event.id;

    // Validate event structure
    const validationResult = WebhookEventSchema.safeParse(event);
    if (!validationResult.success) {
      console.error('Stripe webhook: Invalid event structure:', validationResult.error);
      return NextResponse.json({ error: 'Invalid event structure' }, { status: 400 });
    }

    // Check for duplicate processing
    if (isEventProcessed(eventId)) {
      console.log(`Stripe webhook: Event ${eventId} already processed, skipping`);
      return NextResponse.json({ received: true, status: 'duplicate' });
    }

    // Rate limiting check
    const rateLimit = checkWebhookRateLimit(eventId);
    if (!rateLimit.allowed) {
      console.error(`Stripe webhook: Rate limit exceeded for event ${eventId}`);
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Mark event as being processed
    markEventAsProcessed(eventId);

    // Log webhook event
    console.log(`Stripe webhook: Processing ${event.type} (${eventId})`);

    // Process the webhook event
    const result = await processWebhookEvent(event);

    // Log processing time
    const processingTime = Date.now() - startTime;
    console.log(`Stripe webhook: ${event.type} processed in ${processingTime}ms`);

    // Create audit log
    await createWebhookAuditLog(event, result, processingTime);

    return NextResponse.json({ 
      received: true, 
      eventId: event.id,
      eventType: event.type,
      processingTime,
      result 
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('Stripe webhook error:', {
      eventId,
      error: error.message,
      stack: error.stack,
      processingTime,
      timestamp: new Date().toISOString()
    });

    // Create error audit log
    await createWebhookErrorLog(eventId, error, processingTime);

    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        eventId,
        processingTime
      },
      { status: 500 }
    );
  }
}

async function processWebhookEvent(event: Stripe.Event): Promise<any> {
  const db = getAdminDb();
  const now = new Date();

  switch (event.type) {
    case 'payment_intent.succeeded':
      return await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, db, now);
    
    case 'payment_intent.payment_failed':
      return await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, db, now);
    
    case 'payment_intent.canceled':
      return await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent, db, now);
    
    case 'payment_intent.requires_action':
      return await handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent, db, now);
    
    case 'payment_method.attached':
      return await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod, db, now);
    
    case 'customer.created':
      return await handleCustomerCreated(event.data.object as Stripe.Customer, db, now);
    
    case 'customer.updated':
      return await handleCustomerUpdated(event.data.object as Stripe.Customer, db, now);

    default:
      console.log(`Stripe webhook: Unhandled event type: ${event.type}`);
      return { status: 'unhandled', eventType: event.type };
  }
}

// Payment Intent Success Handler
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  db: any,
  now: Date
): Promise<any> {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      throw new Error('No bookingId found in payment intent metadata');
    }

    // Update booking
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const updateData = {
      paymentStatus: 'paid',
      paymentId: paymentIntent.id,
      paymentMethod: paymentIntent.payment_method,
      amountPaid: paymentIntent.amount / 100, // Convert from öre to SEK
      currency: paymentIntent.currency,
      paidAt: now,
      'metadata.updatedAt': now,
      'metadata.paymentCompletedAt': now
    };

    // Add payment details if available
    if (paymentIntent.charges?.data?.length > 0) {
      const charge = paymentIntent.charges.data[0];
      updateData['paymentDetails'] = {
        chargeId: charge.id,
        paymentMethodType: charge.payment_method_details?.type,
        last4: charge.payment_method_details?.card?.last4,
        brand: charge.payment_method_details?.card?.brand,
        receiptUrl: charge.receipt_url
      };
    }

    await bookingRef.update(updateData);

    // Send success notification
    const bookingData = bookingDoc.data();
    if (bookingData.customerId) {
      await db.collection('notifications').add({
        userId: bookingData.customerId,
        type: 'payment',
        title: 'Betalning genomförd',
        message: `Betalning på ${paymentIntent.amount / 100} SEK har genomförts för bokning #${bookingId.slice(-8)}`,
        data: {
          bookingId,
          paymentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency
        },
        priority: 'normal',
        read: false,
        createdAt: now,
        source: 'stripe_webhook'
      });
    }

    // Update booking status to confirmed if it was pending payment
    if (bookingData.status === 'pending_payment') {
      await bookingRef.update({
        status: 'waiting', // Ready for driver assignment
        'metadata.paymentConfirmedAt': now
      });
    }

    console.log(`Payment succeeded for booking ${bookingId}: ${paymentIntent.amount / 100} ${paymentIntent.currency}`);

    return { 
      status: 'success', 
      bookingId, 
      amount: paymentIntent.amount / 100,
      paymentId: paymentIntent.id
    };

  } catch (error: any) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

// Payment Intent Failed Handler
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  db: any,
  now: Date
): Promise<any> {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      throw new Error('No bookingId found in payment intent metadata');
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
    const errorCode = paymentIntent.last_payment_error?.code || 'unknown_error';

    await bookingRef.update({
      paymentStatus: 'failed',
      paymentId: paymentIntent.id,
      paymentError: errorMessage,
      paymentErrorCode: errorCode,
      'metadata.updatedAt': now,
      'metadata.paymentFailedAt': now
    });

    // Send failure notification
    const bookingData = bookingDoc.data();
    if (bookingData.customerId) {
      await db.collection('notifications').add({
        userId: bookingData.customerId,
        type: 'payment',
        title: 'Betalning misslyckades',
        message: `Betalningen för bokning #${bookingId.slice(-8)} misslyckades. ${errorMessage}`,
        data: {
          bookingId,
          paymentId: paymentIntent.id,
          error: errorMessage,
          errorCode
        },
        priority: 'high',
        read: false,
        createdAt: now,
        source: 'stripe_webhook'
      });
    }

    console.log(`Payment failed for booking ${bookingId}: ${errorMessage}`);

    return { 
      status: 'failed', 
      bookingId, 
      error: errorMessage,
      errorCode
    };

  } catch (error: any) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

// Payment Intent Canceled Handler
async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent,
  db: any,
  now: Date
): Promise<any> {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      throw new Error('No bookingId found in payment intent metadata');
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    
    await bookingRef.update({
      paymentStatus: 'canceled',
      paymentId: paymentIntent.id,
      'metadata.updatedAt': now,
      'metadata.paymentCanceledAt': now
    });

    console.log(`Payment canceled for booking ${bookingId}`);

    return { status: 'canceled', bookingId };

  } catch (error: any) {
    console.error('Error handling payment cancellation:', error);
    throw error;
  }
}

// Payment Requires Action Handler
async function handlePaymentRequiresAction(
  paymentIntent: Stripe.PaymentIntent,
  db: any,
  now: Date
): Promise<any> {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      throw new Error('No bookingId found in payment intent metadata');
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    await bookingRef.update({
      paymentStatus: 'requires_action',
      paymentId: paymentIntent.id,
      'metadata.updatedAt': now,
      'metadata.paymentRequiresActionAt': now
    });

    // Send notification about required action
    const bookingData = bookingDoc.data();
    if (bookingData && bookingData.customerId) {
      await db.collection('notifications').add({
        userId: bookingData.customerId,
        type: 'payment',
        title: 'Betalning kräver åtgärd',
        message: `Din betalning för bokning #${bookingId.slice(-8)} kräver ytterligare verifiering`,
        data: {
          bookingId,
          paymentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret
        },
        priority: 'high',
        read: false,
        createdAt: now,
        source: 'stripe_webhook'
      });
    }

    console.log(`Payment requires action for booking ${bookingId}`);

    return { status: 'requires_action', bookingId };

  } catch (error: any) {
    console.error('Error handling payment requires action:', error);
    throw error;
  }
}

// Payment Method Attached Handler
async function handlePaymentMethodAttached(
  paymentMethod: Stripe.PaymentMethod,
  db: any,
  now: Date
): Promise<any> {
  try {
    // This can be used to track payment methods for analytics
    console.log(`Payment method attached: ${paymentMethod.id} (${paymentMethod.type})`);
    
    return { status: 'logged', paymentMethodId: paymentMethod.id };

  } catch (error: any) {
    console.error('Error handling payment method attachment:', error);
    throw error;
  }
}

// Customer Created Handler
async function handleCustomerCreated(
  customer: Stripe.Customer,
  db: any,
  now: Date
): Promise<any> {
  try {
    // Update user document with Stripe customer ID if user exists
    if (customer.metadata.userId) {
      const userRef = db.collection('users').doc(customer.metadata.userId);
      await userRef.update({
        stripeCustomerId: customer.id,
        'metadata.stripeCustomerCreatedAt': now,
        'metadata.updatedAt': now
      });
    }

    console.log(`Stripe customer created: ${customer.id}`);
    
    return { status: 'customer_linked', customerId: customer.id };

  } catch (error: any) {
    console.error('Error handling customer creation:', error);
    throw error;
  }
}

// Customer Updated Handler
async function handleCustomerUpdated(
  customer: Stripe.Customer,
  db: any,
  now: Date
): Promise<any> {
  try {
    // Sync customer updates with user document if needed
    if (customer.metadata.userId) {
      const userRef = db.collection('users').doc(customer.metadata.userId);
      const updates: any = {
        'metadata.stripeCustomerUpdatedAt': now,
        'metadata.updatedAt': now
      };

      // Update email if changed
      if (customer.email) {
        updates['stripeCustomerEmail'] = customer.email;
      }

      await userRef.update(updates);
    }

    console.log(`Stripe customer updated: ${customer.id}`);
    
    return { status: 'customer_synced', customerId: customer.id };

  } catch (error: any) {
    console.error('Error handling customer update:', error);
    throw error;
  }
}

// Audit logging functions
async function createWebhookAuditLog(
  event: Stripe.Event, 
  result: any, 
  processingTime: number
): Promise<void> {
  try {
    const db = getAdminDb();
    
    await db.collection('stripe_webhook_logs').add({
      eventId: event.id,
      eventType: event.type,
      processingTime,
      result,
      status: 'success',
      createdAt: new Date(),
      metadata: {
        apiVersion: event.api_version,
        livemode: event.livemode
      }
    });
  } catch (error) {
    console.error('Failed to create webhook audit log:', error);
  }
}

async function createWebhookErrorLog(
  eventId: string, 
  error: any, 
  processingTime: number
): Promise<void> {
  try {
    const db = getAdminDb();
    
    await db.collection('stripe_webhook_logs').add({
      eventId,
      processingTime,
      status: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      createdAt: new Date()
    });
  } catch (logError) {
    console.error('Failed to create webhook error log:', logError);
  }
}
