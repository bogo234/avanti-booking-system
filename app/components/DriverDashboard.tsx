'use client';

import { useState, useEffect } from 'react';
import { Driver, Booking, BookingStatus } from '../types/booking';
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
import { createNotification } from '../../lib/firebase';

interface DriverDashboardProps {
  driverId: string;
}

export default function DriverDashboard({ driverId }: DriverDashboardProps) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [availableBookings, setAvailableBookings] = useState<Booking[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load driver data from Firebase
  useEffect(() => {
    const loadDriverData = async () => {
      setIsLoading(true);
      try {
        // Load driver data from Firebase
        const driverDoc = await getDoc(doc(db, 'drivers', driverId));
        if (driverDoc.exists()) {
          const driverData = { id: driverDoc.id, ...driverDoc.data() } as Driver;
          setDriver(driverData);
        }

        // Load available bookings
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[];
        setAvailableBookings(bookingsData);

        // Load current booking if driver is assigned
        const currentBookingQuery = query(
          collection(db, 'bookings'),
          where('driverId', '==', driverId),
          where('status', 'in', ['driver_assigned', 'driver_en_route', 'driver_arrived', 'in_progress']),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        
        const currentBookingSnapshot = await getDocs(currentBookingQuery);
        if (!currentBookingSnapshot.empty) {
          const currentBookingData = { 
            id: currentBookingSnapshot.docs[0].id, 
            ...currentBookingSnapshot.docs[0].data() 
          } as Booking;
          setCurrentBooking(currentBookingData);
        }

      } catch (error) {
        // Error loading driver data
      } finally {
        setIsLoading(false);
      }
    };

    loadDriverData();
  }, [driverId]);

  const handleToggleOnline = () => {
    const newOnline = !isOnline;
    setIsOnline(newOnline);
    // Update driver availability status in Firestore
    try {
      const driverRef = doc(db, 'drivers', driverId);
      updateDoc(driverRef, { status: newOnline ? 'available' : 'offline' });
    } catch (e) {
      // Failed to update driver status
    }
    if (driver) {
      setDriver({ ...driver, isAvailable: newOnline });
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    setIsLoading(true);
    try {
      // Assign driver to booking in Firestore
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'driver_assigned',
        driverId: driverId,
        driver: driver ? {
          id: driverId,
          name: `${driver.firstName} ${driver.lastName}`,
          phone: driver.phone,
          car: driver.vehicleRegistration,
          licensePlate: driver.vehicleRegistration,
        } : {
          id: driverId,
          name: 'Förare',
          phone: '',
          car: '',
          licensePlate: '',
        }
      });

      const booking = availableBookings.find(b => b.id === bookingId);
      if (booking) {
        setCurrentBooking({ ...booking, status: 'driver_assigned' as BookingStatus });
        setAvailableBookings(availableBookings.filter(b => b.id !== bookingId));
      }

      // Create notification
      await createNotification({
        type: 'booking',
        message: `Förare tilldelad bokning #${bookingId.slice(-6)}`,
        bookingId,
        userId: booking?.customerId,
      });
    } catch (error) {
      // Error accepting booking
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (status: BookingStatus) => {
    if (!currentBooking) return;
    
    setIsLoading(true);
    try {
      // Update booking status in Firestore
      const bookingRef = doc(db, 'bookings', currentBooking.id);
      await updateDoc(bookingRef, { status });

      await createNotification({
        type: 'booking',
        message: `Bokning #${currentBooking.id.slice(-6)} status: ${getStatusText(status)}`,
        bookingId: currentBooking.id,
        userId: currentBooking.customerId,
      });

      setCurrentBooking({ ...currentBooking, status });
      
      if (status === 'completed') {
        setCurrentBooking(null);
      }
    } catch (error) {
      // Error updating booking status
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLiveTracking = () => {
    if (currentBooking) {
      window.open(`/tracking?bookingId=${currentBooking.id}&driverView=true`, '_blank');
    }
  };

  if (!driver) {
    return (
      <div className="driver-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Laddar förare-information...</p>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="driver-info">
          <div className="driver-avatar">
            <span>{driver.firstName[0]}{driver.lastName[0]}</span>
          </div>
          <div className="driver-details">
            <h2>{driver.firstName} {driver.lastName}</h2>
            <p className="driver-rating">⭐ {driver.rating} ({driver.totalRides} resor)</p>
            <p className="driver-vehicle">{driver.vehicleRegistration}</p>
          </div>
        </div>
        
        <div className="online-toggle">
          <button
            onClick={handleToggleOnline}
            className={`toggle-button ${isOnline ? 'online' : 'offline'}`}
          >
            <span className="toggle-indicator"></span>
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>
      </div>

      {/* Current Booking */}
      {currentBooking && (
        <div className="current-booking">
          <h3>Aktiv bokning</h3>
          <div className="booking-card active">
            <div className="booking-header">
              <span className="booking-id">#{currentBooking.id.slice(-6)}</span>
              <span className={`booking-status ${currentBooking.status}`}>
                {getStatusText(currentBooking.status)}
              </span>
            </div>
            
            <div className="booking-details">
              <div className="location-info">
                <div className="pickup">
                  <span className="label">Hämta från:</span>
                  <span className="address">{currentBooking.pickupLocation.street}</span>
                </div>
                <div className="destination">
                  <span className="label">Lämna till:</span>
                  <span className="address">{currentBooking.destination.street}</span>
                </div>
              </div>
              
              <div className="booking-meta">
                <span>Tid: {new Date(currentBooking.pickupTime).toLocaleString('sv-SE')}</span>
                <span>Pris: {currentBooking.price} kr</span>
              </div>
            </div>

            <div className="booking-actions">
              {currentBooking.status === 'driver_assigned' && (
                <button
                  onClick={() => handleUpdateBookingStatus('driver_en_route')}
                  className="action-button primary"
                  disabled={isLoading}
                >
                  På väg till kund
                </button>
              )}
              
              {currentBooking.status === 'driver_en_route' && (
                <button
                  onClick={() => handleUpdateBookingStatus('driver_arrived')}
                  className="action-button primary"
                  disabled={isLoading}
                >
                  Anlände till kund
                </button>
              )}
              
              {currentBooking.status === 'driver_arrived' && (
                <button
                  onClick={() => handleUpdateBookingStatus('in_progress')}
                  className="action-button primary"
                  disabled={isLoading}
                >
                  Starta resa
                </button>
              )}
              
              {currentBooking.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateBookingStatus('completed')}
                  className="action-button success"
                  disabled={isLoading}
                >
                  Slutför resa
                </button>
              )}
              
              {currentBooking.status !== 'completed' && (
                <button
                  onClick={handleViewLiveTracking}
                  className="action-button secondary"
                >
                  📍 Live Spårning
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Available Bookings */}
      {isOnline && availableBookings.length > 0 && (
        <div className="available-bookings">
          <h3>Tillgängliga bokningar</h3>
          <div className="bookings-list">
            {availableBookings.map((booking) => (
              <div key={booking.id} className="booking-card available">
                <div className="booking-header">
                  <span className="booking-id">#{booking.id.slice(-6)}</span>
                  <span className="booking-price">{booking.price} kr</span>
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
                    <span>Tid: {new Date(booking.pickupTime).toLocaleString('sv-SE')}</span>
                    <span>Avstånd: {booking.distance} km</span>
                  </div>
                </div>

                <button
                  onClick={() => handleAcceptBooking(booking.id)}
                  className="action-button primary"
                  disabled={isLoading}
                >
                  Acceptera bokning
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Active Bookings */}
      {isOnline && !currentBooking && availableBookings.length === 0 && (
        <div className="no-bookings">
          <div className="empty-state">
            <div className="empty-icon">🚗</div>
            <h3>Inga aktiva bokningar</h3>
            <p>Du är online och redo att ta emot nya bokningar</p>
          </div>
        </div>
      )}

      {/* Offline State */}
      {!isOnline && (
        <div className="offline-state">
          <div className="empty-state">
            <div className="empty-icon">⏸️</div>
            <h3>Du är offline</h3>
            <p>Aktivera dig för att ta emot bokningar</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusText(status: BookingStatus): string {
  switch (status) {
    case 'pending': return 'Väntar';
    case 'confirmed': return 'Bekräftad';
    case 'driver_assigned': return 'Chaufför tilldelad';
    case 'driver_en_route': return 'På väg';
    case 'driver_arrived': return 'Anlände';
    case 'in_progress': return 'Under resa';
    case 'completed': return 'Slutförd';
    case 'cancelled': return 'Avbruten';
    case 'disputed': return 'Disputerad';
    default: return 'Okänd';
  }
}
