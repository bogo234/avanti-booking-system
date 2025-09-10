'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { subscribeToBooking } from '../../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import LiveTrackingMap from '../components/LiveTrackingMap';
import '../styles/booking-system.css';

function TrackingPageContent() {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const { user } = useAuth();

  useEffect(() => {
    if (!bookingId) {
      setError('Inget boknings-ID hittades');
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToBooking(bookingId, (bookingData) => {
      if (bookingData) {
        setBooking(bookingData);
        setError('');
      } else {
        setError('Bokning hittades inte');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [bookingId]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Väntar på förare';
      case 'accepted': return 'Förare tilldelad';
      case 'on_way': return 'På väg till dig';
      case 'arrived': return 'Anlänt';
      case 'completed': return 'Slutförd';
      case 'cancelled': return 'Avbruten';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'on_way': return '#8b5cf6';
      case 'arrived': return '#10b981';
      case 'completed': return '#059669';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return '⏳';
      case 'accepted': return '✅';
      case 'on_way': return '🚗';
      case 'arrived': return '📍';
      case 'completed': return '🎉';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="tracking-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Laddar bokningsstatus...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-page">
        <div className="error-container">
          <h1>Fel</h1>
          <p>{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="modern-button primary"
          >
            Tillbaka till startsidan
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="tracking-page">
        <div className="error-container">
          <h1>Bokning hittades inte</h1>
          <p>Kontrollera att boknings-ID:t är korrekt.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="modern-button primary"
          >
            Tillbaka till startsidan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-page">
      <div className="tracking-container">
        <div className="tracking-header">
          <button 
            onClick={() => window.location.href = '/'}
            className="back-button"
          >
            ← Tillbaka
          </button>
          <h1>Live Spårning</h1>
          <p>Bokning #{booking.id?.slice(-8)}</p>
        </div>

        <div className="status-card">
          <div className="status-header">
            <div className="status-icon">
              {getStatusIcon(booking.status)}
            </div>
            <div className="status-info">
              <h2>{getStatusText(booking.status)}</h2>
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(booking.status) }}
              ></div>
            </div>
          </div>
        </div>

        <div className="booking-details-card">
          <h3>Bokningsdetaljer</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Från:</span>
              <span className="value">{booking.pickup?.address}</span>
            </div>
            <div className="detail-item">
              <span className="label">Till:</span>
              <span className="value">{booking.destination?.address}</span>
            </div>
            <div className="detail-item">
              <span className="label">Tid:</span>
              <span className="value">
                {booking.pickup?.time ? 
                  new Date(booking.pickup.time).toLocaleString('sv-SE') : 
                  'Ej angiven'
                }
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Pris:</span>
              <span className="value">{booking.price} kr</span>
            </div>
            <div className="detail-item">
              <span className="label">Service:</span>
              <span className="value" style={{ textTransform: 'capitalize' }}>
                {booking.service}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Registreringsnummer:</span>
              <span className="value">{booking.licensePlate}</span>
            </div>
          </div>
        </div>

        {/* Live Tracking Map */}
        <div className="map-section">
          <h3>Live Spårning</h3>
          <LiveTrackingMap
            pickupLocation={{
              lat: booking.pickup.coordinates?.lat || 59.3293,
              lng: booking.pickup.coordinates?.lng || 18.0686,
              address: booking.pickup.address
            }}
            destinationLocation={{
              lat: booking.destination.coordinates?.lat || 59.3293,
              lng: booking.destination.coordinates?.lng || 18.0686,
              address: booking.destination.address
            }}
            driverLocation={booking.driver?.location ? {
              lat: booking.driver.location.lat,
              lng: booking.driver.location.lng
            } : undefined}
            bookingStatus={getStatusText(booking.status)}
          />
        </div>

        {booking.driver && (
          <div className="driver-card">
            <h3>Din förare</h3>
            <div className="driver-info">
              <div className="driver-details">
                <h4>{booking.driver.name}</h4>
                <p>📞 {booking.driver.phone}</p>
                <p>🚗 {booking.driver.car}</p>
                <p>🔢 {booking.driver.licensePlate}</p>
              </div>
              <div className="driver-actions">
                <a 
                  href={`tel:${booking.driver.phone}`}
                  className="modern-button primary"
                >
                  Ring förare
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="tracking-actions">
          <button 
            onClick={() => window.location.reload()}
            className="modern-button secondary"
          >
            Uppdatera
          </button>
          <button 
            onClick={() => window.location.href = '/customer'}
            className="modern-button primary"
          >
            Mina bokningar
          </button>
        </div>
      </div>

      <style jsx>{`
        .tracking-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          padding: 2rem;
        }

        .tracking-container {
          max-width: 600px;
          margin: 0 auto;
        }

        .tracking-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .back-button {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          margin-bottom: 1rem;
        }

        .tracking-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #4fc3f7, #29b6f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .status-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .status-icon {
          font-size: 3rem;
        }

        .status-info h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          margin-left: 0.5rem;
        }

        .booking-details-card, .driver-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .booking-details-card h3, .driver-card h3 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          color: #4fc3f7;
        }

        .details-grid {
          display: grid;
          gap: 1rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .label {
          opacity: 0.7;
          font-weight: 500;
        }

        .value {
          font-weight: 600;
        }

        .driver-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .driver-details h4 {
          margin: 0 0 0.5rem 0;
          color: #4fc3f7;
        }

        .driver-details p {
          margin: 0.25rem 0;
          opacity: 0.8;
        }

        .tracking-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .modern-button {
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
          text-align: center;
        }

        .modern-button.primary {
          background: linear-gradient(135deg, #4fc3f7, #29b6f6);
          color: white;
        }

        .modern-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 195, 247, 0.3);
        }

        .modern-button.secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
        }

        .modern-button.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          text-align: center;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid #4fc3f7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .tracking-page {
            padding: 1rem;
          }
          
          .driver-info {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .tracking-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(79, 195, 247, 0.3)',
            borderTop: '3px solid #4fc3f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Laddar spårning...</p>
        </div>
      </div>
    }>
      <TrackingPageContent />
    </Suspense>
  );
}