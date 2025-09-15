import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/firebase-admin';
import { googleMapsClient, GoogleMapsUtils } from '../../../../lib/google-maps-enhanced';
import { z } from 'zod';

// Validation schemas
const GeocodeSchema = z.object({
  address: z.string().min(1, 'Address is required').max(200, 'Address too long')
});

const ReverseGeocodeSchema = z.object({
  lat: z.number().min(-90).max(90, 'Invalid latitude'),
  lng: z.number().min(-180).max(180, 'Invalid longitude')
});

// Rate limiting för geocoding requests
const geocodingAttempts = new Map<string, { count: number; resetTime: number }>();
const GEOCODING_WINDOW = 60 * 1000; // 1 minute
const MAX_GEOCODING_REQUESTS_PER_MINUTE = 30; // Generous limit för användare

function checkGeocodingRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = geocodingAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    geocodingAttempts.set(uid, { 
      count: 1, 
      resetTime: now + GEOCODING_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_GEOCODING_REQUESTS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// POST - Geocode address to coordinates
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkGeocodingRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many geocoding requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = GeocodeSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { address } = validationResult.data;

    // Prioritera svenska adresser
    const enhancedAddress = address.includes('Sverige') || address.includes('Sweden') 
      ? address 
      : `${address}, Sverige`;

    // Geocode adressen
    const result = await googleMapsClient.geocodeAddress(enhancedAddress);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const addressData = result.address!;

    // Kontrollera att adressen är inom Sverige
    if (!GoogleMapsUtils.isWithinSweden(addressData.coordinates)) {
      return NextResponse.json(
        { 
          error: 'Address must be within Sweden',
          suggestion: 'Avanti operates only within Sweden. Please provide a Swedish address.'
        },
        { status: 400 }
      );
    }

    // Validera att det är en giltig svensk adress
    const isValidSwedish = googleMapsClient.isValidSwedishAddress(addressData);
    if (!isValidSwedish) {
      return NextResponse.json(
        { 
          warning: 'Address format may be incomplete',
          address: addressData,
          suggestion: 'Please verify the address includes street, city, and postal code'
        },
        { status: 200 }
      );
    }

    // Format för visning
    const displayAddress = googleMapsClient.formatAddressForDisplay(addressData);

    // Identifiera region
    const region = GoogleMapsUtils.getSwedishRegion(addressData.coordinates);

    return NextResponse.json({
      success: true,
      address: {
        ...addressData,
        display_address: displayAddress,
        region,
        is_valid_swedish: isValidSwedish,
        within_sweden: true
      }
    });

  } catch (error: any) {
    console.error('Geocoding error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    );
  }
}

// PUT - Reverse geocode coordinates to address
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkGeocodingRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many geocoding requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = ReverseGeocodeSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid coordinates',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const coordinates = { lat: validationResult.data.lat, lng: validationResult.data.lng };

    // Kontrollera att koordinaterna är inom Sverige
    if (!GoogleMapsUtils.isWithinSweden(coordinates)) {
      return NextResponse.json(
        { 
          error: 'Coordinates must be within Sweden',
          suggestion: 'Avanti operates only within Sweden.'
        },
        { status: 400 }
      );
    }

    // Reverse geocode koordinaterna
    const result = await googleMapsClient.reverseGeocode(coordinates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const addressData = result.address!;

    // Format för visning
    const displayAddress = googleMapsClient.formatAddressForDisplay(addressData);

    // Identifiera region
    const region = GoogleMapsUtils.getSwedishRegion(coordinates);

    // Validera adressformat
    const isValidSwedish = googleMapsClient.isValidSwedishAddress(addressData);

    return NextResponse.json({
      success: true,
      address: {
        ...addressData,
        display_address: displayAddress,
        region,
        is_valid_swedish: isValidSwedish,
        within_sweden: true
      }
    });

  } catch (error: any) {
    console.error('Reverse geocoding error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reverse geocode coordinates' },
      { status: 500 }
    );
  }
}

// GET - Validate and get address suggestions
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkGeocodingRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many geocoding requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Förbereda sökning
    const location = (lat && lng) ? {
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    } : undefined;

    // Prioritera svenska adresser
    const enhancedQuery = query.includes('Sverige') || query.includes('Sweden') 
      ? query 
      : `${query}, Sverige`;

    // Sök efter platser
    const searchResult = await googleMapsClient.searchPlaces(
      enhancedQuery,
      location,
      10000 // 10km radius
    );

    if (!searchResult.success) {
      return NextResponse.json(
        { error: searchResult.error },
        { status: 400 }
      );
    }

    // Filtrera och formatera resultat
    const swedishPlaces = searchResult.places!
      .filter(place => GoogleMapsUtils.isWithinSweden(place.coordinates))
      .slice(0, 10) // Begränsa till 10 resultat
      .map(place => ({
        ...place,
        region: GoogleMapsUtils.getSwedishRegion(place.coordinates),
        distance: location 
          ? googleMapsClient.calculateDistance(location, place.coordinates)
          : undefined
      }));

    return NextResponse.json({
      success: true,
      places: swedishPlaces,
      query: enhancedQuery,
      total: swedishPlaces.length
    });

  } catch (error: any) {
    console.error('Address search error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to search addresses' },
      { status: 500 }
    );
  }
}
