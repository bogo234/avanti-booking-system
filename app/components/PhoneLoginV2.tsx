'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { getAuthSafe } from '../../firebase.config';
import { getOTPService, OTPError, OTPErrorType } from '../../services/otp-service';
import type { OTPService } from '../../services/otp-service';

type PhoneLoginProps = {
  onSuccess?: () => void;
  className?: string;
};

const THEME = {
  bg: 'bg-black',
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
  
  const otpServiceRef = useRef<OTPService | null>(null);
  const { timeLeft, start: startTimer, stop: stopTimer, isActive: cannotResend } = useCountdown(60);

  // Initialize OTP service
  useEffect(() => {
    const auth = getAuthSafe();
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
      await otpServiceRef.current.sendOTP(phone);
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
    <div className={`${THEME.bg} ${THEME.text} w-full max-w-md rounded-3xl ring-1 ring-white/10 bg-white/5 backdrop-blur-xl p-5 md:p-6 shadow-2xl ${className || ''}`}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Telefoninloggning</h2>
        <p className="text-zinc-400 text-sm mt-1">
          {step === 'phone' 
            ? 'Ange ditt mobilnummer för att få en engångskod'
            : 'Ange den 6-siffriga koden vi skickade till din telefon'
          }
        </p>
      </div>

      {step === 'phone' && (
        <div className="space-y-3">
          <div>
            <label className={THEME.label}>Mobilnummer</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                📱
              </span>
              <input 
                className={`${THEME.input} pl-10`}
                placeholder="070 123 45 67" 
                value={phone} 
                onChange={handlePhoneChange}
                onKeyPress={(e) => e.key === 'Enter' && !loading && sendCode()}
                inputMode="tel" 
                autoComplete="tel"
                disabled={loading === 'send'}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Svenska nummer eller internationellt format (+46...)
            </p>
          </div>
          
          <button 
            onClick={sendCode} 
            disabled={loading === 'send' || !phone.trim()} 
            className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${THEME.primary} disabled:opacity-60 transition-all`}
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
