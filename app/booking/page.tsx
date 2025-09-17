'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ModernBookingForm from '../components/ModernBookingForm';
import { BookingRequest } from '../types/booking';
import { firebaseOperations } from '../../hooks/useFirebaseData';
import { createNotification } from '../../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import '../styles/booking-system.css';

export default function BookingPage() {
  const [isBooking, setIsBooking] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');
  const [showBookingStatus, setShowBookingStatus] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  
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
      
      if (!user) {
        throw new Error('Du måste vara inloggad för att göra en bokning');
      }

      // Create booking in Firebase with authenticated user data
      const bookingData = {
        customer: {
          name: user.displayName || user.email?.split('@')[0] || 'Kund',
          phone: user.phoneNumber || '', // Real phone number or empty
          email: user.email || ''
        },
        pickup: {
          address: `${booking.pickupLocation.street}, ${booking.pickupLocation.city}`,
          time: booking.pickupTime.toISOString(),
          coordinates: booking.pickupLocation.coordinates // Real coordinates from Google Places API
        },
        destination: {
          address: `${booking.destination.street}, ${booking.destination.city}`,
          coordinates: booking.destination.coordinates // Real coordinates from Google Places API
        },
        service: 'standard', // Avanti has one standard service
        status: 'waiting' as const,
        price: booking.estimatedPrice, // Real calculated price based on distance
        customerId: user.uid,
        paymentStatus: 'pending'
      };
      
      const bookingId = await firebaseOperations.create('bookings', bookingData);
      setBookingId(bookingId);

      // Create notification for booking creation
      try {
        await createNotification({
          type: 'booking',
          message: `Ny bokning skapad #${bookingId.slice(-8)}`,
          bookingId,
          userId: user.uid,
        });
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
        // Don't fail the booking if notification fails
      }
      
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
      
      // Redirect directly to Stripe Hosted Checkout
      try {
        const idToken = await (await import('../../lib/firebase')).auth.currentUser?.getIdToken(true).catch(() => null);
        const res = await fetch('/api/stripe/checkout-temp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({ bookingId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.url) {
          if (data?.details) {
            throw new Error(`${data.error}: ${data.details}`);
          }
          throw new Error(data?.error || 'Kunde inte skapa Stripe-betalning');
        }
        // Direct redirect to Stripe
        window.location.replace(data.url as string);
      } catch (e) {
        console.error('Stripe checkout error:', e);
        // Only fallback to payment page if Stripe completely fails
        router.push(`/payment?bookingId=${bookingId}`);
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      alert(`Bokningen misslyckades: ${error instanceof Error ? error.message : 'Okänt fel'}. Försök igen.`);
    } finally {
      setIsBooking(false);
    }
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

    </div>
  );
}