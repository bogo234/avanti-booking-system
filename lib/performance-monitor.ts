// Advanced Performance Monitoring System for Avanti Booking System
// Real-time performance tracking with intelligent alerting

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: MetricCategory;
  tags?: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export enum MetricCategory {
  API_PERFORMANCE = 'api_performance',
  DATABASE = 'database',
  CACHE = 'cache',
  USER_EXPERIENCE = 'user_experience',
  BUSINESS = 'business',
  SYSTEM = 'system',
  SECURITY = 'security'
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  level: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface APIEndpointMetrics {
  endpoint: string;
  method: string;
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  requestCount: number;
  errorRate: number;
  throughput: number; // requests per second
  lastUpdated: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  activeConnections: number;
  queueDepth: number;
  lastHealthCheck: number;
}

class AdvancedPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private apiMetrics: Map<string, APIEndpointMetrics> = new Map();
  private systemHealth: SystemHealth = {
    status: 'healthy',
    uptime: Date.now(),
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    cpuUsage: 0,
    activeConnections: 0,
    queueDepth: 0,
    lastHealthCheck: Date.now()
  };

  private listeners: Map<string, Function[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.startMonitoring();
    this.setupPerformanceObserver();
  }

  // Record performance metric
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricHistory = this.metrics.get(metric.name)!;
    metricHistory.push(fullMetric);

    // Keep only recent metrics
    const cutoff = Date.now() - this.retentionPeriod;
    this.metrics.set(
      metric.name,
      metricHistory.filter(m => m.timestamp > cutoff)
    );

    // Check thresholds and trigger alerts
    this.checkThresholds(fullMetric);

    // Emit metric event
    this.emit('metric', fullMetric);
  }

  // Record API endpoint performance
  recordAPICall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number
  ): void {
    const key = `${method} ${endpoint}`;
    const existing = this.apiMetrics.get(key);
    const isError = statusCode >= 400;

    if (existing) {
      // Update existing metrics
      const newRequestCount = existing.requestCount + 1;
      const newErrorCount = existing.errorRate * existing.requestCount + (isError ? 1 : 0);
      
      existing.requestCount = newRequestCount;
      existing.errorRate = newErrorCount / newRequestCount;
      existing.throughput = this.calculateThroughput(key);
      existing.lastUpdated = Date.now();

      // Update response time percentiles
      this.updateResponseTimeMetrics(existing, responseTime);
    } else {
      // Create new metrics
      this.apiMetrics.set(key, {
        endpoint,
        method,
        responseTime: {
          avg: responseTime,
          p50: responseTime,
          p95: responseTime,
          p99: responseTime,
          min: responseTime,
          max: responseTime
        },
        requestCount: 1,
        errorRate: isError ? 1 : 0,
        throughput: 0,
        lastUpdated: Date.now()
      });
    }

    // Record as general metric
    this.recordMetric({
      name: `api_response_time_${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
      value: responseTime,
      unit: 'ms',
      category: MetricCategory.API_PERFORMANCE,
      tags: { endpoint, method, status: statusCode.toString() },
      threshold: {
        warning: 1000, // 1 second
        critical: 5000  // 5 seconds
      }
    });
  }

  // Get real-time system metrics
  async getSystemMetrics(): Promise<{
    performance: Record<string, PerformanceMetric[]>;
    apiEndpoints: APIEndpointMetrics[];
    systemHealth: SystemHealth;
    alerts: PerformanceAlert[];
    summary: {
      totalRequests: number;
      averageResponseTime: number;
      errorRate: number;
      uptime: number;
      alertCount: number;
    };
  }> {
    // Update system health
    await this.updateSystemHealth();

    const apiEndpoints = Array.from(this.apiMetrics.values());
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);

    // Calculate summary statistics
    const totalRequests = apiEndpoints.reduce((sum, api) => sum + api.requestCount, 0);
    const averageResponseTime = apiEndpoints.length > 0
      ? apiEndpoints.reduce((sum, api) => sum + api.responseTime.avg, 0) / apiEndpoints.length
      : 0;
    const errorRate = totalRequests > 0
      ? apiEndpoints.reduce((sum, api) => sum + (api.errorRate * api.requestCount), 0) / totalRequests
      : 0;

    return {
      performance: Object.fromEntries(this.metrics),
      apiEndpoints,
      systemHealth: this.systemHealth,
      alerts: this.alerts.slice(-50), // Last 50 alerts
      summary: {
        totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        uptime: Date.now() - this.systemHealth.uptime,
        alertCount: activeAlerts.length
      }
    };
  }

  // Get performance analytics for specific time period
  getAnalytics(options: {
    startTime?: number;
    endTime?: number;
    category?: MetricCategory;
    granularity?: 'minute' | 'hour' | 'day';
  } = {}): {
    trends: Record<string, Array<{ timestamp: number; value: number }>>;
    aggregates: Record<string, { min: number; max: number; avg: number; count: number }>;
    percentiles: Record<string, { p50: number; p95: number; p99: number }>;
  } {
    const {
      startTime = Date.now() - 60 * 60 * 1000, // Default: last hour
      endTime = Date.now(),
      category,
      granularity = 'minute'
    } = options;

    const trends: Record<string, Array<{ timestamp: number; value: number }>> = {};
    const aggregates: Record<string, { min: number; max: number; avg: number; count: number }> = {};
    const percentiles: Record<string, { p50: number; p95: number; p99: number }> = {};

    this.metrics.forEach((metricHistory, metricName) => {
      const filteredMetrics = metricHistory.filter(m => 
        m.timestamp >= startTime && 
        m.timestamp <= endTime &&
        (!category || m.category === category)
      );

      if (filteredMetrics.length === 0) return;

      // Calculate trends
      trends[metricName] = this.aggregateByGranularity(filteredMetrics, granularity);

      // Calculate aggregates
      const values = filteredMetrics.map(m => m.value);
      aggregates[metricName] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        count: values.length
      };

      // Calculate percentiles
      const sortedValues = values.sort((a, b) => a - b);
      percentiles[metricName] = {
        p50: this.getPercentile(sortedValues, 0.5),
        p95: this.getPercentile(sortedValues, 0.95),
        p99: this.getPercentile(sortedValues, 0.99)
      };
    });

    return { trends, aggregates, percentiles };
  }

  // Advanced alerting system
  createAlert(
    metricName: string,
    level: 'warning' | 'critical',
    threshold: number,
    condition: 'above' | 'below' = 'above'
  ): string {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up monitoring for this alert
    this.on('metric', (metric: PerformanceMetric) => {
      if (metric.name === metricName) {
        const shouldAlert = condition === 'above' 
          ? metric.value > threshold 
          : metric.value < threshold;

        if (shouldAlert) {
          this.triggerAlert({
            id: alertId,
            metric: metricName,
            level,
            message: `${metricName} is ${condition} threshold: ${metric.value} ${metric.unit}`,
            value: metric.value,
            threshold,
            timestamp: Date.now(),
            resolved: false
          });
        }
      }
    });

    return alertId;
  }

  // Performance optimization recommendations
  getOptimizationRecommendations(): Array<{
    category: string;
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    impact: string;
    implementation: string;
  }> {
    const recommendations: Array<{
      category: string;
      priority: 'low' | 'medium' | 'high';
      title: string;
      description: string;
      impact: string;
      implementation: string;
    }> = [];

    // Analyze API performance
    const slowEndpoints = Array.from(this.apiMetrics.values())
      .filter(api => api.responseTime.avg > 1000)
      .sort((a, b) => b.responseTime.avg - a.responseTime.avg);

    if (slowEndpoints.length > 0) {
      recommendations.push({
        category: 'API Performance',
        priority: 'high',
        title: 'Optimize slow API endpoints',
        description: `${slowEndpoints.length} endpoints have average response times > 1s`,
        impact: 'Improved user experience and reduced server load',
        implementation: 'Add caching, optimize database queries, implement pagination'
      });
    }

    // Analyze error rates
    const errorProneEndpoints = Array.from(this.apiMetrics.values())
      .filter(api => api.errorRate > 0.05) // > 5% error rate
      .sort((a, b) => b.errorRate - a.errorRate);

    if (errorProneEndpoints.length > 0) {
      recommendations.push({
        category: 'Reliability',
        priority: 'high',
        title: 'Fix error-prone endpoints',
        description: `${errorProneEndpoints.length} endpoints have error rates > 5%`,
        impact: 'Improved reliability and user satisfaction',
        implementation: 'Add error handling, input validation, and monitoring'
      });
    }

    // Analyze memory usage
    if (this.systemHealth.memoryUsage.percentage > 80) {
      recommendations.push({
        category: 'System Resources',
        priority: 'medium',
        title: 'Optimize memory usage',
        description: `Memory usage is at ${this.systemHealth.memoryUsage.percentage}%`,
        impact: 'Improved system stability and performance',
        implementation: 'Implement memory pooling, optimize caching, fix memory leaks'
      });
    }

    // Analyze cache performance
    const cacheMetrics = this.metrics.get('cache_hit_rate');
    if (cacheMetrics && cacheMetrics.length > 0) {
      const latestCacheHitRate = cacheMetrics[cacheMetrics.length - 1].value;
      if (latestCacheHitRate < 0.7) {
        recommendations.push({
          category: 'Caching',
          priority: 'medium',
          title: 'Improve cache hit rate',
          description: `Cache hit rate is ${(latestCacheHitRate * 100).toFixed(1)}%`,
          impact: 'Reduced database load and faster response times',
          implementation: 'Optimize cache keys, increase TTL for stable data, implement cache warming'
        });
      }
    }

    return recommendations;
  }

  // Real-time performance dashboard data
  getDashboardData(): {
    realTimeMetrics: {
      requestsPerSecond: number;
      averageResponseTime: number;
      errorRate: number;
      activeUsers: number;
    };
    systemStatus: {
      health: string;
      uptime: number;
      memoryUsage: number;
      cpuUsage: number;
    };
    topEndpoints: Array<{
      endpoint: string;
      requests: number;
      avgResponseTime: number;
      errorRate: number;
    }>;
    recentAlerts: PerformanceAlert[];
  } {
    const apiEndpoints = Array.from(this.apiMetrics.values());
    const now = Date.now();
    const lastMinute = now - 60000;

    // Calculate real-time metrics
    const recentRequests = apiEndpoints.reduce((sum, api) => {
      return sum + (api.lastUpdated > lastMinute ? api.throughput : 0);
    }, 0);

    const avgResponseTime = apiEndpoints.length > 0
      ? apiEndpoints.reduce((sum, api) => sum + api.responseTime.avg, 0) / apiEndpoints.length
      : 0;

    const errorRate = apiEndpoints.reduce((sum, api) => {
      return sum + (api.errorRate * api.requestCount);
    }, 0) / Math.max(1, apiEndpoints.reduce((sum, api) => sum + api.requestCount, 0));

    // Top endpoints by request count
    const topEndpoints = apiEndpoints
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10)
      .map(api => ({
        endpoint: `${api.method} ${api.endpoint}`,
        requests: api.requestCount,
        avgResponseTime: Math.round(api.responseTime.avg),
        errorRate: Math.round(api.errorRate * 100) / 100
      }));

    // Recent alerts (last 10)
    const recentAlerts = this.alerts
      .filter(alert => alert.timestamp > now - 3600000) // Last hour
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      realTimeMetrics: {
        requestsPerSecond: Math.round(recentRequests),
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        activeUsers: this.systemHealth.activeConnections
      },
      systemStatus: {
        health: this.systemHealth.status,
        uptime: now - this.systemHealth.uptime,
        memoryUsage: this.systemHealth.memoryUsage.percentage,
        cpuUsage: this.systemHealth.cpuUsage
      },
      topEndpoints,
      recentAlerts
    };
  }

  // Event system
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

  // Private methods
  private checkThresholds(metric: PerformanceMetric): void {
    if (!metric.threshold) return;

    const { warning, critical } = metric.threshold;
    
    if (metric.value >= critical) {
      this.triggerAlert({
        id: `critical_${Date.now()}_${metric.name}`,
        metric: metric.name,
        level: 'critical',
        message: `Critical threshold exceeded for ${metric.name}: ${metric.value} ${metric.unit}`,
        value: metric.value,
        threshold: critical,
        timestamp: Date.now(),
        resolved: false
      });
    } else if (metric.value >= warning) {
      this.triggerAlert({
        id: `warning_${Date.now()}_${metric.name}`,
        metric: metric.name,
        level: 'warning',
        message: `Warning threshold exceeded for ${metric.name}: ${metric.value} ${metric.unit}`,
        value: metric.value,
        threshold: warning,
        timestamp: Date.now(),
        resolved: false
      });
    }
  }

  private triggerAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Keep only recent alerts
    const cutoff = Date.now() - this.retentionPeriod;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);

    this.emit('alert', alert);
    console.warn(`Performance Alert [${alert.level.toUpperCase()}]: ${alert.message}`);
  }

  private updateResponseTimeMetrics(existing: APIEndpointMetrics, newResponseTime: number): void {
    const { responseTime } = existing;
    
    // Update min/max
    responseTime.min = Math.min(responseTime.min, newResponseTime);
    responseTime.max = Math.max(responseTime.max, newResponseTime);
    
    // Update average (simple moving average)
    responseTime.avg = (responseTime.avg * (existing.requestCount - 1) + newResponseTime) / existing.requestCount;
    
    // For percentiles, we'd need to store more data points
    // This is a simplified approximation
    responseTime.p50 = (responseTime.p50 + newResponseTime) / 2;
    responseTime.p95 = Math.max(responseTime.p95, newResponseTime * 0.95);
    responseTime.p99 = Math.max(responseTime.p99, newResponseTime * 0.99);
  }

  private calculateThroughput(apiKey: string): number {
    const api = this.apiMetrics.get(apiKey);
    if (!api) return 0;

    const timeSinceFirstRequest = Date.now() - (api.lastUpdated - (api.requestCount * 1000));
    return timeSinceFirstRequest > 0 ? (api.requestCount / timeSinceFirstRequest) * 1000 : 0;
  }

  private async updateSystemHealth(): Promise<void> {
    try {
      // In a real implementation, these would come from actual system monitoring
      this.systemHealth = {
        ...this.systemHealth,
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: await this.getCPUUsage(),
        activeConnections: this.getActiveConnections(),
        queueDepth: this.getQueueDepth(),
        lastHealthCheck: Date.now()
      };

      // Determine overall health status
      const { memoryUsage, cpuUsage, queueDepth } = this.systemHealth;
      
      if (memoryUsage.percentage > 90 || cpuUsage > 90 || queueDepth > 1000) {
        this.systemHealth.status = 'critical';
      } else if (memoryUsage.percentage > 70 || cpuUsage > 70 || queueDepth > 100) {
        this.systemHealth.status = 'degraded';
      } else {
        this.systemHealth.status = 'healthy';
      }

    } catch (error) {
      console.error('Failed to update system health:', error);
      this.systemHealth.status = 'critical';
    }
  }

  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    // Browser environment
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (performance as any)) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    // Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      return {
        used: memory.heapUsed,
        total: memory.heapTotal,
        percentage: (memory.heapUsed / memory.heapTotal) * 100
      };
    }

    // Fallback
    return { used: 0, total: 0, percentage: 0 };
  }

  private async getCPUUsage(): Promise<number> {
    // This is a simplified implementation
    // In production, you'd use proper system monitoring tools
    return Math.random() * 100; // Placeholder
  }

  private getActiveConnections(): number {
    // Placeholder - would be implemented based on your connection tracking
    return Math.floor(Math.random() * 100);
  }

  private getQueueDepth(): number {
    // Placeholder - would be implemented based on your queue system
    return Math.floor(Math.random() * 50);
  }

  private aggregateByGranularity(
    metrics: PerformanceMetric[], 
    granularity: 'minute' | 'hour' | 'day'
  ): Array<{ timestamp: number; value: number }> {
    const bucketSize = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    }[granularity];

    const buckets: Map<number, number[]> = new Map();

    metrics.forEach(metric => {
      const bucketKey = Math.floor(metric.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(metric.value);
    });

    return Array.from(buckets.entries())
      .map(([timestamp, values]) => ({
        timestamp,
        value: values.reduce((sum, v) => sum + v, 0) / values.length
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private setupPerformanceObserver(): void {
    // Set up browser performance observer if available
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordMetric({
                name: 'page_load_time',
                value: entry.loadEventEnd - entry.loadEventStart,
                unit: 'ms',
                category: MetricCategory.USER_EXPERIENCE
              });
            } else if (entry.entryType === 'paint') {
              this.recordMetric({
                name: `paint_${entry.name}`,
                value: entry.startTime,
                unit: 'ms',
                category: MetricCategory.USER_EXPERIENCE
              });
            }
          }
        });

        observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Collect every 10 seconds
  }

  private collectSystemMetrics(): void {
    // Record system metrics
    this.recordMetric({
      name: 'memory_usage_percentage',
      value: this.systemHealth.memoryUsage.percentage,
      unit: '%',
      category: MetricCategory.SYSTEM,
      threshold: { warning: 70, critical: 90 }
    });

    this.recordMetric({
      name: 'active_connections',
      value: this.systemHealth.activeConnections,
      unit: 'count',
      category: MetricCategory.SYSTEM
    });

    this.recordMetric({
      name: 'queue_depth',
      value: this.systemHealth.queueDepth,
      unit: 'count',
      category: MetricCategory.SYSTEM,
      threshold: { warning: 100, critical: 1000 }
    });
  }

  // Cleanup
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

// Export singleton instance
export const performanceMonitor = new AdvancedPerformanceMonitor();

// Middleware for automatic API monitoring
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordAPICall(
      req.path || req.url,
      req.method,
      responseTime,
      res.statusCode
    );
  });
  
  next();
};

export default performanceMonitor;
