'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { auth } from '../../lib/firebase';
import { getOTPService, OTPError, OTPErrorType } from '../../services/otp-service';
import type { OTPService } from '../../services/otp-service';

// Country codes with flags
const COUNTRIES = [
  { code: '+46', flag: '🇸🇪', name: 'Sverige' },
  { code: '+47', flag: '🇳🇴', name: 'Norge' },
  { code: '+45', flag: '🇩🇰', name: 'Danmark' },
  { code: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: '+49', flag: '🇩🇪', name: 'Tyskland' },
  { code: '+33', flag: '🇫🇷', name: 'Frankrike' },
  { code: '+44', flag: '🇬🇧', name: 'Storbritannien' },
  { code: '+39', flag: '🇮🇹', name: 'Italien' },
  { code: '+34', flag: '🇪🇸', name: 'Spanien' },
  { code: '+31', flag: '🇳🇱', name: 'Nederländerna' },
  { code: '+32', flag: '🇧🇪', name: 'Belgien' },
  { code: '+41', flag: '🇨🇭', name: 'Schweiz' },
  { code: '+43', flag: '🇦🇹', name: 'Österrike' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+1', flag: '🇨🇦', name: 'Kanada' },
];

type PhoneLoginProps = {
  onSuccess?: () => void;
  className?: string;
};

const THEME = {
  bg: '',
  text: 'text-white',
  primary: 'text-black bg-[#00BFFF] hover:brightness-110',
  glass: 'bg-white/8 text-white/95 ring-1 ring-white/15 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:bg-white/12',
  label: 'text-xs text-zinc-400',
  input: 'w-full px-3 py-3 text-sm rounded-2xl bg-white/5 ring-1 ring-white/10 outline-none text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-[#00BFFF]',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  success: 'text-green-400',
  info: 'text-blue-400'
};

// Timer hook for resend functionality
function useCountdown(initialTime: number = 60) {
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setTimeLeft(initialTime);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initialTime]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeLeft(0);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { timeLeft, start, stop, isActive: timeLeft > 0 };
}

