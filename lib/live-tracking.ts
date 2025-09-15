// Advanced Live Tracking utilities for Avanti Booking System
import { googleMapsClient, Coordinates } from './google-maps-enhanced';
import { driverApiClient } from './driver-api-client';

// Live tracking configuration
export const LiveTrackingConfig = {
  // Update intervals in milliseconds
  updateIntervals: {
    high: 5000,      // 5 seconds - active trip
    medium: 15000,   // 15 seconds - en route
    low: 30000,      // 30 seconds - available
    idle: 60000      // 1 minute - idle/offline
  },
  
  // Accuracy thresholds in meters
  accuracyThresholds: {
    excellent: 10,   // < 10m
    good: 50,        // 10-50m
    fair: 100,       // 50-100m
    poor: 200        // > 100m
  },
  
  // Distance thresholds in meters
  distanceThresholds: {
    significant: 50,  // Minimum distance to trigger update
    arrival: 100,     // Distance to consider "arrived"
    nearbyDriver: 1000, // Distance to show driver as "nearby"
    maxTracking: 50000  // Maximum tracking distance (50km)
  },
  
  // Speed limits in km/h
  speedLimits: {
    walking: 10,
    cycling: 30,
    driving: 200,
    unrealistic: 300  // Flag for potential GPS errors
  }
};

// Location data interface
export interface LocationData {
  coordinates: Coordinates;
  accuracy: number;
  heading?: number;
  speed?: number; // km/h
  altitude?: number;
  timestamp: number;
  source: 'gps' | 'network' | 'passive';
}

// Tracking status interface
export interface TrackingStatus {
  isTracking: boolean;
  accuracy: 'excellent' | 'good' | 'fair' | 'poor';
  lastUpdate: Date;
  updateInterval: number;
  batteryOptimized: boolean;
  errorCount: number;
}

// Trip tracking data
export interface TripTracking {
  bookingId: string;
  driverId: string;
  customerId: string;
  status: 'waiting' | 'accepted' | 'on_way' | 'arrived' | 'started' | 'completed';
  startLocation?: Coordinates;
  endLocation?: Coordinates;
  currentLocation?: LocationData;
  route?: {
    polyline: string;
    distance: number;
    estimatedDuration: number;
  };
  eta?: Date;
  totalDistance?: number;
  totalDuration?: number;
}

// Live tracking manager class
export class LiveTrackingManager {
  private trackingStatus: TrackingStatus = {
    isTracking: false,
    accuracy: 'poor',
    lastUpdate: new Date(),
    updateInterval: LiveTrackingConfig.updateIntervals.low,
    batteryOptimized: true,
    errorCount: 0
  };

  private watchId: number | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private lastKnownLocation: LocationData | null = null;
  private listeners: Map<string, Function[]> = new Map();

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Start live tracking
  async startTracking(options: {
    bookingId?: string;
    updateInterval?: number;
    highAccuracy?: boolean;
    batteryOptimized?: boolean;
  } = {}): Promise<{ success: boolean; error?: string }> {
    
    if (this.trackingStatus.isTracking) {
      return { success: false, error: 'Tracking already active' };
    }

    if (!navigator.geolocation) {
      return { success: false, error: 'Geolocation not supported' };
    }

    const {
      bookingId,
      updateInterval = LiveTrackingConfig.updateIntervals.medium,
      highAccuracy = true,
      batteryOptimized = true
    } = options;

    try {
      // Request initial position to test permissions
      const initialPosition = await this.getCurrentPosition({
        enableHighAccuracy: highAccuracy,
        timeout: 10000,
        maximumAge: 30000
      });

      if (!initialPosition.success) {
        return { success: false, error: initialPosition.error };
      }

      // Update tracking status
      this.trackingStatus = {
        isTracking: true,
        accuracy: this.getAccuracyLevel(initialPosition.location!.accuracy),
        lastUpdate: new Date(),
        updateInterval,
        batteryOptimized,
        errorCount: 0
      };

      // Start continuous tracking
      this.startContinuousTracking({
        enableHighAccuracy: highAccuracy && !batteryOptimized,
        timeout: batteryOptimized ? 15000 : 10000,
        maximumAge: batteryOptimized ? 60000 : 30000
      });

      // Start periodic updates
      this.startPeriodicUpdates(updateInterval, bookingId);

      this.emit('trackingStarted', { 
        bookingId, 
        location: initialPosition.location,
        status: this.trackingStatus 
      });

      console.log('Live tracking started', { bookingId, updateInterval, highAccuracy });
      
      return { success: true };

    } catch (error: any) {
      console.error('Failed to start tracking:', error);
      return { success: false, error: error.message };
    }
  }

