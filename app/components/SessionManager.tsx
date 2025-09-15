'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SessionInfo } from '../../lib/auth-api-client';

interface SessionManagerProps {
  className?: string;
}

export default function SessionManager({ className }: SessionManagerProps) {
  const { activeSessions, currentSession, refreshSessions, revokeAllSessions } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Refresh sessions on mount
  useEffect(() => {
    refreshSessions();
  }, []);

  const handleRevokeAllSessions = async () => {
    if (!confirm('Är du säker på att du vill avsluta alla sessioner? Du kommer att loggas ut från alla enheter.')) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await revokeAllSessions();
      setSuccess('Alla sessioner har avslutats. Du loggas nu ut.');
    } catch (error: any) {
      console.error('Failed to revoke sessions:', error);
      setError('Kunde inte avsluta sessioner. Försök igen.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDeviceInfo = (session: SessionInfo) => {
    const platform = session.deviceInfo?.platform || 'unknown';
    const userAgent = session.deviceInfo?.userAgent || '';
    
    // Simplified device detection
    if (platform === 'mobile' || userAgent.includes('Mobile')) {
      return { icon: '📱', name: 'Mobil enhet' };
    } else if (platform === 'ios' || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return { icon: '📱', name: 'iPhone/iPad' };
    } else if (platform === 'mac' || userAgent.includes('Mac')) {
      return { icon: '💻', name: 'Mac' };
    } else if (platform === 'windows' || userAgent.includes('Windows')) {
      return { icon: '🖥️', name: 'Windows' };
    } else if (platform === 'linux' || userAgent.includes('Linux')) {
      return { icon: '🐧', name: 'Linux' };
    } else {
      return { icon: '🌐', name: 'Webbläsare' };
    }
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just nu';
    if (diffMins < 60) return `${diffMins} min sedan`;
    if (diffHours < 24) return `${diffHours} tim sedan`;
    return `${diffDays} dagar sedan`;
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-white/90">Aktiva sessioner</h2>
          <p className="text-white/60 text-sm mt-1">
            Hantera dina inloggade enheter och säkerhet
          </p>
        </div>
        <button
          onClick={() => refreshSessions()}
          disabled={isLoading}
          className="px-3 py-1 text-sm text-white/70 hover:text-white/90 transition-colors"
        >
          🔄 Uppdatera
        </button>
      </div>

      {/* Success/Error messages */}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Current Session Info */}
      {currentSession && (
        <div className="rounded-2xl p-4 bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-white/90 font-medium">Nuvarande session</h3>
          </div>
          <div className="space-y-1 text-sm text-white/70">
            <p>Enhet: {formatDeviceInfo({ deviceInfo: currentSession.deviceInfo } as SessionInfo).name}</p>
            <p>Inloggad: {new Date(currentSession.iat).toLocaleString('sv-SE')}</p>
            <p>Upphör: {new Date(currentSession.exp).toLocaleString('sv-SE')}</p>
          </div>
        </div>
      )}

      {/* Active Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white/90 font-medium">Alla sessioner ({activeSessions.length})</h3>
          {activeSessions.length > 1 && (
            <button
              onClick={handleRevokeAllSessions}
              disabled={isLoading}
              className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Avslutar...' : 'Avsluta alla'}
            </button>
          )}
        </div>

        {activeSessions.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            <p>Inga aktiva sessioner hittades</p>
            <button
              onClick={() => refreshSessions()}
              className="mt-2 text-sm text-white/70 hover:text-white/90 underline"
            >
              Uppdatera lista
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSessions.map((session, index) => {
              const deviceInfo = formatDeviceInfo(session);
              const isCurrentDevice = session.isCurrent;

              return (
                <div
                  key={session.id || index}
                  className={`rounded-xl p-4 border transition-colors ${
                    isCurrentDevice
                      ? 'bg-white/8 border-white/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{deviceInfo.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white/90 font-medium">{deviceInfo.name}</p>
                          {isCurrentDevice && (
                            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                              Denna enhet
                            </span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm">
                          Senast aktiv: {formatLastActivity(session.lastActivity)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-white/70 text-sm">
                        Skapad: {new Date(session.createdAt).toLocaleDateString('sv-SE')}
                      </p>
                      <p className="text-white/50 text-xs">
                        Upphör: {new Date(session.expiresAt).toLocaleDateString('sv-SE')}
                      </p>
                    </div>
                  </div>

                  {/* Session details */}
                  {session.deviceInfo?.userAgent && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-white/50 text-xs font-mono">
                        {session.deviceInfo.userAgent.substring(0, 80)}
                        {session.deviceInfo.userAgent.length > 80 ? '...' : ''}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Tips */}
      <div className="rounded-xl p-4 bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-yellow-400">🛡️</span>
          <h4 className="text-yellow-400 font-medium">Säkerhetstips</h4>
        </div>
        <ul className="text-yellow-300/80 text-sm space-y-1">
          <li>• Avsluta sessioner på enheter du inte längre använder</li>
          <li>• Kontrollera regelbundet dina aktiva sessioner</li>
          <li>• Logga ut från offentliga datorer efter användning</li>
          <li>• Kontakta support om du ser misstänkt aktivitet</li>
        </ul>
      </div>
    </div>
  );
}
