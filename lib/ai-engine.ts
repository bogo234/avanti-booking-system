// AI Engine for Avanti Booking System
// Advanced machine learning capabilities for smart routing and demand prediction

import { googleMapsClient, Coordinates } from './google-maps-enhanced';
import { performanceMonitor } from './performance-monitor';

export interface TrafficPattern {
  timestamp: number;
  location: Coordinates;
  density: number; // 0-1 scale
  averageSpeed: number; // km/h
  congestionLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedDuration: number; // minutes until pattern changes
}

export interface DemandPrediction {
  location: Coordinates;
  radius: number; // meters
  timestamp: number;
  predictedDemand: number; // 0-1 scale
  confidence: number; // 0-1 scale
  factors: {
    historical: number;
    weather: number;
    events: number;
    timeOfDay: number;
    dayOfWeek: number;
  };
  recommendations: {
    optimalDriverCount: number;
    surgePricingMultiplier: number;
    proactivePositioning: Coordinates[];
  };
}

export interface RouteOptimization {
  originalRoute: {
    distance: number;
    duration: number;
    coordinates: Coordinates[];
  };
  optimizedRoute: {
    distance: number;
    duration: number;
    coordinates: Coordinates[];
    savings: {
      timeMinutes: number;
      distanceKm: number;
      fuelCost: number;
    };
  };
  aiConfidence: number;
  alternativeRoutes: Array<{
    route: Coordinates[];
    score: number;
    reason: string;
  }>;
}

export interface DriverMatchingResult {
  driverId: string;
  score: number; // 0-1 scale, higher is better
  estimatedArrival: number; // minutes
  factors: {
    proximity: number;
    rating: number;
    vehicleType: number;
    availability: number;
    efficiency: number;
  };
  reasoning: string;
}

class AdvancedAIEngine {
  private trafficPatterns: Map<string, TrafficPattern[]> = new Map();
  private demandHistory: Map<string, DemandPrediction[]> = new Map();
  private routeOptimizations: Map<string, RouteOptimization> = new Map();
  private driverPerformanceData: Map<string, any> = new Map();

  // Neural network simulation for demand prediction
  private demandPredictionWeights = {
    historical: 0.3,
    timeOfDay: 0.25,
    weather: 0.15,
    events: 0.15,
    dayOfWeek: 0.1,
    seasonality: 0.05
  };

  // Route optimization parameters
  private routeOptimizationConfig = {
    trafficWeight: 0.4,
    distanceWeight: 0.3,
    fuelEfficiencyWeight: 0.2,
    safetyWeight: 0.1
  };

  constructor() {
    this.initializeAIModels();
    this.startDataCollection();
  }

