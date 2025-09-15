import { auth } from './firebase';
import { User } from 'firebase/auth';

// Types för API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface UserProfileData {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  role: 'customer' | 'driver' | 'admin';
  profile: {
    name: string;
    phone?: string;
    preferences: {
      defaultAddresses: {
        home?: {
          address: string;
          coordinates?: { lat: number; lng: number };
        };
        work?: {
          address: string;
          coordinates?: { lat: number; lng: number };
        };
      };
      notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
      };
      language: 'sv' | 'en';
    };
  };
  status: 'active' | 'suspended' | 'pending_verification';
  metadata: {
    createdAt: any;
    updatedAt: any;
    lastLogin?: any;
    emailVerifiedAt?: any;
  };
}

export interface PasswordStrength {
  score: number;
  maxScore: number;
  level: 'weak' | 'medium' | 'strong';
  feedback: string[];
}

export interface SessionInfo {
  id: string;
  expiresAt: string;
  deviceInfo: {
    platform: string;
    userAgent?: string;
  };
  createdAt: string;
  lastActivity: string;
  isCurrent: boolean;
}

// Custom error class för API errors
export class AuthApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

// Rate limit error
export class RateLimitError extends AuthApiError {
  constructor(message: string, public resetIn: number) {
    super(message, 429, 'RATE_LIMITED');
  }
}

class AuthApiClient {
  private baseUrl = '';

  // Hämta auth token från Firebase
  private async getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new AuthApiError('User not authenticated', 401, 'NO_AUTH');
    }
    
    try {
      return await user.getIdToken(true); // Force refresh
    } catch (error) {
      throw new AuthApiError('Failed to get auth token', 401, 'TOKEN_ERROR');
    }
  }

  // Generic API request method
  private async apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.baseUrl}/api/auth${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      // Handle rate limiting
      if (response.status === 429) {
        throw new RateLimitError(
          data.error || 'Too many requests',
          data.resetIn || data.waitTime || 60
        );
      }

      // Handle other errors
      if (!response.ok) {
        throw new AuthApiError(
          data.error || 'API request failed',
          response.status,
          data.code,
          data.details
        );
      }

      return data;
    } catch (error) {
      if (error instanceof AuthApiError || error instanceof RateLimitError) {
        throw error;
      }
      
      // Network or other errors
      throw new AuthApiError(
        'Network error or server unavailable',
        500,
        'NETWORK_ERROR'
      );
    }
  }

  // Profile API methods
  async getProfile(): Promise<UserProfileData> {
    const response = await this.apiRequest<{ user: UserProfileData }>('/profile');
    return response.user;
  }

  async updateProfile(profileData: Partial<UserProfileData['profile']>): Promise<void> {
    await this.apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile: profileData }),
    });
  }

  async deleteAccount(confirmDelete: string = 'DELETE_MY_ACCOUNT'): Promise<{ bookingsAnonymized: number }> {
    const response = await this.apiRequest<{ details: { bookingsAnonymized: number } }>('/profile', {
      method: 'DELETE',
      body: JSON.stringify({ confirmDelete }),
    });
    return response.details;
  }

  // Password API methods
  async changePassword(currentPassword: string, newPassword: string): Promise<{ strengthScore: number }> {
    const response = await this.apiRequest<{ strengthScore: number }>('/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return response;
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.apiRequest('/password', {
      method: 'PUT',
      body: JSON.stringify({ email }),
    });
  }

  async checkPasswordStrength(password: string): Promise<PasswordStrength> {
    const response = await this.apiRequest<{ strength: PasswordStrength }>(
      `/password?password=${encodeURIComponent(password)}`
    );
    return response.strength;
  }

  // Email verification API methods
  async sendVerificationEmail(): Promise<{ email: string; expiresIn: string }> {
    const response = await this.apiRequest<{ email: string; expiresIn: string }>('/email-verification', {
      method: 'POST',
    });
    return response;
  }

  async checkEmailVerification(): Promise<{
    verified: boolean;
    message: string;
    statusChanged?: boolean;
    newStatus?: string;
    verifiedAt?: any;
    emailSentAt?: any;
    canResendAt?: any;
  }> {
    return await this.apiRequest('/email-verification', {
      method: 'PUT',
    });
  }

  async getEmailVerificationStatus(): Promise<{
    emailVerified: boolean;
    email: string | null;
    status: string;
    metadata: {
      emailVerificationSentAt?: any;
      emailVerifiedAt?: any;
      emailVerificationAttempts: number;
    };
    rateLimiting: {
      canSendNow: boolean;
      nextAllowedTime?: number;
      resetTime?: number;
      attemptsRemaining: number;
    };
  }> {
    return await this.apiRequest('/email-verification');
  }

  // Session API methods
  async createSession(): Promise<{
    session: {
      id: string;
      expiresAt: string;
      deviceInfo: { platform: string };
    };
    user: {
      uid: string;
      email: string;
      role: string;
      emailVerified: boolean;
      status: string;
    };
  }> {
    return await this.apiRequest('/session', {
      method: 'POST',
    });
  }

  async getActiveSessions(): Promise<{
    sessions: SessionInfo[];
    totalActiveSessions: number;
  }> {
    return await this.apiRequest('/session?action=list');
  }

  async getCurrentSession(): Promise<{
    currentSession: {
      uid: string;
      email: string;
      iat: string;
      exp: string;
      deviceInfo: { platform: string };
    };
  }> {
    return await this.apiRequest('/session');
  }

  async revokeAllSessions(): Promise<{
    message: string;
    revokedCount: number;
    action: string;
  }> {
    return await this.apiRequest('/session?action=all', {
      method: 'DELETE',
    });
  }

  async revokeCurrentSession(): Promise<{
    message: string;
    revokedCount: number;
    action: string;
  }> {
    return await this.apiRequest('/session', {
      method: 'DELETE',
    });
  }

  async updateSessionActivity(): Promise<{
    message: string;
    lastActivity: string;
  }> {
    return await this.apiRequest('/session', {
      method: 'PUT',
    });
  }

  // Utility methods
  async healthCheck(): Promise<boolean> {
    try {
      await this.getCurrentSession();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Handle rate limiting with retry logic
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof RateLimitError && attempt < maxRetries) {
          // Wait for rate limit to reset, but cap at 60 seconds
          const waitTime = Math.min(error.resetIn * 1000, 60000);
          console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Don't retry for non-rate-limit errors
        if (!(error instanceof RateLimitError)) {
          throw error;
        }
      }
    }
    
    throw lastError!;
  }
}

// Export singleton instance
export const authApiClient = new AuthApiClient();
