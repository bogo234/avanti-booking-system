'use client';

import { useState, useEffect } from 'react';
import { useFirebaseData, firebaseOperations } from '../../hooks/useFirebaseData';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // Real-time Firebase data
  const { data: allUsers, loading: usersLoading } = useFirebaseData('users');
  const { data: allBookings, loading: bookingsLoading } = useFirebaseData('bookings', {
    orderBy: { field: 'createdAt', direction: 'desc' }
  });
  const { data: allDrivers, loading: driversLoading } = useFirebaseData('drivers');
  const { data: allMessages, loading: messagesLoading } = useFirebaseData('messages', {
    orderBy: { field: 'createdAt', direction: 'desc' },
    limit: 50
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

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
      case 'on_way': return 'På väg till kund';
      case 'arrived': return 'Anlänt';
      case 'completed': return 'Slutförd';
      case 'cancelled': return 'Avbruten';
      default: return status;
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await firebaseOperations.update('bookings', bookingId, { status });
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const handleUpdateDriverStatus = async (driverId: string, status: string) => {
    try {
      await firebaseOperations.update('drivers', driverId, { status });
    } catch (error) {
      console.error('Error updating driver status:', error);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (confirm('Är du säker på att du vill ta bort denna bokning?')) {
      try {
        await firebaseOperations.delete('bookings', bookingId);
      } catch (error) {
        console.error('Error deleting booking:', error);
      }
    }
  };

  const handleCreateDriver = async (driverData: any) => {
    try {
      await firebaseOperations.create('drivers', {
        ...driverData,
        status: 'available',
        rating: 5.0,
        totalRides: 0,
        createdAt: new Date()
      });
      setShowCreateDriver(false);
    } catch (error) {
      console.error('Error creating driver:', error);
    }
  };

  const handleCreateBooking = async (bookingData: any) => {
    try {
      await firebaseOperations.create('bookings', {
        ...bookingData,
        status: 'waiting',
        createdAt: new Date()
      });
      setShowCreateBooking(false);
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await firebaseOperations.create('users', {
        ...userData,
        role: 'customer',
        status: 'active',
        createdAt: new Date()
      });
      setShowCreateUser(false);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  if (usersLoading || bookingsLoading || driversLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Laddar admin-data...</p>
      </div>
    );
  }

  // Calculate statistics
  const totalUsers = allUsers.length;
  const totalBookings = allBookings.length;
  const totalDrivers = allDrivers.length;
  const activeBookings = allBookings.filter(b => ['waiting', 'accepted', 'on_way', 'arrived'].includes(b.status)).length;
  const completedBookings = allBookings.filter(b => b.status === 'completed').length;
  const availableDrivers = allDrivers.filter(d => d.status === 'available').length;

  return (
    <div className="admin-dashboard">
      <div className="admin-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Översikt
        </button>
        <button 
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => setActiveTab('bookings')}
        >
          Bokningar ({totalBookings})
        </button>
        <button 
          className={activeTab === 'drivers' ? 'active' : ''}
          onClick={() => setActiveTab('drivers')}
        >
          Förare ({totalDrivers})
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Användare ({totalUsers})
        </button>
        <button 
          className={activeTab === 'messages' ? 'active' : ''}
          onClick={() => setActiveTab('messages')}
        >
          Meddelanden
        </button>
        <button 
          className={activeTab === 'manage' ? 'active' : ''}
          onClick={() => setActiveTab('manage')}
        >
          Hantera
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Totalt antal användare</h3>
                <div className="stat-number">{totalUsers}</div>
              </div>
              <div className="stat-card">
                <h3>Totalt antal bokningar</h3>
                <div className="stat-number">{totalBookings}</div>
              </div>
              <div className="stat-card">
                <h3>Aktiva bokningar</h3>
                <div className="stat-number">{activeBookings}</div>
              </div>
              <div className="stat-card">
                <h3>Slutförda bokningar</h3>
                <div className="stat-number">{completedBookings}</div>
              </div>
              <div className="stat-card">
                <h3>Totalt antal förare</h3>
                <div className="stat-number">{totalDrivers}</div>
              </div>
              <div className="stat-card">
                <h3>Tillgängliga förare</h3>
                <div className="stat-number">{availableDrivers}</div>
              </div>
            </div>

            <div className="recent-activity">
              <h3>Senaste bokningar</h3>
              <div className="activity-list">
                {allBookings.slice(0, 10).map((booking) => (
                  <div key={booking.id} className="activity-item">
                    <div className="activity-info">
                      <span className="booking-id">#{booking.id?.slice(-8)}</span>
                      <span className="customer-email">{booking.customerEmail}</span>
                      <span className="status" style={{ color: getStatusColor(booking.status) }}>
                        {getStatusText(booking.status)}
                      </span>
                    </div>
                    <div className="activity-time">
                      {new Date(booking.createdAt?.toDate?.() || new Date()).toLocaleString('sv-SE')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bookings-tab">
            <h3>Alla bokningar</h3>
            <div className="bookings-grid">
              {allBookings.map((booking) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <h4>Bokning #{booking.id?.slice(-8)}</h4>
                    <div 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(booking.status) }}
                    >
                      {getStatusText(booking.status)}
                    </div>
                  </div>
                  
                  <div className="booking-details">
                    <p><strong>Kund:</strong> {booking.customerEmail}</p>
                    <p><strong>Från:</strong> {booking.pickup?.address}</p>
                    <p><strong>Till:</strong> {booking.destination?.address}</p>
                    <p><strong>Pris:</strong> {booking.price} kr</p>
                    <p><strong>Skapad:</strong> {new Date(booking.createdAt?.toDate?.() || new Date()).toLocaleString('sv-SE')}</p>
                  </div>

                  {booking.driver && (
                    <div className="driver-info">
                      <p><strong>Förare:</strong> {booking.driver.name}</p>
                      <p><strong>Bil:</strong> {booking.driver.car}</p>
                    </div>
                  )}

                  <div className="booking-actions">
                    <select 
                      value={booking.status}
                      onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="waiting">Väntar på förare</option>
                      <option value="accepted">Förare tilldelad</option>
                      <option value="on_way">På väg till kund</option>
                      <option value="arrived">Anlänt</option>
                      <option value="completed">Slutförd</option>
                      <option value="cancelled">Avbruten</option>
                    </select>
                    <button 
                      onClick={() => handleDeleteBooking(booking.id)}
                      className="delete-btn"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="drivers-tab">
            <h3>Alla förare</h3>
            <div className="drivers-grid">
              {allDrivers.map((driver) => (
                <div key={driver.id} className="driver-card">
                  <div className="driver-header">
                    <h4>{driver.name}</h4>
                    <div 
                      className="status-badge"
                      style={{ 
                        backgroundColor: driver.status === 'available' ? '#10b981' : 
                                        driver.status === 'busy' ? '#f59e0b' : '#6b7280'
                      }}
                    >
                      {driver.status === 'available' ? 'Tillgänglig' : 
                       driver.status === 'busy' ? 'Upptagen' : 'Offline'}
                    </div>
                  </div>
                  
                  <div className="driver-details">
                    <p><strong>Email:</strong> {driver.email}</p>
                    <p><strong>Telefon:</strong> {driver.phone}</p>
                    <p><strong>Bil:</strong> {driver.car}</p>
                    <p><strong>Registreringsnummer:</strong> {driver.licensePlate}</p>
                    <p><strong>Betyg:</strong> {driver.rating}/5</p>
                    <p><strong>Antal resor:</strong> {driver.totalRides}</p>
                  </div>

                  {driver.location && (
                    <div className="location-info">
                      <p><strong>Position:</strong> {driver.location.lat.toFixed(4)}, {driver.location.lng.toFixed(4)}</p>
                    </div>
                  )}

                  <div className="driver-actions">
                    <select 
                      value={driver.status}
                      onChange={(e) => handleUpdateDriverStatus(driver.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="available">Tillgänglig</option>
                      <option value="busy">Upptagen</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-tab">
            <h3>Alla användare</h3>
            <div className="users-grid">
              {allUsers.map((user) => (
                <div key={user.id} className="user-card">
                  <div className="user-header">
                    <h4>{user.name || user.email}</h4>
                    <div 
                      className="role-badge"
                      style={{ 
                        backgroundColor: user.role === 'admin' ? '#ef4444' : 
                                        user.role === 'driver' ? '#3b82f6' : '#10b981'
                      }}
                    >
                      {user.role === 'admin' ? 'Admin' : 
                       user.role === 'driver' ? 'Förare' : 'Kund'}
                    </div>
                  </div>
                  
                  <div className="user-details">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Status:</strong> {user.status || 'Aktiv'}</p>
                    <p><strong>Skapad:</strong> {new Date(user.createdAt?.toDate?.() || new Date()).toLocaleString('sv-SE')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="messages-tab">
            <h3>Senaste meddelanden</h3>
            <div className="messages-list">
              {allMessages.map((message) => (
                <div key={message.id} className="message-card">
                  <div className="message-header">
                    <span className="sender-type">{message.senderType}</span>
                    <span className="message-time">
                      {new Date(message.createdAt?.toDate?.() || new Date()).toLocaleString('sv-SE')}
                    </span>
                  </div>
                  <div className="message-content">
                    <p><strong>Bokning:</strong> #{message.bookingId?.slice(-8)}</p>
                    <p><strong>Meddelande:</strong> {message.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="manage-tab">
            <h3>Hantera systemet</h3>
            
            <div className="management-section">
              <h4>Förarhantering</h4>
              <p>Skapa nya förare och hantera befintliga förare i systemet.</p>
              <button 
                className="action-btn primary"
                onClick={() => setShowCreateDriver(true)}
              >
                Skapa ny förare
              </button>
            </div>

            <div className="management-section">
              <h4>Användarhantering</h4>
              <p>Skapa nya användare (kunder) i systemet.</p>
              <button 
                className="action-btn tertiary"
                onClick={() => setShowCreateUser(true)}
              >
                Skapa ny användare
              </button>
            </div>

            <div className="management-section">
              <h4>Manuell bokning</h4>
              <p>Skapa bokningar manuellt för kunder som behöver hjälp.</p>
              <button 
                className="action-btn secondary"
                onClick={() => setShowCreateBooking(true)}
              >
                Skapa manuell bokning
              </button>
            </div>

            <div className="management-section">
              <h4>Systemstatistik</h4>
              <div className="system-stats">
                <div className="stat-item">
                  <span className="stat-label">Aktiva förare</span>
                  <span className="stat-value">{availableDrivers}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Väntande bokningar</span>
                  <span className="stat-value">{allBookings.filter(b => b.status === 'waiting').length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Slutförda idag</span>
                  <span className="stat-value">{allBookings.filter(b => {
                    const today = new Date();
                    const bookingDate = new Date(b.createdAt?.toDate?.() || new Date());
                    return b.status === 'completed' && 
                           bookingDate.toDateString() === today.toDateString();
                  }).length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Driver Modal */}
      {showCreateDriver && (
        <CreateDriverModal 
          onClose={() => setShowCreateDriver(false)}
          onSubmit={handleCreateDriver}
        />
      )}

      {/* Create Booking Modal */}
      {showCreateBooking && (
        <CreateBookingModal 
          onClose={() => setShowCreateBooking(false)}
          onSubmit={handleCreateBooking}
          drivers={allDrivers}
        />
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserModal 
          onClose={() => setShowCreateUser(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* Modal Components */}
      <style jsx>{`
        .admin-dashboard {
          padding: 2rem;
          background: #f8fafc;
          min-height: calc(100vh - 200px);
        }

        .admin-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .admin-tabs button {
          padding: 0.75rem 1.5rem;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .admin-tabs button:hover {
          color: #3b82f6;
        }

        .admin-tabs button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .admin-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .admin-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
        }

        .stat-card h3 {
          margin: 0 0 1rem 0;
          color: #64748b;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #1e293b;
        }

        .recent-activity h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .activity-info {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .booking-id {
          font-weight: 600;
          color: #3b82f6;
        }

        .customer-email {
          color: #64748b;
        }

        .status {
          font-weight: 500;
        }

        .activity-time {
          color: #64748b;
          font-size: 0.875rem;
        }

        .bookings-grid, .drivers-grid, .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .booking-card, .driver-card, .user-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .booking-header, .driver-header, .user-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .booking-header h4, .driver-header h4, .user-header h4 {
          margin: 0;
          color: #1e293b;
        }

        .status-badge, .role-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .booking-details, .driver-details, .user-details {
          margin-bottom: 1rem;
        }

        .booking-details p, .driver-details p, .user-details p {
          margin: 0.25rem 0;
          color: #64748b;
          font-size: 0.875rem;
        }

        .driver-info, .location-info {
          background: #e2e8f0;
          border-radius: 6px;
          padding: 0.75rem;
          margin-bottom: 1rem;
        }

        .driver-info p, .location-info p {
          margin: 0.25rem 0;
          color: #475569;
          font-size: 0.875rem;
        }

        .booking-actions, .driver-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .status-select {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
        }

        .delete-btn {
          padding: 0.5rem 1rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .delete-btn:hover {
          background: #dc2626;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .sender-type {
          background: #3b82f6;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .message-time {
          color: #64748b;
          font-size: 0.875rem;
        }

        .message-content p {
          margin: 0.25rem 0;
          color: #64748b;
          font-size: 0.875rem;
        }

        .manage-tab {
          padding: 1rem 0;
        }

        .manage-tab h3 {
          margin: 0 0 2rem 0;
          color: #1e293b;
          font-size: 1.5rem;
        }

        .management-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .management-section h4 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.25rem;
        }

        .management-section p {
          margin: 0 0 1.5rem 0;
          color: #64748b;
          font-size: 1rem;
        }

        .action-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: #3b82f6;
          color: white;
        }

        .action-btn.primary:hover {
          background: #2563eb;
        }

        .action-btn.secondary {
          background: #10b981;
          color: white;
        }

        .action-btn.secondary:hover {
          background: #059669;
        }

        .action-btn.tertiary {
          background: #8b5cf6;
          color: white;
        }

        .action-btn.tertiary:hover {
          background: #7c3aed;
        }

        .system-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .stat-item {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
        }

        .stat-label {
          display: block;
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

          .stat-value {
            display: block;
            color: #1e293b;
            font-size: 2rem;
            font-weight: bold;
          }

          /* Modal Styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .modal-title {
            margin: 0;
            color: #1e293b;
            font-size: 1.5rem;
          }

          .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #64748b;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .modal-close:hover {
            color: #1e293b;
          }

          .form-group {
            margin-bottom: 1.5rem;
          }

          .form-label {
            display: block;
            margin-bottom: 0.5rem;
            color: #374151;
            font-weight: 500;
          }

          .form-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
          }

          .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .form-select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
            background: white;
          }

          .modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 2rem;
          }

          .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.2s;
          }

          .btn-secondary {
            background: #6b7280;
            color: white;
          }

          .btn-secondary:hover {
            background: #4b5563;
          }

          .btn-primary {
            background: #3b82f6;
            color: white;
          }

          .btn-primary:hover {
            background: #2563eb;
          }

        @media (max-width: 768px) {
          .admin-dashboard {
            padding: 1rem;
          }

          .admin-tabs {
            flex-wrap: wrap;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .bookings-grid, .drivers-grid, .users-grid {
            grid-template-columns: 1fr;
          }

          .activity-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .booking-actions, .driver-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

// Create Driver Modal Component
function CreateDriverModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    car: '',
    licensePlate: '',
    status: 'available'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Skapa ny förare</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Namn</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">E-post</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Bil</label>
            <input
              type="text"
              name="car"
              value={formData.car}
              onChange={handleChange}
              className="form-input"
              placeholder="t.ex. Volvo XC60"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Registreringsnummer</label>
            <input
              type="text"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleChange}
              className="form-input"
              placeholder="t.ex. ABC123"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-select"
            >
              <option value="available">Tillgänglig</option>
              <option value="busy">Upptagen</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Avbryt
            </button>
            <button type="submit" className="btn btn-primary">
              Skapa förare
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Booking Modal Component
function CreateBookingModal({ onClose, onSubmit, drivers }: { onClose: () => void, onSubmit: (data: any) => void, drivers: any[] }) {
  const [formData, setFormData] = useState({
    customerEmail: '',
    customerPhone: '',
    pickup: {
      address: '',
      lat: 0,
      lng: 0
    },
    destination: {
      address: '',
      lat: 0,
      lng: 0
    },
    price: '',
    driverId: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      const parentData = formData[parent as keyof typeof formData] as any;
      setFormData({
        ...formData,
        [parent]: {
          ...parentData,
          [child]: name.includes('lat') || name.includes('lng') ? parseFloat(value) || 0 : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: name === 'price' ? parseFloat(value) || 0 : value
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Skapa manuell bokning</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Kund e-post</label>
            <input
              type="email"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Kund telefon</label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Hämtningsadress</label>
            <input
              type="text"
              name="pickup.address"
              value={formData.pickup.address}
              onChange={handleChange}
              className="form-input"
              placeholder="t.ex. Storgatan 1, Stockholm"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Destinationsadress</label>
            <input
              type="text"
              name="destination.address"
              value={formData.destination.address}
              onChange={handleChange}
              className="form-input"
              placeholder="t.ex. Centralstationen, Stockholm"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Pris (kr)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="form-input"
              min="0"
              step="0.01"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Tilldela förare (valfritt)</label>
            <select
              name="driverId"
              value={formData.driverId}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">Välj förare</option>
              {drivers.filter(d => d.status === 'available').map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.car}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Anteckningar</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-input"
              rows={3}
              placeholder="Eventuella specialförfrågningar eller information..."
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Avbryt
            </button>
            <button type="submit" className="btn btn-primary">
              Skapa bokning
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Skapa ny användare</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Namn</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">E-post</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Telefon</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Adress</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="form-input"
              placeholder="t.ex. Storgatan 1, Stockholm"
              required
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Avbryt
            </button>
            <button type="submit" className="btn btn-primary">
              Skapa användare
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}