export default function PhoneLoginV2({ onSuccess, className }: PhoneLoginProps) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState<'send' | 'verify' | 'resend' | null>(null);
  const [error, setError] = useState<string>('');
  const [errorType, setErrorType] = useState<OTPErrorType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Default to Sweden
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const otpServiceRef = useRef<OTPService | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { timeLeft, start: startTimer, stop: stopTimer, isActive: cannotResend } = useCountdown(60);

  // Initialize OTP service
  useEffect(() => {
    if (auth && !otpServiceRef.current) {
      otpServiceRef.current = getOTPService(auth);
    }
    
    return () => {
      // Cleanup on unmount
      otpServiceRef.current?.cleanup();
    };
  }, []);

  // Clear messages after a delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle phone number formatting for display
  const formatPhoneDisplay = (value: string) => {
    // Remove non-digits for formatting
    const digits = value.replace(/\D/g, '');
    
    // Swedish number formatting
    if (digits.startsWith('46') || digits.startsWith('0')) {
      const cleaned = digits.startsWith('46') ? digits.slice(2) : digits.slice(1);
      if (cleaned.length <= 2) return value;
      if (cleaned.length <= 5) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
      if (cleaned.length <= 8) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    
    return value;
  };

  const sendCode = async () => {
    if (!otpServiceRef.current) {
      setError('Service not initialized. Please refresh the page.');
      return;
    }

    setError('');
    setErrorType(null);
    setSuccessMessage('');
    setLoading('send');
    
    try {
      const fullPhoneNumber = selectedCountry.code + phone;
      await otpServiceRef.current.sendOTP(fullPhoneNumber);
      setStep('otp');
      setSuccessMessage('SMS-kod skickad! Kontrollera din telefon.');
      startTimer(); // Start resend timer
    } catch (e: any) {
      console.error('Send OTP error:', e);
      
      if (e instanceof OTPError) {
        setError(e.message);
        setErrorType(e.type);
        
        // Provide specific guidance based on error type
        if (e.type === OTPErrorType.RECAPTCHA_FAILED) {
          setError(`${e.message}\n\nTips: Stäng av adblockers och försök igen.`);
        } else if (e.type === OTPErrorType.RATE_LIMITED) {
          const match = e.message.match(/\d+/);
          if (match) {
            startTimer(); // Use the wait time from error
          }
        }
      } else {
        setError('Ett oväntat fel uppstod. Försök igen senare.');
      }
    } finally {
      setLoading(null);
    }
  };

  const verifyCode = async () => {
    if (!otpServiceRef.current) {
      setError('Service not initialized. Please refresh the page.');
      return;
    }

    setError('');
    setErrorType(null);
    setLoading('verify');
    
    try {
      await otpServiceRef.current.verifyOTP(otp);
      setSuccessMessage('Inloggning lyckades!');
      stopTimer();
      
      // Small delay for user feedback before redirect
      setTimeout(() => {
        onSuccess?.();
      }, 500);
    } catch (e: any) {
      console.error('Verify OTP error:', e);
      
      if (e instanceof OTPError) {
        setError(e.message);
        setErrorType(e.type);
        
        if (e.type === OTPErrorType.TIMEOUT) {
          // Code expired, offer to resend
          setError(`${e.message}\n\nKlicka på "Skicka ny kod" för att få en ny.`);
        }
      } else {
        setError('Verifiering misslyckades. Kontrollera koden och försök igen.');
      }
    } finally {
      setLoading(null);
    }
  };

  const resendCode = async () => {
    if (!otpServiceRef.current) {
      setError('Service not initialized. Please refresh the page.');
      return;
    }

    setError('');
    setErrorType(null);
    setLoading('resend');
    
    try {
      await otpServiceRef.current.resendOTP();
      setSuccessMessage('Ny kod skickad!');
      setOtp(''); // Clear old code
      startTimer(); // Restart timer
    } catch (e: any) {
      console.error('Resend OTP error:', e);
      
      if (e instanceof OTPError) {
        setError(e.message);
        setErrorType(e.type);
      } else {
        setError('Kunde inte skicka ny kod. Försök igen.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow +, digits, spaces, and dashes
    if (/^[\d\s\-+]*$/.test(value)) {
      setPhone(value);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    
    // Auto-submit when 6 digits are entered
    if (value.length === 6 && !loading) {
      verifyCode();
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setError('');
    setSuccessMessage('');
    stopTimer();
    otpServiceRef.current?.cancel();
  };

  // Get error color based on type
  const getErrorClass = () => {
    switch (errorType) {
      case OTPErrorType.RATE_LIMITED:
        return THEME.warning;
      case OTPErrorType.NETWORK_ERROR:
      case OTPErrorType.RECAPTCHA_FAILED:
        return THEME.warning;
      default:
        return THEME.error;
    }
  };

  return (
    <div className={`${THEME.bg} ${THEME.text} w-full ${className || ''}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold mb-1" style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>Telefoninloggning</h2>
        <p className="text-white/60 text-xs">
          {step === 'phone' 
            ? 'Ange ditt mobilnummer för att få en engångskod'
            : 'Ange den 6-siffriga koden vi skickade till din telefon'
          }
        </p>
      </div>

      {step === 'phone' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400">Mobilnummer</label>
            <div className="relative mt-1">
              {/* Country Code Dropdown */}
              <div ref={dropdownRef} className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                  style={{ fontSize: '14px', background: 'transparent', border: 'none', padding: '2px 4px' }}
                >
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-36 rounded-lg shadow-2xl overflow-hidden scrollbar-transparent" style={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}>
                    {COUNTRIES.map((country, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-1 px-2 py-1 text-xs text-white transition-colors"
                        style={{ background: 'transparent' }}
                      >
                        <span>{country.flag}</span>
                        <span>{country.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <input 
                className="pl-20 rounded-2xl bg-white/5 w-full px-3 py-2 text-sm text-white outline-none border-none placeholder:text-zinc-500 focus:bg-white/8"
                style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
                placeholder="" 
                value={phone} 
                onChange={handlePhoneChange}
                onKeyPress={(e) => e.key === 'Enter' && !loading && sendCode()}
                inputMode="tel" 
                autoComplete="tel"
                disabled={loading === 'send'}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Välj landskod och ange ditt mobilnummer
            </p>
          </div>
          
          <button 
            onClick={sendCode} 
            disabled={loading === 'send' || !phone.trim()} 
            className="w-full inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-300 focus:outline-none mt-2"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.95)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
              transform: 'translateY(0)',
            }}
            onMouseEnter={(e) => {
              if (loading !== 'send' && phone.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.12) 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (loading !== 'send' && phone.trim()) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)';
              }
            }}
          > 
            {loading === 'send' && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/70 border-t-transparent"/>
            )}
            {loading === 'send' ? 'Skickar...' : 'Skicka kod'}
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-3">
          <div>
            <label className={THEME.label}>Verifieringskod</label>
            <div className="mt-1 space-y-2">
              <input 
                className={`${THEME.input} text-center text-lg tracking-widest font-mono`}
                placeholder="000000" 
                value={otp} 
                onChange={handleOtpChange}
                onKeyPress={(e) => e.key === 'Enter' && otp.length === 6 && !loading && verifyCode()}
                inputMode="numeric" 
                autoComplete="one-time-code" 
                maxLength={6}
                disabled={loading === 'verify'}
                autoFocus
              />
              
              {/* Visual OTP input indicator */}
              <div className="flex justify-center gap-2">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i}
                    className={`h-1 w-8 rounded-full transition-colors ${
                      i < otp.length ? 'bg-[#00BFFF]' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={verifyCode} 
              disabled={loading === 'verify' || otp.length !== 6} 
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${THEME.primary} disabled:opacity-60 transition-all`}
            > 
              {loading === 'verify' && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/70 border-t-transparent"/>
              )}
              {loading === 'verify' ? 'Verifierar...' : 'Verifiera'}
            </button>
            
            <button 
              onClick={handleBack}
              type="button" 
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${THEME.glass} transition-all`}
            > 
              ← Tillbaka
            </button>
          </div>
          
          {/* Resend code section */}
          <div className="text-center pt-2 border-t border-white/10">
            {cannotResend ? (
              <p className="text-xs text-zinc-400">
                Ny kod kan skickas om {timeLeft} sekunder
              </p>
            ) : (
              <button
                onClick={resendCode}
                disabled={loading === 'resend'}
                className="text-xs text-[#00BFFF] hover:underline disabled:opacity-60"
              >
                {loading === 'resend' ? 'Skickar ny kod...' : 'Skicka ny kod'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className={`mt-3 p-3 bg-green-900/30 border border-green-500/50 rounded-lg`}>
          <p className={`text-sm ${THEME.success} flex items-center gap-2`}>
            <span>✅</span>
            {successMessage}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className={`mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg`}>
          <p className={`text-sm ${getErrorClass()} whitespace-pre-line`}>
            {error}
          </p>
        </div>
      )}

      {/* Hidden recaptcha container */}
      <div id="recaptcha-container" className="hidden" />
    </div>
  );
}
