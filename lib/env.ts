// Environment variable validation for the entire application
function validateEnvironmentVariables() {
  const requiredVars = {
    // Firebase
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    
    // Google Maps
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    
    // Stripe
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    
    // OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    const errorMessage = `
Missing required environment variables: ${missingVars.join(', ')}

Please set these in your Vercel dashboard:
1. Go to your project in Vercel Dashboard
2. Click on Settings
3. Go to Environment Variables
4. Add the following variables:

${missingVars.map(key => `- ${key}: [Your ${key} value]`).join('\n')}

For development, you can also create a .env.local file in your project root.
    `.trim();
    
    throw new Error(errorMessage);
  }
}

// Validate on import (only in production)
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnvironmentVariables();
  } catch (error) {
    console.error('Environment validation failed:', error);
    // Don't throw in production to avoid breaking the build
    // The error will be caught when the API routes are called
  }
}

export { validateEnvironmentVariables };
