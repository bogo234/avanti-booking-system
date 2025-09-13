'use client';
import { useState, useEffect, useRef } from 'react';
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
import EmailVerification from '../components/EmailVerification';
import { sendVerificationEmail } from '../../lib/user-management';

// Country codes with flags
const COUNTRIES = [
  { code: '+46', flag: '🇸🇪', name: 'Sverige' },
  { code: '+47', flag: '🇳🇴', name: 'Norge' },
  { code: '+45', flag: '🇩🇰', name: 'Danmark' },
  { code: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: '+49', flag: '🇩🇪', name: 'Tyskland' },
  { code: '+33', flag: '🇫🇷', name: 'Frankrike' },
  { code: '+44', flag: '🇬🇧', name: 'Storbritannien' },
  { code: '+39', flag: '🇮🇹', name: 'Italien' },
  { code: '+34', flag: '🇪🇸', name: 'Spanien' },
  { code: '+31', flag: '🇳🇱', name: 'Nederländerna' },
  { code: '+32', flag: '🇧🇪', name: 'Belgien' },
  { code: '+41', flag: '🇨🇭', name: 'Schweiz' },
  { code: '+43', flag: '🇦🇹', name: 'Österrike' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+1', flag: '🇨🇦', name: 'Kanada' },
];

type AuthTab = 'email' | 'phone';
type AuthMode = 'signin' | 'signup' | 'verification';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>('email');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState({ code: '+46', flag: '🇸🇪', name: 'Sverige' });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const router = useRouter();
  const { user, userRole, userProfile, signIn, signUp, signInWithGoogle, signInWithApple, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle user state and verification
  useEffect(() => {
    if (user) {
      // Check if email is verified
      if (!user.emailVerified && userProfile?.status === 'pending_verification') {
        setAuthMode('verification');
        return;
      }
      
      // Redirect if verified and has role
      if (userRole) {
        if (userRole === 'admin') {
          router.push('/admin');
        } else if (userRole === 'driver') {
          router.push('/driver');
        } else {
          router.push('/');
        }
      }
    }
  }, [user, userRole, userProfile, router]);

  // Show loading while redirecting
  if (user && userRole && user.emailVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-white">Omdirigerar...</p>
        </div>
      </div>
    );
  }

  // Show email verification screen
  if (authMode === 'verification' && user) {
    return (
      <EmailVerification
        user={user}
        onVerificationComplete={() => {
          setAuthMode('signin');
          setSuccess('E-post verifierad! Du kan nu logga in.');
        }}
        onResendEmail={() => {
          setSuccess('Nytt verifieringsmail skickat!');
        }}
      />
    );
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (authMode === 'signin') {
        // Try to sign in
        await signIn(email, password);
        // If successful, redirect will happen in useEffect
      } else if (authMode === 'signup') {
        // Validate required fields for signup
        if (!firstName.trim()) {
          setError('Förnamn är obligatoriskt');
          return;
        }
        if (!lastName.trim()) {
          setError('Efternamn är obligatoriskt');
          return;
        }
        
        // Create new account
        const fullPhoneNumber = phone.trim() ? selectedCountry.code + phone.trim() : undefined;
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        await signUp(email, password, fullName, fullPhoneNumber);
        
        // Send verification email
        if (user) {
          await sendVerificationEmail(user);
          setAuthMode('verification');
          setSuccess('Konto skapat! Kontrollera din e-post för verifiering.');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      if (error.code === 'auth/user-not-found') {
        setError('Inget konto hittades med denna e-postadress. Skapa ett konto istället.');
        setAuthMode('signup');
      } else if (error.code === 'auth/wrong-password') {
        setError('Felaktigt lösenord');
      } else if (error.code === 'auth/invalid-email') {
        setError('Ogiltig e-postadress');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('E-postadressen används redan. Logga in istället.');
        setAuthMode('signin');
      } else if (error.code === 'auth/weak-password') {
        setError('Lösenordet är för svagt. Använd minst 6 tecken.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('För många försök. Vänta en stund och försök igen.');
      } else {
        setError(authMode === 'signin' ? 'Felaktig e-post eller lösenord' : 'Kunde inte skapa konto. Försök igen.');
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
      router.push('/');
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
      router.push('/');
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
      <div className="w-full h-screen flex items-center justify-center px-4" style={{ zIndex: 10, position: 'relative', overflow: 'hidden', paddingTop: '100px' }}>
        <div className="w-full max-w-[400px]">
          <div className="rounded-3xl p-4 md:p-6 shadow-2xl bg-white/8 backdrop-blur-xl space-y-0" style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <div className="text-center">
              <h1 className="text-white/95 text-xl md:text-3xl font-semibold mb-1" style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {authMode === 'signin' ? 'Logga in för att boka din förare' : 'Skapa konto för att boka din förare'}
              </h1>
              
              {/* Success message */}
              {success && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
            </div>
            
            <div className="grid grid-cols-1 gap-2 mb-4">
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
            
            <div className="flex items-center gap-3 my-0">
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
              <span className="text-white/60 text-xs font-medium px-3 py-1 rounded-full" style={{ 
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                transform: 'translateY(-0.5rem)'
              }}>Eller</span>
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
            </div>
            
            <div className="flex items-center justify-center mb-0">
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
            
            <div className="space-y-0">
              {activeTab === 'email' && (
                <form onSubmit={handleEmailAuth} className="space-y-0">
                  {/* Name fields for signup */}
                  {authMode === 'signup' && (
                    <div className="mb-0">
                      <label className="text-xs text-zinc-400">Namn</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            id="firstName" 
                            data-testid="input-firstName" 
                            className="rounded-2xl bg-white/5 w-full px-3 py-2 text-sm text-white outline-none border border-white/10 placeholder:text-zinc-500 focus:bg-white/8 focus:border-white/20" 
                            placeholder="Förnamn" 
                            type="text" 
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required={authMode === 'signup'}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="relative flex-1">
                          <input 
                            id="lastName" 
                            data-testid="input-lastName" 
                            className="rounded-2xl bg-white/5 w-full px-3 py-2 text-sm text-white outline-none border border-white/10 placeholder:text-zinc-500 focus:bg-white/8 focus:border-white/20" 
                            placeholder="Efternamn" 
                            type="text" 
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required={authMode === 'signup'}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Phone field for signup */}
                  {authMode === 'signup' && (
                    <div className="mb-0">
                      <label className="text-xs text-zinc-400">Mobilnummer</label>
                      <div className="relative">
                        {/* Country Code Dropdown */}
                        <div ref={dropdownRef} className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
                            <button
                              type="button"
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                              style={{ fontSize: '14px', background: 'transparent', border: 'none', padding: '2px 4px', cursor: 'pointer !important' }}
                            >
                            <span>{selectedCountry.code}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                              <path d="M7 10l5 5 5-5z"/>
                            </svg>
                          </button>
                          
                          {isDropdownOpen && (
                            <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg shadow-2xl overflow-hidden scrollbar-transparent animate-in fade-in-0 zoom-in-95 duration-200" style={{
                              background: '#2a2a2a',
                              border: '1px solid #555555',
                              height: '100px',
                              overflowY: 'auto',
                              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                              zIndex: 1000
                            }}>
                              {COUNTRIES.map((country, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCountry(country);
                                    setIsDropdownOpen(false);
                                  }}
                                  className="w-full flex items-center justify-start gap-2 px-3 py-2 text-xs text-white transition-all duration-200 hover:bg-gray-600 group"
                                  style={{ 
                                    background: '#2a2a2a'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 0 10px #ffffff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <span className="font-mono text-white group-hover:text-white transition-colors">{country.code}</span>
                                  <span className="text-white group-hover:text-white transition-colors">{country.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <input 
                          className="pl-32 rounded-2xl bg-white/5 w-full px-3 py-2 text-sm text-white outline-none border border-white/10 placeholder:text-zinc-500 focus:bg-white/8 focus:border-white/20"
                          style={{ paddingLeft: '3.5rem' }}
                          placeholder={phone ? '' : '712345678'} 
                          type="tel" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  {/* Email field */}
                  <div className="mb-0">
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
                  </div>
                  
                  <div className="mb-0">
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
                  </div>
                  
                  <button 
                    data-testid="btn-email" 
                    type="submit"
                    disabled={isLoading || !email || !password || (authMode === 'signup' && (!firstName.trim() || !lastName.trim()))}
                    className="w-full inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-300 focus:outline-none mt-2 mb-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                      transform: 'translateY(0)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && email && password && (authMode === 'signin' || (firstName.trim() && lastName.trim()))) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.12) 100%)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && email && password && (authMode === 'signin' || (firstName.trim() && lastName.trim()))) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)';
                      }
                    }}
                  >
                    <span>
                      {isLoading 
                        ? (authMode === 'signin' ? 'Loggar in...' : 'Skapar konto...') 
                        : (authMode === 'signin' ? 'Logga in' : 'Skapa konto')
                      }
                    </span>
                  </button>
                </form>
              )}
              
              {activeTab === 'phone' && (
                <div className="space-y-3">
                  <PhoneLoginV2 
                    onSuccess={() => {
                      // Efter lyckad telefon-inloggning
                      router.push('/');
                    }}
                    className="w-full"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3 text-white text-[11px]">
                {authMode === 'signin' ? (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setAuthMode('signup');
                      setError('');
                      setSuccess('');
                    }}
                    className="hover:text-zinc-300 text-white"
                    style={{ color: 'white', textDecoration: 'none', outline: 'none', border: 'none' }}
                  >
                    Inget konto? Skapa ett här
                  </a>
                ) : (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setAuthMode('signin');
                      setError('');
                      setSuccess('');
                    }}
                    className="hover:text-zinc-300 text-white"
                    style={{ color: 'white', textDecoration: 'none', outline: 'none', border: 'none' }}
                  >
                    Har du redan konto? Logga in
                  </a>
                )}
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
