'use client';

import { useState, useEffect } from 'react';
import { subscribeToBookings } from '../../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  type: 'booking_update' | 'driver_assigned' | 'driver_arrived' | 'booking_completed';
  title: string;
  message: string;
  timestamp: Date;
  bookingId: string;
  read: boolean;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to bookings for this user
    const unsubscribe = subscribeToBookings((bookings) => {
      const userBookings = bookings.filter(booking => 
        booking.customer?.email === user.email
      );

      // Create notifications for booking updates
      const newNotifications: Notification[] = [];
      
      userBookings.forEach(booking => {
        if (booking.status === 'accepted' && booking.driver) {
          newNotifications.push({
            id: `driver-assigned-${booking.id}`,
            type: 'driver_assigned',
            title: 'Förare tilldelad!',
            message: `${booking.driver.name} är på väg till dig. Bil: ${booking.driver.car}`,
            timestamp: new Date(),
            bookingId: booking.id!,
            read: false
          });
        }

        if (booking.status === 'on_way') {
          newNotifications.push({
            id: `driver-en-route-${booking.id}`,
            type: 'booking_update',
            title: 'Förare på väg',
            message: 'Din förare är på väg till upphämtningsplatsen',
            timestamp: new Date(),
            bookingId: booking.id!,
            read: false
          });
        }

        if (booking.status === 'arrived') {
          newNotifications.push({
            id: `driver-arrived-${booking.id}`,
            type: 'driver_arrived',
            title: 'Förare anlänt!',
            message: 'Din förare har anlänt till upphämtningsplatsen',
            timestamp: new Date(),
            bookingId: booking.id!,
            read: false
          });
        }

        if (booking.status === 'completed') {
          newNotifications.push({
            id: `booking-completed-${booking.id}`,
            type: 'booking_completed',
            title: 'Resa slutförd!',
            message: 'Din resa har slutförts. Tack för att du valde Avanti!',
            timestamp: new Date(),
            bookingId: booking.id!,
            read: false
          });
        }
      });

      setNotifications(prev => {
        // Merge with existing notifications, avoiding duplicates
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
        return [...prev, ...uniqueNew].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'driver_assigned': return '🚗';
      case 'driver_arrived': return '📍';
      case 'booking_completed': return '✅';
      case 'booking_update': return '📱';
      default: return '🔔';
    }
  };

  return (
    <div className="notification-center">
      <button 
        className="notification-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifikationer</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="mark-all-read"
              >
                Markera alla som lästa
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>Inga notifikationer</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => {
                    markAsRead(notification.id);
                    // Navigate to tracking page
                    window.open(`/tracking?bookingId=${notification.bookingId}`, '_blank');
                  }}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {notification.timestamp.toLocaleTimeString('sv-SE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  {!notification.read && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .notification-center {
          position: relative;
        }

        .notification-button {
          position: relative;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s ease;
        }

        .notification-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: bold;
        }

        .notification-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          width: 350px;
          max-height: 400px;
          overflow: hidden;
          z-index: 1000;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .notification-header {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-header h3 {
          margin: 0;
          color: white;
          font-size: 1.1rem;
        }

        .mark-all-read {
          background: none;
          border: none;
          color: #4fc3f7;
          cursor: pointer;
          font-size: 0.8rem;
          text-decoration: underline;
        }

        .notification-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .no-notifications {
          padding: 2rem;
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .notification-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .notification-item.unread {
          background: rgba(79, 195, 247, 0.1);
        }

        .notification-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
        }

        .notification-content h4 {
          margin: 0 0 0.25rem 0;
          color: white;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .notification-content p {
          margin: 0 0 0.5rem 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.8rem;
          line-height: 1.4;
        }

        .notification-time {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
        }

        .unread-indicator {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 8px;
          height: 8px;
          background: #4fc3f7;
          border-radius: 50%;
        }

        @media (max-width: 768px) {
          .notification-dropdown {
            width: 300px;
            right: -50px;
          }
        }
      `}</style>
    </div>
  );
}
