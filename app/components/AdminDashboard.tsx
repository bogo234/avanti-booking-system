'use client';

import React, { useState, useEffect } from 'react';
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
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [createDriverError, setCreateDriverError] = useState('');
  const [createUserError, setCreateUserError] = useState('');
  const [createBookingError, setCreateBookingError] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  
  // Inline form states
  const [activeInlineForm, setActiveInlineForm] = useState('');
  const [inlineDriverData, setInlineDriverData] = useState({
    name: '', email: '', phone: '', car: '', licensePlate: '', password: '', confirmPassword: ''
  });
  const [inlineUserData, setInlineUserData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  const [inlineBookingData, setInlineBookingData] = useState({
    customerName: '', customerEmail: '', customerPhone: '', pickup: { address: '' }, 
    destination: { address: '' }, price: '', driverId: '', notes: ''
  });

  // Auto-assign per-booking loading state
  const [assigningId, setAssigningId] = useState<string | null>(null);

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
      if (!user) return;
      const idToken = await user.getIdToken(true).catch(() => null);
      const res = await fetch('/api/bookings/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ bookingId, newStatus: status }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || 'Kunde inte uppdatera status');
      }
    } catch (error) {
      // swallow; UI stays realtime synced
    }
  };

  const handleUpdateDriverStatus = async (driverId: string, status: string) => {
    try {
      await firebaseOperations.update('drivers', driverId, { status });
    } catch (error) {
      // Error is handled by Firebase operations
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (confirm('Är du säker på att du vill ta bort denna bokning?')) {
      try {
        await firebaseOperations.delete('bookings', bookingId);
      } catch (error) {
        // Error is handled by Firebase operations
      }
    }
  };

  // Auto-assign nearest available driver (admin-only route)
  const handleAutoAssign = async (bookingId: string) => {
    if (!user) return;
    setAssigningId(bookingId);
    try {
      const idToken = await user.getIdToken(true).catch(() => null);
      const res = await fetch('/api/auto-assign-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Kunde inte tilldela förare');
      }
      // Success: realtime subscriptions will refresh the UI
    } catch (e) {
      console.error('Auto-assign failed', e);
      alert('Kunde inte tilldela förare');
    } finally {
      setAssigningId(null);
    }
  };

  const handleCreateDriver = async (driverData: any) => {
    setIsCreatingDriver(true);
    setCreateDriverError('');
    
    try {
      // Validate required fields
      if (!driverData.name || !driverData.email || !driverData.phone || !driverData.car || !driverData.licensePlate || !driverData.password) {
        throw new Error('Alla fält måste fyllas i');
      }

      if (driverData.password !== driverData.confirmPassword) {
        throw new Error('Lösenorden matchar inte');
      }

      // Check if driver with same email already exists
      const existingDriver = allDrivers.find(d => d.email === driverData.email);
      if (existingDriver) {
        throw new Error('En förare med denna e-postadress finns redan');
      }

      // Create Firebase Auth account
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('../../lib/firebase');
      
      const userCredential = await createUserWithEmailAndPassword(auth, driverData.email, driverData.password);
      const firebaseUser = userCredential.user;

      // Create user profile
      const { createUserProfile } = await import('../../lib/user-management');
      await createUserProfile(firebaseUser, {
        name: driverData.name,
        phone: driverData.phone,
        role: 'driver'
      });

      // Create driver-specific data
      await firebaseOperations.create('drivers', {
        name: driverData.name,
        email: driverData.email,
        phone: driverData.phone,
        car: driverData.car,
        licensePlate: driverData.licensePlate,
        status: 'available',
        rating: 5.0,
        totalRides: 0,
        userId: firebaseUser.uid,
        createdAt: new Date(),
        createdBy: user?.uid || 'admin'
      });

      // Send welcome email (optional)
      try {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(firebaseUser);
      } catch (emailError) {
        // Email verification is optional, continue without it
      }
      
      setShowCreateDriver(false);
      setCreateDriverError('');
    } catch (error: any) {
      let errorMessage = 'Ett fel uppstod vid skapande av förare';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'E-postadressen används redan';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Lösenordet är för svagt';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Ogiltig e-postadress';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCreateDriverError(errorMessage);
    } finally {
      setIsCreatingDriver(false);
    }
  };

  const handleCreateBooking = async (bookingData: any) => {
    setIsCreatingBooking(true);
    setCreateBookingError('');
    
    try {
      if (editingBooking) {
        // Update existing booking
        await firebaseOperations.update('bookings', editingBooking.id, {
          ...bookingData,
          updatedAt: new Date()
        });
        setEditingBooking(null);
      } else {
        // Create new booking
        await firebaseOperations.create('bookings', {
          ...bookingData,
          status: 'waiting',
          createdAt: new Date()
        });
      }
      setShowCreateBooking(false);
    } catch (error: any) {
      setCreateBookingError(error instanceof Error ? error.message : 'Ett fel uppstod');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleCreateUser = async (userData: any) => {
    setIsCreatingUser(true);
    setCreateUserError('');
    
    try {
      // Validate required fields
      if (!userData.name || !userData.email || !userData.phone || !userData.password) {
        throw new Error('Alla fält måste fyllas i');
      }

      // Create Firebase Auth account
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('../../lib/firebase');
      
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;

      // Create user profile
      const { createUserProfile } = await import('../../lib/user-management');
      await createUserProfile(firebaseUser, {
        name: userData.name,
        phone: userData.phone,
        role: 'customer'
      });

      // Send welcome email (optional)
      try {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(firebaseUser);
      } catch (emailError) {
        // Email verification is optional, continue without it
      }
      
      setShowCreateUser(false);
      setCreateUserError('');
    } catch (error: any) {
      let errorMessage = 'Ett fel uppstod vid skapande av användare';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'E-postadressen används redan';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Lösenordet är för svagt';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Ogiltig e-postadress';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCreateUserError(errorMessage);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditBooking = (booking: any) => {
    setEditingBooking(booking);
    setShowCreateBooking(true);
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
          <span>Översikt</span>
        </button>
        <button 
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => setActiveTab('bookings')}
        >
          <span>Bokningar</span>
          <span className="tab-count">({totalBookings})</span>
        </button>
        <button 
          className={activeTab === 'drivers' ? 'active' : ''}
          onClick={() => setActiveTab('drivers')}
        >
          <span>Förare</span>
          <span className="tab-count">({totalDrivers})</span>
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          <span>Användare</span>
          <span className="tab-count">({totalUsers})</span>
        </button>
        <button 
          className={activeTab === 'messages' ? 'active' : ''}
          onClick={() => setActiveTab('messages')}
        >
          <span>Meddelanden</span>
        </button>
        <button 
          className={activeTab === 'manage' ? 'active' : ''}
          onClick={() => setActiveTab('manage')}
        >
          <span>Hantera</span>
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
                    <button 
                      onClick={() => handleEditBooking(booking)}
                      className="edit-btn"
                      style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: '#3b82f6',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        marginRight: '0.5rem',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Redigera
                    </button>
                    {/* Auto-assign button visible for unassigned waiting bookings */}
                    {booking.status === 'waiting' && !booking.driver && (
                      <button
                        onClick={() => handleAutoAssign(booking.id)}
                        className="status-btn"
                        disabled={assigningId === booking.id}
                        style={{
                          background: assigningId === booking.id ? '#6b7280' : '#10b981',
                          color: 'white',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: assigningId === booking.id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {assigningId === booking.id ? 'Tilldelar…' : 'Auto-assign förare'}
                      </button>
                    )}
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
            {/* Quick Actions at Top */}
            <div className="quick-actions-grid">
              <div className="quick-action-card">
                <div className="quick-action-header">
                  <div className="quick-action-icon primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4>Skapa förare</h4>
                  <p>Lägg till ny förare</p>
                </div>
                <button 
                  className={`compact-btn ${activeInlineForm === 'driver' ? 'active' : 'primary'}`}
                  onClick={() => setActiveInlineForm(activeInlineForm === 'driver' ? '' : 'driver')}
                >
                  {activeInlineForm === 'driver' ? 'Stäng' : 'Öppna formulär'}
                </button>
                
                {activeInlineForm === 'driver' && (
                  <CompactDriverForm 
                    data={inlineDriverData}
                    setData={setInlineDriverData}
                    onSubmit={handleCreateDriver}
                    isLoading={isCreatingDriver}
                    error={createDriverError}
                  />
                )}
              </div>

              <div className="quick-action-card">
                <div className="quick-action-header">
                  <div className="quick-action-icon secondary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h4>Skapa användare</h4>
                  <p>Lägg till ny kund</p>
                </div>
                <button 
                  className={`compact-btn ${activeInlineForm === 'user' ? 'active' : 'secondary'}`}
                  onClick={() => setActiveInlineForm(activeInlineForm === 'user' ? '' : 'user')}
                >
                  {activeInlineForm === 'user' ? 'Stäng' : 'Öppna formulär'}
                </button>
                
                {activeInlineForm === 'user' && (
                  <CompactUserForm 
                    data={inlineUserData}
                    setData={setInlineUserData}
                    onSubmit={handleCreateUser}
                    isLoading={isCreatingUser}
                    error={createUserError}
                  />
                )}
              </div>

              <div className="quick-action-card">
                <div className="quick-action-header">
                  <div className="quick-action-icon tertiary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h4>Manuell bokning</h4>
                  <p>Skapa bokning</p>
                </div>
                <button 
                  className={`compact-btn ${activeInlineForm === 'booking' ? 'active' : 'tertiary'}`}
                  onClick={() => setActiveInlineForm(activeInlineForm === 'booking' ? '' : 'booking')}
                >
                  {activeInlineForm === 'booking' ? 'Stäng' : 'Öppna formulär'}
                </button>
                
                {activeInlineForm === 'booking' && (
                  <CompactBookingForm 
                    data={inlineBookingData}
                    setData={setInlineBookingData}
                    onSubmit={handleCreateBooking}
                    drivers={allDrivers}
                    isLoading={isCreatingBooking}
                    error={createBookingError}
                  />
                )}
              </div>
            </div>

            {/* System Statistics */}
            <div className="system-stats-compact">
              <h3>Systemöversikt</h3>
              <div className="stats-row">
                <div className="stat-compact">
                  <span className="stat-label">Aktiva förare</span>
                  <span className="stat-value">{availableDrivers}</span>
                </div>
                <div className="stat-compact">
                  <span className="stat-label">Väntande bokningar</span>
                  <span className="stat-value">{allBookings.filter(b => b.status === 'waiting').length}</span>
                </div>
                <div className="stat-compact">
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
          onClose={() => {
            setShowCreateDriver(false);
            setCreateDriverError('');
          }}
          onSubmit={handleCreateDriver}
          isLoading={isCreatingDriver}
          error={createDriverError}
        />
      )}

      {/* Create/Edit Booking Modal */}
      {showCreateBooking && (
        <CreateBookingModal 
          onClose={() => {
            setShowCreateBooking(false);
            setEditingBooking(null);
            setCreateBookingError('');
          }}
          onSubmit={handleCreateBooking}
          drivers={allDrivers}
          existingBooking={editingBooking}
        />
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserModal 
          onClose={() => {
            setShowCreateUser(false);
            setCreateUserError('');
          }}
          onSubmit={handleCreateUser}
        />
      )}

    </div>
  );
}

// Premium Create Driver Modal Component
function CreateDriverModal({ onClose, onSubmit, isLoading, error }: { 
  onClose: () => void, 
  onSubmit: (data: any) => void,
  isLoading?: boolean,
  error?: string
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    car: '',
    licensePlate: '',
    status: 'available',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return;
    }
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div 
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl bg-white/8 backdrop-blur-xl border border-white/10"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 
            className="text-white/95 text-2xl font-semibold mb-2"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Skapa ny förare
          </h2>
          <p className="text-white/70 text-sm">Skapa ett komplett användarkonto för föraren</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">❌ {error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Förnamn</label>
              <input
                type="text"
                name="firstName"
                value={formData.name.split(' ')[0] || ''}
                onChange={(e) => setFormData({...formData, name: `${e.target.value} ${formData.name.split(' ').slice(1).join(' ')}`.trim()})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Förnamn"
                required
              />
            </div>
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Efternamn</label>
              <input
                type="text"
                name="lastName"
                value={formData.name.split(' ').slice(1).join(' ') || ''}
                onChange={(e) => setFormData({...formData, name: `${formData.name.split(' ')[0]} ${e.target.value}`.trim()})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Efternamn"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">E-post</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="forename@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Telefon</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="+46 70 123 45 67"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Bil</label>
              <input
                type="text"
                name="car"
                value={formData.car}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Volvo XC60"
                required
              />
            </div>
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Registreringsnummer</label>
              <input
                type="text"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="ABC123"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Lösenord</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Minst 6 tecken"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Bekräfta lösenord</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Upprepa lösenord"
              required
              minLength={6}
            />
          </div>
          
          {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-xs">Lösenorden matchar inte</p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              className="flex-1 px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all font-medium"
              onClick={onClose} 
              disabled={isLoading}
            >
              Avbryt
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || formData.password !== formData.confirmPassword}
            >
              {isLoading ? 'Skapar...' : 'Skapa förare'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Premium Create/Edit Booking Modal Component
function CreateBookingModal({ onClose, onSubmit, drivers, existingBooking }: { 
  onClose: () => void, 
  onSubmit: (data: any) => void, 
  drivers: any[],
  existingBooking?: any 
}) {
  const [formData, setFormData] = useState({
    customerEmail: '',
    customerPhone: '',
    customerName: '',
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
    notes: '',
    status: 'waiting'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form if editing existing booking
  React.useEffect(() => {
    if (existingBooking) {
      setFormData({
        customerEmail: existingBooking.customerEmail || existingBooking.customer?.email || '',
        customerPhone: existingBooking.customerPhone || existingBooking.customer?.phone || '',
        customerName: existingBooking.customerName || existingBooking.customer?.name || '',
        pickup: existingBooking.pickup || { address: '', lat: 0, lng: 0 },
        destination: existingBooking.destination || { address: '', lat: 0, lng: 0 },
        price: existingBooking.price || '',
        driverId: existingBooking.driverId || existingBooking.driver?.id || '',
        notes: existingBooking.notes || '',
        status: existingBooking.status || 'waiting'
      });
    }
  }, [existingBooking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsLoading(false);
    }
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div 
        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl bg-white/8 backdrop-blur-xl border border-white/10 my-8"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 
            className="text-white/95 text-2xl font-semibold mb-2"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {existingBooking ? 'Redigera bokning' : 'Skapa manuell bokning'}
          </h2>
          <p className="text-white/70 text-sm">
            {existingBooking ? 'Uppdatera bokningsinformation' : 'Skapa en bokning för en kund'}
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">❌ {error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Förnamn</label>
              <input
                type="text"
                name="customerFirstName"
                value={formData.customerName.split(' ')[0] || ''}
                onChange={(e) => setFormData({...formData, customerName: `${e.target.value} ${formData.customerName.split(' ').slice(1).join(' ')}`.trim()})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Förnamn"
                required
              />
            </div>
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Efternamn</label>
              <input
                type="text"
                name="customerLastName"
                value={formData.customerName.split(' ').slice(1).join(' ') || ''}
                onChange={(e) => setFormData({...formData, customerName: `${formData.customerName.split(' ')[0]} ${e.target.value}`.trim()})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Efternamn"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Kund e-post</label>
            <input
              type="email"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="kund@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Kund telefon</label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="+46 70 123 45 67"
              required
            />
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Hämtningsadress</label>
            <input
              type="text"
              name="pickup.address"
              value={formData.pickup.address}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Storgatan 1, Stockholm"
              required
            />
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Destinationsadress</label>
            <input
              type="text"
              name="destination.address"
              value={formData.destination.address}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Centralstationen, Stockholm"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Pris (kr)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                min="0"
                step="0.01"
                placeholder="299"
                required
              />
            </div>
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              >
                <option value="waiting">Väntar på förare</option>
                <option value="accepted">Förare tilldelad</option>
                <option value="on_way">På väg till kund</option>
                <option value="arrived">Anlänt</option>
                <option value="completed">Slutförd</option>
                <option value="cancelled">Avbruten</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Tilldela förare (valfritt)</label>
            <select
              name="driverId"
              value={formData.driverId}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            >
              <option value="">Välj förare</option>
              {drivers.filter(d => d.status === 'available' || d.id === formData.driverId).map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.car} {driver.status !== 'available' ? `(${driver.status})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Anteckningar</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
              rows={3}
              placeholder="Eventuella specialförfrågningar eller information..."
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              className="flex-1 px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all font-medium"
              onClick={onClose} 
              disabled={isLoading}
            >
              Avbryt
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Sparar...' : (existingBooking ? 'Uppdatera bokning' : 'Skapa bokning')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Premium Create User Modal Component
function CreateUserModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Lösenorden matchar inte');
      return;
    }
    if (formData.password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const userData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        role: 'customer'
      };
      await onSubmit(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div 
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl bg-white/8 backdrop-blur-xl border border-white/10"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 
            className="text-white/95 text-2xl font-semibold mb-2"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Skapa ny användare
          </h2>
          <p className="text-white/70 text-sm">Skapa ett komplett användarkonto för kunden</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">❌ {error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Förnamn</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Förnamn"
                required
              />
            </div>
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Efternamn</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="Efternamn"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">E-post</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="kund@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Telefon</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="+46 70 123 45 67"
              required
            />
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Adress</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Storgatan 1, Stockholm"
              required
            />
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Lösenord</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Minst 6 tecken"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-white/90 text-sm font-medium mb-2">Bekräfta lösenord</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Upprepa lösenord"
              required
              minLength={6}
            />
          </div>
          
          {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-xs">Lösenorden matchar inte</p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              className="flex-1 px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all font-medium"
              onClick={onClose} 
              disabled={isLoading}
            >
              Avbryt
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || formData.password !== formData.confirmPassword}
            >
              {isLoading ? 'Skapar...' : 'Skapa användare'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Compact Driver Form Component
function CompactDriverForm({ data, setData, onSubmit, isLoading, error }: {
  data: any, setData: any, onSubmit: any, isLoading: boolean, error: string
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  const handleChange = (field: string, value: string) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="compact-form">
      {error && (
        <div className="compact-error">
          <span>❌ {error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="compact-form-grid">
        <div className="form-row">
          <input
            type="text"
            placeholder="Förnamn Efternamn"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="compact-input"
            required
          />
          <input
            type="email"
            placeholder="E-post"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="compact-input"
            required
          />
        </div>
        
        <div className="form-row">
          <input
            type="tel"
            placeholder="Telefon"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="compact-input"
            required
          />
          <input
            type="text"
            placeholder="Bil (t.ex. Volvo XC60)"
            value={data.car}
            onChange={(e) => handleChange('car', e.target.value)}
            className="compact-input"
            required
          />
        </div>
        
        <div className="form-row">
          <input
            type="text"
            placeholder="Registreringsnummer"
            value={data.licensePlate}
            onChange={(e) => handleChange('licensePlate', e.target.value)}
            className="compact-input"
            required
          />
          <input
            type="password"
            placeholder="Lösenord"
            value={data.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className="compact-input"
            required
            minLength={6}
          />
        </div>
        
        <div className="form-row">
          <input
            type="password"
            placeholder="Bekräfta lösenord"
            value={data.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            className="compact-input"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={isLoading || data.password !== data.confirmPassword}
            className="compact-submit-btn primary"
          >
            {isLoading ? 'Skapar...' : 'Skapa förare'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Compact User Form Component
function CompactUserForm({ data, setData, onSubmit, isLoading, error }: {
  data: any, setData: any, onSubmit: any, isLoading: boolean, error: string
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password
    });
  };

  const handleChange = (field: string, value: string) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="compact-form">
      {error && (
        <div className="compact-error">
          <span>❌ {error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="compact-form-grid">
        <div className="form-row">
          <input
            type="text"
            placeholder="Förnamn Efternamn"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="compact-input"
            required
          />
          <input
            type="email"
            placeholder="E-post"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="compact-input"
            required
          />
        </div>
        
        <div className="form-row">
          <input
            type="tel"
            placeholder="Telefon"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="compact-input"
            required
          />
          <input
            type="password"
            placeholder="Lösenord"
            value={data.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className="compact-input"
            required
            minLength={6}
          />
        </div>
        
        <div className="form-row">
          <input
            type="password"
            placeholder="Bekräfta lösenord"
            value={data.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            className="compact-input"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={isLoading || data.password !== data.confirmPassword}
            className="compact-submit-btn secondary"
          >
            {isLoading ? 'Skapar...' : 'Skapa användare'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Compact Booking Form Component
function CompactBookingForm({ data, setData, onSubmit, drivers, isLoading, error }: {
  data: any, setData: any, onSubmit: any, drivers: any[], isLoading: boolean, error: string
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  const handleChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setData((prev: any) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="compact-form">
      {error && (
        <div className="compact-error">
          <span>❌ {error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="compact-form-grid">
        <div className="form-row">
          <input
            type="text"
            placeholder="Kundnamn"
            value={data.customerName}
            onChange={(e) => handleChange('customerName', e.target.value)}
            className="compact-input"
            required
          />
          <input
            type="email"
            placeholder="Kund e-post"
            value={data.customerEmail}
            onChange={(e) => handleChange('customerEmail', e.target.value)}
            className="compact-input"
            required
          />
        </div>
        
        <div className="form-row">
          <input
            type="tel"
            placeholder="Kund telefon"
            value={data.customerPhone}
            onChange={(e) => handleChange('customerPhone', e.target.value)}
            className="compact-input"
            required
          />
          <input
            type="number"
            placeholder="Pris (kr)"
            value={data.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="compact-input"
            required
            min="0"
          />
        </div>
        
        <div className="form-row">
          <input
            type="text"
            placeholder="Hämtningsadress"
            value={data.pickup.address}
            onChange={(e) => handleChange('pickup.address', e.target.value)}
            className="compact-input"
            required
          />
          <input
            type="text"
            placeholder="Destinationsadress"
            value={data.destination.address}
            onChange={(e) => handleChange('destination.address', e.target.value)}
            className="compact-input"
            required
          />
        </div>
        
        <div className="form-row">
          <select
            value={data.driverId}
            onChange={(e) => handleChange('driverId', e.target.value)}
            className="compact-input"
          >
            <option value="">Välj förare (valfritt)</option>
            {drivers.filter(d => d.status === 'available').map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name} - {driver.car}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isLoading}
            className="compact-submit-btn tertiary"
          >
            {isLoading ? 'Skapar...' : 'Skapa bokning'}
          </button>
        </div>
        
        {data.notes !== undefined && (
          <div className="form-row full-width">
            <textarea
              placeholder="Anteckningar (valfritt)"
              value={data.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="compact-textarea"
              rows={2}
            />
          </div>
        )}
      </form>
    </div>
  );
}