  // Stop live tracking
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.trackingStatus.isTracking = false;
    this.emit('trackingStopped', { lastLocation: this.lastKnownLocation });
    
    console.log('Live tracking stopped');
  }

  // Get current position
  async getCurrentPosition(options: PositionOptions = {}): Promise<{
    success: boolean;
    location?: LocationData;
    error?: string;
  }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ success: false, error: 'Geolocation not supported' });
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.processPosition(position);
          resolve({ success: true, location });
        },
        (error) => {
          const errorMessage = this.getGeolocationErrorMessage(error);
          resolve({ success: false, error: errorMessage });
        },
        { ...defaultOptions, ...options }
      );
    });
  }

  // Start continuous tracking
  private startContinuousTracking(options: PositionOptions): void {
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = this.processPosition(position);
        this.handleLocationUpdate(location);
      },
      (error) => {
        this.handleLocationError(error);
      },
      options
    );
  }

  // Start periodic updates to server
  private startPeriodicUpdates(interval: number, bookingId?: string): void {
    this.updateTimer = setInterval(async () => {
      if (this.lastKnownLocation) {
        await this.sendLocationUpdate(this.lastKnownLocation, bookingId);
      }
    }, interval);
  }

  // Process GPS position
  private processPosition(position: GeolocationPosition): LocationData {
    const { coords, timestamp } = position;
    
    const location: LocationData = {
      coordinates: {
        lat: coords.latitude,
        lng: coords.longitude
      },
      accuracy: coords.accuracy,
      heading: coords.heading || undefined,
      speed: coords.speed ? coords.speed * 3.6 : undefined, // Convert m/s to km/h
      altitude: coords.altitude || undefined,
      timestamp: timestamp || Date.now(),
      source: coords.accuracy < 50 ? 'gps' : 'network'
    };

    // Validate speed for unrealistic values
    if (location.speed && location.speed > LiveTrackingConfig.speedLimits.unrealistic) {
      console.warn('Unrealistic speed detected:', location.speed);
      location.speed = undefined;
    }

    return location;
  }

  // Handle location update
  private handleLocationUpdate(location: LocationData): void {
    const previousLocation = this.lastKnownLocation;
    
    // Check if location has changed significantly
    if (previousLocation) {
      const distance = googleMapsClient.calculateDistance(
        previousLocation.coordinates,
        location.coordinates
      ) * 1000; // Convert to meters

      if (distance < LiveTrackingConfig.distanceThresholds.significant) {
        // Location hasn't changed significantly, skip update
        return;
      }
    }

    this.lastKnownLocation = location;
    this.trackingStatus.lastUpdate = new Date();
    this.trackingStatus.accuracy = this.getAccuracyLevel(location.accuracy);
    this.trackingStatus.errorCount = 0;

    this.emit('locationUpdate', { location, previousLocation });
  }

  // Handle location error
  private handleLocationError(error: GeolocationPositionError): void {
    this.trackingStatus.errorCount++;
    const errorMessage = this.getGeolocationErrorMessage(error);
    
    console.error('Location error:', errorMessage);
    this.emit('locationError', { error: errorMessage, errorCount: this.trackingStatus.errorCount });

    // Stop tracking after too many errors
    if (this.trackingStatus.errorCount >= 5) {
      console.error('Too many location errors, stopping tracking');
      this.stopTracking();
      this.emit('trackingFailed', { reason: 'too_many_errors' });
    }
  }

  // Send location update to server
  private async sendLocationUpdate(location: LocationData, bookingId?: string): Promise<void> {
    try {
      await driverApiClient.updateLocation({
        lat: location.coordinates.lat,
        lng: location.coordinates.lng,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        timestamp: location.timestamp
      });

      this.emit('locationSent', { location, bookingId });

    } catch (error: any) {
      console.error('Failed to send location update:', error);
      this.emit('locationSendError', { error: error.message, location });
    }
  }

  // Get accuracy level
  private getAccuracyLevel(accuracy: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (accuracy <= LiveTrackingConfig.accuracyThresholds.excellent) return 'excellent';
    if (accuracy <= LiveTrackingConfig.accuracyThresholds.good) return 'good';
    if (accuracy <= LiveTrackingConfig.accuracyThresholds.fair) return 'fair';
    return 'poor';
  }

  // Get geolocation error message
  private getGeolocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied by user';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable';
      case error.TIMEOUT:
        return 'Location request timed out';
      default:
        return `Unknown location error: ${error.message}`;
    }
  }

  // Get current tracking status
  getTrackingStatus(): TrackingStatus {
    return { ...this.trackingStatus };
  }

  // Get last known location
  getLastKnownLocation(): LocationData | null {
    return this.lastKnownLocation ? { ...this.lastKnownLocation } : null;
  }

  // Calculate ETA based on current location and destination
  async calculateETA(destination: Coordinates, currentSpeed?: number): Promise<{
    success: boolean;
    eta?: Date;
    distance?: number;
    duration?: number;
    error?: string;
  }> {
    if (!this.lastKnownLocation) {
      return { success: false, error: 'No current location available' };
    }

    try {
      const directionsResult = await googleMapsClient.getDirections(
        this.lastKnownLocation.coordinates,
        destination,
        {
          travelMode: 'driving',
          departureTime: new Date(),
          trafficModel: 'best_guess'
        }
      );

      if (!directionsResult.success || !directionsResult.routes?.length) {
        return { success: false, error: 'Failed to calculate route' };
      }

      const route = directionsResult.routes[0];
      const duration = route.duration_in_traffic?.value || route.duration.value;
      const distance = route.distance.value;

      // Adjust ETA based on current speed if available
      let adjustedDuration = duration;
      if (currentSpeed && currentSpeed > 0) {
        const averageSpeed = (distance / 1000) / (duration / 3600); // km/h
        const speedRatio = currentSpeed / averageSpeed;
        
        // Adjust duration based on current speed vs average speed
        if (speedRatio > 0.5 && speedRatio < 2.0) {
          adjustedDuration = duration / speedRatio;
        }
      }

      const eta = new Date(Date.now() + adjustedDuration * 1000);

      return {
        success: true,
        eta,
        distance: distance / 1000, // Convert to km
        duration: adjustedDuration / 60 // Convert to minutes
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Check if driver has arrived at destination
  checkArrival(destination: Coordinates): boolean {
    if (!this.lastKnownLocation) return false;

    const distance = googleMapsClient.calculateDistance(
      this.lastKnownLocation.coordinates,
      destination
    ) * 1000; // Convert to meters

    return distance <= LiveTrackingConfig.distanceThresholds.arrival;
  }

  // Optimize tracking based on battery and network conditions
  optimizeTracking(options: {
    batteryLevel?: number;
    isCharging?: boolean;
    networkType?: 'wifi' | '4g' | '3g' | '2g';
    backgroundMode?: boolean;
  }): void {
    const { batteryLevel, isCharging, networkType, backgroundMode } = options;

    let newInterval = this.trackingStatus.updateInterval;

    // Adjust based on battery level
    if (batteryLevel !== undefined) {
      if (batteryLevel < 20 && !isCharging) {
        newInterval = LiveTrackingConfig.updateIntervals.low;
        this.trackingStatus.batteryOptimized = true;
      } else if (batteryLevel > 50 || isCharging) {
        newInterval = LiveTrackingConfig.updateIntervals.medium;
        this.trackingStatus.batteryOptimized = false;
      }
    }

    // Adjust based on network type
    if (networkType === '2g' || networkType === '3g') {
      newInterval = Math.max(newInterval, LiveTrackingConfig.updateIntervals.low);
    }

    // Adjust for background mode
    if (backgroundMode) {
      newInterval = Math.max(newInterval, LiveTrackingConfig.updateIntervals.low);
    }

    // Update if interval changed
    if (newInterval !== this.trackingStatus.updateInterval) {
      this.trackingStatus.updateInterval = newInterval;
      
      if (this.updateTimer) {
        clearInterval(this.updateTimer);
        this.startPeriodicUpdates(newInterval);
      }

      this.emit('trackingOptimized', { 
        newInterval, 
        batteryOptimized: this.trackingStatus.batteryOptimized 
      });
    }
  }
}

// Trip tracking utilities
export class TripTracker {
  private tripData: TripTracking | null = null;
  private trackingManager: LiveTrackingManager;

  constructor() {
    this.trackingManager = new LiveTrackingManager();
  }

  // Start trip tracking
  async startTrip(tripData: Partial<TripTracking>): Promise<{ success: boolean; error?: string }> {
    if (!tripData.bookingId || !tripData.driverId) {
      return { success: false, error: 'Booking ID and Driver ID required' };
    }

    this.tripData = {
      bookingId: tripData.bookingId,
      driverId: tripData.driverId,
      customerId: tripData.customerId || '',
      status: tripData.status || 'accepted',
      startLocation: tripData.startLocation,
      endLocation: tripData.endLocation,
      route: tripData.route
    };

    // Start location tracking
    const trackingResult = await this.trackingManager.startTracking({
      bookingId: this.tripData.bookingId,
      updateInterval: LiveTrackingConfig.updateIntervals.high,
      highAccuracy: true,
      batteryOptimized: false
    });

    if (!trackingResult.success) {
      return trackingResult;
    }

    // Set up event listeners
    this.trackingManager.on('locationUpdate', this.handleLocationUpdate.bind(this));
    this.trackingManager.on('locationError', this.handleLocationError.bind(this));

    return { success: true };
  }

  // Stop trip tracking
  stopTrip(): void {
    this.trackingManager.stopTracking();
    this.tripData = null;
  }

  // Handle location updates during trip
  private handleLocationUpdate(data: { location: LocationData }): void {
    if (!this.tripData) return;

    this.tripData.currentLocation = data.location;

    // Check for arrival if destination is set
    if (this.tripData.endLocation) {
      const hasArrived = this.trackingManager.checkArrival(this.tripData.endLocation);
      
      if (hasArrived && this.tripData.status !== 'completed') {
        this.emit('arrivedAtDestination', { 
          tripData: this.tripData,
          location: data.location 
        });
      }
    }

    this.emit('tripLocationUpdate', { 
      tripData: this.tripData,
      location: data.location 
    });
  }

  // Handle location errors during trip
  private handleLocationError(data: { error: string }): void {
    this.emit('tripLocationError', { 
      tripData: this.tripData,
      error: data.error 
    });
  }

  // Event system
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Get current trip data
  getTripData(): TripTracking | null {
    return this.tripData ? { ...this.tripData } : null;
  }
}

// Export singleton instances
export const liveTrackingManager = new LiveTrackingManager();
export const tripTracker = new TripTracker();

export default liveTrackingManager;
