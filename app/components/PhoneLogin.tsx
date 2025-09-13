'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '../../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';

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
  input: 'w-full px-3 py-3 text-sm rounded-2xl bg-white/5 ring-1 ring-white/10 outline-none text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-[#00BFFF]'
};

export default function PhoneLogin({ onSuccess, className }: PhoneLoginProps) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState<'send' | 'verify' | null>(null);
  const [error, setError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmRef = useRef<ConfirmationResult | null>(null);

  const normalizePhone = useCallback((raw: string) => {
    try {
      const trimmed = raw.trim();
      if (trimmed.startsWith('+')) return trimmed.replace(/\s+/g, '');
      if (/^0[0-9]{6,}$/.test(trimmed)) return `+46${trimmed.replace(/^0+/, '')}`;
      return trimmed.replace(/\s+/g, '');
    } catch {
      return raw;
    }
  }, []);

  const ensureRecaptcha = useCallback(async () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    
    if (!auth) throw new Error('noauth');
    
    try {
      setDebugInfo('Initialiserar reCAPTCHA...');
      
      // Kontrollera om reCAPTCHA redan finns
      const existingRecaptcha = document.getElementById('recaptcha-container');
      if (existingRecaptcha) {
        existingRecaptcha.innerHTML = '';
      }
      
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          setDebugInfo('reCAPTCHA verifierad!');
        },
        'expired-callback': () => {
          setDebugInfo('reCAPTCHA utgången, försök igen');
          recaptchaRef.current = null;
        }
      });
      
      setDebugInfo('reCAPTCHA initialiserad framgångsrikt');
      return recaptchaRef.current;
    } catch (error: any) {
      setDebugInfo(`reCAPTCHA fel: ${error.message}`);
      throw error;
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        recaptchaRef.current?.clear?.();
      } catch {}
    };
  }, []);

  const sendCode = async () => {
    setError('');
    setLoading('send');
    setDebugInfo('Skickar SMS-kod...');
    
    // Debug logging
    console.log('🚀 sendCode startar...');
    console.log('📱 Telefonnummer:', phone);
    
    try {
      if (!auth) {
        console.error('❌ Firebase Auth inte tillgänglig');
        throw new Error('Firebase Auth inte tillgänglig');
      }
      
      console.log('✅ Firebase Auth tillgänglig:', auth);
      setDebugInfo('Kontrollerar Firebase-konfiguration...');
      
      const app = auth.app;
      if (!app) {
        console.error('❌ auth.app är null');
        throw new Error('Firebase App inte tillgänglig');
      }
      
      console.log('✅ Firebase App tillgänglig:', app);
      console.log('🔑 App ID:', app.options.appId);
      setDebugInfo(`Firebase App ID: ${app.options.appId}`);
      
      const recaptcha = await ensureRecaptcha();
      console.log('✅ reCAPTCHA initialiserad:', recaptcha);
      
      const formatted = normalizePhone(phone);
      console.log('📱 Formaterat telefonnummer:', formatted);
      
      if (!/^\+[1-9][0-9]{6,15}$/.test(formatted)) {
        console.error('❌ Ogiltigt telefonnummer-format:', formatted);
        setError('Ogiltigt mobilnummer. Ange i internationellt format, t.ex. +46 7x…');
        setDebugInfo('Ogiltigt telefonnummer-format');
        return;
      }
      
      setDebugInfo(`Skickar kod till: ${formatted}`);
      console.log('📤 Skickar kod till:', formatted);
      
      const result = await signInWithPhoneNumber(auth, formatted, recaptcha);
      console.log('✅ signInWithPhoneNumber lyckades:', result);
      
      confirmRef.current = result;
      setStep('otp');
      setDebugInfo('SMS-kod skickad framgångsrikt!');
      
    } catch (e: any) {
      const code = e?.code || '';
      console.error('❌ Fel vid sendCode:', e);
      console.error('🔍 Felkod:', code);
      console.error('📝 Felmeddelande:', e?.message);
      
      setDebugInfo(`Fel: ${code} - ${e?.message}`);
      
      if (code === 'auth/invalid-app-credential') {
        setError('Firebase-appen är inte korrekt konfigurerad. Kontrollera App ID och API-nyckel.');
      } else if (code === 'auth/too-many-requests') {
        setError('För många försök. Försök igen senare.');
      } else if (code === 'auth/invalid-phone-number') {
        setError('Ogiltigt mobilnummer.');
      } else if (code === 'auth/missing-recaptcha-token' || code === 'auth/invalid-recaptcha-token') {
        setError('reCAPTCHA blockerad. Stäng av innehållsblockerare eller prova annan webbläsare.');
      } else {
        setError(`Kunde inte skicka SMS‑kod. ${code ? `(${code})` : ''}`);
      }
    } finally {
      setLoading(null);
    }
  };

  const verifyCode = async () => {
    setError('');
    setLoading('verify');
    setDebugInfo('Verifierar OTP-kod...');
    
    try {
      if (!otp || otp.trim().length < 6) {
        setError('Ange 6‑siffrig kod.');
        setDebugInfo('OTP-kod för kort');
        return;
      }

      const res = confirmRef.current;
      if (!res) {
        setError('Ingen kod har skickats än.');
        setDebugInfo('Ingen bekräftelse tillgänglig');
        return;
      }

      await res.confirm(otp.trim());
      setDebugInfo('OTP-kod verifierad framgångsrikt!');
      onSuccess?.();
      
    } catch (e: any) {
      const code = e?.code || '';
      setDebugInfo(`Verifieringsfel: ${code} - ${e?.message}`);
      
      if (code === 'auth/invalid-verification-code') {
        setError('Fel SMS‑kod. Försök igen.');
      } else {
        setError(`Verifiering misslyckades. ${code ? `(${code})` : ''}`);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`${THEME.bg} ${THEME.text} w-full max-w-md rounded-3xl ring-1 ring-white/10 bg-white/5 backdrop-blur-xl p-5 md:p-6 shadow-2xl ${className || ''}`}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Telefoninloggning</h2>
        <p className="text-zinc-400 text-sm">Logga in med en SMS‑kod. Snabbt och säkert.</p>
      </div>

      {step === 'phone' && (
        <div className="space-y-2">
          <label className={THEME.label}>Mobilnummer</label>
          <input 
            className={THEME.input} 
            placeholder="Ex: +46 7x xxx xx xx" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            inputMode="tel" 
            autoComplete="tel" 
          />
          <button 
            onClick={sendCode} 
            disabled={loading==='send'} 
            className={`w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${THEME.primary} disabled:opacity-60`} 
          > 
            {loading==='send' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/70 border-t-transparent"/> : null} 
            Skicka kod 
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-2">
          <label className={THEME.label}>SMS‑kod</label>
          <input 
            className={THEME.input} 
            placeholder="6 siffror" 
            value={otp} 
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0,6))} 
            inputMode="numeric" 
            autoComplete="one-time-code" 
            maxLength={6} 
          />
          <div className="flex gap-2">
            <button 
              onClick={verifyCode} 
              disabled={loading==='verify'} 
              className={`flex-1 mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${THEME.primary} disabled:opacity-60`} 
            > 
              {loading==='verify' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/70 border-t-transparent"/> : null} 
              Verifiera kod 
            </button>
            <button 
              onClick={() => setStep('phone')} 
              type="button" 
              className={`mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${THEME.glass}`} 
            > 
              Ändra nummer 
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-[13px] text-red-400">{error}</p>}
      
      {/* Debug information */}
      {debugInfo && (
        <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg text-sm text-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400">🔍</span>
            <strong className="text-blue-300">Debug Info:</strong>
          </div>
          <div className="font-mono text-xs">{debugInfo}</div>
        </div>
      )}

      <div id="recaptcha-container" />
    </div>
  );
}
