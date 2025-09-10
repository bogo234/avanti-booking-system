'use client';

import PhoneLogin from '../components/PhoneLogin';
import { useState } from 'react';

export default function TestPhonePage() {
  const [debugMode, setDebugMode] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PhoneLogin Test</h1>
        
        {/* Debug Mode Toggle */}
        <div className="mb-6 p-4 bg-white/10 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={debugMode} 
              onChange={(e) => setDebugMode(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Debug Mode</span>
          </label>
          {debugMode && (
            <div className="mt-2 p-2 bg-blue-900/20 rounded text-xs text-blue-300">
              <strong>Debug aktiverat:</strong> Du kommer att se detaljerad information om vad som händer
            </div>
          )}
        </div>
        
        <div className="bg-white/10 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Testa PhoneLogin-komponenten:</h2>
          
          <PhoneLogin 
            onSuccess={() => {
              alert('Telefon-inloggning lyckades!');
            }}
            className="w-full"
          />
        </div>

        {/* Manual Test Buttons */}
        <div className="mt-8 bg-white/10 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Manuella tester:</h3>
          
          <div className="space-y-2">
            <button 
              onClick={() => {
                console.log('Testar Firebase-konfiguration...');
                console.log('Environment variables:', {
                  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Konfigurerad' : '❌ Saknas',
                  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Konfigurerad' : '❌ Saknas',
                  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Konfigurerad' : '❌ Saknas',
                  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Konfigurerad' : '❌ Saknas'
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Testa Firebase Config (kolla konsolen)
            </button>
            
            <button 
              onClick={() => {
                console.log('Testar window.Firebase...');
                console.log('Firebase global:', typeof window !== 'undefined' ? (window as any).Firebase : 'Server-side');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Testa Firebase Global (kolla konsolen)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
