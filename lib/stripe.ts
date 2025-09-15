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
    // Use account default API version unless explicitly overridden in dashboard.
    return new Stripe(process.env.STRIPE_SECRET_KEY!);
  } catch (error) {
    console.error('Stripe initialization failed:', error);
    throw error;
  }
}

// Export validated Stripe instance
export const stripe = createStripeInstance();

// Export webhook secret with validation
export function getWebhookSecret(): string {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. ' +
      'Please set this in your Vercel dashboard under Settings > Environment Variables.'
    );
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
}

// Export validation function for use in API routes
export { validateStripeEnvironment };
