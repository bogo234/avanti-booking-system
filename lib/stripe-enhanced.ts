import Stripe from 'stripe';

// Initialize Stripe with enhanced configuration
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
  appInfo: {
    name: 'Avanti Booking System',
    version: '2.0.0',
    url: 'https://avanti-app.se'
  }
});

// Webhook secrets for different environments
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

// Enhanced Stripe configuration and utilities
export const StripeConfig = {
  // Currency settings
  defaultCurrency: 'sek' as const,
  supportedCurrencies: ['sek', 'eur', 'usd'] as const,
  
  // Amount limits (in SEK)
  minAmount: 50, // 50 SEK
  maxAmount: 50000, // 50,000 SEK
  
  // Service fees and pricing
  serviceFee: {
    standard: 0.05, // 5%
    premium: 0.08, // 8%
    luxury: 0.12 // 12%
  },
  
  // Payment method types
  paymentMethods: [
    'card',
    'klarna',
    'swish' // Swedish mobile payment
  ] as const,
  
  // Webhook event types we handle
  webhookEvents: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'payment_intent.requires_action',
    'payment_method.attached',
    'customer.created',
    'customer.updated',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'subscription.created',
    'subscription.updated',
    'subscription.canceled'
  ] as const
};

// Price calculation utilities
export class PriceCalculator {
  static calculateServiceFee(baseAmount: number, serviceType: 'standard' | 'premium' | 'luxury'): number {
    const feeRate = StripeConfig.serviceFee[serviceType];
    return Math.round(baseAmount * feeRate);
  }

  static calculateTotalAmount(baseAmount: number, serviceType: 'standard' | 'premium' | 'luxury'): number {
    const serviceFee = this.calculateServiceFee(baseAmount, serviceType);
    return baseAmount + serviceFee;
  }

  static validateAmount(amount: number): { valid: boolean; error?: string } {
    if (amount < StripeConfig.minAmount) {
      return { valid: false, error: `Amount must be at least ${StripeConfig.minAmount} SEK` };
    }
    
    if (amount > StripeConfig.maxAmount) {
      return { valid: false, error: `Amount cannot exceed ${StripeConfig.maxAmount} SEK` };
    }
    
    return { valid: true };
  }

  // Distance-based pricing (placeholder - can be enhanced with Google Maps API)
  static calculateDistancePrice(distanceKm: number, serviceType: 'standard' | 'premium' | 'luxury'): number {
    const basePrices = {
      standard: 15, // 15 SEK per km
      premium: 25, // 25 SEK per km  
      luxury: 40 // 40 SEK per km
    };

    const minimumFares = {
      standard: 80, // 80 SEK minimum
      premium: 150, // 150 SEK minimum
      luxury: 300 // 300 SEK minimum
    };

    const basePrice = distanceKm * basePrices[serviceType];
    const minimumFare = minimumFares[serviceType];
    
    return Math.max(basePrice, minimumFare);
  }

  // Time-based surge pricing
  static applySurgePricing(baseAmount: number, surgeMultiplier: number = 1.0): number {
    return Math.round(baseAmount * surgeMultiplier);
  }

  // Peak hour detection
  static isPeakHour(date: Date = new Date()): boolean {
    const hour = date.getHours();
    const day = date.getDay();
    
    // Weekday rush hours: 7-9 AM and 5-7 PM
    if (day >= 1 && day <= 5) {
      return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    }
    
    // Weekend evening: 7-11 PM
    if (day === 0 || day === 6) {
      return hour >= 19 && hour <= 23;
    }
    
    return false;
  }

  static getSurgeMultiplier(date: Date = new Date()): number {
    if (this.isPeakHour(date)) {
      return 1.3; // 30% surge during peak hours
    }
    return 1.0;
  }
}

// Customer management utilities
export class StripeCustomerManager {
  static async createOrRetrieveCustomer(
    email: string, 
    name?: string, 
    phone?: string,
    userId?: string
  ): Promise<Stripe.Customer> {
    try {
      // Try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name,
        phone,
        metadata: {
          userId: userId || '',
          source: 'avanti-booking-system'
        }
      });

      return customer;
    } catch (error) {
      console.error('Error creating/retrieving Stripe customer:', error);
      throw error;
    }
  }

  static async updateCustomer(
    customerId: string, 
    updates: {
      name?: string;
      email?: string;
      phone?: string;
      address?: Stripe.CustomerUpdateParams.Address;
    }
  ): Promise<Stripe.Customer> {
    try {
      return await stripe.customers.update(customerId, updates);
    } catch (error) {
      console.error('Error updating Stripe customer:', error);
      throw error;
    }
  }
}

