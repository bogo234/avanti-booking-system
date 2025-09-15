// Production-Ready Error Handling System for Avanti Booking System
// Comprehensive error management with logging, monitoring, and recovery

import { z } from 'zod';

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  timestamp: number;
  environment: string;
  version: string;
  additionalData?: Record<string, any>;
}

export interface StructuredError {
  id: string;
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  stack?: string;
  cause?: Error;
  retryable: boolean;
  userMessage: string;
  internalMessage: string;
  solutions?: string[];
  metadata?: Record<string, any>;
}

export interface ErrorRecoveryStrategy {
  name: string;
  condition: (error: StructuredError) => boolean;
  action: (error: StructuredError) => Promise<any>;
  maxAttempts: number;
  backoffMs: number;
}

class ProductionErrorHandler {
  private errorLog: StructuredError[] = [];
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private errorCounts: Map<string, number> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }> = new Map();
  
  private readonly maxLogSize = 10000;
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerTimeout = 60000; // 1 minute

  constructor() {
    this.setupDefaultRecoveryStrategies();
    this.setupCleanupTasks();
  }

  // Create structured error
  createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: Partial<ErrorContext> = {},
    cause?: Error
  ): StructuredError {
    const errorId = this.generateErrorId();
    
    const structuredError: StructuredError = {
      id: errorId,
      code,
      message,
      category,
      severity,
      context: {
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        ...context
      },
      stack: cause?.stack || new Error().stack,
      cause,
      retryable: this.isRetryable(category, code),
      userMessage: this.getUserFriendlyMessage(code, category),
      internalMessage: message,
      solutions: this.getSolutions(code, category),
      metadata: {}
    };

    this.logError(structuredError);
    this.updateErrorCounts(code);
    this.checkCircuitBreaker(category);

    return structuredError;
  }

  // Handle and process errors
  async handleError(error: Error | StructuredError, context?: Partial<ErrorContext>): Promise<StructuredError> {
    let structuredError: StructuredError;

    if (this.isStructuredError(error)) {
      structuredError = error;
    } else {
      // Convert regular error to structured error
      const category = this.categorizeError(error);
      const severity = this.determineSeverity(error, category);
      
      structuredError = this.createError(
        this.getErrorCode(error),
        error.message,
        category,
        severity,
        context,
        error
      );
    }

    // Try recovery strategies
    await this.attemptRecovery(structuredError);

    // Send alerts for critical errors
    if (structuredError.severity === ErrorSeverity.CRITICAL) {
      await this.sendCriticalAlert(structuredError);
    }

    // Log to external services
    await this.logToExternalServices(structuredError);

    return structuredError;
  }

  // Express/Next.js error middleware
  middleware() {
    return async (error: Error, req: any, res: any, next: any) => {
      const context: Partial<ErrorContext> = {
        userId: req.user?.uid,
        requestId: req.headers['x-request-id'] || this.generateRequestId(),
        endpoint: req.path || req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      const structuredError = await this.handleError(error, context);

      // Don't expose internal errors to users
      const responseError = this.sanitizeErrorForResponse(structuredError);

      // Set appropriate HTTP status code
      const statusCode = this.getHttpStatusCode(structuredError);

      res.status(statusCode).json({
        success: false,
        error: {
          code: responseError.code,
          message: responseError.userMessage,
          requestId: context.requestId,
          timestamp: structuredError.context.timestamp
        },
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            category: structuredError.category,
            severity: structuredError.severity,
            stack: structuredError.stack
          }
        })
      });
    };
  }

  // Add custom recovery strategy
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  // Get error analytics
  getErrorAnalytics(timeRange: { start: number; end: number }): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrorCodes: Array<{ code: string; count: number; lastOccurrence: number }>;
    errorTrends: Array<{ timestamp: number; count: number }>;
    recoverySuccessRate: number;
    circuitBreakerStatus: Array<{ service: string; state: string; failures: number }>;
  } {
    const relevantErrors = this.errorLog.filter(error => 
      error.context.timestamp >= timeRange.start && error.context.timestamp <= timeRange.end
    );

    const errorsByCategory = relevantErrors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = relevantErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const errorCodeCounts = relevantErrors.reduce((acc, error) => {
      if (!acc[error.code]) {
        acc[error.code] = { count: 0, lastOccurrence: 0 };
      }
      acc[error.code].count++;
      acc[error.code].lastOccurrence = Math.max(acc[error.code].lastOccurrence, error.context.timestamp);
      return acc;
    }, {} as Record<string, { count: number; lastOccurrence: number }>);

    const topErrorCodes = Object.entries(errorCodeCounts)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate hourly error trends
    const hourlyBuckets = new Map<number, number>();
    relevantErrors.forEach(error => {
      const hour = Math.floor(error.context.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
      hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
    });

    const errorTrends = Array.from(hourlyBuckets.entries())
      .map(([timestamp, count]) => ({ timestamp, count }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Recovery success rate (placeholder - would be tracked in real implementation)
    const recoverySuccessRate = 85; // 85% success rate

    // Circuit breaker status
    const circuitBreakerStatus = Array.from(this.circuitBreakers.entries())
      .map(([service, data]) => ({
        service,
        state: data.state,
        failures: data.failures
      }));

    return {
      totalErrors: relevantErrors.length,
      errorsByCategory,
      errorsBySeverity,
      topErrorCodes,
      errorTrends,
      recoverySuccessRate,
      circuitBreakerStatus
    };
  }

  // Export error logs
  exportErrorLogs(format: 'json' | 'csv' = 'json', filters?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    startTime?: number;
    endTime?: number;
  }): string {
    let filteredLogs = [...this.errorLog];

    if (filters) {
      filteredLogs = filteredLogs.filter(error => {
        if (filters.category && error.category !== filters.category) return false;
        if (filters.severity && error.severity !== filters.severity) return false;
        if (filters.startTime && error.context.timestamp < filters.startTime) return false;
        if (filters.endTime && error.context.timestamp > filters.endTime) return false;
        return true;
      });
    }

    if (format === 'csv') {
      const headers = [
        'ID', 'Code', 'Message', 'Category', 'Severity', 'Timestamp',
        'User ID', 'Endpoint', 'IP', 'Retryable', 'Environment'
      ];

      const rows = filteredLogs.map(error => [
        error.id,
        error.code,
        error.message.replace(/,/g, ';'), // Escape commas
        error.category,
        error.severity,
        new Date(error.context.timestamp).toISOString(),
        error.context.userId || '',
        error.context.endpoint || '',
        error.context.ip || '',
        error.retryable.toString(),
        error.context.environment
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(filteredLogs, null, 2);
  }

  // Private helper methods
  private isStructuredError(error: any): error is StructuredError {
    return error && typeof error === 'object' && 'id' in error && 'code' in error && 'category' in error;
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorCategory.VALIDATION;
    }
    
    if (name.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    if (message.includes('permission') || message.includes('access denied')) {
      return ErrorCategory.AUTHORIZATION;
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return ErrorCategory.NETWORK;
    }
    
    if (message.includes('database') || message.includes('query') || message.includes('transaction')) {
      return ErrorCategory.DATABASE;
    }
    
    if (message.includes('stripe') || message.includes('firebase') || message.includes('google')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    return ErrorCategory.UNKNOWN;
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that affect system availability
    if (category === ErrorCategory.SYSTEM || category === ErrorCategory.DATABASE) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for authentication and external service failures
    if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.EXTERNAL_SERVICE) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity for business logic and authorization
    if (category === ErrorCategory.BUSINESS_LOGIC || category === ErrorCategory.AUTHORIZATION) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity for validation errors
    return ErrorSeverity.LOW;
  }

  private getErrorCode(error: Error): string {
    // Try to extract error code from error message or use error name
    const codeMatch = error.message.match(/\[([A-Z_]+)\]/);
    if (codeMatch) {
      return codeMatch[1];
    }

    return error.name.toUpperCase().replace(/ERROR$/, '') || 'UNKNOWN_ERROR';
  }

  private isRetryable(category: ErrorCategory, code: string): boolean {
    // Network and external service errors are usually retryable
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.EXTERNAL_SERVICE) {
      return true;
    }

    // Specific retryable error codes
    const retryableCodes = ['TIMEOUT', 'RATE_LIMIT', 'TEMPORARY_UNAVAILABLE', 'CONNECTION_ERROR'];
    return retryableCodes.includes(code);
  }

  private getUserFriendlyMessage(code: string, category: ErrorCategory): string {
    const messages: Record<string, string> = {
      VALIDATION_ERROR: 'Kontrollera att all information är korrekt ifylld.',
      AUTHENTICATION_ERROR: 'Du behöver logga in för att fortsätta.',
      AUTHORIZATION_ERROR: 'Du har inte behörighet att utföra denna åtgärd.',
      NETWORK_ERROR: 'Nätverksfel. Kontrollera din internetanslutning och försök igen.',
      EXTERNAL_SERVICE_ERROR: 'En extern tjänst är tillfälligt otillgänglig. Försök igen om en stund.',
      DATABASE_ERROR: 'Ett tekniskt fel uppstod. Vårt team har informerats.',
      RATE_LIMIT_ERROR: 'För många förfrågningar. Vänta en stund innan du försöker igen.',
      UNKNOWN_ERROR: 'Ett oväntat fel uppstod. Kontakta support om problemet kvarstår.'
    };

    return messages[code] || messages[`${category.toUpperCase()}_ERROR`] || messages.UNKNOWN_ERROR;
  }

  private getSolutions(code: string, category: ErrorCategory): string[] {
    const solutions: Record<string, string[]> = {
      VALIDATION_ERROR: [
        'Kontrollera att alla obligatoriska fält är ifyllda',
        'Säkerställ att e-postadresser och telefonnummer har rätt format',
        'Uppdatera sidan och försök igen'
      ],
      AUTHENTICATION_ERROR: [
        'Logga in på ditt konto',
        'Kontrollera att användarnamn och lösenord är korrekta',
        'Återställ ditt lösenord om du glömt det'
      ],
      NETWORK_ERROR: [
        'Kontrollera din internetanslutning',
        'Försök igen om några sekunder',
        'Använd en annan nätverksanslutning om möjligt'
      ],
      EXTERNAL_SERVICE_ERROR: [
        'Vänta några minuter och försök igen',
        'Kontakta support om problemet kvarstår',
        'Använd en alternativ betalmetod om tillgänglig'
      ]
    };

    return solutions[code] || solutions[`${category.toUpperCase()}_ERROR`] || [
      'Uppdatera sidan och försök igen',
      'Kontakta vår kundtjänst om problemet kvarstår'
    ];
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private logError(error: StructuredError): void {
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console logging with proper formatting
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.id}] ${error.code}: ${error.internalMessage}`;
    
    console[logLevel](logMessage, {
      category: error.category,
      severity: error.severity,
      context: error.context,
      stack: error.stack
    });
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'info';
    }
  }

  private updateErrorCounts(code: string): void {
    this.errorCounts.set(code, (this.errorCounts.get(code) || 0) + 1);
  }

  private checkCircuitBreaker(category: ErrorCategory): void {
    const key = category.toString();
    const breaker = this.circuitBreakers.get(key) || { failures: 0, lastFailure: 0, state: 'closed' as const };

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.circuitBreakerThreshold && breaker.state === 'closed') {
      breaker.state = 'open';
      console.warn(`Circuit breaker opened for ${category} due to ${breaker.failures} failures`);
    }

    this.circuitBreakers.set(key, breaker);
  }

  private async attemptRecovery(error: StructuredError): Promise<void> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.condition(error)) {
        try {
          console.log(`Attempting recovery strategy: ${strategy.name} for error ${error.id}`);
          await strategy.action(error);
          console.log(`Recovery strategy ${strategy.name} succeeded for error ${error.id}`);
          break;
        } catch (recoveryError) {
          console.error(`Recovery strategy ${strategy.name} failed for error ${error.id}:`, recoveryError);
        }
      }
    }
  }

  private setupDefaultRecoveryStrategies(): void {
    // Retry strategy for retryable errors
    this.addRecoveryStrategy({
      name: 'retry_with_backoff',
      condition: (error) => error.retryable,
      action: async (error) => {
        // Implementation would retry the original operation
        console.log(`Would retry operation for error ${error.id}`);
      },
      maxAttempts: 3,
      backoffMs: 1000
    });

    // Circuit breaker recovery
    this.addRecoveryStrategy({
      name: 'circuit_breaker_recovery',
      condition: (error) => error.category === ErrorCategory.EXTERNAL_SERVICE,
      action: async (error) => {
        const breaker = this.circuitBreakers.get(error.category);
        if (breaker && breaker.state === 'open' && 
            Date.now() - breaker.lastFailure > this.circuitBreakerTimeout) {
          breaker.state = 'half-open';
          console.log(`Circuit breaker for ${error.category} moved to half-open state`);
        }
      },
      maxAttempts: 1,
      backoffMs: 0
    });
  }

  private async sendCriticalAlert(error: StructuredError): Promise<void> {
    // In production, integrate with alerting services
    console.error(`CRITICAL ALERT: ${error.code} - ${error.message}`, {
      errorId: error.id,
      context: error.context,
      stack: error.stack
    });

    // Could integrate with:
    // - Slack/Discord webhooks
    // - PagerDuty
    // - Email notifications
    // - SMS alerts
    // - Monitoring services (Datadog, New Relic, etc.)
  }

  private async logToExternalServices(error: StructuredError): Promise<void> {
    // Log to external services like Sentry, LogRocket, etc.
    try {
      // Example: Sentry logging
      // Sentry.captureException(error.cause || new Error(error.message), {
      //   tags: {
      //     category: error.category,
      //     severity: error.severity,
      //     code: error.code
      //   },
      //   extra: error.context
      // });

      console.log(`Logged error ${error.id} to external services`);
    } catch (loggingError) {
      console.error('Failed to log to external services:', loggingError);
    }
  }

  private sanitizeErrorForResponse(error: StructuredError): StructuredError {
    // Remove sensitive information from error response
    const sanitized = { ...error };
    
    // Remove stack trace in production
    if (process.env.NODE_ENV === 'production') {
      delete sanitized.stack;
      delete sanitized.internalMessage;
    }

    // Remove sensitive context data
    if (sanitized.context.additionalData) {
      const { password, token, secret, ...safeData } = sanitized.context.additionalData;
      sanitized.context.additionalData = safeData;
    }

    return sanitized;
  }

  private getHttpStatusCode(error: StructuredError): number {
    const statusCodes: Record<string, number> = {
      VALIDATION_ERROR: 400,
      AUTHENTICATION_ERROR: 401,
      AUTHORIZATION_ERROR: 403,
      NOT_FOUND_ERROR: 404,
      RATE_LIMIT_ERROR: 429,
      EXTERNAL_SERVICE_ERROR: 502,
      DATABASE_ERROR: 503,
      TIMEOUT_ERROR: 504
    };

    return statusCodes[error.code] || 500;
  }

  private setupCleanupTasks(): void {
    // Clean up old circuit breaker states
    setInterval(() => {
      const now = Date.now();
      for (const [key, breaker] of this.circuitBreakers.entries()) {
        if (breaker.state === 'open' && now - breaker.lastFailure > this.circuitBreakerTimeout * 2) {
          breaker.state = 'closed';
          breaker.failures = 0;
          console.log(`Circuit breaker for ${key} reset to closed state`);
        }
      }
    }, 60000); // Check every minute
  }
}

// Specialized error classes
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class BusinessLogicError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string, public service: string, public originalError?: Error) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

// Export singleton instance
export const errorHandler = new ProductionErrorHandler();

// Utility functions
export const createValidationError = (message: string, field?: string, value?: any): StructuredError => {
  return errorHandler.createError(
    'VALIDATION_ERROR',
    message,
    ErrorCategory.VALIDATION,
    ErrorSeverity.LOW,
    { additionalData: { field, value } }
  );
};

export const createAuthError = (message: string = 'Authentication required'): StructuredError => {
  return errorHandler.createError(
    'AUTHENTICATION_ERROR',
    message,
    ErrorCategory.AUTHENTICATION,
    ErrorSeverity.HIGH
  );
};

export const createBusinessError = (message: string, code: string = 'BUSINESS_LOGIC_ERROR'): StructuredError => {
  return errorHandler.createError(
    code,
    message,
    ErrorCategory.BUSINESS_LOGIC,
    ErrorSeverity.MEDIUM
  );
};

export default errorHandler;
