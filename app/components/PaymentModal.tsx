'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  bookingId: string;
  onPaymentSuccess: (paymentId: string) => void;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  amount, 
  bookingId, 
  onPaymentSuccess 
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'swish' | 'klarna'>('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock payment ID
      const paymentId = 'PAY_' + Date.now().toString().slice(-8);
      
      // Simulate success
      onPaymentSuccess(paymentId);
      onClose();
    } catch (error) {
      setError('Betalningen misslyckades. Försök igen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

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

        <div className="payment-content">
          <div className="payment-summary">
            <h3>Bokning #{bookingId.slice(-8)}</h3>
            <div className="amount">
              <span>Totalt att betala:</span>
              <span className="total-amount">{amount} kr</span>
            </div>
          </div>

          <div className="payment-methods">
            <h3>Välj betalningsmetod</h3>
            <div className="method-options">
              <label className={`method-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <span>💳 Kort</span>
              </label>
              <label className={`method-option ${paymentMethod === 'swish' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="swish"
                  checked={paymentMethod === 'swish'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <span>📱 Swish</span>
              </label>
              <label className={`method-option ${paymentMethod === 'klarna' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="klarna"
                  checked={paymentMethod === 'klarna'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <span>🛒 Klarna</span>
              </label>
            </div>
          </div>

          {paymentMethod === 'card' && (
            <div className="card-form">
              <div className="form-group">
                <label>Kortnummer</label>
                <input
                  type="text"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails(prev => ({ 
                    ...prev, 
                    number: formatCardNumber(e.target.value) 
                  }))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Giltigt till</label>
                  <input
                    type="text"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails(prev => ({ 
                      ...prev, 
                      expiry: formatExpiry(e.target.value) 
                    }))}
                    placeholder="MM/ÅÅ"
                    maxLength={5}
                  />
                </div>
                <div className="form-group">
                  <label>CVV</label>
                  <input
                    type="text"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails(prev => ({ 
                      ...prev, 
                      cvv: e.target.value.replace(/\D/g, '') 
                    }))}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Kortinnehavare</label>
                <input
                  type="text"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  placeholder="Förnamn Efternamn"
                />
              </div>
            </div>
          )}

          {paymentMethod === 'swish' && (
            <div className="swish-form">
              <div className="form-group">
                <label>Telefonnummer</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="070 123 45 67"
                />
              </div>
              <div className="swish-info">
                <p>Du kommer att få en notifikation i Swish-appen för att bekräfta betalningen.</p>
              </div>
            </div>
          )}

          {paymentMethod === 'klarna' && (
            <div className="klarna-form">
              <div className="klarna-info">
                <p>Du kommer att omdirigeras till Klarna för att slutföra betalningen.</p>
                <p>Välj mellan att betala nu eller senare.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="payment-actions">
            <button 
              onClick={onClose}
              className="cancel-button"
              disabled={isProcessing}
            >
              Avbryt
            </button>
            <button 
              onClick={handlePayment}
              className="pay-button"
              disabled={isProcessing}
            >
              {isProcessing ? 'Bearbetar...' : `Betala ${amount} kr`}
            </button>
          </div>
        </div>
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
          padding: 2rem;
        }

        .payment-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .payment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .payment-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 1.5rem;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: #374151;
        }

        .payment-content {
          padding: 1.5rem;
        }

        .payment-summary {
          background: #f9fafb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .payment-summary h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 1.1rem;
        }

        .amount {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .total-amount {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1f2937;
        }

        .payment-methods h3 {
          margin: 0 0 1rem 0;
          color: #374151;
          font-size: 1.1rem;
        }

        .method-options {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .method-option {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .method-option:hover {
          border-color: #d1d5db;
        }

        .method-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .method-option input {
          margin: 0;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #374151;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .swish-info, .klarna-info {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 1rem;
          margin-top: 1rem;
        }

        .swish-info p, .klarna-info p {
          margin: 0 0 0.5rem 0;
          color: #0369a1;
          font-size: 0.9rem;
        }

        .swish-info p:last-child, .klarna-info p:last-child {
          margin-bottom: 0;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .payment-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .cancel-button, .pay-button {
          flex: 1;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-button {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #374151;
        }

        .cancel-button:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .pay-button {
          background: #3b82f6;
          border: 1px solid #3b82f6;
          color: white;
        }

        .pay-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .cancel-button:disabled, .pay-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .payment-modal-overlay {
            padding: 1rem;
          }

          .method-options {
            flex-direction: column;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .payment-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
