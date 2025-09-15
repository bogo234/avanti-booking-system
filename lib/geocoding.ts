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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key is missing. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local');
  }

  const params = new URLSearchParams({
    address,
    key: apiKey,
    language: 'sv',
    region: 'SE',
    components: 'country:SE',
  });

  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding REST request failed with status ${response.status}`);
  }

  const data: any = await response.json();
  if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  }

  throw new Error(`Geocoding REST failed for address "${address}". Status: ${data.status}`);
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
