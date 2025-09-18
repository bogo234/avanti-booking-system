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
    
    // Lägg till timeout för hela bokningsprocessen
    const bookingTimeout = setTimeout(() => {
      console.error('Booking process timeout - taking too long');
      setIsBooking(false);
      alert('Bokningsprocessen tog för lång tid. Försök igen eller kontakta support.');
    }, 30000); // 30 sekunder timeout
    
    try {
      console.log('Starting booking submission...');
      
      if (!user) {
        throw new Error('Du måste vara inloggad för att göra en bokning');
      }

      console.log('User authenticated:', user.uid);

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
      
      console.log('Creating booking in Firebase...');
      const bookingId = await firebaseOperations.create('bookings', bookingData);
      console.log('Booking created with ID:', bookingId);
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
        console.log('Creating Stripe checkout session...');
        
        // Förbättrad ID token hämtning med bättre felhantering
        let idToken = null;
        try {
          const { auth } = await import('../../lib/firebase');
          if (auth.currentUser) {
            idToken = await auth.currentUser.getIdToken(true);
            console.log('ID token obtained successfully');
          } else {
            console.error('No current user found');
            throw new Error('Du måste vara inloggad för att betala');
          }
        } catch (tokenError) {
          console.error('Failed to get ID token:', tokenError);
          throw new Error('Autentisering misslyckades. Logga in igen och försök på nytt.');
        }
        
        if (!idToken) {
          throw new Error('Kunde inte verifiera din identitet. Logga in igen och försök på nytt.');
        }
        
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({ bookingId }),
        });
        
        console.log('Stripe response status:', res.status);
        const data = await res.json();
        console.log('Stripe response data:', data);
        
        if (!res.ok) {
          let errorMessage = 'Kunde inte skapa betalning';
          if (data?.error) {
            errorMessage = data.error;
            if (data?.details) {
              errorMessage += `: ${data.details}`;
            }
          }
          throw new Error(errorMessage);
        }
        
        if (!data?.url) {
          throw new Error('Stripe returnerade ingen betalningslänk');
        }
        
        console.log('Redirecting to Stripe...');
        // Direct redirect to Stripe
        window.location.replace(data.url as string);
      } catch (stripeError) {
        console.error('Stripe checkout error:', stripeError);
        
        // Visa tydligt felmeddelande till användaren
        const errorMessage = stripeError instanceof Error ? stripeError.message : 'Betalningssystemet är inte tillgängligt just nu';
        alert(`Betalningsfel: ${errorMessage}\n\nDu kan fortfarande betala via betalningssidan.`);
        
        // Fallback to payment page
        console.log('Falling back to payment page...');
        router.push(`/payment?bookingId=${bookingId}`);
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
      alert(`Bokningen misslyckades: ${errorMessage}\n\nFörsök igen eller kontakta support om problemet kvarstår.`);
    } finally {
      // Rensa timeout och säkerställ att laddningsindikatorn alltid stängs av
      clearTimeout(bookingTimeout);
      setIsBooking(false);
      console.log('Booking process completed, loading state reset');
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