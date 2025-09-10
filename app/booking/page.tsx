'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ModernBookingForm from '../components/ModernBookingForm';
import StripePaymentModal from '../components/StripePaymentModal';
import { BookingRequest } from '../types/booking';
import { firebaseOperations } from '../../hooks/useFirebaseData';
import { useAuth } from '../contexts/AuthContext';
import '../styles/booking-system.css';

export default function BookingPage() {
  const [isBooking, setIsBooking] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');
  const [showBookingStatus, setShowBookingStatus] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="booking-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Laddar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  const handleBookingSubmit = async (booking: BookingRequest) => {
    setIsBooking(true);
    
    try {
      // Create booking in Firebase
      const bookingData = {
        customer: {
          name: user?.displayName || 'Kund',
          phone: user?.phoneNumber || '+46 70 123 45 67',
          email: user?.email || 'kund@example.com'
        },
        pickup: {
          address: `${booking.pickupLocation.street}, ${booking.pickupLocation.city}`,
          time: booking.pickupTime.toISOString(),
          coordinates: booking.pickupLocation.coordinates
        },
        destination: {
          address: `${booking.destination.street}, ${booking.destination.city}`,
          coordinates: booking.destination.coordinates
        },
        service: booking.serviceTypeId as 'standard' | 'premium' | 'luxury',
        status: 'waiting' as const,
        price: 299 // Base price, should be calculated based on service type
      };
      
      const bookingId = await firebaseOperations.create('bookings', {
        ...bookingData,
        customerId: user?.uid || '',
        paymentStatus: 'pending'
      });
      setBookingId(bookingId);
      
      // Create booking data for display
      const displayBookingData = {
        id: bookingId,
        status: 'waiting',
        pickupLocation: booking.pickupLocation,
        destination: booking.destination,
        pickupTime: booking.pickupTime,
        estimatedPrice: 299, // Base price, should be calculated
        estimatedDuration: 15, // Default wait time
        driver: null
      };
      
      setBookingData(displayBookingData);
      setPaymentAmount(displayBookingData.estimatedPrice);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Bokningen misslyckades. Försök igen.');
    } finally {
      setIsBooking(false);
    }
  };

  const handlePaymentSuccess = (paymentId: string) => {
    setBookingComplete(true);
    setShowPaymentModal(false);
    console.log('Payment successful:', paymentId);
  };

  if (bookingComplete && !showBookingStatus) {
    return (
      <div className="booking-success">
        <div className="success-container">
          <div className="success-icon">✓</div>
          <h1>Bokning bekräftad</h1>
          <p>Din bokning har skapats och bekräftats.</p>
          <div className="booking-details">
            <p><strong>Bokningsnummer:</strong> {bookingId}</p>
            <p>Du kommer att få en bekräftelse via SMS och e-post.</p>
          </div>
          <div className="success-actions">
            <button 
              onClick={() => {
                setBookingComplete(false);
                setShowBookingStatus(false);
                setBookingData(null);
              }}
              className="modern-button primary"
            >
              Boka en till resa
            </button>
            <button 
              onClick={() => setShowBookingStatus(true)}
              className="modern-button secondary"
            >
              Se bokningsstatus
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (bookingComplete && showBookingStatus && bookingData) {
    return (
      <div className="booking-status-page">
        <div className="status-container">
          <div className="status-header">
            <button 
              onClick={() => setShowBookingStatus(false)}
              className="back-button"
            >
              ← Tillbaka
            </button>
            <h1>Bokningsstatus</h1>
            <p>Bokning #{bookingData.id}</p>
          </div>

          <div className="booking-status-timeline">
            <div className="status-step completed">
              <div className="step-icon">1</div>
              <div className="step-content">
                <span className="step-title">Bokning skapad</span>
                <span className="step-time">{new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            
            <div className="status-step active">
              <div className="step-icon">2</div>
              <div className="step-content">
                <span className="step-title">Väntar på bekräftelse</span>
                <span className="step-time">-</span>
              </div>
            </div>
            
            <div className="status-step">
              <div className="step-icon">3</div>
              <div className="step-content">
                <span className="step-title">Chaufför tilldelad</span>
                <span className="step-time">-</span>
              </div>
            </div>
            
            <div className="status-step">
              <div className="step-icon">4</div>
              <div className="step-content">
                <span className="step-title">På väg till dig</span>
                <span className="step-time">-</span>
              </div>
            </div>
            
            <div className="status-step">
              <div className="step-icon">5</div>
              <div className="step-content">
                <span className="step-title">Anlände</span>
                <span className="step-time">-</span>
              </div>
            </div>
            
            <div className="status-step">
              <div className="step-icon">6</div>
              <div className="step-content">
                <span className="step-title">Under resa</span>
                <span className="step-time">-</span>
              </div>
            </div>
            
            <div className="status-step">
              <div className="step-icon">7</div>
              <div className="step-content">
                <span className="step-title">Slutförd</span>
                <span className="step-time">-</span>
              </div>
            </div>
          </div>

          <div className="booking-details-card">
            <h3 style={{textTransform: 'none'}}>Bokningsdetaljer</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Från:</span>
                <span className="value">{bookingData.pickupLocation.street}</span>
              </div>
              <div className="detail-item">
                <span className="label">Till:</span>
                <span className="value">{bookingData.destination.street}</span>
              </div>
              <div className="detail-item">
                <span className="label">Tid:</span>
                <span className="value">{new Date(bookingData.pickupTime).toLocaleString('sv-SE')}</span>
              </div>
              <div className="detail-item">
                <span className="label">Pris:</span>
                <span className="value">{bookingData.estimatedPrice} kr</span>
              </div>
              <div className="detail-item">
                <span className="label">Tidsuppskattning:</span>
                <span className="value">{bookingData.estimatedDuration} min</span>
              </div>
            </div>
          </div>

          <div className="status-actions">
            <button 
              onClick={() => window.open(`/tracking?bookingId=${bookingData.id}`, '_blank')}
              className="modern-button primary"
            >
              Live Spårning
            </button>
            <button className="modern-button secondary">
              Kontakta support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <h1>Boka resa</h1>
          <p>Professionell transport</p>
        </div>
      
        <ModernBookingForm 
          onBookingSubmit={handleBookingSubmit}
          isLoading={isBooking}
        />
      </div>

      <StripePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={paymentAmount}
        bookingId={bookingId}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
