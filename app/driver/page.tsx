'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseData, useUserData, firebaseOperations } from '../../hooks/useFirebaseData';
import { useDriverLocation } from '../../hooks/useDriverLocation';
import '../styles/booking-system.css';

export default function DriverDashboard() {
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Real-time Firebase data
  const { data: waitingBookings, loading: bookingsLoading } = useFirebaseData('bookings', {
    where: [{ field: 'status', operator: '==', value: 'waiting' }],
    orderBy: { field: 'createdAt', direction: 'desc' }
  });
  
  const { data: allDrivers, loading: driversLoading } = useFirebaseData('drivers');
  
  const { userBookings, userDrivers, loading: userDataLoading } = useUserData(user?.uid || '', userRole || '');
  
  // Location tracking for driver
  const { 
    location, 
    loading: locationLoading, 
    error: locationError, 
    getCurrentLocation, 
    startLocationTracking 
  } = useDriverLocation({ 
    driverId: selectedDriver, 
    enabled: user?.uid === selectedDriver 
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (allDrivers.length > 0 && !selectedDriver) {
      setSelectedDriver(allDrivers[0].id || '');
    }
  }, [allDrivers, selectedDriver]);

  const handleAcceptBooking = async (bookingId: string) => {
    if (!selectedDriver) {
      alert('Välj en förare först');
      return;
    }

    const driver = allDrivers.find(d => d.id === selectedDriver);
    if (!driver) return;

    try {
      await firebaseOperations.update('bookings', bookingId, {
        status: 'accepted',
        driver: {
          id: driver.id || '',
          name: driver.name,
          phone: driver.phone,
          car: driver.car,
          licensePlate: driver.licensePlate
        }
      });

      // Update driver status to busy
      await firebaseOperations.update('drivers', selectedDriver, { status: 'busy' });
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      await firebaseOperations.update('bookings', bookingId, { status: 'cancelled' });
    } catch (error) {
      console.error('Error rejecting booking:', error);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await firebaseOperations.update('bookings', bookingId, { status });
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

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

  if (authLoading || bookingsLoading || driversLoading) {
    return (
      <div className="driver-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Laddar förare-dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="driver-dashboard">
      <div className="dashboard-header">
        <h1>Förare Dashboard</h1>
        <div className="real-time-indicator">
          <span className="live-dot"></span>
          <span>Live data</span>
        </div>
      </div>

      <div className="driver-selection">
        <h2>Välj förare</h2>
        <select 
          value={selectedDriver} 
          onChange={(e) => setSelectedDriver(e.target.value)}
          className="driver-select"
        >
          {allDrivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name} - {driver.car} ({driver.status})
            </option>
          ))}
        </select>
      </div>

      {selectedDriver && (
        <div className="location-section">
          <h3>Position</h3>
          <div className="location-controls">
            <button onClick={getCurrentLocation} className="location-btn">
              📍 Hämta position
            </button>
            <button onClick={startLocationTracking} className="location-btn">
              🎯 Starta spårning
            </button>
          </div>
          {location && (
            <div className="location-info">
              <p>Lat: {location.lat.toFixed(6)}</p>
              <p>Lng: {location.lng.toFixed(6)}</p>
            </div>
          )}
          {locationError && (
            <div className="location-error">
              <p>❌ {locationError}</p>
            </div>
          )}
        </div>
      )}

      <div className="bookings-section">
        <h2>Väntande bokningar ({waitingBookings.length})</h2>
        <div className="bookings-grid">
          {waitingBookings.map((booking) => (
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
                  <span className="value">{booking.pickup?.time}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Pris:</span>
                  <span className="value">{booking.price} kr</span>
                </div>
                <div className="detail-row">
                  <span className="label">Kund:</span>
                  <span className="value">{booking.customerEmail}</span>
                </div>
              </div>

              <div className="booking-actions">
                <button 
                  onClick={() => handleAcceptBooking(booking.id)}
                  className="accept-btn"
                >
                  ✓ Acceptera
                </button>
                <button 
                  onClick={() => handleRejectBooking(booking.id)}
                  className="reject-btn"
                >
                  ✗ Avvisa
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="my-bookings-section">
        <h2>Mina bokningar ({userBookings.length})</h2>
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
                  <span className="label">Status:</span>
                  <span className="value">{getStatusText(booking.status)}</span>
                </div>
              </div>

              {booking.status === 'accepted' && (
                <div className="booking-actions">
                  <button 
                    onClick={() => handleUpdateBookingStatus(booking.id, 'on_way')}
                    className="status-btn"
                  >
                    🚗 På väg
                  </button>
                  <button 
                    onClick={() => handleUpdateBookingStatus(booking.id, 'arrived')}
                    className="status-btn"
                  >
                    🏁 Anlänt
                  </button>
                  <button 
                    onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                    className="status-btn"
                  >
                    ✅ Slutförd
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .driver-dashboard {
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

        .driver-selection {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .driver-selection h2 {
          margin: 0 0 1rem 0;
          color: white;
        }

        .driver-select {
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          color: white;
          font-size: 1rem;
        }

        .location-section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .location-section h3 {
          margin: 0 0 1rem 0;
          color: white;
        }

        .location-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .location-btn {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .location-btn:hover {
          background: #2563eb;
        }

        .location-info {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          padding: 1rem;
        }

        .location-info p {
          margin: 0.25rem 0;
          font-family: monospace;
          font-size: 0.875rem;
        }

        .location-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          padding: 1rem;
        }

        .location-error p {
          margin: 0;
          color: #ef4444;
        }

        .bookings-section, .my-bookings-section {
          margin-bottom: 2rem;
        }

        .bookings-section h2, .my-bookings-section h2 {
          margin: 0 0 1.5rem 0;
          color: white;
        }

        .bookings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
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

        .booking-actions {
          display: flex;
          gap: 0.75rem;
        }

        .accept-btn, .reject-btn, .status-btn {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .accept-btn {
          background: #10b981;
          color: white;
        }

        .accept-btn:hover {
          background: #059669;
        }

        .reject-btn {
          background: #ef4444;
          color: white;
        }

        .reject-btn:hover {
          background: #dc2626;
        }

        .status-btn {
          background: #3b82f6;
          color: white;
        }

        .status-btn:hover {
          background: #2563eb;
        }

        @media (max-width: 768px) {
          .driver-dashboard {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .bookings-grid {
            grid-template-columns: 1fr;
          }

          .location-controls {
            flex-direction: column;
          }

          .booking-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
