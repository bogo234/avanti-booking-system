'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signInUser, createUser, signOutUser, signInWithGoogle, signInWithApple } from '../../lib/firebase';
import { UserProfile, getUserProfile, createUserProfile, linkExistingBookings } from '../../lib/user-management';
import { authApiClient, SessionInfo, AuthApiError } from '../../lib/auth-api-client';

export type UserRole = 'customer' | 'driver' | 'admin';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<User>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (role: UserRole) => void;
  refreshUserProfile: () => Promise<void>;
  // Session management
  activeSessions: SessionInfo[];
  currentSession: any | null;
  refreshSessions: () => Promise<void>;
  revokeAllSessions: () => Promise<void>;
  updateSessionActivity: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Session management state
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [currentSession, setCurrentSession] = useState<any | null>(null);

  // Function to load user profile
  const loadUserProfile = async (firebaseUser: User) => {
    try {
      const profile = await getUserProfile(firebaseUser.uid);
      if (profile) {
        // Check if user should be admin based on email
        if (firebaseUser.email === 'admin@avanti.se' && profile.role !== 'admin') {
          // Update existing profile to admin
          await createUserProfile(firebaseUser, {
            name: 'Admin User',
            role: 'admin'
          });
          setUserRole('admin');
        } else {
          setUserProfile(profile);
          setUserRole(profile.role);
        }
      } else {
        // If no profile exists, create one for existing users
        if (firebaseUser.email === 'admin@avanti.se') {
          await createUserProfile(firebaseUser, {
            name: 'Admin User',
            role: 'admin'
          });
          setUserRole('admin');
        } else {
          setUserRole('customer');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Set admin role for admin@avanti.se even if profile loading fails
      if (firebaseUser.email === 'admin@avanti.se') {
        setUserRole('admin');
      } else {
        setUserRole('customer');
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await loadUserProfile(firebaseUser);
        
        // Initialize session when user logs in
        await initializeSession();
        
        // Load sessions
        await refreshSessions();
      } else {
        setUserRole(null);
        setUserProfile(null);
        setActiveSessions([]);
        setCurrentSession(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInUser(email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const user = await createUser(email, password);
      
      // Create user profile in Firestore
      await createUserProfile(user, {
        name,
        phone,
        role: 'customer' // All new users start as customers
      });
      
      // Link existing bookings if any
      if (user.email) {
        const linkedCount = await linkExistingBookings(user.email, user.uid);
        if (linkedCount > 0) {
          // Log successful booking linking for debugging
          console.info(`Successfully linked ${linkedCount} existing bookings to new account for ${user.email}`);
        }
      }
      
      setUserRole('customer');
      return user; // Return the created user
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // User role will be set to 'customer' by default in useEffect
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      // User role will be set to 'customer' by default in useEffect
    } catch (error) {
      console.error('Apple sign in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      setUser(null);
      setUserRole(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  // Session management functions
  const initializeSession = async () => {
    if (!user) return;
    
    try {
      // Create session in backend
      await authApiClient.createSession();
      
      // Get current session info
      const sessionInfo = await authApiClient.getCurrentSession();
      setCurrentSession(sessionInfo.currentSession);
      
      // Start session activity heartbeat
      startSessionHeartbeat();
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const refreshSessions = async () => {
    if (!user) return;
    
    try {
      const sessionsData = await authApiClient.getActiveSessions();
      setActiveSessions(sessionsData.sessions);
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    }
  };

  const revokeAllSessions = async () => {
    if (!user) return;
    
    try {
      await authApiClient.revokeAllSessions();
      setActiveSessions([]);
      setCurrentSession(null);
      
      // This will trigger logout since all tokens are revoked
      await logout();
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
      throw error;
    }
  };

  const updateSessionActivity = async () => {
    if (!user) return;
    
    try {
      await authApiClient.updateSessionActivity();
    } catch (error) {
      // Don't throw error for session activity updates
      console.warn('Failed to update session activity:', error);
    }
  };

  // Session heartbeat to keep session alive
  const startSessionHeartbeat = () => {
    // Update activity every 5 minutes
    const heartbeatInterval = setInterval(async () => {
      if (user) {
        await updateSessionActivity();
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 5 * 60 * 1000);

    // Cleanup on unmount
    return () => clearInterval(heartbeatInterval);
  };

  const value = {
    user,
    userRole,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle: handleGoogleSignIn,
    signInWithApple: handleAppleSignIn,
    logout,
    setUserRole,
    refreshUserProfile,
    // Session management
    activeSessions,
    currentSession,
    refreshSessions,
    revokeAllSessions,
    updateSessionActivity
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
