import { 
  Auth, 
  RecaptchaVerifier, 
  ConfirmationResult, 
  signInWithPhoneNumber,
  ApplicationVerifier,
  AuthError
} from 'firebase/auth';

// OTP Service Configuration
const OTP_CONFIG = {
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
  
  // Timeout configuration
  VERIFICATION_TIMEOUT: 300000, // 1 minute
  RECAPTCHA_TIMEOUT: 10000, // 10 seconds
  
  // Rate limiting
  MIN_REQUEST_INTERVAL: 60000, // 10 seconds between requests for same number
  
  // Phone number validation patterns
  PHONE_PATTERNS: {
    INTERNATIONAL: /^\+[1-9]\d{6,14}$/,
    SWEDEN: /^(\+46|0046|46)?[0-9]{7,10}$/,
    US: /^(\+1|001|1)?[0-9]{10}$/
  }
};

// Track recent OTP requests to prevent spam
const recentRequests = new Map<string, number>();

// Error types for better error handling
export enum OTPErrorType {
  INVALID_PHONE = 'INVALID_PHONE',
  RECAPTCHA_FAILED = 'RECAPTCHA_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FIREBASE_ERROR = 'FIREBASE_ERROR',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export class OTPError extends Error {
  type: OTPErrorType;
  code?: string;
  
  constructor(message: string, type: OTPErrorType, code?: string) {
    super(message);
    this.name = 'OTPError';
    this.type = type;
    this.code = code;
  }
}

// Recaptcha Manager to handle recaptcha lifecycle
class RecaptchaManager {
  private verifier: RecaptchaVerifier | null = null;
  private auth: Auth;
  private containerId: string;
  private initialized = false;
  
  constructor(auth: Auth, containerId: string = 'recaptcha-container') {
    this.auth = auth;
    this.containerId = containerId;
  }
  
  async initialize(): Promise<RecaptchaVerifier> {
    try {
      // If already initialized, return existing verifier
      if (this.initialized && this.verifier) {
        console.log('✅ reCAPTCHA already initialized, reusing existing instance');
        return this.verifier;
      }
      
      // Clean up any existing recaptcha
      await this.cleanup();
      
      // Wait a bit to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ensure container exists
      this.ensureContainer();
      
      // Create new recaptcha verifier with production-ready settings
      this.verifier = new RecaptchaVerifier(this.auth, this.containerId, {
        size: 'invisible',
        callback: () => {
          console.log('✅ reCAPTCHA verified successfully');
        },
        'expired-callback': () => {
          console.warn('⚠️ reCAPTCHA expired, resetting...');
          this.initialized = false;
          // Don't call cleanup here to avoid recursion
        },
        'error-callback': (error: any) => {
          console.error('❌ reCAPTCHA error:', error);
          this.initialized = false;
          // Don't call cleanup here to avoid recursion
        }
      });
      
      // Render the recaptcha
      await this.verifier.render();
      this.initialized = true;
      
      return this.verifier;
    } catch (error: any) {
      console.error('Failed to initialize reCAPTCHA:', error);
      
      // If it's already rendered error, try to cleanup and retry once
      if (error.message?.includes('already been rendered')) {
        console.log('🔄 reCAPTCHA already rendered, cleaning up and retrying...');
        await this.cleanup();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create fresh verifier
        this.verifier = new RecaptchaVerifier(this.auth, this.containerId, {
          size: 'invisible'
        });
        
        try {
          await this.verifier.render();
          this.initialized = true;
          return this.verifier;
        } catch (retryError) {
          console.error('Failed to initialize reCAPTCHA on retry:', retryError);
        }
      }
      
      throw new OTPError(
        'Failed to initialize security verification. Please refresh and try again.',
        OTPErrorType.RECAPTCHA_FAILED,
        (error as any)?.code
      );
    }
  }
  
  private ensureContainer(): void {
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.style.display = 'none';
      document.body.appendChild(container);
    } else {
      // Clear existing content
      container.innerHTML = '';
    }
  }
  
  async cleanup(): Promise<void> {
    try {
      if (this.verifier) {
        await this.verifier.clear();
        this.verifier = null;
      }
      this.initialized = false;
      
      // Clean up DOM element
      const container = document.getElementById(this.containerId);
      if (container) {
        container.innerHTML = '';
      }
    } catch (error) {
      console.warn('Error during reCAPTCHA cleanup:', error);
    }
  }
  
  isInitialized(): boolean {
    return this.initialized && this.verifier !== null;
  }
  
  getVerifier(): RecaptchaVerifier | null {
    return this.verifier;
  }
}

