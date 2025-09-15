// Advanced Security Manager for Avanti Booking System
// Implements comprehensive security features and GDPR compliance

import crypto from 'crypto';
import { z } from 'zod';

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
  hashing: {
    algorithm: string;
    saltRounds: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  session: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  audit: {
    enabled: boolean;
    retentionDays: number;
    sensitiveFields: string[];
  };
}

export interface SecurityAuditLog {
  id: string;
  timestamp: number;
  userId?: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  success: boolean;
  details?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  compliance?: {
    gdpr: boolean;
    pci: boolean;
    iso27001: boolean;
  };
}

export interface DataProcessingConsent {
  userId: string;
  consentId: string;
  purpose: string;
  dataTypes: string[];
  granted: boolean;
  timestamp: number;
  expiresAt?: number;
  withdrawnAt?: number;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
}

export interface PersonalDataRequest {
  id: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: number;
  completedAt?: number;
  reason?: string;
  data?: any;
}

class AdvancedSecurityManager {
  private config: SecurityConfig;
  private encryptionKey: Buffer;
  private auditLogs: SecurityAuditLog[] = [];
  private consentRecords: Map<string, DataProcessingConsent[]> = new Map();
  private dataRequests: Map<string, PersonalDataRequest> = new Map();

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16
      },
      hashing: {
        algorithm: 'sha256',
        saltRounds: 12
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100
      },
      session: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: true,
        httpOnly: true,
        sameSite: 'strict'
      },
      audit: {
        enabled: true,
        retentionDays: 90,
        sensitiveFields: ['password', 'ssn', 'creditCard', 'bankAccount']
      },
      ...config
    };

    this.encryptionKey = this.deriveEncryptionKey();
    this.setupCleanupTasks();
  }

  // Encryption and Decryption
  encrypt(data: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(this.config.encryption.ivLength);
    const cipher = crypto.createCipheriv(this.config.encryption.algorithm, this.encryptionKey, iv);
    (cipher as any).setAAD?.(Buffer.from('avanti-booking-system'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = (cipher as any).getAuthTag?.() as Buffer | undefined;

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: (tag ? tag.toString('hex') : '')
    };
  }

  decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.config.encryption.algorithm, this.encryptionKey, iv);
    (decipher as any).setAAD?.(Buffer.from('avanti-booking-system'));
    if (encryptedData.tag) {
      (decipher as any).setAuthTag?.(Buffer.from(encryptedData.tag, 'hex'));
    }

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Secure hashing
  hash(data: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, this.config.hashing.algorithm);
    
    return {
      hash: hash.toString('hex'),
      salt: actualSalt
    };
  }

  verifyHash(data: string, hash: string, salt: string): boolean {
    const computed = this.hash(data, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed.hash, 'hex'));
  }

  // Input validation and sanitization
  validateAndSanitize<T>(data: any, schema: z.ZodSchema<T>): { valid: boolean; data?: T; errors?: string[] } {
    try {
      const validated = schema.parse(data);
      const sanitized = this.sanitizeData(validated);
      
      return { valid: true, data: sanitized };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          valid: false, 
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`) 
        };
      }
      return { valid: false, errors: ['Validation failed'] };
    }
  }

  // Data sanitization
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove potential XSS vectors
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }

  // Security audit logging
  logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): void {
    if (!this.config.audit.enabled) return;

    const auditLog: SecurityAuditLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...event
    };

    this.auditLogs.push(auditLog);

    // Trigger alerts for high-risk events
    if (auditLog.riskLevel === 'critical' || auditLog.riskLevel === 'high') {
      this.triggerSecurityAlert(auditLog);
    }

    // Clean up old logs
    this.cleanupAuditLogs();
  }

  // GDPR Compliance - Consent Management
  recordConsent(consent: Omit<DataProcessingConsent, 'consentId' | 'timestamp'>): string {
    const consentId = crypto.randomUUID();
    const fullConsent: DataProcessingConsent = {
      ...consent,
      consentId,
      timestamp: Date.now()
    };

    if (!this.consentRecords.has(consent.userId)) {
      this.consentRecords.set(consent.userId, []);
    }

    this.consentRecords.get(consent.userId)!.push(fullConsent);

    this.logSecurityEvent({
      userId: consent.userId,
      action: 'consent_recorded',
      resource: 'user_data',
      ip: 'system',
      userAgent: 'system',
      success: true,
      riskLevel: 'low',
      details: { purpose: consent.purpose, dataTypes: consent.dataTypes },
      compliance: { gdpr: true, pci: false, iso27001: true }
    });

    return consentId;
  }

  withdrawConsent(userId: string, consentId: string): boolean {
    const userConsents = this.consentRecords.get(userId);
    if (!userConsents) return false;

    const consent = userConsents.find(c => c.consentId === consentId);
    if (!consent) return false;

    consent.withdrawnAt = Date.now();
    consent.granted = false;

    this.logSecurityEvent({
      userId,
      action: 'consent_withdrawn',
      resource: 'user_data',
      ip: 'system',
      userAgent: 'system',
      success: true,
      riskLevel: 'medium',
      details: { consentId, purpose: consent.purpose },
      compliance: { gdpr: true, pci: false, iso27001: true }
    });

    return true;
  }

  hasValidConsent(userId: string, purpose: string): boolean {
    const userConsents = this.consentRecords.get(userId);
    if (!userConsents) return false;

    return userConsents.some(consent => 
      consent.purpose === purpose &&
      consent.granted &&
      !consent.withdrawnAt &&
      (!consent.expiresAt || consent.expiresAt > Date.now())
    );
  }

  // GDPR Data Subject Rights
  createDataRequest(request: Omit<PersonalDataRequest, 'id' | 'status' | 'requestedAt'>): string {
    const requestId = crypto.randomUUID();
    const dataRequest: PersonalDataRequest = {
      ...request,
      id: requestId,
      status: 'pending',
      requestedAt: Date.now()
    };

    this.dataRequests.set(requestId, dataRequest);

    this.logSecurityEvent({
      userId: request.userId,
      action: 'data_request_created',
      resource: 'personal_data',
      ip: 'system',
      userAgent: 'system',
      success: true,
      riskLevel: 'medium',
      details: { requestType: request.type },
      compliance: { gdpr: true, pci: false, iso27001: true }
    });

    return requestId;
  }

  processDataRequest(requestId: string, result: { success: boolean; data?: any; reason?: string }): boolean {
    const request = this.dataRequests.get(requestId);
    if (!request) return false;

    request.status = result.success ? 'completed' : 'rejected';
    request.completedAt = Date.now();
    request.data = result.data;
    request.reason = result.reason;

    this.logSecurityEvent({
      userId: request.userId,
      action: 'data_request_processed',
      resource: 'personal_data',
      ip: 'system',
      userAgent: 'system',
      success: result.success,
      riskLevel: 'medium',
      details: { requestType: request.type, requestId },
      compliance: { gdpr: true, pci: false, iso27001: true }
    });

    return true;
  }

  // Data anonymization for GDPR compliance
  anonymizePersonalData(data: any): any {
    const anonymized = { ...data };
    
    // Remove or hash personally identifiable information
    const piiFields = [
      'email', 'phone', 'firstName', 'lastName', 'name',
      'address', 'ssn', 'personalNumber', 'bankAccount',
      'creditCard', 'ip', 'deviceId'
    ];

    const anonymizeValue = (value: any): any => {
      if (typeof value === 'string') {
        if (value.includes('@')) {
          // Email anonymization
          const [, domain] = value.split('@');
          return `anonymous@${domain}`;
        }
        if (value.match(/^\+?\d{8,15}$/)) {
          // Phone number anonymization
          return value.replace(/\d/g, '*');
        }
        // General string anonymization
        return value.replace(/./g, '*');
      }
      return '***';
    };

    const anonymizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => anonymizeObject(item));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (piiFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            result[key] = anonymizeValue(value);
          } else if (typeof value === 'object') {
            result[key] = anonymizeObject(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      }
      
      return obj;
    };

    return anonymizeObject(anonymized);
  }

  // Security headers for HTTP responses
  getSecurityHeaders(): Record<string, string> {
    return {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': this.getCSPHeader(),
      'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
      'X-Permitted-Cross-Domain-Policies': 'none'
    };
  }

  private getCSPHeader(): string {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com *.stripe.com",
      "style-src 'self' 'unsafe-inline' *.googleapis.com",
      "img-src 'self' data: *.googleapis.com *.gstatic.com *.stripe.com",
      "font-src 'self' *.gstatic.com",
      "connect-src 'self' *.googleapis.com *.firebase.com *.stripe.com wss:",
      "frame-src 'self' *.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    return csp.join('; ');
  }

  // Rate limiting
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  checkRateLimit(identifier: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const windowMs = this.config.rateLimit.windowMs;
    const maxRequests = this.config.rateLimit.maxRequests;

    const record = this.rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
      // New window
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      this.logSecurityEvent({
        action: 'rate_limit_exceeded',
        resource: 'api',
        ip: identifier,
        userAgent: 'unknown',
        success: false,
        riskLevel: 'medium',
        details: { count: record.count, limit: maxRequests }
      });

      return { 
        allowed: false, 
        resetTime: record.resetTime,
        remaining: 0
      };
    }

    // Increment count
    record.count++;
    return { 
      allowed: true, 
      remaining: maxRequests - record.count 
    };
  }

  // Security analytics
  getSecurityAnalytics(timeRange: { start: number; end: number }): {
    totalEvents: number;
    riskLevelBreakdown: Record<string, number>;
    topActions: Array<{ action: string; count: number }>;
    suspiciousActivity: SecurityAuditLog[];
    complianceScore: number;
  } {
    const relevantLogs = this.auditLogs.filter(log => 
      log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
    );

    const riskLevelBreakdown = relevantLogs.reduce((acc, log) => {
      acc[log.riskLevel] = (acc[log.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const actionCounts = relevantLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    const suspiciousActivity = relevantLogs.filter(log => 
      log.riskLevel === 'high' || log.riskLevel === 'critical' || !log.success
    );

    // Calculate compliance score based on GDPR compliance events
    const complianceEvents = relevantLogs.filter(log => log.compliance?.gdpr);
    const complianceScore = complianceEvents.length > 0 
      ? (complianceEvents.filter(log => log.success).length / complianceEvents.length) * 100
      : 100;

    return {
      totalEvents: relevantLogs.length,
      riskLevelBreakdown,
      topActions,
      suspiciousActivity,
      complianceScore: Math.round(complianceScore)
    };
  }

  // Private helper methods
  private deriveEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'avanti-default-secret-change-in-production';
    return crypto.pbkdf2Sync(secret, 'avanti-salt', 100000, this.config.encryption.keyLength, 'sha256');
  }

  private triggerSecurityAlert(auditLog: SecurityAuditLog): void {
    // In production, this would send alerts to security team
    console.warn(`SECURITY ALERT [${auditLog.riskLevel.toUpperCase()}]:`, {
      action: auditLog.action,
      resource: auditLog.resource,
      userId: auditLog.userId,
      ip: auditLog.ip,
      details: auditLog.details
    });

    // Could integrate with services like:
    // - Slack notifications
    // - PagerDuty
    // - Email alerts
    // - SIEM systems
  }

  private cleanupAuditLogs(): void {
    const cutoff = Date.now() - (this.config.audit.retentionDays * 24 * 60 * 60 * 1000);
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoff);
  }

  private setupCleanupTasks(): void {
    // Clean up audit logs daily
    setInterval(() => {
      this.cleanupAuditLogs();
    }, 24 * 60 * 60 * 1000);

    // Clean up rate limit records hourly
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.rateLimitMap.entries()) {
        if (now > record.resetTime) {
          this.rateLimitMap.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }

  // Export audit logs for compliance
  exportAuditLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'User ID', 'Action', 'Resource', 'IP', 'Success', 'Risk Level'];
      const rows = this.auditLogs.map(log => [
        log.id,
        new Date(log.timestamp).toISOString(),
        log.userId || '',
        log.action,
        log.resource,
        log.ip,
        log.success.toString(),
        log.riskLevel
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.auditLogs, null, 2);
  }

  // Get GDPR compliance report
  getGDPRComplianceReport(userId?: string): {
    consentRecords: DataProcessingConsent[];
    dataRequests: PersonalDataRequest[];
    auditTrail: SecurityAuditLog[];
    complianceStatus: {
      hasValidConsents: boolean;
      pendingRequests: number;
      lastDataAccess: number | null;
    };
  } {
    const userFilter = userId ? (item: any) => item.userId === userId : () => true;

    const consentRecords = userId 
      ? this.consentRecords.get(userId) || []
      : Array.from(this.consentRecords.values()).flat();

    const dataRequests = Array.from(this.dataRequests.values()).filter(userFilter);
    
    const auditTrail = this.auditLogs.filter(log => 
      log.compliance?.gdpr && (!userId || log.userId === userId)
    );

    const hasValidConsents = userId 
      ? this.hasValidConsent(userId, 'data_processing')
      : true;

    const pendingRequests = dataRequests.filter(req => req.status === 'pending').length;
    
    const lastDataAccess = auditTrail
      .filter(log => log.action.includes('data_access'))
      .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp || null;

    return {
      consentRecords: consentRecords.filter(userFilter),
      dataRequests,
      auditTrail,
      complianceStatus: {
        hasValidConsents,
        pendingRequests,
        lastDataAccess
      }
    };
  }
}

// Export singleton instance
export const securityManager = new AdvancedSecurityManager();

// Security middleware for Express/Next.js
export const securityMiddleware = (req: any, res: any, next: any) => {
  // Add security headers
  const headers = securityManager.getSecurityHeaders();
  Object.entries(headers).forEach(([name, value]) => {
    res.setHeader(name, value);
  });

  // Rate limiting
  const identifier = req.ip || req.connection.remoteAddress || 'unknown';
  const rateLimit = securityManager.checkRateLimit(identifier);
  
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      resetTime: rateLimit.resetTime
    });
  }

  // Add rate limit headers
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining || 0);
  if (rateLimit.resetTime) {
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000));
  }

  next();
};

export default securityManager;
