'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Image from 'next/image';
import '../styles/auth.css';
import AuthButton from '../components/AuthButton';
import OtpInput from '../components/OtpInput';
import PhoneLoginV2 from '../components/PhoneLoginV2';
import RequireAuth from '../components/RequireAuth';
import RoleLinks from '../components/RoleLinks';
import UserMenu from '../components/UserMenu';

type AuthTab = 'email' | 'phone';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const { user, userRole, signIn, signUp, signInWithGoogle, signInWithApple, logout } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'admin') {
        router.push('/admin');
      } else if (userRole === 'driver') {
        router.push('/driver');
      } else {
        router.push('/booking');
      }
    }
  }, [user, userRole, router]);

  // Show loading while redirecting
  if (user && userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-white">Omdirigerar...</p>
        </div>
      </div>
    );
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Try to sign in first
      await signIn(email, password);
      // If successful, stop loading and redirect to booking page
      setIsLoading(false);
      router.push('/booking');
      return; // Exit early to prevent finally block
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // If user doesn't exist, try to create account
      if (error.code === 'auth/user-not-found') {
        try {
          await signUp(email, password, 'customer');
          setIsLoading(false); // Stop loading before redirect
          router.push('/booking');
          return; // Exit early to prevent finally block
        } catch (signUpError: any) {
          console.error('Sign up error:', signUpError);
          setError('Kunde inte skapa konto. Kontrollera din e-post och försök igen.');
        }
      } else if (error.code === 'auth/wrong-password') {
        setError('Felaktigt lösenord');
      } else if (error.code === 'auth/invalid-email') {
        setError('Ogiltig e-postadress');
      } else if (error.code === 'auth/too-many-requests') {
        setError('För många försök. Vänta en stund och försök igen.');
      } else {
        setError('Felaktig e-post eller lösenord');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      setIsGoogleLoading(false); // Stop loading before redirect
      router.push('/booking');
      return; // Exit early to prevent finally block
    } catch (error: any) {
      console.error('Google auth error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Inloggningen avbröts');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup blockerades. Tillåt popups för denna sida.');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setError('Det finns redan ett konto med denna e-postadress');
      } else {
        setError('Fel vid Google-inloggning');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setIsAppleLoading(true);
    setError('');

    try {
      await signInWithApple();
      setIsAppleLoading(false); // Stop loading before redirect
      router.push('/booking');
      return; // Exit early to prevent finally block
    } catch (error: any) {
      console.error('Apple auth error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Inloggningen avbröts');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup blockerades. Tillåt popups för denna sida.');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setError('Det finns redan ett konto med denna e-postadress');
      } else {
        setError('Fel vid Apple-inloggning');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <div className="relative" style={{ minHeight: '100vh', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.05)', background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))' }}>
      {/* Logo only - positioned top left */}
      <div style={{
        position: 'fixed',
        top: '1rem',
        left: '1.5rem',
        zIndex: 1000
      }}>
        <Image
          src="/avanti-logo.svg"
          alt="Avanti"
          width={120}
          height={35}
          priority
          style={{
            color: 'transparent'
          }}
        />
      </div>

      {/* Elegant premium background */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)]" />
      <div className="w-full h-screen flex items-center justify-center px-4" style={{ zIndex: 10, position: 'relative', overflow: 'hidden', paddingTop: '160px' }}>
        <div className="w-full max-w-[400px]">
          <div className="rounded-3xl p-6 md:p-8 shadow-2xl bg-white/8 backdrop-blur-xl space-y-4" style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <div className="text-center">
              <h1 className="text-white/95 text-xl md:text-3xl font-semibold mb-2" style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>Logga in för att boka din förare</h1>
              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <AuthButton 
                variant="google"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading || isAppleLoading || isLoading}
                loading={isGoogleLoading}
                testId="btn-google"
                startIcon={
                  <img alt="Google" className="w-5 h-5 object-contain" draggable="false" src="/logos/google-g.svg" />
                }
              >
                Fortsätt med Google
              </AuthButton>
              
              <AuthButton 
                variant="apple"
                onClick={handleAppleAuth}
                disabled={isGoogleLoading || isAppleLoading || isLoading}
                loading={isAppleLoading}
                testId="btn-apple"
                startIcon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                }
              >
                Fortsätt med Apple
              </AuthButton>
            </div>
            
            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
              <span className="text-white/60 text-xs font-medium px-3 py-1 rounded-full" style={{ 
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>eller</span>
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
            </div>
            
            <div className="flex items-center justify-center mb-2">
              <div className="inline-flex rounded-xl p-1 text-xs" style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
              }}>
                <button 
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    border: 'none',
                    background: activeTab === 'email' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    color: activeTab === 'email' ? 'white' : 'rgb(156 163 175)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'email') {
                      (e.target as HTMLElement).style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'email') {
                      (e.target as HTMLElement).style.color = 'rgb(156 163 175)';
                    }
                  }}
                  onClick={() => {
                    setActiveTab('email');
                  }}
                >
                  E‑post
                </button>
                <button 
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    border: 'none',
                    background: activeTab === 'phone' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    color: activeTab === 'phone' ? 'white' : 'rgb(156 163 175)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'phone') {
                      (e.target as HTMLElement).style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'phone') {
                      (e.target as HTMLElement).style.color = 'rgb(156 163 175)';
                    }
                  }}
                  onClick={() => {
                    setActiveTab('phone');
                    setError('');
                  }}
                >
                  Telefon
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {activeTab === 'email' && (
                <form onSubmit={handleEmailAuth}>
                  <label className="text-xs text-zinc-400" htmlFor="email">E‑post</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"></path>
                      </svg>
                    </span>
                    <input 
                      id="email" 
                      data-testid="input-email" 
                      className="pl-10 rounded-2xl bg-white/5 w-full px-3 py-2 text-sm text-white outline-none border-none placeholder:text-zinc-500 focus:bg-white/8" 
                      placeholder="din@mail.se" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <label className="text-xs text-zinc-400" htmlFor="password">Lösenord</label>
                  <div className="relative">
                    
                                          <input 
                        id="password" 
                        data-testid="input-password" 
                        className="pl-10 pr-10 rounded-2xl bg-white/5 w-full px-3 py-2 text-sm text-white outline-none border-none placeholder:text-zinc-500 focus:bg-white/8" 
                        placeholder="••••••••" 
                        type={showPassword ? 'text' : 'password'} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                      <button 
                        type="button" 
                        aria-label="Visa lösenord" 
                        className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md transition-all duration-200 hover:scale-110 active:scale-95" 
                        style={{ 
                          color: 'rgba(255, 255, 255, 0.95)',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '0.375rem',
                          padding: '0.25rem'
                        }}
                        onClick={() => {
                          setShowPassword(!showPassword);
                        }}
                      >
                        <svg 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="rgba(255, 255, 255, 0.95)" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="transition-all duration-200"
                        >
                          {showPassword ? (
                            <>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </>
                          ) : (
                            <>
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  
                  <button 
                    data-testid="btn-email" 
                    type="submit"
                    disabled={isLoading || !email || !password}
                    className="w-full inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-300 focus:outline-none mt-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                      transform: 'translateY(0)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && email && password) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.12) 100%)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && email && password) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)';
                      }
                    }}
                  >
                    <span>{isLoading ? 'Loggar in...' : 'Logga in'}</span>
                  </button>
                </form>
              )}
              
              {activeTab === 'phone' && (
                <div className="space-y-3">
                  <PhoneLoginV2 
                    onSuccess={() => {
                      // Efter lyckad telefon-inloggning
                      router.push('/booking');
                    }}
                    className="w-full"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V11a1 1 0 011-1h1zm2 0h8V8a4 4 0 10-8 0v2z"></path>
                </svg>
                <span>Säker inloggning via Firebase</span>
              </div>
              <div className="flex items-center gap-3 text-white text-[11px]">
                <a className="hover:text-zinc-300 text-white" href="/villkor?from=login" style={{ color: 'white', textDecoration: 'none', outline: 'none', border: 'none' }}>Villkor</a>
                <a className="hover:text-zinc-300 text-white" href="/integritet?from=login" style={{ color: 'white', textDecoration: 'none', outline: 'none', border: 'none' }}>Integritetspolicy</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
