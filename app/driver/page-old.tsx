'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseData, useUserData, firebaseOperations } from '../../hooks/useFirebaseData';
import { useDriverLocation } from '../../hooks/useDriverLocation';
import { Booking } from '../types/booking';

// Driver interface
interface Driver {
  id: string;
  name: string;
  car: string;
  status: string;
}

export default function DriverDashboard() {
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Real-time Firebase data
  const { data: allBookings, loading: bookingsLoading } = useFirebaseData('bookings', {
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
      await firebaseOperations.update('bookings', bookingId, { status: status as any });
      
      // If completed, make driver available again
      if (status === 'completed') {
        const booking = allBookings?.find((b: Booking) => b.id === bookingId);
        if (booking?.driver?.id) {
          await firebaseOperations.update('drivers', booking.driver.id, { status: 'available' });
        }
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Väntar på förare';
      case 'accepted': return 'Accepterad';
      case 'on_way': return 'På väg';
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

  if (authLoading || bookingsLoading || driversLoading || userDataLoading || locationLoading) {
    return (
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
            width: '50px', 
            height: '50px', 
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid #4fc3f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Laddar förare dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Tillbaka till startsidan
          </button>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Förare Dashboard</h1>
          <p style={{ opacity: 0.7 }}>Hantera bokningar och förare</p>
        </div>

        {/* Driver Selection */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Välj förare</h3>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: '12px',
              color: 'white',
              fontSize: '1rem',
              minWidth: '200px'
            }}
          >
            {allDrivers?.map((driver: Driver) => (
              <option key={driver.id} value={driver.id} style={{ background: '#1e293b' }}>
                {driver.name} - {driver.car} ({driver.status})
              </option>
            ))}
          </select>
        </div>

        {/* Waiting Bookings */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Nya bokningar</h2>
          
          {allBookings?.length === 0 ? (
            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }}>
              Inga nya bokningar just nu
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {allBookings?.map((booking: Booking) => (
                <div 
                  key={booking.id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                        Bokning #{booking.id?.slice(-8)}
                      </h3>
                      <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                        {booking.createdAt instanceof Date 
                          ? booking.createdAt.toLocaleString('sv-SE')
                          : new Date(booking.createdAt).toLocaleString('sv-SE')
                        }
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getStatusColor(booking.status)
                      }}></div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        {getStatusText(booking.status)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', opacity: 0.8 }}>Upphämtning</h4>
                      <p style={{ margin: 0 }}>{booking.pickupLocation.street}, {booking.pickupLocation.city}</p>
                      <p style={{ opacity: 0.7, fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                        {booking.pickupTime instanceof Date 
                          ? booking.pickupTime.toLocaleString('sv-SE')
                          : new Date(booking.pickupTime).toLocaleString('sv-SE')
                        }
                      </p>
                    </div>
                    
                    <div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', opacity: 0.8 }}>Destination</h4>
                      <p style={{ margin: 0 }}>{booking.destination.street}, {booking.destination.city}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', opacity: 0.8 }}>Service</h4>
                        <p style={{ margin: 0, textTransform: 'capitalize' }}>Standard transport</p>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', opacity: 0.8 }}>Pris</h4>
                        <p style={{ margin: 0 }}>{booking.price} kr</p>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', opacity: 0.8 }}>Registreringsnummer</h4>
                        <p style={{ margin: 0 }}>Ej angivet</p>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem', opacity: 0.8 }}>Kund</h4>
                      <p style={{ margin: 0 }}>Kund #{booking.customerId.slice(-8)}</p>
                      <p style={{ opacity: 0.7, fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                        Kontakt via system
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      onClick={() => handleAcceptBooking(booking.id!)}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        flex: 1
                      }}
                    >
                      Acceptera
                    </button>
                    <button 
                      onClick={() => handleRejectBooking(booking.id!)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        flex: 1
                      }}
                    >
                      Avslå
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Bookings */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Aktiva bokningar</h2>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            {allBookings?.filter((b: Booking) => b.status === 'driver_assigned' || b.status === 'driver_en_route' || b.status === 'driver_arrived' || b.status === 'in_progress').map((booking: Booking) => (
              <div 
                key={booking.id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                    Bokning #{booking.id?.slice(-8)} - Kund #{booking.customerId.slice(-8)}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getStatusColor(booking.status)
                    }}></div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                      {getStatusText(booking.status)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', opacity: 0.8 }}>Från:</p>
                    <p style={{ margin: 0 }}>{booking.pickupLocation.street}, {booking.pickupLocation.city}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', opacity: 0.8 }}>Till:</p>
                    <p style={{ margin: 0 }}>{booking.destination.street}, {booking.destination.city}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {booking.status === 'driver_assigned' && (
                    <button 
                      onClick={() => handleUpdateBookingStatus(booking.id!, 'driver_en_route')}
                      style={{
                        background: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      På väg
                    </button>
                  )}
                  {booking.status === 'driver_en_route' && (
                    <button 
                      onClick={() => handleUpdateBookingStatus(booking.id!, 'driver_arrived')}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Anlänt
                    </button>
                  )}
                  {booking.status === 'driver_arrived' && (
                    <button 
                      onClick={() => handleUpdateBookingStatus(booking.id!, 'completed')}
                      style={{
                        background: '#059669',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Slutför
                    </button>
                  )}
                  <a 
                    href="#"
                    style={{
                      background: '#4fc3f7',
                      color: 'white',
                      textDecoration: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  >
                    Ring kund
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}