  // Smart Route Optimization with AI
  async optimizeRoute(
    origin: Coordinates,
    destination: Coordinates,
    options: {
      vehicleType?: 'standard' | 'premium' | 'luxury';
      priority?: 'time' | 'cost' | 'comfort' | 'eco';
      avoidTolls?: boolean;
      departureTime?: Date;
      passengerCount?: number;
    } = {}
  ): Promise<RouteOptimization> {
    const startTime = Date.now();

    try {
      // Get current traffic patterns
      const trafficData = await this.analyzeTrafficPatterns(origin, destination);
      
      // Get historical route data
      const historicalData = await this.getHistoricalRouteData(origin, destination);
      
      // Generate multiple route options using AI
      const routeOptions = await this.generateIntelligentRoutes(
        origin, 
        destination, 
        trafficData, 
        historicalData, 
        options
      );

      // Score and rank routes using ML algorithm
      const scoredRoutes = await this.scoreRoutes(routeOptions, options);
      
      // Select optimal route
      const optimalRoute = scoredRoutes[0];
      
      // Get original Google Maps route for comparison
      const originalRoute = await this.getGoogleMapsRoute(origin, destination, options);
      
      const optimization: RouteOptimization = {
        originalRoute: {
          distance: originalRoute.distance / 1000, // Convert to km
          duration: originalRoute.duration / 60, // Convert to minutes
          coordinates: this.decodePolyline(originalRoute.polyline)
        },
        optimizedRoute: {
          distance: optimalRoute.distance,
          duration: optimalRoute.duration,
          coordinates: optimalRoute.coordinates,
          savings: {
            timeMinutes: Math.max(0, (originalRoute.duration / 60) - optimalRoute.duration),
            distanceKm: Math.max(0, (originalRoute.distance / 1000) - optimalRoute.distance),
            fuelCost: this.calculateFuelSavings(originalRoute.distance, optimalRoute.distance * 1000)
          }
        },
        aiConfidence: optimalRoute.confidence,
        alternativeRoutes: scoredRoutes.slice(1, 4).map(route => ({
          route: route.coordinates,
          score: route.score,
          reason: route.reason
        }))
      };

      // Cache the optimization
      const cacheKey = this.generateRouteKey(origin, destination, options);
      this.routeOptimizations.set(cacheKey, optimization);

      // Record performance metrics
      performanceMonitor.recordMetric({
        name: 'ai_route_optimization_time',
        value: Date.now() - startTime,
        unit: 'ms',
        category: 'AI_PERFORMANCE' as any
      });

      return optimization;

    } catch (error) {
      console.error('Route optimization failed:', error);
      
      // Fallback to Google Maps route
      const fallbackRoute = await this.getGoogleMapsRoute(origin, destination, options);
      
      return {
        originalRoute: {
          distance: fallbackRoute.distance / 1000,
          duration: fallbackRoute.duration / 60,
          coordinates: this.decodePolyline(fallbackRoute.polyline)
        },
        optimizedRoute: {
          distance: fallbackRoute.distance / 1000,
          duration: fallbackRoute.duration / 60,
          coordinates: this.decodePolyline(fallbackRoute.polyline),
          savings: { timeMinutes: 0, distanceKm: 0, fuelCost: 0 }
        },
        aiConfidence: 0,
        alternativeRoutes: []
      };
    }
  }

  // Demand Prediction using Machine Learning
  async predictDemand(
    location: Coordinates,
    radius: number = 2000,
    timeRange: { start: Date; end: Date }
  ): Promise<DemandPrediction[]> {
    const predictions: DemandPrediction[] = [];
    
    try {
      // Get historical demand data
      const historicalDemand = await this.getHistoricalDemand(location, radius);
      
      // Get weather forecast
      const weatherData = await this.getWeatherForecast(location, timeRange);
      
      // Get events data
      const eventsData = await this.getLocalEvents(location, radius, timeRange);
      
      // Generate predictions for each hour in the time range
      const startTime = timeRange.start.getTime();
      const endTime = timeRange.end.getTime();
      const hourlyInterval = 60 * 60 * 1000; // 1 hour
      
      for (let timestamp = startTime; timestamp <= endTime; timestamp += hourlyInterval) {
        const predictionTime = new Date(timestamp);
        
        // Extract features for ML model
        const features = this.extractDemandFeatures(
          predictionTime,
          historicalDemand,
          weatherData,
          eventsData
        );
        
        // Apply neural network simulation
        const predictedDemand = this.calculateDemandPrediction(features);
        
        // Calculate confidence based on data quality
        const confidence = this.calculatePredictionConfidence(features, historicalDemand);
        
        // Generate recommendations
        const recommendations = this.generateDemandRecommendations(
          predictedDemand,
          location,
          predictionTime
        );
        
        predictions.push({
          location,
          radius,
          timestamp,
          predictedDemand,
          confidence,
          factors: {
            historical: features.historical * this.demandPredictionWeights.historical,
            weather: features.weather * this.demandPredictionWeights.weather,
            events: features.events * this.demandPredictionWeights.events,
            timeOfDay: features.timeOfDay * this.demandPredictionWeights.timeOfDay,
            dayOfWeek: features.dayOfWeek * this.demandPredictionWeights.dayOfWeek
          },
          recommendations
        });
      }
      
      // Cache predictions
      const cacheKey = `${location.lat}_${location.lng}_${radius}`;
      this.demandHistory.set(cacheKey, predictions);
      
      return predictions;
      
    } catch (error) {
      console.error('Demand prediction failed:', error);
      return [];
    }
  }

