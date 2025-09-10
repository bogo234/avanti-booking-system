'use client';

import { useState, useEffect } from 'react';
import { Booking, BookingStatus, User } from '../types/booking';
import { subscribeToBooking, updateBooking } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  updateDoc 
} from 'firebase/firestore';

interface CustomerDashboardProps {
  customerId: string;
}

export default function CustomerDashboard({ customerId }: CustomerDashboardProps) {
  const [customer, setCustomer] = useState<User | null>(null);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [bookingHistory, setBookingHistory] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load customer data from Firebase
  useEffect(() => {
    const loadCustomerData = async () => {
      setIsLoading(true);
      try {
        // Load customer data from Firebase
        const customerDoc = await getDoc(doc(db, 'users', customerId));
        if (customerDoc.exists()) {
          const customerData = { id: customerDoc.id, ...customerDoc.data() } as User;
          setCustomer(customerData);
        }

        // Load active booking
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('customerId', '==', customerId),
          where('status', 'in', ['pending', 'confirmed', 'driver_assigned', 'in_progress']),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        
        const activeBookingSnapshot = await getDocs(bookingsQuery);
        if (!activeBookingSnapshot.empty) {
          const bookingData = { 
            id: activeBookingSnapshot.docs[0].id, 
            ...activeBookingSnapshot.docs[0].data() 
          } as Booking;
          setActiveBooking(bookingData);
        }

        // Load booking history
        const historyQuery = query(
          collection(db, 'bookings'),
          where('customerId', '==', customerId),
          where('status', 'in', ['completed', 'cancelled']),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const historySnapshot = await getDocs(historyQuery);
        const historyData = historySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[];
        setBookingHistory(historyData);

      } catch (error) {
        console.error('Error loading customer data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerData();
  }, [customerId]);

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    
    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setActiveBooking({ ...activeBooking, status: 'cancelled' });
      
      // Move to history
      setBookingHistory([activeBooking, ...bookingHistory]);
      setActiveBooking(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSupport = () => {
    window.open('tel:+46701234567', '_self');
  };

  const handleViewLiveTracking = () => {
    if (activeBooking) {
      window.open(`/tracking?bookingId=${activeBooking.id}`, '_blank');
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'driver_assigned': return 'primary';
      case 'driver_en_route': return 'primary';
      case 'driver_arrived': return 'success';
      case 'in_progress': return 'success';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      case 'disputed': return 'danger';
      default: return 'secondary';
    }
  };

  if (!customer) {
    return (
      <div className="customer-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Laddar kund-information...</p>
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="customer-info">
          <div className="customer-avatar">
            <span>{customer.firstName[0]}{customer.lastName[0]}</span>
          </div>
          <div className="customer-details">
            <h2>Välkommen, {customer.firstName}!</h2>
            <p className="customer-email">{customer.email}</p>
          </div>
        </div>
      </div>

      {/* Active Booking */}
      {activeBooking && (
        <div className="active-booking">
          <h3>Aktiv bokning</h3>
          <div className={`booking-card active status-${getStatusColor(activeBooking.status)}`}>
            <div className="booking-header">
              <span className="booking-id">#{activeBooking.id.slice(-6)}</span>
              <span className={`booking-status ${getStatusColor(activeBooking.status)}`}>
                {getStatusText(activeBooking.status)}
              </span>
            </div>
            
            <div className="booking-details">
              <div className="location-info">
                <div className="pickup">
                  <span className="label">Hämtas från:</span>
                  <span className="address">{activeBooking.pickupLocation.street}</span>
                </div>
                <div className="destination">
                  <span className="label">Lämnas till:</span>
                  <span className="address">{activeBooking.destination.street}</span>
                </div>
              </div>
              
              <div className="booking-meta">
                <div className="meta-item">
                  <span className="label">Tid:</span>
                  <span>{new Date(activeBooking.pickupTime).toLocaleString('sv-SE')}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Pris:</span>
                  <span>{activeBooking.price} kr</span>
                </div>
                <div className="meta-item">
                  <span className="label">Avstånd:</span>
                  <span>{activeBooking.distance} km</span>
                </div>
                <div className="meta-item">
                  <span className="label">Beräknad tid:</span>
                  <span>{activeBooking.estimatedDuration} min</span>
                </div>
              </div>
            </div>

            {/* Driver Info (if assigned) */}
            {activeBooking.driverId && (
              <div className="driver-info">
                <h4>Din chaufför</h4>
                <div className="driver-details">
                  <div className="driver-avatar">
                    <span>MA</span>
                  </div>
                  <div className="driver-text">
                    <p className="driver-name">Marcus Andersson</p>
                    <p className="driver-vehicle">Volvo XC60 - ABC123</p>
                    <p className="driver-rating">⭐ 4.9 (127 resor)</p>
                  </div>
                  <div className="driver-actions">
                    <button className="action-button secondary" onClick={handleContactSupport}>
                      📞 Ring
                    </button>
                    <button className="action-button secondary">
                      💬 Meddelande
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="booking-actions">
              {activeBooking.status === 'pending' && (
                <button
                  onClick={handleCancelBooking}
                  className="action-button danger"
                  disabled={isLoading}
                >
                  Avbryt bokning
                </button>
              )}
              
              {activeBooking.status !== 'completed' && activeBooking.status !== 'cancelled' && (
                <button
                  onClick={handleViewLiveTracking}
                  className="action-button primary"
                >
                  📍 Live Spårning
                </button>
              )}
              
              <button
                onClick={handleContactSupport}
                className="action-button secondary"
              >
                Kontakta support
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Active Booking */}
      {!activeBooking && (
        <div className="no-active-booking">
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <h3>Ingen aktiv bokning</h3>
            <p>Du har för närvarande ingen pågående resa</p>
            <button className="action-button primary">
              Boka ny resa
            </button>
          </div>
        </div>
      )}

      {/* Booking History */}
      {bookingHistory.length > 0 && (
        <div className="booking-history">
          <h3>Tidigare resor</h3>
          <div className="history-list">
            {bookingHistory.map((booking) => (
              <div key={booking.id} className={`booking-card history status-${getStatusColor(booking.status)}`}>
                <div className="booking-header">
                  <span className="booking-id">#{booking.id.slice(-6)}</span>
                  <span className="booking-date">
                    {new Date(booking.createdAt).toLocaleDateString('sv-SE')}
                  </span>
                </div>
                
                <div className="booking-details">
                  <div className="location-info">
                    <div className="pickup">
                      <span className="label">Från:</span>
                      <span className="address">{booking.pickupLocation.street}</span>
                    </div>
                    <div className="destination">
                      <span className="label">Till:</span>
                      <span className="address">{booking.destination.street}</span>
                    </div>
                  </div>
                  
                  <div className="booking-meta">
                    <span>Pris: {booking.price} kr</span>
                    <span className={`status ${getStatusColor(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </span>
                  </div>
                </div>

                <div className="booking-actions">
                  <button className="action-button secondary">
                    Se detaljer
                  </button>
                  <button className="action-button secondary">
                    Boka igen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Snabbåtgärder</h3>
        <div className="actions-grid">
          <button className="quick-action-button">
            <span className="action-icon">📞</span>
            <span>Support</span>
          </button>
          <button className="quick-action-button">
            <span className="action-icon">📋</span>
            <span>Villkor</span>
          </button>
          <button className="quick-action-button">
            <span className="action-icon">🔒</span>
            <span>Integritet</span>
          </button>
          <button className="quick-action-button">
            <span className="action-icon">❓</span>
            <span>FAQ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatusText(status: BookingStatus): string {
  switch (status) {
    case 'pending': return 'Väntar på bekräftelse';
    case 'confirmed': return 'Bekräftad';
    case 'driver_assigned': return 'Chaufför tilldelad';
    case 'driver_en_route': return 'Chaufför på väg';
    case 'driver_arrived': return 'Chaufför anlände';
    case 'in_progress': return 'Under resa';
    case 'completed': return 'Slutförd';
    case 'cancelled': return 'Avbruten';
    case 'disputed': return 'Disputerad';
    default: return 'Okänd';
  }
}
