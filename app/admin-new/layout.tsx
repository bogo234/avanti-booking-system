'use client';

import React from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { AuthProvider } from '../contexts/AuthContext';
import './styles/admin.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="admin-layout min-h-screen bg-gray-900 text-gray-100">
        <Sidebar />
        <div className="admin-main">
          <Header />
          <main className="admin-content">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
