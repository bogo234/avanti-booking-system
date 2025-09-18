// Production-ready geocoding utilities using only real APIs

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Google Maps Geocoding via official REST API (locked)
 * - Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * - Swedish language/region and country restriction
 */
export async function geocodeAddress(address: string): Promise<Coordinates> {
  if (typeof window === 'undefined') {
    throw new Error('Geocoding can only be performed in browser environment');
  }

  const { loadGoogleMaps } = await import('./google-maps-loader');
  await loadGoogleMaps();

  const geocoder = new window.google!.maps.Geocoder();

  const result: Coordinates | null = await new Promise((resolve) => {
    geocoder.geocode({ address, region: 'SE', language: 'sv', componentRestrictions: { country: 'se' as any } as any }, (results, status) => {
      if (status === 'OK' && results && results[0]?.geometry?.location) {
        resolve({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      } else {
        resolve(null);
      }
    });
  });

  if (!result) {
    throw new Error('Geocoding misslyckades eller hittade inga koordinater');
  }

  return result;
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
