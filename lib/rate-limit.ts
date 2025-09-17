import { NextRequest } from 'next/server';

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: NextRequest) => string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyGenerator } = options;

  return (req: NextRequest): { success: boolean; remaining: number; resetTime: number } => {
    const key = keyGenerator ? keyGenerator(req) : getClientIP(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) {
        rateLimitMap.delete(k);
      }
    }

    const current = rateLimitMap.get(key);
    
    if (!current || current.resetTime < now) {
      // First request or window expired
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return {
        success: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    if (current.count >= maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }

    // Increment counter
    current.count++;
    rateLimitMap.set(key, current);

    return {
      success: true,
      remaining: maxRequests - current.count,
      resetTime: current.resetTime
    };
  };
}

function getClientIP(req: NextRequest): string {
  // Try to get real IP from headers (for Vercel/proxies)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to connection IP
  return req.ip || 'unknown';
}

// Predefined rate limiters
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const body = req.body;
    // Include email in key for more specific rate limiting
    return `auth:${ip}`;
  }
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
});

export const bookingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 bookings per minute
});
