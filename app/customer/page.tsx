'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useUserData, firebaseOperations } from '../../hooks/useFirebaseData';
import '../styles/booking-system.css';

export default function CustomerDashboard() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Real-time user data
  const { userBookings, userDrivers, loading: userDataLoading } = useUserData(user?.uid || '', userRole || '');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'on_way': return '#8b5cf6';
      case 'arrived': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

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

  const handleCancelBooking = async (bookingId: string) => {
    if (confirm('Är du säker på att du vill avbryta bokningen?')) {
      try {
        await firebaseOperations.update('bookings', bookingId, { status: 'cancelled' });
      } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('Kunde inte avbryta bokningen. Försök igen.');
      }
    }
  };

  if (authLoading || userDataLoading) {
    return (
      <div className="customer-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Laddar kund-dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="customer-dashboard">
      <div className="dashboard-header">
        <h1>Mina bokningar</h1>
        <div className="real-time-indicator">
          <span className="live-dot"></span>
          <span>Live data</span>
        </div>
      </div>

      <div className="booking-stats">
        <div className="stat-card">
          <div className="stat-number">{userBookings.length}</div>
          <div className="stat-label">Totalt antal bokningar</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {userBookings.filter(b => b.status === 'completed').length}
          </div>
          <div className="stat-label">Slutförda resor</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {userBookings.filter(b => b.status === 'waiting' || b.status === 'accepted' || b.status === 'on_way').length}
          </div>
          <div className="stat-label">Aktiva bokningar</div>
        </div>
      </div>

      <div className="bookings-section">
        <h2>Alla bokningar</h2>
        {userBookings.length === 0 ? (
          <div className="no-bookings">
            <p>Du har inga bokningar än.</p>
            <button 
              onClick={() => router.push('/booking')}
              className="book-now-btn"
            >
              Boka en resa
            </button>
          </div>
        ) : (
          <div className="bookings-grid">
            {userBookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-header">
                  <h3>Bokning #{booking.id?.slice(-8)}</h3>
                  <div 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(booking.status) }}
                  >
                    {getStatusText(booking.status)}
                  </div>
                </div>
                
                <div className="booking-details">
                  <div className="detail-row">
                    <span className="label">Från:</span>
                    <span className="value">{booking.pickup?.address}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Till:</span>
                    <span className="value">{booking.destination?.address}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Tid:</span>
                    <span className="value">
                      {new Date(booking.pickup?.time).toLocaleString('sv-SE')}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Pris:</span>
                    <span className="value">{booking.price} kr</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Betalning:</span>
                    <span className="value">
                      {booking.paymentStatus === 'paid' ? '✅ Betald' : '⏳ Väntar'}
                    </span>
                  </div>
                </div>

                {booking.driver && (
                  <div className="driver-info">
                    <h4>Din förare</h4>
                    <div className="driver-details">
                      <p><strong>Namn:</strong> {booking.driver.name}</p>
                      <p><strong>Telefon:</strong> {booking.driver.phone}</p>
                      <p><strong>Bil:</strong> {booking.driver.car}</p>
                      <p><strong>Registreringsnummer:</strong> {booking.driver.licensePlate}</p>
                    </div>
                    <div className="driver-actions">
                      <a 
                        href={`tel:${booking.driver.phone}`}
                        className="call-driver-btn"
                      >
                        📞 Ring förare
                      </a>
                    </div>
                  </div>
                )}

                <div className="booking-actions">
                  {(booking.status === 'waiting' || booking.status === 'accepted') && (
                    <button 
                      onClick={() => handleCancelBooking(booking.id)}
                      className="cancel-btn"
                    >
                      ✗ Avbryt bokning
                    </button>
                  )}
                  
                  {booking.status === 'completed' && (
                    <button 
                      onClick={() => router.push(`/tracking?bookingId=${booking.id}`)}
                      className="track-btn"
                    >
                      📍 Visa resa
                    </button>
                  )}
                  
                  <button 
                    onClick={() => router.push(`/tracking?bookingId=${booking.id}`)}
                    className="track-btn"
                  >
                    📍 Spåra resa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .customer-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          padding: 2rem;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 2rem;
        }

        .real-time-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #10b981;
          font-size: 0.875rem;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .booking-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
        }

        .bookings-section h2 {
          margin: 0 0 1.5rem 0;
          color: white;
        }

        .no-bookings {
          text-align: center;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .no-bookings p {
          margin: 0 0 1.5rem 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.125rem;
        }

        .book-now-btn {
          padding: 0.75rem 2rem;
          background: #3b82f6;
          border: none;
          border-radius: 6px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          font-size: 1rem;
        }

        .book-now-btn:hover {
          background: #2563eb;
        }

        .bookings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .booking-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .booking-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .booking-header h3 {
          margin: 0;
          color: white;
          font-size: 1.125rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .booking-details {
          margin-bottom: 1.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .detail-row .label {
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        .detail-row .value {
          color: white;
          text-align: right;
        }

        .driver-info {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .driver-info h4 {
          margin: 0 0 0.75rem 0;
          color: white;
          font-size: 1rem;
        }

        .driver-details p {
          margin: 0.25rem 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
        }

        .driver-actions {
          margin-top: 0.75rem;
        }

        .call-driver-btn {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #10b981;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .call-driver-btn:hover {
          background: #059669;
        }

        .booking-actions {
          display: flex;
          gap: 0.75rem;
        }

        .cancel-btn, .track-btn {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: #ef4444;
          color: white;
        }

        .cancel-btn:hover {
          background: #dc2626;
        }

        .track-btn {
          background: #3b82f6;
          color: white;
        }

        .track-btn:hover {
          background: #2563eb;
        }

        @media (max-width: 768px) {
          .customer-dashboard {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .booking-stats {
            grid-template-columns: 1fr;
          }

          .bookings-grid {
            grid-template-columns: 1fr;
          }

          .booking-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
