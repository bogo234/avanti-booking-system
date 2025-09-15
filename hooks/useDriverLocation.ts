import { useState, useEffect, useCallback } from 'react';

interface Location {
  lat: number;
  lng: number;
}

interface UseDriverLocationProps {
  driverId?: string;
  bookingId?: string;
  enabled?: boolean;
}

export function useDriverLocation({ 
  driverId, 
  bookingId, 
  enabled = true 
}: UseDriverLocationProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateLocation = useCallback(async (newLocation: Location) => {
    if (!driverId) return;

    setLoading(true);
    setError('');

    try {
      const idToken = await (await import('../lib/firebase')).auth.currentUser?.getIdToken(true).catch(() => null);
      const response = await fetch('/api/update-driver-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          driverId,
          location: newLocation,
          bookingId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update location');
      }

      setLocation(newLocation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    } finally {
      setLoading(false);
    }
  }, [driverId, bookingId]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLocation);
        updateLocation(newLocation);
      },
      (error) => {
        setError(`Geolocation error: ${error.message}`);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, [updateLocation]);

  const startLocationTracking = useCallback(() => {
    if (!enabled || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLocation);
        updateLocation(newLocation);
      },
      (error) => {
        setError(`Geolocation error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // 30 seconds
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, updateLocation]);

  useEffect(() => {
    if (enabled && driverId) {
      getCurrentLocation();
    }
  }, [enabled, driverId, getCurrentLocation]);

  return {
    location,
    loading,
    error,
    updateLocation,
    getCurrentLocation,
    startLocationTracking,
  };
}
