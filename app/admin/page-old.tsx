'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AdminDashboard from '../components/AdminDashboard';
import '../styles/admin.css';

interface User {
  id: string;
  email: string;
  phone: string;
  role: 'customer' | 'driver' | 'admin';
  name: string;
  createdAt: Date;
}

export default function AdminPage() {
  const { user, userRole, logout } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    
    if (userRole !== 'admin') {
      router.push('/');
      return;
    }
  }, [user, userRole, router]);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'anna@example.com',
        phone: '+46701234567',
        role: 'customer',
        name: 'Anna Andersson',
        createdAt: new Date('2024-01-15')
      },
      {
        id: '2',
        email: 'marcus@avanti.se',
        phone: '+46709876543',
        role: 'driver',
        name: 'Marcus Svensson',
        createdAt: new Date('2024-01-10')
      },
      {
        id: '3',
        email: 'admin@avanti.se',
        phone: '+46705555555',
        role: 'admin',
        name: 'Admin User',
        createdAt: new Date('2024-01-01')
      }
    ];

    setUsers(mockUsers);
    setIsLoading(false);
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'customer' | 'driver') => {
    try {
      // Mock API call - replace with actual Firebase function
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

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

      <div className="admin-content">
        <div className="admin-section">
          <h2>Användarhantering</h2>
          <div className="users-table">
            <div className="table-header">
              <div className="header-cell">Namn</div>
              <div className="header-cell">E-post</div>
              <div className="header-cell">Telefon</div>
              <div className="header-cell">Roll</div>
              <div className="header-cell">Registrerad</div>
              <div className="header-cell">Åtgärder</div>
            </div>
            
            {users.map((user) => (
              <div key={user.id} className="table-row">
                <div className="table-cell">{user.name}</div>
                <div className="table-cell">{user.email}</div>
                <div className="table-cell">{user.phone}</div>
                <div className="table-cell">
                  <span className={`role-badge ${user.role}`}>
                    {user.role === 'customer' ? 'Kund' : 
                     user.role === 'driver' ? 'Förare' : 'Admin'}
                  </span>
                </div>
                <div className="table-cell">
                  {user.createdAt.toLocaleDateString('sv-SE')}
                </div>
                <div className="table-cell">
                  {user.role !== 'admin' && (
                    <div className="role-actions">
                      <button
                        onClick={() => handleRoleChange(user.id, 'customer')}
                        className={`role-btn ${user.role === 'customer' ? 'active' : ''}`}
                        disabled={user.role === 'customer'}
                      >
                        Kund
                      </button>
                      <button
                        onClick={() => handleRoleChange(user.id, 'driver')}
                        className={`role-btn ${user.role === 'driver' ? 'active' : ''}`}
                        disabled={user.role === 'driver'}
                      >
                        Förare
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-section">
          <h2>Systemstatistik</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{users.filter(u => u.role === 'customer').length}</div>
              <div className="stat-label">Kunder</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{users.filter(u => u.role === 'driver').length}</div>
              <div className="stat-label">Förare</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{users.length}</div>
              <div className="stat-label">Totalt</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
