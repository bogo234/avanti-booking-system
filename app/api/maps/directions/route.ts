import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/firebase-admin';
import { googleMapsClient, GoogleMapsUtils, Coordinates } from '../../../../lib/google-maps-enhanced';
import { PriceCalculator } from '../../../../lib/stripe-enhanced';
import { z } from 'zod';

// Validation schemas
const DirectionsSchema = z.object({
  origin: z.union([
    z.string().min(1, 'Origin address required'),
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
  ]),
  destination: z.union([
    z.string().min(1, 'Destination address required'),
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
  ]),
  waypoints: z.array(z.union([
    z.string(),
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
  ])).optional(),
  serviceType: z.enum(['standard', 'premium', 'luxury']).default('standard'),
  travelMode: z.enum(['driving', 'walking', 'bicycling', 'transit']).default('driving'),
  avoidTolls: z.boolean().default(false),
  avoidHighways: z.boolean().default(false),
  avoidFerries: z.boolean().default(false),
  optimizeWaypoints: z.boolean().default(true),
  departureTime: z.string().datetime().optional(),
  trafficModel: z.enum(['best_guess', 'pessimistic', 'optimistic']).default('best_guess'),
  includePricing: z.boolean().default(true),
  includeAlternatives: z.boolean().default(true)
});

// Rate limiting för directions requests
const directionsAttempts = new Map<string, { count: number; resetTime: number }>();
const DIRECTIONS_WINDOW = 60 * 1000; // 1 minute
const MAX_DIRECTIONS_REQUESTS_PER_MINUTE = 20;

function checkDirectionsRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = directionsAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    directionsAttempts.set(uid, { 
      count: 1, 
      resetTime: now + DIRECTIONS_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_DIRECTIONS_REQUESTS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// POST - Get directions and pricing
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkDirectionsRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many directions requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = DirectionsSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const {
      origin,
      destination,
      waypoints = [],
      serviceType,
      travelMode,
      avoidTolls,
      avoidHighways,
      avoidFerries,
      optimizeWaypoints,
      departureTime,
      trafficModel,
      includePricing,
      includeAlternatives
    } = validationResult.data;

    // Validera att start och slutpunkt är inom Sverige
    const originCoords = await validateSwedishLocation(origin);
    const destinationCoords = await validateSwedishLocation(destination);

    if (!originCoords.success) {
      return NextResponse.json(
        { error: `Origin: ${originCoords.error}` },
        { status: 400 }
      );
    }

    if (!destinationCoords.success) {
      return NextResponse.json(
        { error: `Destination: ${destinationCoords.error}` },
        { status: 400 }
      );
    }

    // Validera waypoints
    const validatedWaypoints = [];
    for (const waypoint of waypoints) {
      const waypointCoords = await validateSwedishLocation(waypoint);
      if (!waypointCoords.success) {
        return NextResponse.json(
          { error: `Waypoint: ${waypointCoords.error}` },
          { status: 400 }
        );
      }
      validatedWaypoints.push(waypoint);
    }

    // Förbered departure time
    const depTime = departureTime ? new Date(departureTime) : undefined;

    // Hämta directions från Google Maps
    const directionsResult = await googleMapsClient.getDirections(
      origin,
      destination,
      {
        waypoints: validatedWaypoints,
        travelMode,
        avoidTolls,
        avoidHighways,
        avoidFerries,
        optimizeWaypoints,
        departureTime: depTime,
        trafficModel
      }
    );

    if (!directionsResult.success) {
      return NextResponse.json(
        { error: directionsResult.error },
        { status: 400 }
      );
    }

    const routes = directionsResult.routes!;

    // Beräkna priser för varje rutt
    const routesWithPricing = routes.map((route, index) => {
      const distanceKm = route.distance.value / 1000;
      
      let pricing = null;
      if (includePricing) {
        // Grundpris baserat på avstånd
        const basePrice = googleMapsClient.estimateTravelCost(distanceKm, serviceType);
        
        // Lägg till serviceavgift
        const totalPrice = PriceCalculator.calculateTotalAmount(basePrice, serviceType);
        
        // Tillämpa surge pricing om det är högtrafik
        const surgeMultiplier = PriceCalculator.getSurgeMultiplier(depTime);
        const finalPrice = PriceCalculator.applySurgePricing(totalPrice, surgeMultiplier);
        
        pricing = {
          basePrice,
          serviceFee: totalPrice - basePrice,
          surgeMultiplier,
          finalPrice,
          currency: 'SEK',
          isPeakHour: PriceCalculator.isPeakHour(depTime),
          pricePerKm: Math.round((basePrice / distanceKm) * 100) / 100,
          breakdown: {
            distance: `${distanceKm.toFixed(1)} km`,
            baseRate: `${Math.round(basePrice / distanceKm)} SEK/km`,
            serviceType: serviceType,
            serviceFeeRate: `${Math.round(PriceCalculator.serviceFee[serviceType] * 100)}%`
          }
        };
      }

      return {
        ...route,
        routeIndex: index,
        pricing,
        summary: {
          distance: route.distance,
          duration: route.duration,
          duration_in_traffic: route.duration_in_traffic,
          hasTrafficData: !!route.duration_in_traffic,
          trafficDelay: route.duration_in_traffic 
            ? route.duration_in_traffic.value - route.duration.value 
            : 0
        },
        metadata: {
          serviceType,
          travelMode,
          optimized: optimizeWaypoints,
          avoidances: {
            tolls: avoidTolls,
            highways: avoidHighways,
            ferries: avoidFerries
          }
        }
      };
    });

    // Sortera rutter: snabbaste först, sedan kortaste
    const sortedRoutes = routesWithPricing.sort((a, b) => {
      // Prioritera rutter med trafikdata
      const aTime = a.duration_in_traffic?.value || a.duration.value;
      const bTime = b.duration_in_traffic?.value || b.duration.value;
      
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      
      // Om samma tid, välj kortaste
      return a.distance.value - b.distance.value;
    });

    // Begränsa antal rutter om inte alla begärs
    const finalRoutes = includeAlternatives ? sortedRoutes : [sortedRoutes[0]];

    // Beräkna sammanfattande statistik
    const summary = {
      totalRoutes: finalRoutes.length,
      recommendedRoute: 0, // Index för rekommenderad rutt
      distanceRange: {
        min: Math.min(...finalRoutes.map(r => r.distance.value)) / 1000,
        max: Math.max(...finalRoutes.map(r => r.distance.value)) / 1000
      },
      durationRange: {
        min: Math.min(...finalRoutes.map(r => r.duration.value)) / 60,
        max: Math.max(...finalRoutes.map(r => r.duration.value)) / 60
      },
      priceRange: includePricing ? {
        min: Math.min(...finalRoutes.map(r => r.pricing?.finalPrice || 0)),
        max: Math.max(...finalRoutes.map(r => r.pricing?.finalPrice || 0))
      } : null
    };

    // Lägg till rekommendationer
    const recommendations = generateRouteRecommendations(finalRoutes, serviceType);

    return NextResponse.json({
      success: true,
      routes: finalRoutes,
      summary,
      recommendations,
      query: {
        origin,
        destination,
        waypoints: validatedWaypoints,
        serviceType,
        travelMode,
        departureTime: depTime?.toISOString(),
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Directions error:', {
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
      { error: 'Failed to get directions' },
      { status: 500 }
    );
  }
}

// Hjälpfunktioner
async function validateSwedishLocation(location: string | Coordinates): Promise<{ success: boolean; coordinates?: Coordinates; error?: string }> {
  let coordinates: Coordinates;

  if (typeof location === 'string') {
    // Geocode adressen
    const geocodeResult = await googleMapsClient.geocodeAddress(location);
    if (!geocodeResult.success) {
      return { success: false, error: geocodeResult.error };
    }
    coordinates = geocodeResult.address!.coordinates;
  } else {
    coordinates = location;
  }

  // Kontrollera att koordinaterna är inom Sverige
  if (!GoogleMapsUtils.isWithinSweden(coordinates)) {
    return { 
      success: false, 
      error: 'Location must be within Sweden. Avanti operates only within Sweden.' 
    };
  }

  return { success: true, coordinates };
}

function generateRouteRecommendations(routes: any[], serviceType: string): any[] {
  const recommendations = [];

  // Hitta snabbaste rutten
  const fastestRoute = routes.reduce((prev, curr) => {
    const prevTime = prev.duration_in_traffic?.value || prev.duration.value;
    const currTime = curr.duration_in_traffic?.value || curr.duration.value;
    return currTime < prevTime ? curr : prev;
  });

  recommendations.push({
    type: 'fastest',
    routeIndex: fastestRoute.routeIndex,
    reason: 'Snabbaste rutten',
    details: `${fastestRoute.summary.duration.text}${fastestRoute.duration_in_traffic ? ' med trafik' : ''}`
  });

  // Hitta kortaste rutten
  const shortestRoute = routes.reduce((prev, curr) => 
    curr.distance.value < prev.distance.value ? curr : prev
  );

  if (shortestRoute.routeIndex !== fastestRoute.routeIndex) {
    recommendations.push({
      type: 'shortest',
      routeIndex: shortestRoute.routeIndex,
      reason: 'Kortaste rutten',
      details: `${shortestRoute.summary.distance.text}`
    });
  }

  // Hitta mest ekonomiska rutten (om priser finns)
  if (routes[0].pricing) {
    const cheapestRoute = routes.reduce((prev, curr) => 
      (curr.pricing?.finalPrice || Infinity) < (prev.pricing?.finalPrice || Infinity) ? curr : prev
    );

    if (cheapestRoute.routeIndex !== fastestRoute.routeIndex && 
        cheapestRoute.routeIndex !== shortestRoute.routeIndex) {
      recommendations.push({
        type: 'cheapest',
        routeIndex: cheapestRoute.routeIndex,
        reason: 'Mest ekonomiska rutten',
        details: `${cheapestRoute.pricing.finalPrice} SEK`
      });
    }
  }

  // Rekommendation för trafikförhållanden
  const routesWithTraffic = routes.filter(r => r.duration_in_traffic);
  if (routesWithTraffic.length > 0) {
    const leastTrafficRoute = routesWithTraffic.reduce((prev, curr) => 
      curr.summary.trafficDelay < prev.summary.trafficDelay ? curr : prev
    );

    if (leastTrafficRoute.summary.trafficDelay < 300) { // Mindre än 5 min fördröjning
      recommendations.push({
        type: 'traffic',
        routeIndex: leastTrafficRoute.routeIndex,
        reason: 'Minst trafikstörningar',
        details: `Endast ${Math.round(leastTrafficRoute.summary.trafficDelay / 60)} min fördröjning`
      });
    }
  }

  return recommendations;
}
