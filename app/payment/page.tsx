'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import type { PaymentRequest as StripePaymentRequest } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useAuth } from '../contexts/AuthContext';
import { firebaseOperations } from '../../hooks/useFirebaseData';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BookingDetails {
  id: string;
  pickupLocation: string;
  destination: string;
  pickupTime: string;
  price: number;
  service: string;
  customerEmail: string;
  customerId: string;
  licensePlate: string;
  paymentStatus: string;
  driver: any;
}

function PaymentForm({ bookingDetails, selectedMethod }: { bookingDetails: BookingDetails; selectedMethod?: 'applepay' | 'card' }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentRequest, setPaymentRequest] = useState<StripePaymentRequest | null>(null);
  const [isPrButtonReady, setIsPrButtonReady] = useState(false);

  // Initialize Payment Request (Apple Pay / Google Pay)
  useEffect(() => {
    async function setupPaymentRequest() {
      if (!stripe || !bookingDetails) return;

      try {
        const pr = stripe.paymentRequest({
          country: 'SE',
          currency: 'sek',
          total: {
            label: 'Avanti Taxi',
            amount: Math.round(bookingDetails.price * 100),
          },
          requestPayerName: true,
          requestPayerEmail: true,
        });

        const result = await pr.canMakePayment();
        // Strictly require native Apple Pay support; do not enable for other wallets
        if (result && (result as any).applePay === true) {
          setPaymentRequest(pr);
          setIsPrButtonReady(true);

          pr.on('paymentmethod', async (ev) => {
            setIsProcessing(true);
            setError('');
            try {
              const idToken = await (await import('../../lib/firebase')).auth.currentUser?.getIdToken(true).catch(() => null);

              // Create PaymentIntent on our backend
              const createRes = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                },
                body: JSON.stringify({
                  amount: bookingDetails.price,
                  bookingId: bookingDetails.id,
                  customerEmail: user?.email,
                }),
              });

              const createData = await createRes.json();
              if (!createRes.ok) {
                throw new Error(createData.error || 'Kunde inte skapa betalning');
              }

              const { clientSecret } = createData as { clientSecret: string };

              // Confirm the payment with the PaymentRequest payment method
              const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                clientSecret,
                {
                  payment_method: ev.paymentMethod.id,
                },
                {
                  handleActions: false,
                }
              );

              if (confirmError) {
                ev.complete('fail');
                throw new Error(confirmError.message);
              }

              ev.complete('success');

              // If additional actions are required (e.g., 3DS), handle them
              if (paymentIntent && paymentIntent.status === 'requires_action') {
                const { error: actionError, paymentIntent: actionPi } = await stripe.confirmCardPayment(clientSecret);
                if (actionError) {
                  throw new Error(actionError.message);
                }
                if (!actionPi || actionPi.status !== 'succeeded') {
                  throw new Error('Betalningen kunde inte slutföras');
                }
              }

              const finalPiId = (paymentIntent?.id) || '';

              // Confirm on backend and update booking
              const confirmIdToken = await (await import('../../lib/firebase')).auth.currentUser?.getIdToken(true).catch(() => null);
              const confirmResponse = await fetch('/api/confirm-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(confirmIdToken ? { Authorization: `Bearer ${confirmIdToken}` } : {}),
                },
                body: JSON.stringify({
                  paymentIntentId: finalPiId,
                  bookingId: bookingDetails.id,
                }),
              });

              const confirmResult = await confirmResponse.json();
              if (!confirmResponse.ok || !confirmResult.success) {
                throw new Error(confirmResult.error || 'Payment confirmation failed');
              }

              router.push(`/payment/success?bookingId=${bookingDetails.id}&paymentId=${finalPiId}`);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Betalningen misslyckades');
            } finally {
              setIsProcessing(false);
            }
          });
        } else {
          setIsPrButtonReady(false);
        }
      } catch (e) {
        console.error('Payment Request setup failed', e);
        setIsPrButtonReady(false);
      }
    }

    setupPaymentRequest();
  }, [stripe, bookingDetails]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Create payment intent
      const idToken = await (await import('../../lib/firebase')).auth.currentUser?.getIdToken(true).catch(() => null);
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          amount: bookingDetails.price,
          bookingId: bookingDetails.id,
          customerEmail: user?.email,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment intent');
      }
      const { clientSecret, error: apiError } = result;

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
              name: user?.displayName,
            },
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on our backend
        const confirmIdToken = await (await import('../../lib/firebase')).auth.currentUser?.getIdToken(true).catch(() => null);
        const confirmResponse = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(confirmIdToken ? { Authorization: `Bearer ${confirmIdToken}` } : {}),
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            bookingId: bookingDetails.id,
          }),
        });

        const confirmResult = await confirmResponse.json();

        if (confirmResult.success) {
          // Redirect to success page
          router.push(`/payment/success?bookingId=${bookingDetails.id}&paymentId=${paymentIntent.id}`);
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

  const applePayReady = Boolean(isPrButtonReady && paymentRequest);
  const showApplePay = applePayReady && (selectedMethod ? selectedMethod === 'applepay' : true);
  const showCardForm = selectedMethod ? (selectedMethod === 'card' || (selectedMethod === 'applepay' && !applePayReady)) : true;

  return (
    <div className="payment-container">
      <div className="payment-card">
        {/* Booking Summary */}
        <div className="booking-summary">
          <h2>Bokningssammanfattning</h2>
          <div className="summary-details">
            <div className="detail-row">
              <span className="label">Från:</span>
              <span className="value">{bookingDetails.pickupLocation}</span>
            </div>
            <div className="detail-row">
              <span className="label">Till:</span>
              <span className="value">{bookingDetails.destination}</span>
            </div>
            <div className="detail-row">
              <span className="label">Tid:</span>
              <span className="value">{new Date(bookingDetails.pickupTime).toLocaleString('sv-SE')}</span>
            </div>
            <div className="detail-row">
              <span className="label">Service:</span>
              <span className="value">{bookingDetails.service}</span>
            </div>
            {bookingDetails.licensePlate && (
              <div className="detail-row">
                <span className="label">Registreringsnummer:</span>
                <span className="value">{bookingDetails.licensePlate}</span>
              </div>
            )}
            {bookingDetails.driver && (
              <div className="detail-row">
                <span className="label">Förare:</span>
                <span className="value">{bookingDetails.driver.name}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="label">Betalningsstatus:</span>
              <span className="value" style={{ 
                color: bookingDetails.paymentStatus === 'paid' ? '#10b981' : 
                       bookingDetails.paymentStatus === 'pending' ? '#f59e0b' : '#ef4444' 
              }}>
                {bookingDetails.paymentStatus === 'paid' ? 'Betald' : 
                 bookingDetails.paymentStatus === 'pending' ? 'Väntar på betalning' : 
                 bookingDetails.paymentStatus}
              </span>
            </div>
            <div className="detail-row total">
              <span className="label">Totalt:</span>
              <span className="value">{bookingDetails.price} kr</span>
            </div>
          </div>
        </div>

        {/* Fast Payments (Apple Pay / Google Pay) */}
        {showApplePay && (
          <div className="payment-form-section" style={{ paddingTop: 0 }}>
            <h2>Snabbbetalning</h2>
            <div style={{ marginBottom: '1rem' }}>
              <PaymentRequestButtonElement
                options={{
                  paymentRequest,
                  style: {
                    paymentRequestButton: {
                      type: 'default',
                      theme: 'dark',
                      height: '48px',
                    },
                  },
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 12 }}>
              <span>eller betala med kort</span>
              <span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
          </div>
        )}

        {/* Payment Form */}
        {showCardForm && (
        <div className="payment-form-section">
          <h2>Betalning</h2>
          <form onSubmit={handleSubmit}>
            <div className="card-element-container">
              <label htmlFor="card-element">Kortuppgifter</label>
              <CardElement
                id="card-element"
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#1a1a1a',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      '::placeholder': {
                        color: '#9ca3af',
                      },
                    },
                    invalid: {
                      color: '#ef4444',
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
                onClick={() => router.back()}
                className="cancel-button"
                disabled={isProcessing}
              >
                Tillbaka
              </button>
              <button 
                type="submit"
                className="pay-button"
                disabled={!stripe || isProcessing}
              >
                {isProcessing ? (
                  <div className="processing-spinner">
                    <div className="spinner"></div>
                    Bearbetar...
                  </div>
                ) : (
                  `Betala ${bookingDetails.price} kr`
                )}
              </button>
            </div>
          </form>
        </div>
        )}
      </div>

      <style jsx>{`
        .payment-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 2rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .payment-card {
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
          max-width: 600px;
          width: 100%;
          overflow: hidden;
        }

        .booking-summary {
          background: #1a1a1a;
          color: white;
          padding: 2rem;
        }

        .booking-summary h2 {
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: white;
        }

        .summary-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row.total {
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 2px solid rgba(255, 255, 255, 0.2);
          border-bottom: none;
          font-weight: 600;
          font-size: 1.125rem;
        }

        .label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .value {
          color: white;
          font-weight: 500;
          text-align: right;
        }

        .total .label,
        .total .value {
          color: white;
          font-size: 1.125rem;
        }

        .payment-form-section {
          padding: 2rem;
        }

        .payment-form-section h2 {
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1a1a1a;
        }

        .card-element-container {
          margin-bottom: 1.5rem;
        }

        .card-element-container label {
          display: block;
          margin-bottom: 0.75rem;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-element-container :global(.StripeElement) {
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          transition: border-color 0.2s ease;
        }

        .card-element-container :global(.StripeElement:focus) {
          border-color: #3b82f6;
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .error-message {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          color: #dc2626;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
        }

        .payment-actions {
          display: flex;
          gap: 1rem;
        }

        .cancel-button,
        .pay-button {
          flex: 1;
          padding: 1rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cancel-button {
          background: #f8fafc;
          color: #64748b;
          border: 2px solid #e2e8f0;
        }

        .cancel-button:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .pay-button {
          background: #1a1a1a;
          color: white;
        }

        .pay-button:hover:not(:disabled) {
          background: #333333;
          transform: translateY(-1px);
        }

        .pay-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .processing-spinner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .payment-container {
            padding: 1rem;
          }

          .payment-card {
            border-radius: 16px;
          }

          .booking-summary,
          .payment-form-section {
            padding: 1.5rem;
          }

          .payment-actions {
            flex-direction: column;
          }

          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .value {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}

function PaymentPageInner() {
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<'applepay' | 'card'>('applepay');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }

    const bookingId = searchParams.get('bookingId');
    if (!bookingId) {
      router.push('/booking');
      return;
    }

    // Fetch booking details with retry logic
    const fetchBookingDetails = async (attempt = 0) => {
      try {
        const booking = await firebaseOperations.getById('bookings', bookingId);
        if (!booking) {
          throw new Error('Booking not found');
        }

        // Extract comprehensive booking data from Firebase
        const pickupAddress = (booking as any)?.pickup?.address ?? '';
        const pickupTime = (booking as any)?.pickup?.time ?? new Date().toISOString();
        const destinationAddress = (booking as any)?.destination?.address ?? '';
        const price = typeof (booking as any)?.price === 'number' ? (booking as any).price : 0;
        const service = (booking as any)?.service || 'Avanti Biltransport';
        const customerEmail = (booking as any)?.customerEmail ?? '';
        const customerId = (booking as any)?.customerId ?? '';
        const licensePlate = (booking as any)?.licensePlate ?? '';
        const paymentStatus = (booking as any)?.paymentStatus ?? 'pending';
        const driver = (booking as any)?.driver ?? null;

        setBookingDetails({
          id: bookingId,
          pickupLocation: pickupAddress,
          destination: destinationAddress,
          pickupTime: pickupTime,
          price: price,
          service,
          customerEmail,
          customerId,
          licensePlate,
          paymentStatus,
          driver
        });
        setError(''); // Clear any previous errors
        setLoading(false);
      } catch (err) {
        console.error('Error fetching booking:', err);
        
        if (attempt < 2) {
          // Retry up to 2 times
          setRetryCount(attempt + 1);
          setTimeout(() => fetchBookingDetails(attempt + 1), 1000 * (attempt + 1));
          return;
        }
        
        setError(
          err instanceof Error 
            ? err.message 
            : 'Kunde inte ladda bokningsdetaljer. Kontrollera din internetanslutning.'
        );
      } finally {
        if (attempt >= 2) {
          setLoading(false);
        }
      }
    };

    if (!authLoading && user) {
      fetchBookingDetails();
    }
  }, [searchParams, router, user, authLoading]);

  async function startHostedCheckout() {
    try {
      setIsRedirecting(true);
      setCheckoutError('');
      
      if (!bookingDetails?.id) {
        throw new Error('Boknings-ID saknas');
      }
      
      const idToken = await (await import('../../lib/firebase')).auth.currentUser?.getIdToken(true).catch(() => null);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ bookingId: bookingDetails.id }),
      });
      
      const data = await res.json();
      if (!res.ok || !data?.url) {
        if (data?.details) {
          throw new Error(`${data.error}: ${data.details}`);
        }
        throw new Error(data?.error || 'Kunde inte skapa Stripe-betalning.');
      }
      
      // Immediate redirect to Stripe
      window.location.replace(data.url as string);
    } catch (e) {
      console.error('Stripe checkout error:', e);
      setCheckoutError(e instanceof Error ? e.message : 'Ett fel uppstod. Försök igen.');
      setIsRedirecting(false);
    }
  }

  useEffect(() => {
    if (bookingDetails && !isRedirecting && !checkoutError) {
      startHostedCheckout();
    }
  }, [bookingDetails, isRedirecting, checkoutError]);

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Omdirigerar till Stripe...</p>
        {retryCount > 0 && (
          <p className="retry-info">Försöker igen... ({retryCount}/2)</p>
        )}
        
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e2e8f0;
            border-top: 4px solid #1a1a1a;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          p {
            color: #64748b;
            font-size: 1rem;
            margin: 0.25rem 0;
          }

          .retry-info {
            color: #f59e0b;
            font-size: 0.875rem;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h1>Ett fel uppstod</h1>
          <p>{error}</p>
          <button onClick={() => router.push('/booking')} className="back-button">
            Tillbaka till bokning
          </button>
        </div>

        <style jsx>{`
          .error-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 1rem;
          }

          .error-card {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          }

          .back-button {
            background: #1a1a1a;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 1rem;
          }
        `}</style>
      </div>
    );
  }

  if (!bookingDetails) {
    return null;
  }

  // Show error state if checkout failed, otherwise redirect immediately
  if (checkoutError) {
    return (
      <div className="error-container">
        <div className="error-card">
          <h1>Betalningsfel</h1>
          <p>{checkoutError}</p>
          <div className="actions">
            <button className="primary" onClick={startHostedCheckout} disabled={isRedirecting}>
              {isRedirecting ? 'Försöker igen...' : 'Försök igen'}
            </button>
            <button className="secondary" onClick={() => router.push(`/booking`)} disabled={isRedirecting}>
              Tillbaka till bokning
            </button>
          </div>
        </div>

        <style jsx>{`
          .error-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 1.5rem;
          }
          .error-card {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            max-width: 520px;
            width: 100%;
            text-align: center;
          }
          h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; color: #111827; }
          p { margin: 0 0 1.5rem 0; color: #6b7280; }
          .actions { display: flex; gap: 0.75rem; }
          .primary {
            flex: 1; background: #1a1a1a; color: #fff; border: none; border-radius: 10px; padding: 0.75rem 1rem; font-weight: 600; cursor: pointer;
          }
          .primary:disabled { opacity: 0.6; cursor: not-allowed; }
          .secondary {
            flex: 1; background: #f8fafc; color: #64748b; border: 2px solid #e2e8f0; border-radius: 10px; padding: 0.75rem 1rem; font-weight: 600; cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  // If we reach here, we're redirecting - show minimal loading state
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Omdirigerar till Stripe...</p>
      
      <style jsx>{`
        .loading-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #1a1a1a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        p {
          color: #64748b;
          font-size: 1rem;
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div />}> 
      <PaymentPageInner />
    </Suspense>
  );
}
