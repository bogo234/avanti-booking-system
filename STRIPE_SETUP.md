# Stripe Setup Instructions

## 1. Install Stripe Dependencies
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

## 2. Get Stripe API Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create account or login
3. Go to Developers > API Keys
4. Copy your Publishable key and Secret key

## 3. Add to Environment Variables
Add these to your `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

## 4. Test the Integration
1. Use test card numbers from Stripe documentation
2. Test successful payments
3. Test failed payments
4. Verify webhook events

## 5. Production Setup
1. Switch to live keys in production
2. Set up webhook endpoints
3. Configure proper error handling
4. Test with real payment methods

## Test Card Numbers
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Insufficient funds: 4000 0000 0000 9995
