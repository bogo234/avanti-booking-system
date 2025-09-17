// Enhanced Google Maps utilities for Avanti Booking System

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  formatted_address: string;
  place_id: string;
  coordinates: Coordinates;
  address_components: {
    street_number?: string;
    route?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
    administrative_area_level_1?: string;
    administrative_area_level_2?: string;
  };
}

export interface RouteInfo {
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  duration_in_traffic?: {
    text: string;
    value: number; // seconds
  };
  polyline: string;
  steps: RouteStep[];
  warnings?: string[];
  waypoint_order?: number[];
}

export interface RouteStep {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  html_instructions: string;
  maneuver?: string;
  start_location: Coordinates;
  end_location: Coordinates;
  polyline: string;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  coordinates: Coordinates;
  types: string[];
  rating?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
    weekday_text: string[];
  };
  phone_number?: string;
  website?: string;
}

export interface GeocodingResult {
  success: boolean;
  address?: Address;
  error?: string;
}

export interface DirectionsResult {
  success: boolean;
  routes?: RouteInfo[];
  error?: string;
}

export interface PlaceSearchResult {
  success: boolean;
  places?: PlaceDetails[];
  error?: string;
}

// Google Maps API client class
export class GoogleMapsClient {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured');
    }
    this.apiKey = apiKey;
  }

  // Geocoding: Convert address to coordinates
  async geocodeAddress(address: string): Promise<GeocodingResult> {
    try {
      const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}&region=se&language=sv`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results.length) {
        return {
          success: false,
          error: `Geocoding failed: ${data.status} - ${data.error_message || 'No results found'}`
        };
      }

      const result = data.results[0];
      const addressComponents: any = {};

      // Parse address components
      result.address_components?.forEach((component: any) => {
        component.types.forEach((type: string) => {
          switch (type) {
            case 'street_number':
              addressComponents.street_number = component.long_name;
              break;
            case 'route':
              addressComponents.route = component.long_name;
              break;
            case 'locality':
              addressComponents.locality = component.long_name;
              break;
            case 'postal_code':
              addressComponents.postal_code = component.long_name;
              break;
            case 'country':
              addressComponents.country = component.long_name;
              break;
            case 'administrative_area_level_1':
              addressComponents.administrative_area_level_1 = component.long_name;
              break;
            case 'administrative_area_level_2':
              addressComponents.administrative_area_level_2 = component.long_name;
              break;
          }
        });
      });

      return {
        success: true,
        address: {
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          coordinates: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          },
          address_components: addressComponents
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Geocoding error: ${error.message}`
      };
    }
  }

  // Reverse Geocoding: Convert coordinates to address
  async reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult> {
    try {
      const url = `${this.baseUrl}/geocode/json?latlng=${coordinates.lat},${coordinates.lng}&key=${this.apiKey}&language=sv`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results.length) {
        return {
          success: false,
          error: `Reverse geocoding failed: ${data.status}`
        };
      }

      const result = data.results[0];
      const addressComponents: any = {};

      // Parse address components (same as geocodeAddress)
      result.address_components?.forEach((component: any) => {
        component.types.forEach((type: string) => {
          switch (type) {
            case 'street_number':
              addressComponents.street_number = component.long_name;
              break;
            case 'route':
              addressComponents.route = component.long_name;
              break;
            case 'locality':
              addressComponents.locality = component.long_name;
              break;
            case 'postal_code':
              addressComponents.postal_code = component.long_name;
              break;
            case 'country':
              addressComponents.country = component.long_name;
              break;
            case 'administrative_area_level_1':
              addressComponents.administrative_area_level_1 = component.long_name;
              break;
            case 'administrative_area_level_2':
              addressComponents.administrative_area_level_2 = component.long_name;
              break;
          }
        });
      });

      return {
        success: true,
        address: {
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          coordinates,
          address_components: addressComponents
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Reverse geocoding error: ${error.message}`
      };
    }
  }

  // Directions: Get route between two points
  async getDirections(
    origin: string | Coordinates,
    destination: string | Coordinates,
    options: {
      waypoints?: (string | Coordinates)[];
      travelMode?: 'driving' | 'walking' | 'bicycling' | 'transit';
      avoidTolls?: boolean;
      avoidHighways?: boolean;
      avoidFerries?: boolean;
      optimizeWaypoints?: boolean;
      departureTime?: Date;
      trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
    } = {}
  ): Promise<DirectionsResult> {
    try {
      const {
        waypoints = [],
        travelMode = 'driving',
        avoidTolls = false,
        avoidHighways = false,
        avoidFerries = false,
        optimizeWaypoints = false,
        departureTime,
        trafficModel = 'best_guess'
      } = options;

      // Format origin and destination
      const formatLocation = (location: string | Coordinates): string => {
        if (typeof location === 'string') return encodeURIComponent(location);
        return `${location.lat},${location.lng}`;
      };

      const originStr = formatLocation(origin);
      const destinationStr = formatLocation(destination);

      // Build URL
      let url = `${this.baseUrl}/directions/json?origin=${originStr}&destination=${destinationStr}&key=${this.apiKey}&language=sv&region=se`;

      // Add waypoints
      if (waypoints.length > 0) {
        const waypointsStr = waypoints.map(formatLocation).join('|');
        url += `&waypoints=${optimizeWaypoints ? 'optimize:true|' : ''}${waypointsStr}`;
      }

      // Add travel mode
      url += `&mode=${travelMode}`;

      // Add avoidance options
      const avoid = [];
      if (avoidTolls) avoid.push('tolls');
      if (avoidHighways) avoid.push('highways');
      if (avoidFerries) avoid.push('ferries');
      if (avoid.length > 0) {
        url += `&avoid=${avoid.join('|')}`;
      }

      // Add traffic information for driving
      if (travelMode === 'driving') {
        if (departureTime) {
          url += `&departure_time=${Math.floor(departureTime.getTime() / 1000)}`;
        } else {
          url += `&departure_time=now`;
        }
        url += `&traffic_model=${trafficModel}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.routes.length) {
        return {
          success: false,
          error: `Directions failed: ${data.status} - ${data.error_message || 'No routes found'}`
        };
      }

      const routes = data.routes.map((route: any) => ({
        distance: route.legs.reduce((total: any, leg: any) => ({
          text: `${(total.value + leg.distance.value) / 1000} km`,
          value: total.value + leg.distance.value
        }), { value: 0 }),
        duration: route.legs.reduce((total: any, leg: any) => ({
          text: this.formatDuration(total.value + leg.duration.value),
          value: total.value + leg.duration.value
        }), { value: 0 }),
        duration_in_traffic: route.legs.reduce((total: any, leg: any) => {
          if (leg.duration_in_traffic) {
            return {
              text: this.formatDuration(total.value + leg.duration_in_traffic.value),
              value: total.value + leg.duration_in_traffic.value
            };
          }
          return total.value > 0 ? total : undefined;
        }, { value: 0 }),
        polyline: route.overview_polyline.points,
        steps: route.legs.flatMap((leg: any) => 
          leg.steps.map((step: any) => ({
            distance: step.distance,
            duration: step.duration,
            html_instructions: step.html_instructions,
            maneuver: step.maneuver,
            start_location: step.start_location,
            end_location: step.end_location,
            polyline: step.polyline.points
          }))
        ),
        warnings: route.warnings,
        waypoint_order: route.waypoint_order
      }));

      return {
        success: true,
        routes
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Directions error: ${error.message}`
      };
    }
  }

  // Places Search: Find places near a location
  async searchPlaces(
    query: string,
    location?: Coordinates,
    radius: number = 5000, // meters
    type?: string
  ): Promise<PlaceSearchResult> {
    try {
      let url = `${this.baseUrl}/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}&language=sv&region=se`;

      if (location) {
        url += `&location=${location.lat},${location.lng}&radius=${radius}`;
      }

      if (type) {
        url += `&type=${type}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        return {
          success: false,
          error: `Places search failed: ${data.status} - ${data.error_message || 'No results found'}`
        };
      }

      const places = data.results.map((place: any) => ({
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        types: place.types,
        rating: place.rating,
        price_level: place.price_level
      }));

      return {
        success: true,
        places
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Places search error: ${error.message}`
      };
    }
  }

  // Get Place Details
  async getPlaceDetails(placeId: string): Promise<{ success: boolean; place?: PlaceDetails; error?: string }> {
    try {
      const url = `${this.baseUrl}/place/details/json?place_id=${placeId}&key=${this.apiKey}&language=sv&fields=name,formatted_address,geometry,types,rating,price_level,opening_hours,formatted_phone_number,website`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        return {
          success: false,
          error: `Place details failed: ${data.status}`
        };
      }

      const result = data.result;
      const place: PlaceDetails = {
        place_id: placeId,
        name: result.name,
        formatted_address: result.formatted_address,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        },
        types: result.types,
        rating: result.rating,
        price_level: result.price_level,
        phone_number: result.formatted_phone_number,
        website: result.website
      };

      if (result.opening_hours) {
        place.opening_hours = {
          open_now: result.opening_hours.open_now,
          periods: result.opening_hours.periods,
          weekday_text: result.opening_hours.weekday_text
        };
      }

      return {
        success: true,
        place
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Place details error: ${error.message}`
      };
    }
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  // Calculate bearing between two points
  calculateBearing(point1: Coordinates, point2: Coordinates): number {
    const dLng = this.toRadians(point2.lng - point1.lng);
    const lat1 = this.toRadians(point1.lat);
    const lat2 = this.toRadians(point2.lat);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360; // Normalize to 0-360
  }

  // Utility methods
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  }

  // Validate Swedish address format
  isValidSwedishAddress(address: Address): boolean {
    const components = address.address_components;
    
    // Check for required Swedish address components
    const hasStreet = components.route || components.street_number;
    const hasCity = components.locality;
    const hasPostalCode = components.postal_code;
    const isSweden = components.country === 'Sverige' || components.country === 'Sweden';

    return !!(hasStreet && hasCity && hasPostalCode && isSweden);
  }

  // Format address for display
  formatAddressForDisplay(address: Address): string {
    const components = address.address_components;
    
    let formatted = '';
    
    // Street address
    if (components.route) {
      formatted += components.route;
      if (components.street_number) {
        formatted += ` ${components.street_number}`;
      }
    }
    
    // City and postal code
    if (components.postal_code && components.locality) {
      formatted += `, ${components.postal_code} ${components.locality}`;
    } else if (components.locality) {
      formatted += `, ${components.locality}`;
    }
    
    return formatted || address.formatted_address;
  }

  // Estimate travel cost based on distance and service type
  estimateTravelCost(distanceKm: number, serviceType: 'standard' | 'premium' | 'luxury'): number {
    const basePrices = {
      standard: 15, // 15 SEK per km
      premium: 25,  // 25 SEK per km
      luxury: 40    // 40 SEK per km
    };

    const minimumFares = {
      standard: 80,   // 80 SEK minimum
      premium: 150,   // 150 SEK minimum
      luxury: 300     // 300 SEK minimum
    };

    const basePrice = distanceKm * basePrices[serviceType];
    return Math.max(basePrice, minimumFares[serviceType]);
  }
}

// Export singleton instance
export const googleMapsClient = new GoogleMapsClient();

// Export utility functions
export const GoogleMapsUtils = {
  // Decode polyline string to coordinates array
  decodePolyline: (encoded: string): Coordinates[] => {
    const poly: Coordinates[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return poly;
  },

  // Check if coordinates are within Sweden bounds
  isWithinSweden: (coordinates: Coordinates): boolean => {
    const { lat, lng } = coordinates;
    
    // Approximate bounds of Sweden
    const swedishBounds = {
      north: 69.1,
      south: 55.3,
      east: 24.2,
      west: 10.9
    };

    return lat >= swedishBounds.south && 
           lat <= swedishBounds.north && 
           lng >= swedishBounds.west && 
           lng <= swedishBounds.east;
  },

  // Get Swedish region from coordinates
  getSwedishRegion: (coordinates: Coordinates): string | null => {
    const { lat, lng } = coordinates;

    // Simplified regional boundaries
    if (lat > 66) return 'Norrland';
    if (lat > 60) return 'Svealand';
    if (lat > 55.3) return 'Götaland';
    
    return null;
  }
};

export default googleMapsClient;
