'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AdminDashboard from '../components/AdminDashboard';
import '../styles/admin.css';

export default function AdminPage() {
  const { user, userRole, logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (userRole !== 'admin') {
      router.push('/');
      return;
    }
    setIsLoading(false);
  }, [user, userRole, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Laddar admin-panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Panel</h1>
          <p>Hantera användare och system</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logga ut
        </button>
      </div>

      <AdminDashboard />
    </div>
  );
}
