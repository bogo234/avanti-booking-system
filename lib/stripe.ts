import Stripe from 'stripe';
import { validateEnvironmentVariables } from './env';

// Stripe-specific environment variable validation
function validateStripeEnvironment() {
  const requiredVars = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing Stripe environment variables: ${missingVars.join(', ')}. ` +
      'Please set these in your Vercel dashboard under Settings > Environment Variables.'
    );
  }
}

// Initialize Stripe with proper error handling
function createStripeInstance(): Stripe {
  try {
    validateStripeEnvironment();
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set or empty');
    }
    // Use account default API version unless explicitly overridden in dashboard.
    return new Stripe(secretKey);
  } catch (error) {
    console.error('Stripe initialization failed:', error);
    throw error;
  }
}

// Export validated Stripe instance
export const stripe = createStripeInstance();

// Export webhook secret with validation
export function getWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. ' +
      'Please set this in your Vercel dashboard under Settings > Environment Variables.'
    );
  }
  return webhookSecret;
}

// Export validation function for use in API routes
export { validateStripeEnvironment };
