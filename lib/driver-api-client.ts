import { auth } from './firebase';
import { AuthApiError, RateLimitError } from './auth-api-client';

// Types för Driver API responses
export interface DriverStatus {
  id: string;
  name: string;
  email: string;
  phone?: string;
  car?: string;
  licensePlate?: string;
  status: 'available' | 'busy' | 'offline';
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    updatedAt: string;
  };
  rating: number;
  totalRatings: number;
}

export interface DriverStatistics {
  today: {
    bookings: number;
    earnings: number;
  };
  week: {
    bookings: number;
    earnings: number;
  };
  month: {
    bookings: number;
    earnings: number;
  };
}

export interface BookingForDriver {
  id: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  pickup: {
    address: string;
    time: string;
    coordinates?: { lat: number; lng: number };
  };
  destination: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  service: 'standard' | 'premium' | 'luxury';
  status: string;
  price: number;
  createdAt: string;
  estimatedDuration?: number;
  distance?: number;
}

export interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

class DriverApiClient {
  private baseUrl = '';

  // Hämta auth token från Firebase
  private async getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new AuthApiError('User not authenticated', 401, 'NO_AUTH');
    }
    
    try {
      return await user.getIdToken(true); // Force refresh
    } catch (error) {
      throw new AuthApiError('Failed to get auth token', 401, 'TOKEN_ERROR');
    }
  }

  // Generic API request method
  private async apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.baseUrl}/api/driver${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      // Handle rate limiting
      if (response.status === 429) {
        throw new RateLimitError(
          data.error || 'Too many requests',
          data.resetIn || data.waitTime || 60
        );
      }

      // Handle other errors
      if (!response.ok) {
        throw new AuthApiError(
          data.error || 'API request failed',
          response.status,
          data.code,
          data.details
        );
      }

      return data;
    } catch (error) {
      if (error instanceof AuthApiError || error instanceof RateLimitError) {
        throw error;
      }
      
      // Network or other errors
      throw new AuthApiError(
        'Network error or server unavailable',
        500,
        'NETWORK_ERROR'
      );
    }
  }

  // Hämta förarens status och statistik
  async getDriverStatus(): Promise<{
    driver: DriverStatus;
    statistics: DriverStatistics;
    currentBooking: BookingForDriver | null;
    recentRatings: Array<{
      rating: number;
      feedback?: string;
      completedAt: string;
    }>;
  }> {
    return await this.apiRequest('/status');
  }

  // Uppdatera förarens status
  async updateDriverStatus(
    status: 'available' | 'busy' | 'offline',
    location?: LocationUpdate
  ): Promise<{ status: string; updatedAt: string }> {
    const response = await this.apiRequest('/status', {
      method: 'PUT',
      body: JSON.stringify({ status, location }),
    });
    return response;
  }

  // Uppdatera endast plats (för live tracking)
  async updateLocation(location: LocationUpdate): Promise<{
    location: LocationUpdate & { updatedAt: string };
  }> {
    const response = await this.apiRequest('/status', {
      method: 'POST',
      body: JSON.stringify({ location }),
    });
    return response;
  }

  // Hämta tillgängliga bokningar
  async getAvailableBookings(limit: number = 20): Promise<{
    bookings: BookingForDriver[];
    pagination: { count: number; hasMore: boolean };
  }> {
    const response = await this.apiRequest(
      `/bookings?status=available&limit=${limit}`
    );
    return {
      bookings: response.bookings,
      pagination: response.pagination
    };
  }

  // Hämta förarens tilldelade bokningar
  async getAssignedBookings(limit: number = 20): Promise<{
    bookings: BookingForDriver[];
    statistics: {
      totalBookings: number;
      totalEarnings: number;
      averageRating: number;
      totalRatings: number;
    };
    pagination: { count: number; hasMore: boolean };
  }> {
    return await this.apiRequest(`/bookings?status=assigned&limit=${limit}`);
  }

  // Hämta slutförda bokningar
  async getCompletedBookings(limit: number = 20): Promise<{
    bookings: BookingForDriver[];
    statistics: {
      totalBookings: number;
      totalEarnings: number;
      averageRating: number;
      totalRatings: number;
    };
    pagination: { count: number; hasMore: boolean };
  }> {
    return await this.apiRequest(`/bookings?status=completed&limit=${limit}`);
  }

  // Acceptera bokning
  async acceptBooking(
    bookingId: string,
    location?: LocationUpdate,
    notes?: string
  ): Promise<{
    booking: { id: string; status: string; updatedAt: string };
  }> {
    const response = await this.apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        bookingId,
        action: 'accept',
        location,
        notes
      }),
    });
    return response;
  }

  // Avvisa bokning
  async rejectBooking(
    bookingId: string,
    notes?: string
  ): Promise<{
    booking: { id: string; status: string; updatedAt: string };
  }> {
    const response = await this.apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        bookingId,
        action: 'reject',
        notes
      }),
    });
    return response;
  }

  // Starta resa (på väg)
  async startTrip(
    bookingId: string,
    location?: LocationUpdate,
    notes?: string
  ): Promise<{
    booking: { id: string; status: string; updatedAt: string };
  }> {
    const response = await this.apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        bookingId,
        action: 'start',
        location,
        notes
      }),
    });
    return response;
  }

  // Markera som anlände
  async arriveAtPickup(
    bookingId: string,
    location?: LocationUpdate,
    notes?: string
  ): Promise<{
    booking: { id: string; status: string; updatedAt: string };
  }> {
    const response = await this.apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        bookingId,
        action: 'arrive',
        location,
        notes
      }),
    });
    return response;
  }

  // Slutför resa
  async completeTrip(
    bookingId: string,
    location?: LocationUpdate,
    notes?: string
  ): Promise<{
    booking: { id: string; status: string; updatedAt: string };
  }> {
    const response = await this.apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        bookingId,
        action: 'complete',
        location,
        notes
      }),
    });
    return response;
  }

  // Utility methods
  async healthCheck(): Promise<boolean> {
    try {
      await this.getDriverStatus();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Location tracking utilities
  startLocationTracking(
    onLocationUpdate: (location: LocationUpdate) => void,
    options: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
      updateInterval?: number;
    } = {}
  ): { stop: () => void } {
    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 30000,
      updateInterval = 10000 // Update every 10 seconds
    } = options;

    let watchId: number | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let lastKnownLocation: LocationUpdate | null = null;

    const updateLocation = async (location: LocationUpdate) => {
      try {
        await this.updateLocation(location);
        onLocationUpdate(location);
      } catch (error) {
        console.warn('Failed to update location:', error);
      }
    };

    // Start watching position
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: LocationUpdate = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp
          };
          
          lastKnownLocation = location;
          updateLocation(location);
        },
        (error) => {
          console.error('Location error:', error);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge
        }
      );

      // Also update location at regular intervals
      intervalId = setInterval(() => {
        if (lastKnownLocation) {
          updateLocation({
            ...lastKnownLocation,
            timestamp: Date.now()
          });
        }
      }, updateInterval);
    }

    // Return stop function
    return {
      stop: () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
        if (intervalId !== null) {
          clearInterval(intervalId);
        }
      }
    };
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Estimate travel time based on distance and average speed
  estimateTravelTime(distanceKm: number, averageSpeedKmh: number = 40): number {
    return Math.round((distanceKm / averageSpeedKmh) * 60); // Minutes
  }
}

// Export singleton instance
export const driverApiClient = new DriverApiClient();

export { AuthApiError, RateLimitError };
