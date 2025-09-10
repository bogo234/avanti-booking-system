'use client';

import { useEffect, useState } from 'react';
import { getAuthSafe } from '../../firebase.config';
import { RecaptchaVerifier } from 'firebase/auth';

export default function TestFirebasePage() {
  const [status, setStatus] = useState<string>('Laddar...');
  const [error, setError] = useState<string | null>(null);
  const [recaptchaStatus, setRecaptchaStatus] = useState<string>('');

  useEffect(() => {
    const testFirebase = async () => {
      try {
        setStatus('Testar Firebase...');
        
        const auth = getAuthSafe();
        if (!auth) {
          throw new Error('Firebase Auth kunde inte initialiseras');
        }

        setStatus('Firebase Auth initialiserad framgångsrikt! ✅');
        
        // Testa att vi kan komma åt Firebase-appen
        const app = auth.app;
        if (app) {
          setStatus(`Firebase App ID: ${app.options.appId} ✅`);
        }

        // Testa reCAPTCHA
        try {
          setRecaptchaStatus('Testar reCAPTCHA...');
          const recaptcha = new RecaptchaVerifier(auth, 'recaptcha-test', { size: 'invisible' });
          setRecaptchaStatus('reCAPTCHA initialiserad framgångsrikt! ✅');
        } catch (recaptchaError: any) {
          setRecaptchaStatus(`reCAPTCHA fel: ${recaptchaError.message} ❌`);
        }
        
      } catch (err: any) {
        setError(err.message || 'Okänt fel');
        setStatus('Firebase-test misslyckades ❌');
      }
    };

    testFirebase();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Firebase Test</h1>
        
        <div className="bg-white/10 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Status:</h2>
          <p className="text-lg">{status}</p>
          
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded">
              <p className="text-red-300">Fel: {error}</p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white/10 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">reCAPTCHA Status:</h2>
          <p className="text-lg">{recaptchaStatus}</p>
          <div id="recaptcha-test" className="mt-4"></div>
        </div>

        <div className="mt-8 bg-white/10 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Miljövariabler:</h2>
          <div className="space-y-2 text-sm">
            <p>API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Konfigurerad' : '❌ Saknas'}</p>
            <p>Auth Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Konfigurerad' : '❌ Saknas'}</p>
            <p>Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Konfigurerad' : '❌ Saknas'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