// Main OTP Service class
export class OTPService {
  private auth: Auth;
  private recaptchaManager: RecaptchaManager;
  private confirmationResult: ConfirmationResult | null = null;
  private currentPhoneNumber: string | null = null;
  
  constructor(auth: Auth) {
    this.auth = auth;
    this.recaptchaManager = new RecaptchaManager(auth);
  }
  
  // Normalize phone number to international format
  normalizePhoneNumber(phoneNumber: string, defaultCountryCode: string = '+46'): string {
    // Remove all non-digit characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');
    
    // Handle Swedish numbers
    if (defaultCountryCode === '+46') {
      if (normalized.startsWith('0046')) {
        normalized = '+46' + normalized.slice(4);
      } else if (normalized.startsWith('46')) {
        normalized = '+' + normalized;
      } else if (normalized.startsWith('0')) {
        normalized = '+46' + normalized.slice(1);
      } else if (!normalized.startsWith('+')) {
        normalized = '+46' + normalized;
      }
    }
    
    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      normalized = defaultCountryCode + normalized;
    }
    
    return normalized;
  }
  
  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): boolean {
    return OTP_CONFIG.PHONE_PATTERNS.INTERNATIONAL.test(phoneNumber);
  }
  
  // Check rate limiting
  private checkRateLimit(phoneNumber: string): void {
    const lastRequest = recentRequests.get(phoneNumber);
    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest;
      if (timeSinceLastRequest < OTP_CONFIG.MIN_REQUEST_INTERVAL) {
        const waitTime = Math.ceil((OTP_CONFIG.MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
        throw new OTPError(
          `Please wait ${waitTime} seconds before requesting another code`,
          OTPErrorType.RATE_LIMITED
        );
      }
    }
  }
  
  // Send OTP with retry logic
  async sendOTP(phoneNumber: string, retryCount: number = 0): Promise<void> {
    try {
      // Normalize and validate phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      if (!this.validatePhoneNumber(normalizedPhone)) {
        throw new OTPError(
          'Invalid phone number format. Please use international format (e.g., +46701234567)',
          OTPErrorType.INVALID_PHONE
        );
      }
      
      // Check rate limiting
      this.checkRateLimit(normalizedPhone);
      
      // Initialize or get recaptcha
      let recaptcha: RecaptchaVerifier;
      if (!this.recaptchaManager.isInitialized()) {
        recaptcha = await this.recaptchaManager.initialize();
      } else {
        recaptcha = this.recaptchaManager.getVerifier()!;
      }
      
      // Send OTP
      console.log(`📱 Sending OTP to: ${normalizedPhone}`);
      this.confirmationResult = await signInWithPhoneNumber(
        this.auth,
        normalizedPhone,
        recaptcha
      );
      
      // Store phone number and update rate limiting
      this.currentPhoneNumber = normalizedPhone;
      recentRequests.set(normalizedPhone, Date.now());
      
      // Clean up old rate limit entries (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - 300000;
      for (const [phone, timestamp] of recentRequests.entries()) {
        if (timestamp < fiveMinutesAgo) {
          recentRequests.delete(phone);
        }
      }
      
      console.log('✅ OTP sent successfully');
    } catch (error: any) {
      console.error('❌ Failed to send OTP:', error);
      
      // Handle specific Firebase errors
      const errorCode = error?.code || '';
      const errorMessage = error?.message || 'Unknown error';
      
      // Check if we should retry
      if (retryCount < OTP_CONFIG.MAX_RETRIES) {
        const shouldRetry = this.shouldRetryError(errorCode);
        if (shouldRetry) {
          console.log(`🔄 Retrying... (Attempt ${retryCount + 1}/${OTP_CONFIG.MAX_RETRIES})`);
          
          // Reset recaptcha for retry
          await this.recaptchaManager.cleanup();
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, OTP_CONFIG.RETRY_DELAY));
          
          // Retry
          return this.sendOTP(phoneNumber, retryCount + 1);
        }
      }
      
      // Throw appropriate error
      throw this.mapFirebaseError(error);
    }
  }
  
  // Verify OTP code
  async verifyOTP(code: string): Promise<void> {
    if (!this.confirmationResult) {
      throw new OTPError(
        'No verification in progress. Please request a new code.',
        OTPErrorType.VERIFICATION_FAILED
      );
    }
    
    // Validate OTP format
    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      throw new OTPError(
        'Invalid verification code. Please enter the 6-digit code.',
        OTPErrorType.VERIFICATION_FAILED
      );
    }
    
    try {
      console.log('🔐 Verifying OTP...');
      await this.confirmationResult.confirm(cleanCode);
      console.log('✅ OTP verified successfully');
      
      // Clean up
      this.confirmationResult = null;
      this.currentPhoneNumber = null;
      await this.recaptchaManager.cleanup();
    } catch (error: any) {
      console.error('❌ Failed to verify OTP:', error);
      throw this.mapFirebaseError(error);
    }
  }
  
  // Check if error should trigger retry
  private shouldRetryError(errorCode: string): boolean {
    const retryableCodes = [
      'auth/network-request-failed',
      'auth/internal-error',
      'auth/too-many-requests', // Sometimes temporary
      'auth/operation-not-allowed' // Might be temporary config issue
    ];
    
    return retryableCodes.includes(errorCode);
  }
  
  // Map Firebase errors to OTP errors
  private mapFirebaseError(error: any): OTPError {
    const code = error?.code || '';
    const message = error?.message || 'An unexpected error occurred';
    
    switch (code) {
      case 'auth/invalid-phone-number':
        return new OTPError(
          'Invalid phone number. Please check and try again.',
          OTPErrorType.INVALID_PHONE,
          code
        );
        
      case 'auth/missing-phone-number':
        return new OTPError(
          'Phone number is required.',
          OTPErrorType.INVALID_PHONE,
          code
        );
        
      case 'auth/quota-exceeded':
      case 'auth/too-many-requests':
        return new OTPError(
          'Too many attempts. Please try again later.',
          OTPErrorType.RATE_LIMITED,
          code
        );
        
      case 'auth/network-request-failed':
        return new OTPError(
          'Network error. Please check your connection and try again.',
          OTPErrorType.NETWORK_ERROR,
          code
        );
        
      case 'auth/invalid-app-credential':
      case 'auth/invalid-app-id':
      case 'auth/api-key-not-valid':
        return new OTPError(
          'Service configuration error. Please contact support.',
          OTPErrorType.FIREBASE_ERROR,
          code
        );
        
      case 'auth/recaptcha-not-verified':
      case 'auth/missing-recaptcha-token':
      case 'auth/invalid-recaptcha-token':
        return new OTPError(
          'Security verification failed. Please disable ad blockers and try again.',
          OTPErrorType.RECAPTCHA_FAILED,
          code
        );
        
      case 'auth/invalid-verification-code':
      case 'auth/invalid-verification-id':
      case 'auth/missing-verification-code':
      case 'auth/missing-verification-id':
        return new OTPError(
          'Invalid verification code. Please check and try again.',
          OTPErrorType.VERIFICATION_FAILED,
          code
        );
        
      case 'auth/code-expired':
      case 'auth/session-expired':
        return new OTPError(
          'Verification code expired. Please request a new one.',
          OTPErrorType.TIMEOUT,
          code
        );
        
      case 'auth/operation-not-allowed':
        return new OTPError(
          'Phone authentication is not enabled. Please contact support.',
          OTPErrorType.FIREBASE_ERROR,
          code
        );
        
      default:
        return new OTPError(
          `Authentication failed: ${message}`,
          OTPErrorType.UNKNOWN,
          code
        );
    }
  }
  
  // Resend OTP
  async resendOTP(): Promise<void> {
    if (!this.currentPhoneNumber) {
      throw new OTPError(
        'No phone number available. Please enter your number again.',
        OTPErrorType.INVALID_PHONE
      );
    }
    
    // Clear current confirmation
    this.confirmationResult = null;
    
    // Resend to same number
    await this.sendOTP(this.currentPhoneNumber);
  }
  
  // Cancel current OTP flow
  async cancel(): Promise<void> {
    this.confirmationResult = null;
    this.currentPhoneNumber = null;
    await this.recaptchaManager.cleanup();
  }
  
  // Clean up resources
  async cleanup(): Promise<void> {
    await this.cancel();
    recentRequests.clear();
  }
  
  // Get current state
  getState() {
    return {
      hasActiveVerification: this.confirmationResult !== null,
      currentPhoneNumber: this.currentPhoneNumber,
      recaptchaInitialized: this.recaptchaManager.isInitialized()
    };
  }
}

// Export singleton instance factory
let otpServiceInstance: OTPService | null = null;

export function getOTPService(auth: Auth): OTPService {
  if (!otpServiceInstance) {
    otpServiceInstance = new OTPService(auth);
  }
  return otpServiceInstance;
}

// Reset the singleton instance (useful for testing or when auth changes)
export function resetOTPService(): void {
  if (otpServiceInstance) {
    otpServiceInstance.cleanup();
    otpServiceInstance = null;
  }
}
