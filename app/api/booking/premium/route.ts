import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb, getUserRole } from '../../../../lib/firebase-admin';
import { googleMapsClient } from '../../../../lib/google-maps-enhanced';
import type { Coordinates } from '../../../../lib/google-maps-enhanced';
import { PriceCalculator } from '../../../../lib/stripe-enhanced';
import { z } from 'zod';

// Premium booking validation schema
const PremiumBookingSchema = z.object({
  pickup: z.object({
    address: z.string().min(1, 'Pickup address is required'),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }).optional(),
    time: z.string().datetime('Invalid pickup time format'),
    specialInstructions: z.string().max(500).optional()
  }),
  destination: z.object({
    address: z.string().min(1, 'Destination address is required'),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }).optional(),
    specialInstructions: z.string().max(500).optional()
  }),
  serviceType: z.enum(['premium', 'luxury']),
  passengers: z.number().min(1).max(8).default(1),
  luggage: z.enum(['none', 'small', 'medium', 'large']).default('none'),
  preferences: z.object({
    vehicleType: z.enum(['sedan', 'suv', 'van', 'luxury']).optional(),
    amenities: z.array(z.enum(['wifi', 'charger', 'water', 'newspapers', 'child_seat'])).optional(),
    music: z.enum(['none', 'classical', 'jazz', 'pop', 'custom']).optional(),
    temperature: z.number().min(16).max(26).optional(),
    driverPreferences: z.object({
      language: z.enum(['swedish', 'english', 'any']).default('any'),
      experience: z.enum(['any', 'experienced', 'premium_only']).default('any')
    }).optional()
  }).optional(),
  waypoints: z.array(z.object({
    address: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    stopDuration: z.number().min(0).max(60).default(5), // minutes
    instructions: z.string().max(200).optional()
  })).optional(),
  bookingType: z.enum(['immediate', 'scheduled']).default('immediate'),
  recurringBooking: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    endDate: z.string().datetime(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional() // For weekly
  }).optional(),
  corporateAccount: z.object({
    companyId: z.string(),
    projectCode: z.string().optional(),
    costCenter: z.string().optional()
  }).optional(),
  specialRequests: z.string().max(1000).optional(),
  priorityLevel: z.enum(['normal', 'high', 'urgent']).default('normal')
});

// Rate limiting för premium bookings
const premiumBookingAttempts = new Map<string, { count: number; resetTime: number }>();
const PREMIUM_BOOKING_WINDOW = 60 * 1000; // 1 minute
const MAX_PREMIUM_BOOKINGS_PER_MINUTE = 3; // Begränsat för premium

function checkPremiumBookingRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = premiumBookingAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    premiumBookingAttempts.set(uid, { 
      count: 1, 
      resetTime: now + PREMIUM_BOOKING_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_PREMIUM_BOOKINGS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// POST - Create premium booking with advanced pricing
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkPremiumBookingRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many premium booking requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = PremiumBookingSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid booking data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const bookingData = validationResult.data;
    const db = getAdminDb();
    const now = new Date();
    const pickupTime = new Date(bookingData.pickup.time);

    // Kontrollera att pickup-tiden är i framtiden
    if (pickupTime <= now) {
      return NextResponse.json(
        { error: 'Pickup time must be in the future' },
        { status: 400 }
      );
    }

    // Hämta användarens profil
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Kontrollera premium-behörighet
    const userRole = await getUserRole(decodedToken.uid);
    const isPremiumUser = userData.subscription?.type === 'premium' || 
                         userData.subscription?.type === 'luxury' ||
                         userRole === 'admin';

    if (!isPremiumUser && bookingData.serviceType === 'luxury') {
      return NextResponse.json(
        { 
          error: 'Luxury service requires premium subscription',
          upgradeUrl: '/subscription/upgrade'
        },
        { status: 403 }
      );
    }

    // Geocode adresser om koordinater saknas
    const pickupCoordsMaybe = bookingData.pickup.coordinates || 
      (await googleMapsClient.geocodeAddress(bookingData.pickup.address)).address?.coordinates;
    
    const destinationCoordsMaybe = bookingData.destination.coordinates ||
      (await googleMapsClient.geocodeAddress(bookingData.destination.address)).address?.coordinates;

    if (!pickupCoordsMaybe || !destinationCoordsMaybe || pickupCoordsMaybe.lat === undefined || pickupCoordsMaybe.lng === undefined || destinationCoordsMaybe.lat === undefined || destinationCoordsMaybe.lng === undefined) {
      return NextResponse.json(
        { error: 'Could not geocode pickup or destination address' },
        { status: 400 }
      );
    }

    const pickupCoords: Coordinates = { lat: pickupCoordsMaybe.lat, lng: pickupCoordsMaybe.lng };
    const destinationCoords: Coordinates = { lat: destinationCoordsMaybe.lat, lng: destinationCoordsMaybe.lng };

    // Beräkna rutt och avstånd
    const directionsResult = await googleMapsClient.getDirections(
      pickupCoords,
      destinationCoords,
      {
        waypoints: bookingData.waypoints?.map(wp => wp.coordinates ? ({ lat: wp.coordinates.lat, lng: wp.coordinates.lng } as Coordinates) : wp.address),
        travelMode: 'driving',
        departureTime: pickupTime,
        trafficModel: 'best_guess'
      }
    );

    if (!directionsResult.success) {
      return NextResponse.json(
        { error: 'Could not calculate route' },
        { status: 400 }
      );
    }

    const route = directionsResult.routes![0];
    const distanceKm = route.distance.value / 1000;
    const baseDurationMinutes = route.duration.value / 60;

    // Avancerad prisberäkning för premium-tjänster
    const pricing = calculatePremiumPricing({
      serviceType: bookingData.serviceType,
      distanceKm,
      durationMinutes: baseDurationMinutes,
      passengers: bookingData.passengers,
      luggage: bookingData.luggage,
      waypoints: bookingData.waypoints || [],
      preferences: bookingData.preferences,
      pickupTime,
      priorityLevel: bookingData.priorityLevel,
      isRecurring: !!bookingData.recurringBooking
    });

    // Skapa booking-objektet
    const bookingId = `avanti_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    const booking = {
      id: bookingId,
      customerId: decodedToken.uid,
      customer: {
        name: userData.profile?.name || 'Premium Customer',
        email: userData.email,
        phone: userData.profile?.phone || '',
        subscriptionType: userData.subscription?.type || 'standard'
      },
      serviceType: bookingData.serviceType,
      status: 'pending_confirmation',
      
      pickup: {
        address: bookingData.pickup.address,
        coordinates: pickupCoords,
        time: pickupTime,
        specialInstructions: bookingData.pickup.specialInstructions
      },
      
      destination: {
        address: bookingData.destination.address,
        coordinates: destinationCoords,
        specialInstructions: bookingData.destination.specialInstructions
      },
      
      waypoints: bookingData.waypoints || [],
      
      route: {
        distance: route.distance,
        duration: route.duration,
        duration_in_traffic: route.duration_in_traffic,
        polyline: route.polyline,
        steps: route.steps
      },
      
      pricing: pricing,
      
      passengers: bookingData.passengers,
      luggage: bookingData.luggage,
      preferences: bookingData.preferences || {},
      
      bookingType: bookingData.bookingType,
      recurringBooking: bookingData.recurringBooking,
      corporateAccount: bookingData.corporateAccount,
      specialRequests: bookingData.specialRequests,
      priorityLevel: bookingData.priorityLevel,
      
      paymentStatus: 'pending',
      driverAssigned: false,
      
      createdAt: now,
      updatedAt: now,
      
      metadata: {
        source: 'premium_api',
        userAgent: request.headers.get('user-agent') || 'unknown',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        apiVersion: '2.0',
        createdBy: decodedToken.uid
      }
    };

    // Spara bokningen
    await db.collection('bookings').doc(bookingId).set(booking);

    // Skapa notifikation
    await db.collection('notifications').add({
      userId: decodedToken.uid,
      type: 'booking',
      title: `${bookingData.serviceType === 'luxury' ? 'Luxury' : 'Premium'} bokning skapad`,
      message: `Din ${bookingData.serviceType}-bokning till ${bookingData.destination.address} har skapats`,
      data: {
        bookingId,
        serviceType: bookingData.serviceType,
        totalPrice: pricing.totalPrice,
        pickupTime: pickupTime.toISOString()
      },
      priority: 'normal',
      read: false,
      createdAt: now,
      source: 'booking_system'
    });

    // Schemalägg automatisk förartilldelning för premium
    if (bookingData.serviceType === 'premium' || bookingData.serviceType === 'luxury') {
      await scheduleDriverAssignment(bookingId, pickupTime, bookingData.serviceType);
    }

    // Skapa återkommande bokningar om specificerat
    if (bookingData.recurringBooking) {
      await createRecurringBookings(booking, bookingData.recurringBooking);
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingId,
        status: booking.status,
        serviceType: booking.serviceType,
        pickup: booking.pickup,
        destination: booking.destination,
        pricing: pricing,
        route: {
          distance: route.distance,
          duration: route.duration,
          duration_in_traffic: route.duration_in_traffic
        },
        estimatedArrival: new Date(pickupTime.getTime() + route.duration.value * 1000),
        confirmationRequired: true
      },
      nextSteps: {
        confirmBooking: `/api/booking/${bookingId}/confirm`,
        paymentRequired: pricing.totalPrice > 0,
        paymentUrl: `/booking/${bookingId}/payment`
      }
    });

  } catch (error: any) {
    console.error('Premium booking creation error:', {
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
      { error: 'Failed to create premium booking' },
      { status: 500 }
    );
  }
}

// Avancerad prisberäkning för premium-tjänster
function calculatePremiumPricing(params: {
  serviceType: 'premium' | 'luxury';
  distanceKm: number;
  durationMinutes: number;
  passengers: number;
  luggage: string;
  waypoints: any[];
  preferences?: any;
  pickupTime: Date;
  priorityLevel: string;
  isRecurring: boolean;
}): any {
  const {
    serviceType,
    distanceKm,
    durationMinutes,
    passengers,
    luggage,
    waypoints,
    preferences,
    pickupTime,
    priorityLevel,
    isRecurring
  } = params;

  // Grundpris baserat på avstånd och tjänstetyp
  const basePrice = googleMapsClient.estimateTravelCost(distanceKm, serviceType);
  
  let totalPrice = basePrice;
  const breakdown: any = {
    basePrice,
    distance: `${distanceKm.toFixed(1)} km`,
    serviceType
  };

  // Passagerartillägg
  if (passengers > 2) {
    const passengerSurcharge = (passengers - 2) * (serviceType === 'luxury' ? 100 : 50);
    totalPrice += passengerSurcharge;
    breakdown.passengerSurcharge = passengerSurcharge;
  }

  // Bagagetillägg
  const luggageSurcharges = {
    none: 0,
    small: 0,
    medium: serviceType === 'luxury' ? 100 : 50,
    large: serviceType === 'luxury' ? 200 : 100
  };
  const luggageSurcharge = luggageSurcharges[luggage as keyof typeof luggageSurcharges] || 0;
  if (luggageSurcharge > 0) {
    totalPrice += luggageSurcharge;
    breakdown.luggageSurcharge = luggageSurcharge;
  }

  // Waypoint-tillägg
  if (waypoints.length > 0) {
    const waypointSurcharge = waypoints.length * (serviceType === 'luxury' ? 150 : 100);
    totalPrice += waypointSurcharge;
    breakdown.waypointSurcharge = waypointSurcharge;
    
    // Väntetid vid waypoints
    const totalWaitTime = waypoints.reduce((sum, wp) => sum + (wp.stopDuration || 5), 0);
    const waitTimeSurcharge = Math.ceil(totalWaitTime / 5) * (serviceType === 'luxury' ? 50 : 25);
    totalPrice += waitTimeSurcharge;
    breakdown.waitTimeSurcharge = waitTimeSurcharge;
  }

  // Premium amenities-tillägg
  if (preferences?.amenities?.length > 0) {
    const amenitySurcharges = {
      wifi: 0, // Gratis för premium
      charger: 0, // Gratis för premium
      water: serviceType === 'luxury' ? 0 : 25,
      newspapers: serviceType === 'luxury' ? 0 : 15,
      child_seat: 100
    };
    
    const amenitySurcharge = preferences.amenities.reduce((sum: number, amenity: string) => {
      return sum + (amenitySurcharges[amenity as keyof typeof amenitySurcharges] || 0);
    }, 0);
    
    if (amenitySurcharge > 0) {
      totalPrice += amenitySurcharge;
      breakdown.amenitySurcharge = amenitySurcharge;
    }
  }

  // Prioritetstillägg
  const prioritySurcharges = {
    normal: 0,
    high: serviceType === 'luxury' ? 200 : 100,
    urgent: serviceType === 'luxury' ? 500 : 300
  };
  const prioritySurcharge = prioritySurcharges[priorityLevel as keyof typeof prioritySurcharges] || 0;
  if (prioritySurcharge > 0) {
    totalPrice += prioritySurcharge;
    breakdown.prioritySurcharge = prioritySurcharge;
  }

  // Tidstillägg (tidig morgon, sen kväll, helger)
  const hour = pickupTime.getHours();
  const day = pickupTime.getDay();
  const isWeekend = day === 0 || day === 6;
  const isEarlyMorning = hour >= 5 && hour < 7;
  const isLateEvening = hour >= 22 || hour < 5;

  let timeSurcharge = 0;
  if (isWeekend) {
    timeSurcharge += serviceType === 'luxury' ? 200 : 100;
    breakdown.weekendSurcharge = timeSurcharge;
  }
  if (isEarlyMorning || isLateEvening) {
    const nightSurcharge = serviceType === 'luxury' ? 300 : 150;
    timeSurcharge += nightSurcharge;
    breakdown.nightSurcharge = nightSurcharge;
  }
  totalPrice += timeSurcharge;

  // Återkommande bokningsrabatt
  if (isRecurring) {
    const recurringDiscount = Math.round(totalPrice * 0.1); // 10% rabatt
    totalPrice -= recurringDiscount;
    breakdown.recurringDiscount = -recurringDiscount;
  }

  // Surge pricing
  const surgeMultiplier = PriceCalculator.getSurgeMultiplier(pickupTime);
  if (surgeMultiplier > 1.0) {
    const surgeAmount = Math.round((totalPrice * (surgeMultiplier - 1)));
    totalPrice += surgeAmount;
    breakdown.surgePricing = surgeAmount;
    breakdown.surgeMultiplier = surgeMultiplier;
  }

  // Serviceavgift
  const serviceFee = PriceCalculator.calculateServiceFee(totalPrice, serviceType);
  totalPrice += serviceFee;
  breakdown.serviceFee = serviceFee;

  // Moms (25% i Sverige)
  const vatAmount = Math.round(totalPrice * 0.25);
  const finalPrice = totalPrice + vatAmount;
  breakdown.vat = vatAmount;
  breakdown.vatRate = '25%';

  return {
    basePrice,
    totalPrice: finalPrice,
    currency: 'SEK',
    breakdown,
    estimatedDuration: Math.round(durationMinutes),
    pricePerKm: Math.round((basePrice / distanceKm) * 100) / 100,
    serviceLevel: serviceType,
    includes: getServiceIncludes(serviceType),
    paymentRequired: true,
    cancellationPolicy: getCancellationPolicy(serviceType),
    validUntil: new Date(Date.now() + 15 * 60 * 1000) // 15 minuter
  };
}

// Vad som ingår i respektive service
function getServiceIncludes(serviceType: 'premium' | 'luxury'): string[] {
  const baseIncludes = [
    'Professionell förare',
    'Rengöring av fordon',
    'Gratis WiFi',
    'Telefonladdare',
    'Klimatkontroll'
  ];

  if (serviceType === 'luxury') {
    return [
      ...baseIncludes,
      'Lyxfordon (Mercedes, BMW, Audi)',
      'Läder interiör',
      'Gratis vatten',
      'Dagstidningar',
      'Premium sound system',
      'Personlig service',
      'Prioriterad support'
    ];
  }

  return [
    ...baseIncludes,
    'Komfortfordon',
    'Tystgående motor',
    'Extra benutrymme'
  ];
}

// Avbokningspolicy
function getCancellationPolicy(serviceType: 'premium' | 'luxury'): any {
  if (serviceType === 'luxury') {
    return {
      free: '2 timmar innan avresa',
      partial: '50% avgift 30 minuter - 2 timmar innan',
      full: '100% avgift mindre än 30 minuter innan'
    };
  }

  return {
    free: '1 timme innan avresa',
    partial: '50% avgift 15 minuter - 1 timme innan',
    full: '100% avgift mindre än 15 minuter innan'
  };
}

// Schemalägg förartilldelning
async function scheduleDriverAssignment(bookingId: string, pickupTime: Date, serviceType: string): Promise<void> {
  // Detta skulle implementeras med en job queue eller scheduler
  console.log(`Scheduling driver assignment for ${bookingId} at ${pickupTime} (${serviceType})`);
  
  // Placeholder för schemaläggning
  // I produktion skulle detta använda något som Bull Queue, Agenda, eller liknande
}

// Skapa återkommande bokningar
async function createRecurringBookings(baseBooking: any, recurringConfig: any): Promise<void> {
  console.log(`Creating recurring bookings for ${baseBooking.id}`, recurringConfig);
  
  // Placeholder för återkommande bokningar
  // I produktion skulle detta skapa flera bokningar baserat på frequens och slutdatum
}
