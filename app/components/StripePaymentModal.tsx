'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useAuth } from '../contexts/AuthContext';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  bookingId: string;
  onPaymentSuccess: (paymentId: string) => void;
}

function PaymentForm({ 
  amount, 
  bookingId, 
  onPaymentSuccess, 
  onClose 
}: Omit<StripePaymentModalProps, 'isOpen'>) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          bookingId,
          customerEmail: user?.email,
        }),
      });

      const { clientSecret, error: apiError } = await response.json();

      if (apiError) {
        throw new Error(apiError);
      }

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              email: user?.email,
            },
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on our backend
        const confirmResponse = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            bookingId,
          }),
        });

        const confirmResult = await confirmResponse.json();

        if (confirmResult.success) {
          onPaymentSuccess(paymentIntent.id);
          onClose();
        } else {
          throw new Error('Payment confirmation failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Betalningen misslyckades');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="payment-amount">
        <h3>Betala {amount} kr</h3>
        <p>Bokning #{bookingId.slice(-8)}</p>
      </div>

      <div className="card-element-container">
        <label>Kortuppgifter</label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="payment-actions">
        <button 
          type="button"
          onClick={onClose}
          className="cancel-button"
          disabled={isProcessing}
        >
          Avbryt
        </button>
        <button 
          type="submit"
          className="pay-button"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? 'Bearbetar...' : `Betala ${amount} kr`}
        </button>
      </div>

      <style jsx>{`
        .stripe-payment-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .payment-amount {
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .payment-amount h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          color: white;
        }

        .payment-amount p {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
        }

        .card-element-container {
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .card-element-container label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #333;
        }

        .error-message {
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: #ef4444;
          font-size: 0.875rem;
        }

        .payment-actions {
          display: flex;
          gap: 1rem;
        }

        .cancel-button, .pay-button {
          flex: 1;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .cancel-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }

        .pay-button {
          background: #3b82f6;
          color: white;
        }

        .pay-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .pay-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .payment-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </form>
  );
}

export default function StripePaymentModal({ 
  isOpen, 
  onClose, 
  amount, 
  bookingId, 
  onPaymentSuccess 
}: StripePaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="payment-header">
          <h2>Betalning</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <Elements stripe={stripePromise}>
          <PaymentForm
            amount={amount}
            bookingId={bookingId}
            onPaymentSuccess={onPaymentSuccess}
            onClose={onClose}
          />
        </Elements>
      </div>

      <style jsx>{`
        .payment-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .payment-modal {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 2rem;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .payment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .payment-header h2 {
          margin: 0;
          color: white;
          font-size: 1.5rem;
        }

        .close-button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
        }

        .close-button:hover {
          color: white;
        }
      `}</style>
    </div>
  );
}
