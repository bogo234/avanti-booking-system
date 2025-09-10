'use client';

import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <a href="/" className="logo">
            <h1>Avanti</h1>
          </a>
        </div>

        <div className="header-right">
          {user ? (
            <>
              <NotificationCenter />
              <div className="user-menu">
                <span className="user-name">
                  {user.displayName || user.email}
                </span>
                <div className="user-actions">
                  <a href="/customer" className="header-link">
                    Mina bokningar
                  </a>
                  <button onClick={logout} className="logout-button">
                    Logga ut
                  </button>
                </div>
              </div>
            </>
          ) : (
            <a href="/auth/simple" className="login-button">
              Logga in
            </a>
          )}
        </div>
      </div>

      <style jsx>{`
        .app-header {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left .logo {
          text-decoration: none;
          color: white;
        }

        .header-left .logo h1 {
          margin: 0;
          font-size: 1.8rem;
          background: linear-gradient(135deg, #4fc3f7, #29b6f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-name {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }

        .user-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-link {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.3s ease;
        }

        .header-link:hover {
          color: #4fc3f7;
        }

        .logout-button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: rgba(255, 255, 255, 0.8);
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.3s ease;
        }

        .logout-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .login-button {
          background: linear-gradient(135deg, #4fc3f7, #29b6f6);
          color: white;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .login-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79, 195, 247, 0.3);
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 1rem;
          }

          .header-left .logo h1 {
            font-size: 1.5rem;
          }

          .user-actions {
            flex-direction: column;
            gap: 0.5rem;
          }

          .user-name {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
