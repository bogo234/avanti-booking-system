'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signInUser, createUser, signOutUser, signInWithGoogle, signInWithApple } from '../../lib/firebase';

export type UserRole = 'customer' | 'driver' | 'admin';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Check for admin email
        if (firebaseUser.email === 'admin@avanti.se') {
          setUserRole('admin');
        } else {
          // For now, default to customer role
          // In production, you would get this from Firestore or custom claims
          setUserRole('customer');
        }
      } else {
        setUserRole(null);
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

  const signUp = async (email: string, password: string, role: UserRole) => {
    try {
      const user = await createUser(email, password);
      setUserRole(role);
      // TODO: Save user role to Firestore when user profile system is implemented
      console.log('User created with role:', role);
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
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const value = {
    user,
    userRole,
    loading,
    signIn,
    signUp,
    signInWithGoogle: handleGoogleSignIn,
    signInWithApple: handleAppleSignIn,
    logout,
    setUserRole
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
