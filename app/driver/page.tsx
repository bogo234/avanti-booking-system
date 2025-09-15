'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import EnhancedDriverDashboard from '../components/EnhancedDriverDashboard';
import '../styles/booking-system.css';

export default function DriverPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Redirect if not a driver
  useEffect(() => {
    if (!authLoading && user && userRole && userRole !== 'driver') {
      router.push('/');
    }
  }, [user, userRole, authLoading, router]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin mx-auto"></div>
          <p className="text-white/70">Kontrollerar behörighet...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-white/90">Inloggning krävs</h1>
          <p className="text-white/60">Du måste logga in för att komma åt förarpanelen.</p>
        </div>
      </div>
    );
  }

  // Not a driver
  if (userRole && userRole !== 'driver') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-white/90">Åtkomst nekad</h1>
          <p className="text-white/60">Du har inte behörighet att komma åt förarpanelen.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/15 transition-colors"
          >
            Tillbaka till startsidan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <EnhancedDriverDashboard />
      </div>
    </div>
  );
}