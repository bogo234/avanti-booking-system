'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerDashboard from '../components/CustomerDashboard';
import { useAuth } from '../contexts/AuthContext';
import '../styles/booking-system.css';

export default function CustomerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="customer-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Laddar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="customer-page">
      <CustomerDashboard customerId={user.uid} />
    </div>
  );
}