// Payment Intent utilities
export class PaymentIntentManager {
  static async createEnhancedPaymentIntent(params: {
    amount: number;
    currency?: string;
    customerId?: string;
    bookingId: string;
    serviceType: 'standard' | 'premium' | 'luxury';
    customerEmail: string;
    customerName?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    const {
      amount,
      currency = StripeConfig.defaultCurrency,
      customerId,
      bookingId,
      serviceType,
      customerEmail,
      customerName,
      description,
      metadata = {}
    } = params;

    // Validate amount
    const validation = PriceCalculator.validateAmount(amount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Apply surge pricing if peak hour
    const surgeMultiplier = PriceCalculator.getSurgeMultiplier();
    const finalAmount = PriceCalculator.applySurgePricing(amount, surgeMultiplier);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100), // Convert to öre
        currency,
        customer: customerId,
        metadata: {
          bookingId,
          serviceType,
          customerEmail,
          customerName: customerName || '',
          originalAmount: amount.toString(),
          surgeMultiplier: surgeMultiplier.toString(),
          finalAmount: finalAmount.toString(),
          source: 'avanti-booking-system',
          ...metadata
        },
        description: description || `Avanti ${serviceType} transport - Booking ${bookingId.slice(-8)}`,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never' // For better mobile experience
        },
        payment_method_types: StripeConfig.paymentMethods as any,
        setup_future_usage: 'off_session', // Allow saving payment method for future use
        receipt_email: customerEmail,
        statement_descriptor: 'AVANTI TRANSPORT',
        statement_descriptor_suffix: bookingId.slice(-8).toUpperCase()
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating enhanced payment intent:', error);
      throw error;
    }
  }

  static async updatePaymentIntent(
    paymentIntentId: string,
    updates: {
      amount?: number;
      metadata?: Record<string, string>;
      description?: string;
    }
  ): Promise<Stripe.PaymentIntent> {
    try {
      const updateParams: Stripe.PaymentIntentUpdateParams = {};

      if (updates.amount) {
        updateParams.amount = Math.round(updates.amount * 100);
      }

      if (updates.metadata) {
        updateParams.metadata = updates.metadata;
      }

      if (updates.description) {
        updateParams.description = updates.description;
      }

      return await stripe.paymentIntents.update(paymentIntentId, updateParams);
    } catch (error) {
      console.error('Error updating payment intent:', error);
      throw error;
    }
  }
}

// Refund utilities
export class RefundManager {
  static async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
    metadata?: Record<string, string>
  ): Promise<Stripe.Refund> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason,
        metadata: {
          source: 'avanti-booking-system',
          ...metadata
        }
      });

      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  static async listRefunds(paymentIntentId: string): Promise<Stripe.Refund[]> {
    try {
      const refunds = await stripe.refunds.list({
        payment_intent: paymentIntentId
      });
      
      return refunds.data;
    } catch (error) {
      console.error('Error listing refunds:', error);
      throw error;
    }
  }
}

// Error handling utilities
export class StripeErrorHandler {
  static handleStripeError(error: Stripe.StripeError): { message: string; code: string; statusCode: number } {
    switch (error.type) {
      case 'card_error':
        return {
          message: 'Ditt kort avvisades. Kontrollera kortuppgifterna och försök igen.',
          code: error.code || 'card_declined',
          statusCode: 402
        };
      
      case 'rate_limit_error':
        return {
          message: 'För många förfrågningar. Vänta en stund och försök igen.',
          code: 'rate_limit_exceeded',
          statusCode: 429
        };
      
      case 'invalid_request_error':
        return {
          message: 'Ogiltig förfrågan. Kontakta support om problemet kvarstår.',
          code: error.code || 'invalid_request',
          statusCode: 400
        };
      
      case 'api_error':
        return {
          message: 'Ett tekniskt fel uppstod. Försök igen senare.',
          code: 'api_error',
          statusCode: 500
        };
      
      case 'connection_error':
        return {
          message: 'Anslutningsfel. Kontrollera din internetanslutning.',
          code: 'connection_error',
          statusCode: 503
        };
      
      case 'authentication_error':
        return {
          message: 'Autentiseringsfel. Kontakta support.',
          code: 'authentication_error',
          statusCode: 401
        };
      
      default:
        return {
          message: 'Ett oväntat fel uppstod. Försök igen senare.',
          code: 'unknown_error',
          statusCode: 500
        };
    }
  }
}

// Export all utilities
export {
  stripe as default,
  StripeConfig,
  PriceCalculator,
  StripeCustomerManager,
  PaymentIntentManager,
  RefundManager,
  StripeErrorHandler
};
