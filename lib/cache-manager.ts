// Advanced Cache Manager for Avanti Booking System
// Implements multi-tier caching with intelligent invalidation

export interface CacheConfig {
  defaultTTL: number; // seconds
  maxSize: number; // maximum number of entries
  enableCompression: boolean;
  enablePersistence: boolean;
  enableDistribution: boolean; // for multi-instance deployments
}

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  compressed?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

// Cache tiers with different characteristics
export enum CacheTier {
  MEMORY = 'memory',     // Fastest, limited size
  BROWSER = 'browser',   // Medium speed, persistent across sessions
  NETWORK = 'network'    // Slowest, shared across instances
}

// Cache categories for organized management
export enum CacheCategory {
  USER_DATA = 'user_data',
  BOOKING_DATA = 'booking_data',
  LOCATION_DATA = 'location_data',
  PRICING_DATA = 'pricing_data',
  MAPS_DATA = 'maps_data',
  API_RESPONSES = 'api_responses',
  STATIC_CONTENT = 'static_content'
}

class AdvancedCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalSize: 0,
    entryCount: 0,
    memoryUsage: 0,
    oldestEntry: Date.now(),
    newestEntry: Date.now()
  };

  private config: CacheConfig = {
    defaultTTL: 300, // 5 minutes
    maxSize: 1000,
    enableCompression: true,
    enablePersistence: true,
    enableDistribution: false
  };

  private compressionThreshold = 1024; // bytes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.startCleanupProcess();
    this.initializeBrowserStorage();
  }

  // Get data from cache with tier fallback
  async get<T = any>(
    key: string, 
    options: {
      tier?: CacheTier;
      fallbackTiers?: CacheTier[];
      updateAccessTime?: boolean;
    } = {}
  ): Promise<T | null> {
    const { 
      tier = CacheTier.MEMORY, 
      fallbackTiers = [CacheTier.BROWSER, CacheTier.NETWORK],
      updateAccessTime = true 
    } = options;

    // Try primary tier
    const result = await this.getFromTier<T>(key, tier, updateAccessTime);
    if (result !== null) {
      this.recordHit();
      return result;
    }

    // Try fallback tiers
    for (const fallbackTier of fallbackTiers) {
      const fallbackResult = await this.getFromTier<T>(key, fallbackTier, updateAccessTime);
      if (fallbackResult !== null) {
        // Promote to higher tier for faster future access
        await this.set(key, fallbackResult, { tier: CacheTier.MEMORY });
        this.recordHit();
        return fallbackResult;
      }
    }

    this.recordMiss();
    return null;
  }

  // Set data in cache with intelligent tier selection
  async set<T = any>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      tier?: CacheTier;
      tags?: string[];
      category?: CacheCategory;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const {
      ttl = this.config.defaultTTL,
      tier = CacheTier.MEMORY,
      tags = [],
      category,
      metadata = {}
    } = options;

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
      metadata: {
        ...metadata,
        category,
        tier
      }
    };

    // Compress large entries
    if (this.config.enableCompression && this.shouldCompress(data)) {
      entry.compressed = true;
      entry.data = await this.compress(data) as T;
    }

    await this.setInTier(key, entry, tier);
    this.updateStats();
  }

  // Intelligent cache warming for predicted access patterns
  async warmCache(patterns: {
    category: CacheCategory;
    keys?: string[];
    dataLoader?: (key: string) => Promise<any>;
    priority?: 'low' | 'medium' | 'high';
  }[]): Promise<void> {
    console.log('Starting cache warming process...');

    for (const pattern of patterns) {
      const { category, keys = [], dataLoader, priority = 'medium' } = pattern;

      if (keys.length > 0) {
        // Warm specific keys
        for (const key of keys) {
          if (!(await this.has(key))) {
            if (dataLoader) {
              try {
                const data = await dataLoader(key);
                const ttl = this.getTTLForCategory(category, priority);
                await this.set(key, data, { category, ttl });
              } catch (error) {
                console.warn(`Failed to warm cache for key ${key}:`, error);
              }
            }
          }
        }
      }
    }

    console.log('Cache warming completed');
  }

  // Invalidate cache entries by tags or patterns
  async invalidate(options: {
    keys?: string[];
    tags?: string[];
    category?: CacheCategory;
    pattern?: RegExp;
    olderThan?: number; // milliseconds
  }): Promise<number> {
    const { keys, tags, category, pattern, olderThan } = options;
    let invalidatedCount = 0;

    // Invalidate specific keys
    if (keys) {
      for (const key of keys) {
        if (await this.delete(key)) {
          invalidatedCount++;
        }
      }
    }

    // Invalidate by tags
    if (tags) {
      const keysToInvalidate = await this.getKeysByTags(tags);
      for (const key of keysToInvalidate) {
        if (await this.delete(key)) {
          invalidatedCount++;
        }
      }
    }

    // Invalidate by category
    if (category) {
      const keysToInvalidate = await this.getKeysByCategory(category);
      for (const key of keysToInvalidate) {
        if (await this.delete(key)) {
          invalidatedCount++;
        }
      }
    }

    // Invalidate by pattern
    if (pattern) {
      const allKeys = Array.from(this.memoryCache.keys());
      const matchingKeys = allKeys.filter(key => pattern.test(key));
      for (const key of matchingKeys) {
        if (await this.delete(key)) {
          invalidatedCount++;
        }
      }
    }

    // Invalidate old entries
    if (olderThan) {
      const cutoff = Date.now() - olderThan;
      const keysToInvalidate: string[] = [];
      
      this.memoryCache.forEach((entry, key) => {
        if (entry.timestamp < cutoff) {
          keysToInvalidate.push(key);
        }
      });

      for (const key of keysToInvalidate) {
        if (await this.delete(key)) {
          invalidatedCount++;
        }
      }
    }

    this.updateStats();
    return invalidatedCount;
  }

  // Advanced cache analytics
  getAnalytics(): {
    stats: CacheStats;
    topKeys: Array<{ key: string; accessCount: number; size: number }>;
    categoryBreakdown: Record<CacheCategory, { count: number; size: number }>;
    tierDistribution: Record<CacheTier, { count: number; size: number }>;
    recommendations: string[];
  } {
    const topKeys = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        size: this.getEntrySize(entry)
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    const categoryBreakdown = this.getCategoryBreakdown();
    const tierDistribution = this.getTierDistribution();
    const recommendations = this.generateRecommendations();

    return {
      stats: { ...this.cacheStats },
      topKeys,
      categoryBreakdown,
      tierDistribution,
      recommendations
    };
  }

  // Optimize cache performance based on usage patterns
  async optimize(): Promise<void> {
    console.log('Starting cache optimization...');

    // Remove least recently used entries if cache is full
    if (this.memoryCache.size >= this.config.maxSize) {
      await this.evictLRU(Math.floor(this.config.maxSize * 0.1)); // Remove 10%
    }

    // Promote frequently accessed entries
    await this.promoteHotEntries();

    // Compress large entries
    await this.compressLargeEntries();

    // Update TTL for entries based on access patterns
    await this.adjustTTLBasedOnUsage();

    this.updateStats();
    console.log('Cache optimization completed');
  }

  // Private methods
  private async getFromTier<T>(key: string, tier: CacheTier, updateAccessTime: boolean): Promise<T | null> {
    switch (tier) {
      case CacheTier.MEMORY:
        return this.getFromMemory<T>(key, updateAccessTime);
      
      case CacheTier.BROWSER:
        return this.getFromBrowser<T>(key, updateAccessTime);
      
      case CacheTier.NETWORK:
        return this.getFromNetwork<T>(key, updateAccessTime);
      
      default:
        return null;
    }
  }

  private getFromMemory<T>(key: string, updateAccessTime: boolean): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    if (updateAccessTime) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }

    // Decompress if needed
    if (entry.compressed) {
      return this.decompress(entry.data) as T;
    }

    return entry.data;
  }

  private async getFromBrowser<T>(key: string, updateAccessTime: boolean): Promise<T | null> {
    if (!this.config.enablePersistence || typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(`avanti_cache_${key}`);
      if (!stored) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() > entry.timestamp + entry.ttl) {
        localStorage.removeItem(`avanti_cache_${key}`);
        return null;
      }

      if (updateAccessTime) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        localStorage.setItem(`avanti_cache_${key}`, JSON.stringify(entry));
      }

      return entry.compressed ? this.decompress(entry.data) as T : entry.data;
    } catch (error) {
      console.warn(`Failed to get from browser cache: ${key}`, error);
      return null;
    }
  }

  private async getFromNetwork<T>(key: string, updateAccessTime: boolean): Promise<T | null> {
    // Placeholder for distributed cache (Redis, etc.)
    // In production, this would connect to a shared cache service
    return null;
  }

  private async setInTier<T>(key: string, entry: CacheEntry<T>, tier: CacheTier): Promise<void> {
    switch (tier) {
      case CacheTier.MEMORY:
        this.memoryCache.set(key, entry);
        break;
      
      case CacheTier.BROWSER:
        if (this.config.enablePersistence && typeof window !== 'undefined') {
          try {
            localStorage.setItem(`avanti_cache_${key}`, JSON.stringify(entry));
          } catch (error) {
            console.warn(`Failed to set in browser cache: ${key}`, error);
          }
        }
        break;
      
      case CacheTier.NETWORK:
        // Placeholder for distributed cache
        break;
    }
  }

  private async has(key: string): Promise<boolean> {
    return this.memoryCache.has(key) || 
           (typeof window !== 'undefined' && localStorage.getItem(`avanti_cache_${key}`) !== null);
  }

  private async delete(key: string): Promise<boolean> {
    let deleted = false;
    
    if (this.memoryCache.delete(key)) {
      deleted = true;
    }
    
    if (typeof window !== 'undefined') {
      const browserKey = `avanti_cache_${key}`;
      if (localStorage.getItem(browserKey)) {
        localStorage.removeItem(browserKey);
        deleted = true;
      }
    }
    
    return deleted;
  }

  private shouldCompress<T>(data: T): boolean {
    const size = JSON.stringify(data).length;
    return size > this.compressionThreshold;
  }

  private async compress<T>(data: T): Promise<string> {
    // Simple compression using JSON stringification
    // In production, consider using actual compression libraries
    return JSON.stringify(data);
  }

  private decompress<T>(compressedData: any): T {
    // Simple decompression
    // In production, use corresponding decompression
    if (typeof compressedData === 'string') {
      return JSON.parse(compressedData);
    }
    return compressedData;
  }

  private getTTLForCategory(category: CacheCategory, priority: 'low' | 'medium' | 'high'): number {
    const baseTTL = {
      [CacheCategory.USER_DATA]: 600,      // 10 minutes
      [CacheCategory.BOOKING_DATA]: 300,   // 5 minutes
      [CacheCategory.LOCATION_DATA]: 60,   // 1 minute
      [CacheCategory.PRICING_DATA]: 180,   // 3 minutes
      [CacheCategory.MAPS_DATA]: 3600,     // 1 hour
      [CacheCategory.API_RESPONSES]: 300,  // 5 minutes
      [CacheCategory.STATIC_CONTENT]: 7200 // 2 hours
    };

    const multipliers = {
      low: 0.5,
      medium: 1,
      high: 2
    };

    return baseTTL[category] * multipliers[priority];
  }

  private async getKeysByTags(tags: string[]): Promise<string[]> {
    const matchingKeys: string[] = [];
    
    this.memoryCache.forEach((entry, key) => {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        matchingKeys.push(key);
      }
    });

    return matchingKeys;
  }

  private async getKeysByCategory(category: CacheCategory): Promise<string[]> {
    const matchingKeys: string[] = [];
    
    this.memoryCache.forEach((entry, key) => {
      if (entry.metadata?.category === category) {
        matchingKeys.push(key);
      }
    });

    return matchingKeys;
  }

  private getEntrySize(entry: CacheEntry): number {
    return JSON.stringify(entry).length;
  }

  private getCategoryBreakdown(): Record<CacheCategory, { count: number; size: number }> {
    const breakdown: Record<string, { count: number; size: number }> = {};
    
    Object.values(CacheCategory).forEach(category => {
      breakdown[category] = { count: 0, size: 0 };
    });

    this.memoryCache.forEach((entry) => {
      const category = entry.metadata?.category || CacheCategory.API_RESPONSES;
      breakdown[category].count++;
      breakdown[category].size += this.getEntrySize(entry);
    });

    return breakdown as Record<CacheCategory, { count: number; size: number }>;
  }

  private getTierDistribution(): Record<CacheTier, { count: number; size: number }> {
    const distribution: Record<string, { count: number; size: number }> = {};
    
    Object.values(CacheTier).forEach(tier => {
      distribution[tier] = { count: 0, size: 0 };
    });

    this.memoryCache.forEach((entry) => {
      const tier = entry.metadata?.tier || CacheTier.MEMORY;
      distribution[tier].count++;
      distribution[tier].size += this.getEntrySize(entry);
    });

    return distribution as Record<CacheTier, { count: number; size: number }>;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const { hitRate, entryCount } = this.cacheStats;

    if (hitRate < 0.7) {
      recommendations.push('Consider increasing cache TTL for frequently accessed data');
    }

    if (entryCount > this.config.maxSize * 0.9) {
      recommendations.push('Cache is nearly full, consider increasing maxSize or enabling compression');
    }

    if (!this.config.enableCompression) {
      recommendations.push('Enable compression to reduce memory usage');
    }

    if (!this.config.enablePersistence) {
      recommendations.push('Enable persistence to improve performance across sessions');
    }

    return recommendations;
  }

  private async evictLRU(count: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);

    for (const [key] of entries) {
      this.memoryCache.delete(key);
    }
  }

  private async promoteHotEntries(): Promise<void> {
    // Promote frequently accessed entries to higher tiers
    const hotEntries = Array.from(this.memoryCache.entries())
      .filter(([, entry]) => entry.accessCount > 10)
      .slice(0, 50); // Top 50 hot entries

    for (const [key, entry] of hotEntries) {
      if (entry.metadata?.tier !== CacheTier.MEMORY) {
        await this.setInTier(key, { ...entry, metadata: { ...entry.metadata, tier: CacheTier.MEMORY } }, CacheTier.MEMORY);
      }
    }
  }

  private async compressLargeEntries(): Promise<void> {
    if (!this.config.enableCompression) return;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (!entry.compressed && this.shouldCompress(entry.data)) {
        entry.data = await this.compress(entry.data);
        entry.compressed = true;
      }
    }
  }

  private async adjustTTLBasedOnUsage(): Promise<void> {
    const now = Date.now();
    
    this.memoryCache.forEach((entry) => {
      // Extend TTL for frequently accessed entries
      if (entry.accessCount > 5) {
        const extensionFactor = Math.min(entry.accessCount / 10, 2); // Max 2x extension
        entry.ttl = entry.ttl * extensionFactor;
      }
      
      // Reduce TTL for rarely accessed entries
      if (entry.accessCount === 0 && now - entry.timestamp > entry.ttl * 0.5) {
        entry.ttl = entry.ttl * 0.5;
      }
    });
  }

  private recordHit(): void {
    this.cacheStats.hits++;
    this.updateHitRate();
  }

  private recordMiss(): void {
    this.cacheStats.misses++;
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? this.cacheStats.hits / total : 0;
  }

  private updateStats(): void {
    this.cacheStats.entryCount = this.memoryCache.size;
    this.cacheStats.totalSize = Array.from(this.memoryCache.values())
      .reduce((sum, entry) => sum + this.getEntrySize(entry), 0);
    
    const timestamps = Array.from(this.memoryCache.values()).map(entry => entry.timestamp);
    this.cacheStats.oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    this.cacheStats.newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
    
    // Estimate memory usage (rough calculation)
    this.cacheStats.memoryUsage = this.cacheStats.totalSize * 1.2; // Add overhead
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Run every minute
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.memoryCache.delete(key));
    this.updateStats();
  }

  private initializeBrowserStorage(): void {
    if (typeof window === 'undefined' || !this.config.enablePersistence) return;

    // Clean up expired browser cache entries on initialization
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('avanti_cache_')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored);
            if (Date.now() > entry.timestamp + entry.ttl) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryCache.clear();
  }
}

