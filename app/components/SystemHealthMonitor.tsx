'use client';

import { useState, useEffect } from 'react';

interface ServiceHealth {
  status: string;
  message: string;
  error?: string;
  responseTime?: number;
  // Firebase specific
  // Bookings specific
  recentBookings?: number;
  totalBookings?: number;
  // Drivers specific
  activeDrivers?: number;
  availableDrivers?: number;
  busyDrivers?: number;
  // System specific
  memory?: {
    used: number;
    total: number;
    external: number;
  };
  uptime?: number;
  nodeVersion?: string;
  platform?: string;
}

interface SystemHealth {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    firebase?: ServiceHealth;
    bookings?: ServiceHealth;
    drivers?: ServiceHealth;
    system?: ServiceHealth;
  };
}

export default function SystemHealthMonitor() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/system-health');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch system health');
      }

      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'degraded': return '#f59e0b';
      case 'unhealthy': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && !health) {
    return (
      <div className="system-health-monitor">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Laddar systemstatus...</p>
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="system-health-monitor">
        <div className="error-container">
          <h3>❌ {error}</h3>
          <button onClick={fetchHealth} className="retry-button">
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="system-health-monitor">
      <div className="health-header">
        <h3>Systemövervakning</h3>
        <div className="health-controls">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-uppdatera
          </label>
          <button onClick={fetchHealth} className="refresh-button" disabled={loading}>
            {loading ? '🔄' : '🔄'} Uppdatera
          </button>
        </div>
      </div>

      {health && (
        <>
          <div className="overall-status">
            <div 
              className="status-indicator"
              style={{ backgroundColor: getStatusColor(health.status) }}
            >
              {getStatusIcon(health.status)}
            </div>
            <div className="status-info">
              <h4>Systemstatus: {health.status.toUpperCase()}</h4>
              <p>Senast uppdaterad: {new Date(health.timestamp).toLocaleString('sv-SE')}</p>
            </div>
          </div>

          <div className="services-grid">
            {Object.entries(health.services).map(([serviceName, service]) => (
              <div key={serviceName} className="service-card">
                <div className="service-header">
                  <h4>{serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}</h4>
                  <div 
                    className="service-status"
                    style={{ backgroundColor: getStatusColor(service.status) }}
                  >
                    {getStatusIcon(service.status)}
                  </div>
                </div>

                <div className="service-details">
                  {serviceName === 'firebase' && (
                    <>
                      <p>{service.message}</p>
                      {service.responseTime && (
                        <p>Svarstid: {service.responseTime}ms</p>
                      )}
                    </>
                  )}

                  {serviceName === 'bookings' && (
                    <>
                      <p>{service.message}</p>
                      <div className="service-metrics">
                        <span>Totalt: {service.totalBookings}</span>
                        <span>Senaste timmen: {service.recentBookings}</span>
                      </div>
                    </>
                  )}

                  {serviceName === 'drivers' && (
                    <>
                      <p>{service.message}</p>
                      <div className="service-metrics">
                        <span>🟢 Tillgängliga: {service.availableDrivers}</span>
                        <span>🟡 Upptagna: {service.busyDrivers}</span>
                      </div>
                    </>
                  )}

                  {serviceName === 'system' && (
                    <>
                      <div className="service-metrics">
                        <span>Uptime: {formatUptime(service.uptime)}</span>
                        <span>Node: {service.nodeVersion}</span>
                        <span>Plattform: {service.platform}</span>
                      </div>
                      <div className="memory-usage">
                        <h5>Minnesanvändning:</h5>
                        <div className="memory-bar">
                          <div 
                            className="memory-used"
                            style={{ 
                              width: `${(service.memory.used / service.memory.total) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <p>{service.memory.used}MB / {service.memory.total}MB</p>
                      </div>
                    </>
                  )}

                  {service.error && (
                    <div className="service-error">
                      <p>❌ {service.error}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .system-health-monitor {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .health-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .health-header h3 {
          margin: 0;
          color: white;
        }

        .health-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
        }

        .refresh-button {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .retry-button {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          margin-top: 1rem;
        }

        .overall-status {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .status-indicator {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .status-info h4 {
          margin: 0 0 0.25rem 0;
          color: white;
        }

        .status-info p {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .service-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
        }

        .service-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .service-header h4 {
          margin: 0;
          color: white;
          font-size: 1rem;
        }

        .service-status {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }

        .service-details p {
          margin: 0 0 0.5rem 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
        }

        .service-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin: 0.5rem 0;
        }

        .service-metrics span {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .memory-usage {
          margin-top: 0.75rem;
        }

        .memory-usage h5 {
          margin: 0 0 0.5rem 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
        }

        .memory-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }

        .memory-used {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s ease;
        }

        .service-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 4px;
          padding: 0.5rem;
          margin-top: 0.5rem;
        }

        .service-error p {
          margin: 0;
          color: #ef4444;
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .health-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .health-controls {
            width: 100%;
            justify-content: space-between;
          }

          .services-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
