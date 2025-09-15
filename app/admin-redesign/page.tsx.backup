'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRedesignPage() {
  const { user, userRole } = useAuth();

  // Check if user is admin
  if (!user || userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Åtkomst nekad</h1>
          <p className="text-gray-400 mb-6">Du behöver admin-behörigheter för att komma åt denna sida.</p>
          <Link 
            href="/auth" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Logga in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Header */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">Avanti</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/admin"
                className="text-gray-400 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Gamla Admin
              </Link>
              <Link 
                href="/admin-new"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Nya Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎉 Nya Premium Admin Panel
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Helt omdesignad med modern UI, bättre UX och real-time funktionalitet
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Updates</h3>
            <p className="text-gray-400">Live data och instant notifikationer för alla händelser i systemet.</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Analytics Dashboard</h3>
            <p className="text-gray-400">Detaljerade insikter och visualiseringar av ditt företags prestanda.</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Premium Design</h3>
            <p className="text-gray-400">Elegant, minimal design inspirerad av moderna plattformar som Uber.</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Mobile First</h3>
            <p className="text-gray-400">Perfekt optimerad för alla enheter med touch-vänliga kontroller.</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Production Ready</h3>
            <p className="text-gray-400">Robust, säker och skalbar kod som följer alla best practices.</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Micro-interactions</h3>
            <p className="text-gray-400">Subtila animationer och feedback som ger premium-känsla.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Redo att testa den nya admin-panelen?</h2>
          <p className="text-gray-400 mb-6">
            Klicka på knappen nedan för att komma till den helt nya premium admin-panelen
          </p>
          <Link 
            href="/admin-new"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Kom igång nu
          </Link>
        </div>
      </div>
    </div>
  );
}
