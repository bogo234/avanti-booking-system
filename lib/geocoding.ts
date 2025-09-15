// Production-ready geocoding utilities using only real APIs

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Google Maps Geocoding API integration - PRODUCTION ONLY
 * This function requires Google Maps API to be loaded and will throw errors if not available
 */
export async function geocodeAddress(address: string): Promise<Coordinates> {
  if (typeof window === 'undefined') {
    throw new Error('Geocoding can only be performed in browser environment');
  }
  
  if (!(window as any).google?.maps) {
    throw new Error('Google Maps API is not loaded. Please ensure Google Maps JavaScript API is properly initialized.');
  }
  
  const geocoder = new (window as any).google.maps.Geocoder();
  
  return new Promise((resolve, reject) => {
    geocoder.geocode(
      { 
        address: address,
        componentRestrictions: { country: 'SE' }
      },
      (results: any[], status: string) => {
        if (status === 'OK' && results[0]?.geometry?.location) {
          resolve({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          });
        } else {
          reject(new Error(`Geocoding failed for address "${address}". Status: ${status}`));
        }
      }
    );
  });
}

/**
 * Calculate approximate distance between two coordinates (in km)
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate estimated price based on distance
 * Avanti has one simple pricing model:
 * - 299 SEK base fee
 * - +15 SEK per km after the first 5 km
 */
export function calculatePrice(
  pickupCoords: Coordinates, 
  destinationCoords: Coordinates
): number {
  const distance = calculateDistance(pickupCoords, destinationCoords);
  
  const BASE_PRICE = 299; // SEK
  const PRICE_PER_KM = 15; // SEK per km after 5 km
  const FREE_DISTANCE = 5; // First 5 km included in base price
  
  const additionalDistance = Math.max(0, distance - FREE_DISTANCE);
  const distancePrice = additionalDistance * PRICE_PER_KM;
  
  return Math.round(BASE_PRICE + distancePrice);
}
