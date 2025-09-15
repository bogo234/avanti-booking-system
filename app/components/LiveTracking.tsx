'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBookingUpdates, useDriverLocationUpdates } from '../../hooks/useFirebaseData';

interface DriverLocation {
  lat: number;
  lng: number;
  name: string;
  car: string;
  rating: number;
  eta: number;
  phone: string;
}

export default function LiveTracking() {
  const [driver, setDriver] = useState<DriverLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'searching' | 'found' | 'arriving' | 'completed'>('searching');
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId') || '';
  const { booking } = useBookingUpdates(bookingId);
  const { location } = useDriverLocationUpdates(booking?.driver?.id || '');

  useEffect(() => {
    if (!isTracking) return;
    if (!booking) {
      setBookingStatus('searching');
      return;
    }

    switch (booking.status) {
      case 'driver_assigned':
      case 'driver_en_route':
        setBookingStatus('found');
        break;
      case 'driver_arrived':
        setBookingStatus('arriving');
        break;
      case 'completed':
        setBookingStatus('completed');
        break;
      default:
        setBookingStatus('searching');
    }

    if (location) {
      setDriver(prev => ({
        lat: location.lat,
        lng: location.lng,
        name: booking?.driver?.name || prev?.name || 'Förare',
        car: `${booking?.driver?.car || ''} - ${booking?.driver?.licensePlate || ''}`.trim(),
        rating: 5,
        eta: prev?.eta ?? 0,
        phone: booking?.driver?.phone || prev?.phone || ''
      }));
    }
  }, [isTracking, booking, location]);

  const startTracking = () => {
    setIsTracking(true);
    setBookingStatus('searching');
  };

  const callDriver = () => {
    if (driver) {
      window.open(`tel:${driver.phone}`, '_self');
    }
  };

  const getStatusText = () => {
    switch (bookingStatus) {
      case 'searching':
        return 'Söker chaufför...';
      case 'found':
        return 'Chaufför hittad!';
      case 'arriving':
        return 'Chaufför anländer snart';
      case 'completed':
        return 'Resa slutförd';
      default:
        return '';
    }
  };

  if (!isTracking) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '1rem',
        padding: '2rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: 'white', marginBottom: '1rem' }}>Live Spårning</h3>
          <p style={{ color: '#d1d5db', marginBottom: '2rem' }}>
            Spåra din chaufför i realtid när du har bokat en resa
          </p>
          <button
            onClick={startTracking}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Starta Spårning
          </button>
        </div>
      </div>
    );
  }

  if (bookingStatus === 'searching') {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '1rem',
        padding: '2rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #374151',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        <p style={{ color: 'white', fontSize: '1.125rem' }}>{getStatusText()}</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '1rem',
        padding: '2rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#d1d5db' }}>Hämtar chaufförsinformation...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '1rem',
      padding: '2rem',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginTop: '2rem'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Din Chaufför är på väg</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
            {driver.eta} min
          </span>
          <span style={{ color: '#888', fontSize: '0.875rem' }}>till ankomst</span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '0.75rem'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '600',
          fontSize: '1.25rem'
        }}>
          {driver.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: 'white', marginBottom: '0.25rem' }}>{driver.name}</h4>
          <p style={{ color: '#888', marginBottom: '0.5rem' }}>{driver.car}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#fbbf24', fontSize: '0.875rem' }}>★★★★★</span>
            <span style={{ color: 'white', fontWeight: '600' }}>{driver.rating}</span>
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '0.75rem',
        padding: '3rem 2rem',
        textAlign: 'center',
        border: '2px dashed rgba(255, 255, 255, 0.2)',
        marginBottom: '2rem'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
        <p style={{ color: 'white', fontWeight: '600', marginBottom: '0.5rem' }}>Live Karta</p>
        <small style={{ color: '#888' }}>Chaufförens position visas här</small>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <button
          onClick={callDriver}
          style={{
            padding: '0.75rem 1rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          📞 Ring Chaufför
        </button>
        <button style={{
          padding: '0.75rem 1rem',
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          💬 Meddelande
        </button>
      </div>
    </div>
  );
}
