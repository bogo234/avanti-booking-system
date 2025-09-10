'use client';

import { useState, useEffect } from 'react';
import { useBookingUpdates, firebaseOperations } from '../../../hooks/useFirebaseData';
import { useAuth } from '../../contexts/AuthContext';

interface BookingStatusPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function BookingStatusPage({ params }: BookingStatusPageProps) {
  const [newMessage, setNewMessage] = useState('');
  const [bookingId, setBookingId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const { user } = useAuth();
  
  useEffect(() => {
    params.then((resolvedParams) => {
      setBookingId(resolvedParams.id);
    });
  }, [params]);
  
  // Real-time booking updates
  const { booking, loading, error } = useBookingUpdates(bookingId);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !booking) return;

    try {
      await firebaseOperations.create('messages', {
        bookingId: bookingId,
        senderId: user?.uid || 'customer',
        senderType: 'customer',
        message: newMessage.trim()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !confirm('Är du säker på att du vill avbryta bokningen?')) return;

    try {
      await firebaseOperations.update('bookings', bookingId, { status: 'cancelled' });
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Väntar på förare';
      case 'accepted': return 'Förare accepterad';
      case 'on_way': return 'Förare på väg';
      case 'arrived': return 'Förare har anlänt';
      case 'completed': return 'Resa slutförd';
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

  if (loading) {
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
          <p>Laddar bokning...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
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
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Bokning hittades inte</h1>
          <p style={{ marginBottom: '2rem', opacity: 0.7 }}>{error || 'Bokningen existerar inte eller har tagits bort'}</p>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              background: '#4fc3f7',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Tillbaka till startsidan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            ← Tillbaka
          </button>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Din bokning</h1>
          <p style={{ opacity: 0.7 }}>Boknings-ID: {bookingId}</p>
        </div>

        {/* Status Card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: getStatusColor(booking.status),
              marginRight: '12px'
            }}></div>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{getStatusText(booking.status)}</h2>
          </div>

          {/* Booking Details */}
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', opacity: 0.8 }}>Upphämtning</h3>
              <p style={{ fontSize: '1.2rem', margin: 0 }}>{booking.pickup.address}</p>
              <p style={{ opacity: 0.7, margin: '0.25rem 0 0 0' }}>
                {new Date(booking.pickup.time).toLocaleString('sv-SE')}
              </p>
            </div>
            
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', opacity: 0.8 }}>Destination</h3>
              <p style={{ fontSize: '1.2rem', margin: 0 }}>{booking.destination.address}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', opacity: 0.8 }}>Service</h3>
                <p style={{ fontSize: '1.2rem', margin: 0, textTransform: 'capitalize' }}>{booking.service}</p>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', opacity: 0.8 }}>Pris</h3>
                <p style={{ fontSize: '1.2rem', margin: 0 }}>{booking.price} kr</p>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', opacity: 0.8 }}>Registreringsnummer</h3>
              <p style={{ fontSize: '1.2rem', margin: 0 }}>{booking.licensePlate}</p>
            </div>
          </div>

          {/* Driver Info */}
          {booking.driver && (
            <div style={{
              background: 'rgba(79, 195, 247, 0.1)',
              border: '1px solid rgba(79, 195, 247, 0.3)',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Din förare</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <p><strong>Namn:</strong> {booking.driver.name}</p>
                <p><strong>Bil:</strong> {booking.driver.car}</p>
                <p><strong>Registreringsnummer:</strong> {booking.driver.licensePlate}</p>
                <a 
                  href={`tel:${booking.driver.phone}`}
                  style={{
                    display: 'inline-block',
                    background: '#4fc3f7',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    marginTop: '0.5rem'
                  }}
                >
                  Ring förare
                </a>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {booking.status === 'waiting' && (
            <button 
              onClick={handleCancelBooking}
              style={{
                background: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Avbryt bokning
            </button>
          )}
        </div>

        {/* Chat Section */}
        {booking.driver && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '2rem'
          }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Chat med förare</h3>
            
            {/* Messages */}
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              marginBottom: '1rem',
              padding: '1rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px'
            }}>
              {messages.length === 0 ? (
                <p style={{ opacity: 0.7, textAlign: 'center' }}>Inga meddelanden än</p>
              ) : (
                messages.map((message) => (
                  <div 
                    key={message.id}
                    style={{
                      marginBottom: '1rem',
                      textAlign: message.senderType === 'customer' ? 'right' : 'left'
                    }}
                  >
                    <div style={{
                      display: 'inline-block',
                      background: message.senderType === 'customer' ? '#4fc3f7' : 'rgba(255,255,255,0.1)',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      maxWidth: '70%'
                    }}>
                      <p style={{ margin: 0 }}>{message.message}</p>
                      <p style={{ 
                        fontSize: '0.8rem', 
                        opacity: 0.7, 
                        margin: '0.25rem 0 0 0' 
                      }}>
                        {message.timestamp?.toDate?.()?.toLocaleTimeString('sv-SE') || 'Nu'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Skriv meddelande..."
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'white',
                  fontSize: '1rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                style={{
                  background: '#4fc3f7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Skicka
              </button>
            </div>
          </div>
        )}
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