  // Intelligent Driver Matching
  async findOptimalDriver(
    pickupLocation: Coordinates,
    bookingDetails: {
      serviceType: 'standard' | 'premium' | 'luxury';
      passengers: number;
      luggage: 'none' | 'small' | 'medium' | 'large';
      specialRequests?: string[];
      priorityLevel: 'normal' | 'high' | 'urgent';
    },
    availableDrivers: Array<{
      id: string;
      location: Coordinates;
      rating: number;
      vehicleType: string;
      availability: 'available' | 'busy' | 'offline';
      completedRides: number;
      efficiency: number; // 0-1 scale
      specialCapabilities?: string[];
    }>
  ): Promise<DriverMatchingResult[]> {
    const matchingResults: DriverMatchingResult[] = [];
    
    try {
      for (const driver of availableDrivers) {
        if (driver.availability !== 'available') continue;
        
        // Calculate proximity score
        const distance = googleMapsClient.calculateDistance(pickupLocation, driver.location);
        const proximityScore = Math.max(0, 1 - (distance / 10)); // 10km max distance
        
        // Calculate rating score (normalized)
        const ratingScore = driver.rating / 5.0;
        
        // Calculate vehicle type compatibility
        const vehicleScore = this.calculateVehicleCompatibility(
          bookingDetails.serviceType,
          driver.vehicleType,
          bookingDetails.passengers,
          bookingDetails.luggage
        );
        
        // Calculate availability score (based on recent activity)
        const availabilityScore = this.calculateAvailabilityScore(driver.id);
        
        // Calculate efficiency score
        const efficiencyScore = driver.efficiency;
        
        // Special capabilities bonus
        const capabilitiesBonus = this.calculateCapabilitiesBonus(
          bookingDetails.specialRequests || [],
          driver.specialCapabilities || []
        );
        
        // Weighted total score
        const totalScore = (
          proximityScore * 0.3 +
          ratingScore * 0.25 +
          vehicleScore * 0.2 +
          availabilityScore * 0.15 +
          efficiencyScore * 0.1
        ) + capabilitiesBonus;
        
        // Estimate arrival time
        const estimatedArrival = await this.estimateDriverArrival(
          driver.location,
          pickupLocation,
          driver.id
        );
        
        // Generate reasoning
        const reasoning = this.generateMatchingReasoning(
          proximityScore,
          ratingScore,
          vehicleScore,
          availabilityScore,
          efficiencyScore,
          capabilitiesBonus
        );
        
        matchingResults.push({
          driverId: driver.id,
          score: Math.min(1.0, totalScore),
          estimatedArrival,
          factors: {
            proximity: proximityScore,
            rating: ratingScore,
            vehicleType: vehicleScore,
            availability: availabilityScore,
            efficiency: efficiencyScore
          },
          reasoning
        });
      }
      
      // Sort by score (highest first)
      matchingResults.sort((a, b) => b.score - a.score);
      
      // Apply priority boost for urgent bookings
      if (bookingDetails.priorityLevel === 'urgent') {
        matchingResults.forEach(result => {
          result.score = Math.min(1.0, result.score * 1.2);
        });
      }
      
      return matchingResults;
      
    } catch (error) {
      console.error('Driver matching failed:', error);
      return [];
    }
  }

