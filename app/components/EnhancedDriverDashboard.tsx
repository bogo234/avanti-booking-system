'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  driverApiClient, 
  DriverStatus, 
  DriverStatistics, 
  BookingForDriver, 
  LocationUpdate,
  AuthApiError,
  RateLimitError
} from '../../lib/driver-api-client';

interface EnhancedDriverDashboardProps {
  className?: string;
}

export default function EnhancedDriverDashboard({ className }: EnhancedDriverDashboardProps) {
  const { user, userRole } = useAuth();
  
  // Driver state
  const [driverStatus, setDriverStatus] = useState<DriverStatus | null>(null);
  const [statistics, setStatistics] = useState<DriverStatistics | null>(null);
  const [currentBooking, setCurrentBooking] = useState<BookingForDriver | null>(null);
  const [availableBookings, setAvailableBookings] = useState<BookingForDriver[]>([]);
  const [recentRatings, setRecentRatings] = useState<any[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  
  // Location tracking
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locationTracker, setLocationTracker] = useState<{ stop: () => void } | null>(null);

  // Load initial data
  const loadDriverData = useCallback(async () => {
    if (!user || userRole !== 'driver') return;
    
    try {
      setIsLoading(true);
      setError('');
      
      // Load driver status and statistics
      const statusData = await driverApiClient.getDriverStatus();
      setDriverStatus(statusData.driver);
      setStatistics(statusData.statistics);
      setCurrentBooking(statusData.currentBooking);
      setRecentRatings(statusData.recentRatings);
      
      // Load available bookings if driver is available
      if (statusData.driver.status === 'available') {
        const availableData = await driverApiClient.getAvailableBookings(10);
        setAvailableBookings(availableData.bookings);
      }
      
      // Set location tracking if driver is online
      if (['available', 'busy'].includes(statusData.driver.status)) {
        setIsLocationTracking(true);
      }
      
    } catch (error: any) {
      console.error('Failed to load driver data:', error);
      
      if (error instanceof AuthApiError) {
        setError(error.message);
      } else {
        setError('Kunde inte ladda förardata. Försök igen.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, userRole]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadDriverData();
  }, [loadDriverData]);

  // Start/stop location tracking based on status
  useEffect(() => {
    if (isLocationTracking && driverStatus && ['available', 'busy'].includes(driverStatus.status)) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    
    return () => stopLocationTracking();
  }, [isLocationTracking, driverStatus?.status]);

  // Location tracking functions
  const startLocationTracking = useCallback(() => {
    if (locationTracker) return; // Already tracking
    
    setLocationError('');
    
    const tracker = driverApiClient.startLocationTracking(
      (location) => {
        setCurrentLocation(location);
        setLocationError('');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
        updateInterval: 15000 // Update every 15 seconds
      }
    );
    
    setLocationTracker(tracker);
  }, [locationTracker]);

  const stopLocationTracking = useCallback(() => {
    if (locationTracker) {
      locationTracker.stop();
      setLocationTracker(null);
    }
  }, [locationTracker]);

  // Status update functions
  const handleStatusChange = async (newStatus: 'available' | 'busy' | 'offline') => {
    if (!driverStatus) return;
    
    setIsUpdatingStatus(true);
    setError('');
    setSuccess('');
    
    try {
      await driverApiClient.updateDriverStatus(newStatus, currentLocation || undefined);
      
      setDriverStatus({ ...driverStatus, status: newStatus });
      setSuccess(`Status ändrad till ${getStatusText(newStatus)}`);
      
      // Update location tracking based on new status
      setIsLocationTracking(['available', 'busy'].includes(newStatus));
      
      // Reload available bookings if going online
      if (newStatus === 'available') {
        const availableData = await driverApiClient.getAvailableBookings(10);
        setAvailableBookings(availableData.bookings);
      } else {
        setAvailableBookings([]);
      }
      
    } catch (error: any) {
      console.error('Failed to update status:', error);
      
      if (error instanceof RateLimitError) {
        setError(`För många statusändringar. Vänta ${error.resetIn} sekunder.`);
      } else if (error instanceof AuthApiError) {
        setError(error.message);
      } else {
        setError('Kunde inte ändra status. Försök igen.');
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Booking action functions
  const handleAcceptBooking = async (bookingId: string) => {
    setError('');
    setSuccess('');
    
    try {
      await driverApiClient.acceptBooking(bookingId, currentLocation || undefined);
      
      setSuccess('Bokning accepterad!');
      
      // Reload data
      await loadDriverData();
      
    } catch (error: any) {
      console.error('Failed to accept booking:', error);
      
      if (error instanceof AuthApiError) {
        if (error.message.includes('no longer available')) {
          setError('Bokningen är inte längre tillgänglig');
          // Remove from available bookings
          setAvailableBookings(prev => prev.filter(b => b.id !== bookingId));
        } else {
          setError(error.message);
        }
      } else {
        setError('Kunde inte acceptera bokning. Försök igen.');
      }
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'start' | 'arrive' | 'complete') => {
    setError('');
    setSuccess('');
    
    try {
      let result;
      switch (action) {
        case 'start':
          result = await driverApiClient.startTrip(bookingId, currentLocation || undefined);
          setSuccess('Resa påbörjad - på väg till kunden');
          break;
        case 'arrive':
          result = await driverApiClient.arriveAtPickup(bookingId, currentLocation || undefined);
          setSuccess('Markerad som anlände');
          break;
        case 'complete':
          result = await driverApiClient.completeTrip(bookingId, currentLocation || undefined);
          setSuccess('Resa slutförd!');
          break;
      }
      
      // Reload data
      await loadDriverData();
      
    } catch (error: any) {
      console.error(`Failed to ${action} booking:`, error);
      
      if (error instanceof AuthApiError) {
        setError(error.message);
      } else {
        setError(`Kunde inte ${action === 'start' ? 'starta' : action === 'arrive' ? 'markera som anlände' : 'slutföra'} resa. Försök igen.`);
      }
    }
  };

  // Utility functions
  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Tillgänglig';
      case 'busy': return 'Upptagen';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400';
      case 'busy': return 'text-yellow-400';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(amount);
  };

  const formatDistance = (distanceKm: number) => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className || ''}`}>
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin mx-auto"></div>
          <p className="text-white/70">Laddar förarpanel...</p>
        </div>
      </div>
    );
  }

  // Not a driver
  if (userRole !== 'driver') {
    return (
      <div className={`text-center p-8 ${className || ''}`}>
        <p className="text-white/70">Du har inte behörighet att se förarpanelen.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header with Status Controls */}
      <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white/95">Förarpanel</h1>
            <p className="text-white/60 text-sm">
              Välkommen tillbaka, {driverStatus?.name || 'Förare'}!
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Location Status */}
            <div className="flex items-center gap-2 text-sm text-white/60">
              {isLocationTracking ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>GPS aktiv</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span>GPS inaktiv</span>
                </>
              )}
            </div>
            
            {/* Current Status */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(driverStatus?.status || 'offline')}`}>
              {getStatusText(driverStatus?.status || 'offline')}
            </div>
          </div>
        </div>

        {/* Status Controls */}
        <div className="flex gap-3">
          <button
            onClick={() => handleStatusChange('available')}
            disabled={isUpdatingStatus || driverStatus?.status === 'available'}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              driverStatus?.status === 'available'
                ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            {isUpdatingStatus ? 'Uppdaterar...' : 'Tillgänglig'}
          </button>
          
          <button
            onClick={() => handleStatusChange('busy')}
            disabled={isUpdatingStatus || driverStatus?.status === 'busy'}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              driverStatus?.status === 'busy'
                ? 'bg-yellow-500/20 text-yellow-400 cursor-not-allowed'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            Upptagen
          </button>
          
          <button
            onClick={() => handleStatusChange('offline')}
            disabled={isUpdatingStatus || driverStatus?.status === 'offline'}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              driverStatus?.status === 'offline'
                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            Offline
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {locationError && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-yellow-400 text-sm">GPS: {locationError}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/80 text-sm font-medium">Idag</h3>
              <span className="text-2xl">📊</span>
            </div>
            <div className="space-y-1">
              <p className="text-white/90 text-lg font-semibold">
                {formatCurrency(statistics.today.earnings)}
              </p>
              <p className="text-white/60 text-sm">
                {statistics.today.bookings} resor
              </p>
            </div>
          </div>

          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/80 text-sm font-medium">Denna vecka</h3>
              <span className="text-2xl">📈</span>
            </div>
            <div className="space-y-1">
              <p className="text-white/90 text-lg font-semibold">
                {formatCurrency(statistics.week.earnings)}
              </p>
              <p className="text-white/60 text-sm">
                {statistics.week.bookings} resor
              </p>
            </div>
          </div>

          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/80 text-sm font-medium">Rating</h3>
              <span className="text-2xl">⭐</span>
            </div>
            <div className="space-y-1">
              <p className="text-white/90 text-lg font-semibold">
                {driverStatus?.rating.toFixed(1) || '0.0'}
              </p>
              <p className="text-white/60 text-sm">
                {driverStatus?.totalRatings || 0} omdömen
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Booking */}
      {currentBooking && (
        <div className="rounded-2xl p-6 bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white/90">Aktuell resa</h2>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
              {getStatusText(currentBooking.status)}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-white/70 text-sm mb-1">Kund</h4>
              <p className="text-white/90">{currentBooking.customer.name}</p>
              <p className="text-white/60 text-sm">{currentBooking.customer.phone}</p>
            </div>
            
            <div>
              <h4 className="text-white/70 text-sm mb-1">Pris</h4>
              <p className="text-white/90 text-lg font-semibold">
                {formatCurrency(currentBooking.price)}
              </p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <div>
              <h4 className="text-white/70 text-sm mb-1">Upphämtning</h4>
              <p className="text-white/90">{currentBooking.pickup.address}</p>
              <p className="text-white/60 text-sm">{currentBooking.pickup.time}</p>
            </div>
            
            <div>
              <h4 className="text-white/70 text-sm mb-1">Destination</h4>
              <p className="text-white/90">{currentBooking.destination.address}</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            {currentBooking.status === 'accepted' && (
              <button
                onClick={() => handleBookingAction(currentBooking.id, 'start')}
                className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-colors"
              >
                🚗 Påbörja resa
              </button>
            )}
            
            {currentBooking.status === 'on_way' && (
              <button
                onClick={() => handleBookingAction(currentBooking.id, 'arrive')}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors"
              >
                📍 Markera som anlände
              </button>
            )}
            
            {['arrived', 'started'].includes(currentBooking.status) && (
              <button
                onClick={() => handleBookingAction(currentBooking.id, 'complete')}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-500/30 transition-colors"
              >
                ✅ Slutför resa
              </button>
            )}
          </div>
        </div>
      )}

      {/* Available Bookings */}
      {availableBookings.length > 0 && driverStatus?.status === 'available' && (
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white/90">Tillgängliga resor</h2>
            <span className="text-white/60 text-sm">
              {availableBookings.length} tillgängliga
            </span>
          </div>
          
          <div className="space-y-4">
            {availableBookings.map((booking) => (
              <div key={booking.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-white/70 text-sm mb-1">Från</h4>
                    <p className="text-white/90 text-sm">{booking.pickup.address}</p>
                    <p className="text-white/60 text-xs">{booking.pickup.time}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-white/70 text-sm mb-1">Till</h4>
                    <p className="text-white/90 text-sm">{booking.destination.address}</p>
                    {booking.distance && (
                      <p className="text-white/60 text-xs">
                        {formatDistance(booking.distance)}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white/70 text-sm mb-1">Pris</h4>
                      <p className="text-white/90 font-semibold">
                        {formatCurrency(booking.price)}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleAcceptBooking(booking.id)}
                      className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-colors"
                    >
                      Acceptera
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Available Bookings */}
      {availableBookings.length === 0 && driverStatus?.status === 'available' && (
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-white/90 text-lg font-medium mb-2">Inga resor tillgängliga</h3>
          <p className="text-white/60 text-sm mb-4">
            Vi söker efter nya bokningar åt dig. Håll dig tillgänglig!
          </p>
          <button
            onClick={loadDriverData}
            className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/15 transition-colors"
          >
            🔄 Uppdatera
          </button>
        </div>
      )}

      {/* Recent Ratings */}
      {recentRatings.length > 0 && (
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
          <h2 className="text-lg font-medium text-white/90 mb-4">Senaste omdömen</h2>
          <div className="space-y-3">
            {recentRatings.map((rating, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${
                        i < rating.rating ? 'text-yellow-400' : 'text-gray-600'
                      }`}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
                <div className="flex-1">
                  {rating.feedback && (
                    <p className="text-white/80 text-sm mb-1">"{rating.feedback}"</p>
                  )}
                  <p className="text-white/50 text-xs">
                    {new Date(rating.completedAt).toLocaleDateString('sv-SE')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
