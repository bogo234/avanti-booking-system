'use client';

import React, { useState, useEffect } from 'react';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import StatCard from './cards/StatCard';
import Button from './shared/Button';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Firebase data hooks
  const { data: allBookings, loading: bookingsLoading } = useFirebaseData('bookings', {
    orderBy: { field: 'createdAt', direction: 'desc' }
  });
  const { data: allDrivers, loading: driversLoading } = useFirebaseData('drivers');
  const { data: allUsers, loading: usersLoading } = useFirebaseData('users');

  // Loading state
  useEffect(() => {
    if (!bookingsLoading && !driversLoading && !usersLoading) {
      setIsLoading(false);
    }
  }, [bookingsLoading, driversLoading, usersLoading]);

  // Calculate statistics
  const stats = {
    totalBookings: allBookings.length,
    activeBookings: allBookings.filter(b => ['waiting', 'accepted', 'on_way', 'arrived'].includes(b.status)).length,
    completedBookings: allBookings.filter(b => b.status === 'completed').length,
    totalDrivers: allDrivers.length,
    availableDrivers: allDrivers.filter(d => d.status === 'available').length,
    totalUsers: allUsers.length,
    totalRevenue: allBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.price || 0), 0)
  };

  // Recent bookings
  const recentBookings = allBookings.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="premium-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Välkommen till Avanti Admin
            </h1>
            <p className="text-gray-400">
              Översikt över ditt taxi-företag och realtidsstatistik
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="secondary" icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            }>
              Exportera data
            </Button>
            <Button variant="primary" icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }>
              Ny bokning
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Aktiva bokningar"
          value={stats.activeBookings}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
          iconType="primary"
          change={{
            value: 12,
            type: 'positive',
            period: 'senaste 24h'
          }}
          trend={{
            data: [12, 19, 3, 5, 2, 3, 8, 12, 15, 8, 11, 14],
            color: '#276ef1'
          }}
          loading={isLoading}
        />

        <StatCard
          title="Tillgängliga förare"
          value={stats.availableDrivers}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          iconType="success"
          change={{
            value: 8,
            type: 'positive',
            period: 'online nu'
          }}
          loading={isLoading}
        />

        <StatCard
          title="Dagens intäkter"
          value={`${stats.totalRevenue.toLocaleString('sv-SE')} kr`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
          iconType="warning"
          change={{
            value: 23,
            type: 'positive',
            period: 'vs igår'
          }}
          trend={{
            data: [20, 25, 30, 35, 40, 38, 45, 50, 48, 52, 55, 60],
            color: '#f59e0b'
          }}
          loading={isLoading}
        />

        <StatCard
          title="Kundnöjdhet"
          value="4.8"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
          iconType="success"
          change={{
            value: 0.2,
            type: 'positive',
            period: 'denna vecka'
          }}
          loading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <div className="premium-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Senaste bokningar</h2>
              <Button variant="ghost" size="sm">
                Visa alla
              </Button>
            </div>
            
            <div className="space-y-3">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-700/50">
                    <div className="loading-skeleton w-10 h-10 rounded-full"></div>
                    <div className="flex-1">
                      <div className="loading-skeleton h-4 w-32 mb-2 rounded"></div>
                      <div className="loading-skeleton h-3 w-24 rounded"></div>
                    </div>
                    <div className="loading-skeleton h-6 w-16 rounded"></div>
                  </div>
                ))
              ) : (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {booking.customerEmail?.charAt(0).toUpperCase() || 'K'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {booking.customerEmail || 'Okänd kund'}
                      </p>
                      <p className="text-gray-400 text-sm truncate">
                        {booking.pickup?.address} → {booking.destination?.address}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        booking.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                        booking.status === 'on_way' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {booking.status === 'completed' ? 'Slutförd' :
                         booking.status === 'waiting' ? 'Väntar' :
                         booking.status === 'on_way' ? 'På väg' :
                         booking.status}
                      </span>
                      <p className="text-gray-400 text-xs mt-1">
                        {booking.price} kr
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="premium-card">
            <h3 className="text-lg font-semibold text-white mb-4">Snabbåtgärder</h3>
            <div className="space-y-3">
              <Button 
                variant="primary" 
                className="w-full justify-start"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Ny bokning
              </Button>
              <Button 
                variant="secondary" 
                className="w-full justify-start"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              >
                Lägg till förare
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              >
                Visa analytics
              </Button>
            </div>
          </div>

          {/* System Status */}
          <div className="premium-card">
            <h3 className="text-lg font-semibold text-white mb-4">Systemstatus</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Firebase</span>
                <span className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Databas</span>
                <span className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">API</span>
                <span className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