  // Real-time Traffic Analysis with AI
  async analyzeTrafficPatterns(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<TrafficPattern[]> {
    try {
      // Get current traffic from Google Maps
      const directionsResult = await googleMapsClient.getDirections(origin, destination, {
        travelMode: 'driving',
        departureTime: new Date(),
        trafficModel: 'best_guess'
      });
      
      if (!directionsResult.success || !directionsResult.routes?.length) {
        return [];
      }
      
      const route = directionsResult.routes[0];
      const patterns: TrafficPattern[] = [];
      
      // Analyze route segments
      const segments = this.divideRouteIntoSegments(route.steps || []);
      
      for (const segment of segments) {
        const pattern: TrafficPattern = {
          timestamp: Date.now(),
          location: segment.midpoint,
          density: this.calculateTrafficDensity(segment),
          averageSpeed: this.calculateAverageSpeed(segment),
          congestionLevel: this.determineCongestionLevel(segment),
          predictedDuration: this.predictTrafficDuration(segment)
        };
        
        patterns.push(pattern);
      }
      
      // Cache traffic patterns
      const cacheKey = `${origin.lat}_${origin.lng}_${destination.lat}_${destination.lng}`;
      this.trafficPatterns.set(cacheKey, patterns);
      
      return patterns;
      
    } catch (error) {
      console.error('Traffic analysis failed:', error);
      return [];
    }
  }

  // Dynamic Pricing with AI
  calculateDynamicPricing(
    basePrice: number,
    demandPrediction: DemandPrediction,
    trafficPatterns: TrafficPattern[],
    options: {
      serviceType: 'standard' | 'premium' | 'luxury';
      timeOfDay: Date;
      isRecurringCustomer: boolean;
      customerRating: number;
    }
  ): {
    finalPrice: number;
    multiplier: number;
    breakdown: {
      basePrice: number;
      demandMultiplier: number;
      trafficMultiplier: number;
      timeMultiplier: number;
      loyaltyDiscount: number;
      serviceMultiplier: number;
    };
    reasoning: string;
  } {
    let multiplier = 1.0;
    
    // Demand-based pricing
    const demandMultiplier = 1 + (demandPrediction.predictedDemand * 0.5);
    multiplier *= demandMultiplier;
    
    // Traffic-based pricing
    const avgCongestion = trafficPatterns.reduce((sum, p) => {
      const congestionValue = { low: 0, medium: 0.2, high: 0.4, critical: 0.6 }[p.congestionLevel];
      return sum + congestionValue;
    }, 0) / trafficPatterns.length;
    const trafficMultiplier = 1 + avgCongestion;
    multiplier *= trafficMultiplier;
    
    // Time-based pricing
    const hour = options.timeOfDay.getHours();
    const timeMultiplier = this.getTimeMultiplier(hour);
    multiplier *= timeMultiplier;
    
    // Service type multiplier
    const serviceMultipliers = { standard: 1.0, premium: 1.5, luxury: 2.5 };
    const serviceMultiplier = serviceMultipliers[options.serviceType];
    multiplier *= serviceMultiplier;
    
    // Loyalty discount for recurring customers
    const loyaltyDiscount = options.isRecurringCustomer 
      ? Math.max(0.05, options.customerRating / 5.0 * 0.15) 
      : 0;
    multiplier *= (1 - loyaltyDiscount);
    
    const finalPrice = Math.round(basePrice * multiplier);
    
    const reasoning = this.generatePricingReasoning(
      demandPrediction,
      avgCongestion,
      hour,
      options.isRecurringCustomer,
      loyaltyDiscount
    );
    
    return {
      finalPrice,
      multiplier,
      breakdown: {
        basePrice,
        demandMultiplier,
        trafficMultiplier,
        timeMultiplier,
        loyaltyDiscount,
        serviceMultiplier
      },
      reasoning
    };
  }

  // Private helper methods
  private async initializeAIModels(): Promise<void> {
    console.log('Initializing AI models...');
    // In production, this would load pre-trained models
    // For now, we use rule-based algorithms with ML-like behavior
  }

  private startDataCollection(): void {
    // Collect data every 5 minutes
    setInterval(async () => {
      await this.collectTrafficData();
      await this.collectDemandData();
    }, 5 * 60 * 1000);
  }

  private async collectTrafficData(): Promise<void> {
    // Collect real-time traffic data for analysis
    console.log('Collecting traffic data...');
  }

  private async collectDemandData(): Promise<void> {
    // Collect demand patterns for ML training
    console.log('Collecting demand data...');
  }

  private async generateIntelligentRoutes(
    origin: Coordinates,
    destination: Coordinates,
    trafficData: TrafficPattern[],
    historicalData: any,
    options: any
  ): Promise<any[]> {
    // Generate multiple route options using AI algorithms
    const routes = [];
    
    // Primary route (Google Maps optimized)
    const primaryRoute = await this.getGoogleMapsRoute(origin, destination, options);
    routes.push({
      ...primaryRoute,
      type: 'primary',
      confidence: 0.9
    });
    
    // Alternative routes based on AI analysis
    const alternativeRoutes = await this.generateAlternativeRoutes(
      origin, 
      destination, 
      trafficData, 
      options
    );
    routes.push(...alternativeRoutes);
    
    return routes;
  }

  private async scoreRoutes(routes: any[], options: any): Promise<any[]> {
    return routes.map(route => {
      let score = 0;
      
      // Time efficiency (40% weight)
      score += (1 - (route.duration / 3600)) * 0.4; // Normalize by 1 hour
      
      // Distance efficiency (30% weight)
      score += (1 - (route.distance / 50000)) * 0.3; // Normalize by 50km
      
      // Traffic avoidance (20% weight)
      score += route.trafficScore * 0.2;
      
      // Safety score (10% weight)
      score += route.safetyScore * 0.1;
      
      return {
        ...route,
        score: Math.max(0, Math.min(1, score)),
        reason: this.generateRouteReason(route, score)
      };
    }).sort((a, b) => b.score - a.score);
  }

  private async getGoogleMapsRoute(
    origin: Coordinates,
    destination: Coordinates,
    options: any
  ): Promise<any> {
    const result = await googleMapsClient.getDirections(origin, destination, {
      travelMode: 'driving',
      departureTime: options.departureTime || new Date(),
      trafficModel: 'best_guess'
    });
    
    if (result.success && result.routes?.length) {
      const route = result.routes[0];
      return {
        distance: route.distance.value,
        duration: route.duration.value,
        polyline: route.polyline,
        trafficScore: 0.7, // Default score
        safetyScore: 0.8   // Default score
      };
    }
    
    throw new Error('Failed to get Google Maps route');
  }

  private decodePolyline(encoded: string): Coordinates[] {
    // Simplified polyline decoding - in production use proper library
    return []; // Placeholder
  }

  private calculateFuelSavings(originalDistance: number, optimizedDistance: number): number {
    const fuelPricePerLiter = 16; // SEK
    const fuelConsumptionPer100km = 7; // liters
    const distanceSaved = (originalDistance - optimizedDistance) / 1000; // km
    
    return (distanceSaved / 100) * fuelConsumptionPer100km * fuelPricePerLiter;
  }

  private generateRouteKey(origin: Coordinates, destination: Coordinates, options: any): string {
    return `${origin.lat}_${origin.lng}_${destination.lat}_${destination.lng}_${JSON.stringify(options)}`;
  }

  private async getHistoricalRouteData(origin: Coordinates, destination: Coordinates): Promise<any> {
    // Get historical route performance data
    return {};
  }

  private async getHistoricalDemand(location: Coordinates, radius: number): Promise<any[]> {
    // Get historical demand data for the area
    return [];
  }

  private async getWeatherForecast(location: Coordinates, timeRange: { start: Date; end: Date }): Promise<any> {
    // Get weather forecast data
    return {};
  }

  private async getLocalEvents(location: Coordinates, radius: number, timeRange: { start: Date; end: Date }): Promise<any[]> {
    // Get local events that might affect demand
    return [];
  }

  private extractDemandFeatures(
    predictionTime: Date,
    historicalDemand: any[],
    weatherData: any,
    eventsData: any[]
  ): any {
    const hour = predictionTime.getHours();
    const dayOfWeek = predictionTime.getDay();
    
    return {
      historical: this.calculateHistoricalFactor(historicalDemand, hour, dayOfWeek),
      weather: this.calculateWeatherFactor(weatherData),
      events: this.calculateEventsFactor(eventsData),
      timeOfDay: this.calculateTimeOfDayFactor(hour),
      dayOfWeek: this.calculateDayOfWeekFactor(dayOfWeek)
    };
  }

  private calculateDemandPrediction(features: any): number {
    // Simulate neural network prediction
    let prediction = 0;
    
    prediction += features.historical * this.demandPredictionWeights.historical;
    prediction += features.timeOfDay * this.demandPredictionWeights.timeOfDay;
    prediction += features.weather * this.demandPredictionWeights.weather;
    prediction += features.events * this.demandPredictionWeights.events;
    prediction += features.dayOfWeek * this.demandPredictionWeights.dayOfWeek;
    
    return Math.max(0, Math.min(1, prediction));
  }

  private calculatePredictionConfidence(features: any, historicalDemand: any[]): number {
    // Calculate confidence based on data quality and quantity
    const dataQuality = historicalDemand.length > 100 ? 0.9 : historicalDemand.length / 100;
    const featureValues = Object.values(features) as Array<number>;
    const featureCompleteness = featureValues.filter((v) => (typeof v === 'number' ? v : 0) > 0).length / featureValues.length;
    
    return Math.min(0.95, dataQuality * featureCompleteness);
  }

  private generateDemandRecommendations(
    predictedDemand: number,
    location: Coordinates,
    predictionTime: Date
  ): any {
    const optimalDriverCount = Math.ceil(predictedDemand * 10); // Scale to driver count
    const surgePricingMultiplier = 1 + (predictedDemand * 0.5);
    
    return {
      optimalDriverCount,
      surgePricingMultiplier,
      proactivePositioning: this.generateOptimalPositions(location, predictedDemand)
    };
  }

  private generateOptimalPositions(center: Coordinates, demand: number): Coordinates[] {
    // Generate optimal driver positioning coordinates
    const positions: Coordinates[] = [];
    const radius = 0.01; // ~1km in degrees
    const count = Math.min(5, Math.ceil(demand * 5));
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      positions.push({
        lat: center.lat + Math.cos(angle) * radius,
        lng: center.lng + Math.sin(angle) * radius
      });
    }
    
    return positions;
  }

