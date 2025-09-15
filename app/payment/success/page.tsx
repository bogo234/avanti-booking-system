'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookingId, setBookingId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');

  useEffect(() => {
    const booking = searchParams.get('bookingId');
    const payment = searchParams.get('paymentId');
    
    if (booking) setBookingId(booking);
    if (payment) setPaymentId(payment);
  }, [searchParams]);

  return (
    <div className="payment-success-container">
      <div className="success-card">
        <div className="success-icon">
          <CheckCircle size={80} color="#10b981" />
        </div>
        
        <h1>Betalning genomförd!</h1>
        <p className="success-message">
          Din betalning har genomförts och din bokning är bekräftad.
        </p>
        
        <div className="booking-info">
          <div className="info-item">
            <span className="label">Bokningsnummer:</span>
            <span className="value">{bookingId || 'Laddar...'}</span>
          </div>
          <div className="info-item">
            <span className="label">Betalnings-ID:</span>
            <span className="value">{paymentId?.slice(0, 20) || 'Laddar...'}...</span>
          </div>
        </div>
        
        <div className="next-steps">
          <h3>Vad händer nu?</h3>
          <ul>
            <li>Du får en bekräftelse via e-post</li>
            <li>En chaufför kommer att tilldelas din bokning</li>
            <li>Du kan följa din resa i realtid</li>
          </ul>
        </div>
        
        <div className="action-buttons">
          <button 
            onClick={() => router.push(`/tracking?bookingId=${bookingId}`)}
            className="primary-button"
          >
            Följ din bokning
          </button>
          <button 
            onClick={() => router.push('/customer')}
            className="secondary-button"
          >
            Gå till dashboard
          </button>
        </div>
      </div>

      <style jsx>{`
        .payment-success-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .success-card {
          background: white;
          border-radius: 24px;
          padding: 3rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .success-icon {
          margin-bottom: 2rem;
          display: flex;
          justify-content: center;
        }

        h1 {
          color: #1a1a1a;
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 1rem 0;
        }

        .success-message {
          color: #64748b;
          font-size: 1.125rem;
          margin-bottom: 2rem;
        }

        .booking-info {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
        }

        .info-item:not(:last-child) {
          border-bottom: 1px solid #e2e8f0;
        }

        .label {
          color: #64748b;
          font-weight: 500;
        }

        .value {
          color: #1a1a1a;
          font-weight: 600;
          font-family: monospace;
        }

        .next-steps {
          text-align: left;
          margin-bottom: 2rem;
        }

        .next-steps h3 {
          color: #1a1a1a;
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
        }

        .next-steps ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .next-steps li {
          color: #64748b;
          padding: 0.5rem 0;
          padding-left: 1.5rem;
          position: relative;
        }

        .next-steps li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: bold;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-direction: column;
        }

        .primary-button,
        .secondary-button {
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .primary-button {
          background: #1a1a1a;
          color: white;
        }

        .primary-button:hover {
          background: #333333;
          transform: translateY(-2px);
        }

        .secondary-button {
          background: white;
          color: #1a1a1a;
          border: 2px solid #e2e8f0;
        }

        .secondary-button:hover {
          background: #f8fafc;
        }

        @media (min-width: 640px) {
          .action-buttons {
            flex-direction: row;
          }
        }
      `}</style>
    </div>
  );
}