// Specialized cache managers for different data types
export class LocationCacheManager extends AdvancedCacheManager {
  constructor() {
    super({
      defaultTTL: 60, // 1 minute for location data
      maxSize: 500,
      enableCompression: false, // Location data is small
      enablePersistence: false // Location data shouldn't persist
    });
  }

  async cacheDriverLocation(driverId: string, location: any): Promise<void> {
    await this.set(`driver_location_${driverId}`, location, {
      category: CacheCategory.LOCATION_DATA,
      tags: ['driver_location', driverId],
      ttl: 30 // 30 seconds for driver locations
    });
  }

  async getDriverLocation(driverId: string): Promise<any> {
    return this.get(`driver_location_${driverId}`);
  }
}

export class PricingCacheManager extends AdvancedCacheManager {
  constructor() {
    super({
      defaultTTL: 300, // 5 minutes for pricing
      maxSize: 200,
      enableCompression: true,
      enablePersistence: true
    });
  }

  async cacheRoutePrice(origin: string, destination: string, serviceType: string, price: any): Promise<void> {
    const key = `route_price_${this.hashRoute(origin, destination, serviceType)}`;
    await this.set(key, price, {
      category: CacheCategory.PRICING_DATA,
      tags: ['route_price', serviceType],
      ttl: 180 // 3 minutes for pricing
    });
  }

  async getRoutePrice(origin: string, destination: string, serviceType: string): Promise<any> {
    const key = `route_price_${this.hashRoute(origin, destination, serviceType)}`;
    return this.get(key);
  }

  private hashRoute(origin: string, destination: string, serviceType: string): string {
    // Simple hash function for route caching
    return btoa(`${origin}|${destination}|${serviceType}`).replace(/[^a-zA-Z0-9]/g, '');
  }
}

// Export singleton instances
export const mainCacheManager = new AdvancedCacheManager({
  defaultTTL: 300,
  maxSize: 1000,
  enableCompression: true,
  enablePersistence: true
});

export const locationCacheManager = new LocationCacheManager();
export const pricingCacheManager = new PricingCacheManager();

export default mainCacheManager;