  // Additional helper methods...
  private calculateHistoricalFactor(data: any[], hour: number, dayOfWeek: number): number {
    // Calculate historical demand factor
    return Math.random() * 0.8 + 0.1; // Placeholder
  }

  private calculateWeatherFactor(weather: any): number {
    // Calculate weather impact on demand
    return Math.random() * 0.3 + 0.7; // Placeholder
  }

  private calculateEventsFactor(events: any[]): number {
    // Calculate events impact on demand
    return Math.random() * 0.4 + 0.6; // Placeholder
  }

  private calculateTimeOfDayFactor(hour: number): number {
    // Peak hours: 7-9 AM and 5-7 PM
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 0.9;
    } else if (hour >= 22 || hour <= 5) {
      return 0.2;
    }
    return 0.6;
  }

  private calculateDayOfWeekFactor(dayOfWeek: number): number {
    // Monday=1, Sunday=0
    const weekdayFactors = [0.4, 0.8, 0.9, 0.9, 0.9, 0.9, 0.6]; // Sun-Sat
    return weekdayFactors[dayOfWeek] || 0.5;
  }

  private calculateVehicleCompatibility(
    serviceType: string,
    vehicleType: string,
    passengers: number,
    luggage: string
  ): number {
    // Calculate vehicle compatibility score
    let score = 0.5; // Base score
    
    // Service type matching
    if (serviceType === 'luxury' && vehicleType.includes('luxury')) score += 0.4;
    else if (serviceType === 'premium' && vehicleType.includes('premium')) score += 0.3;
    else if (serviceType === 'standard' && vehicleType.includes('standard')) score += 0.2;
    
    // Passenger capacity
    const vehicleCapacity = this.getVehicleCapacity(vehicleType);
    if (vehicleCapacity >= passengers) score += 0.2;
    
    // Luggage capacity
    if (luggage === 'large' && vehicleType.includes('van')) score += 0.1;
    else if (luggage === 'medium' && vehicleType.includes('suv')) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private getVehicleCapacity(vehicleType: string): number {
    const capacities: Record<string, number> = {
      'standard_sedan': 4,
      'premium_sedan': 4,
      'luxury_sedan': 4,
      'suv': 6,
      'van': 8
    };
    return capacities[vehicleType] || 4;
  }

  private calculateAvailabilityScore(driverId: string): number {
    // Calculate availability score based on recent activity
    const performanceData = this.driverPerformanceData.get(driverId);
    return performanceData?.availabilityScore || 0.8;
  }

  private calculateCapabilitiesBonus(requested: string[], available: string[]): number {
    const matches = requested.filter(req => available.includes(req));
    return matches.length * 0.1; // 10% bonus per matched capability
  }

  private async estimateDriverArrival(
    driverLocation: Coordinates,
    pickupLocation: Coordinates,
    driverId: string
  ): Promise<number> {
    try {
      const directions = await googleMapsClient.getDirections(
        driverLocation,
        pickupLocation,
        { travelMode: 'driving', departureTime: new Date() }
      );
      
      if (directions.success && directions.routes?.length) {
        return directions.routes[0].duration.value / 60; // Convert to minutes
      }
    } catch (error) {
      console.error('Failed to estimate driver arrival:', error);
    }
    
    // Fallback to straight-line distance estimation
    const distance = googleMapsClient.calculateDistance(driverLocation, pickupLocation);
    return (distance / 30) * 60; // Assume 30 km/h average speed in city
  }

  private generateMatchingReasoning(
    proximity: number,
    rating: number,
    vehicle: number,
    availability: number,
    efficiency: number,
    bonus: number
  ): string {
    const reasons = [];
    
    if (proximity > 0.8) reasons.push('Very close to pickup location');
    else if (proximity > 0.6) reasons.push('Reasonably close to pickup');
    
    if (rating > 0.9) reasons.push('Excellent customer rating');
    else if (rating > 0.8) reasons.push('High customer rating');
    
    if (vehicle > 0.8) reasons.push('Perfect vehicle match');
    else if (vehicle > 0.6) reasons.push('Good vehicle compatibility');
    
    if (efficiency > 0.8) reasons.push('High efficiency driver');
    
    if (bonus > 0) reasons.push('Has requested special capabilities');
    
    return reasons.join(', ') || 'Standard matching criteria met';
  }

  private divideRouteIntoSegments(steps: any[]): any[] {
    // Divide route into analyzable segments
    return steps.map(step => ({
      midpoint: {
        lat: (step.start_location.lat + step.end_location.lat) / 2,
        lng: (step.start_location.lng + step.end_location.lng) / 2
      },
      distance: step.distance.value,
      duration: step.duration.value,
      instructions: step.html_instructions
    }));
  }

  private calculateTrafficDensity(segment: any): number {
    // Calculate traffic density for segment
    return Math.random() * 0.8 + 0.1; // Placeholder
  }

  private calculateAverageSpeed(segment: any): number {
    // Calculate average speed for segment
    const speedKmh = (segment.distance / 1000) / (segment.duration / 3600);
    return speedKmh;
  }

  private determineCongestionLevel(segment: any): 'low' | 'medium' | 'high' | 'critical' {
    const speed = this.calculateAverageSpeed(segment);
    
    if (speed > 60) return 'low';
    if (speed > 40) return 'medium';
    if (speed > 20) return 'high';
    return 'critical';
  }

  private predictTrafficDuration(segment: any): number {
    // Predict how long current traffic pattern will last
    return Math.random() * 60 + 15; // 15-75 minutes
  }

  private getTimeMultiplier(hour: number): number {
    // Peak hour pricing multipliers
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 1.3; // 30% increase during peak hours
    } else if (hour >= 22 || hour <= 5) {
      return 1.2; // 20% increase for night rides
    }
    return 1.0;
  }

  private generatePricingReasoning(
    demand: DemandPrediction,
    traffic: number,
    hour: number,
    isRecurring: boolean,
    discount: number
  ): string {
    const reasons = [];
    
    if (demand.predictedDemand > 0.7) reasons.push('High demand in area');
    if (traffic > 0.5) reasons.push('Heavy traffic conditions');
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) reasons.push('Peak hour pricing');
    if (hour >= 22 || hour <= 5) reasons.push('Night ride surcharge');
    if (isRecurring && discount > 0) reasons.push(`${Math.round(discount * 100)}% loyalty discount applied`);
    
    return reasons.join(', ') || 'Standard pricing applied';
  }

  private async generateAlternativeRoutes(
    origin: Coordinates,
    destination: Coordinates,
    trafficData: TrafficPattern[],
    options: any
  ): Promise<any[]> {
    // Generate AI-optimized alternative routes
    return []; // Placeholder
  }

  private generateRouteReason(route: any, score: number): string {
    if (score > 0.8) return 'Optimal route with excellent time and distance efficiency';
    if (score > 0.6) return 'Good route with balanced time and traffic considerations';
    if (score > 0.4) return 'Alternative route with moderate efficiency';
    return 'Backup route option';
  }
}

// Export singleton instance
export const aiEngine = new AdvancedAIEngine();

export default aiEngine;
