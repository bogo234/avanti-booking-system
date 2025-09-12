'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { sendVerificationEmail, checkEmailVerification } from '../../lib/user-management';
import Image from 'next/image';

interface EmailVerificationProps {
  user: User;
  onVerificationComplete: () => void;
  onResendEmail: () => void;
}

export default function EmailVerification({ 
  user, 
  onVerificationComplete, 
  onResendEmail 
}: EmailVerificationProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');

  // Cooldown timer för att förhindra spam
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Kontrollera verifieringsstatus periodiskt
  useEffect(() => {
    const checkVerification = async () => {
      if (!user) return;
      
      setIsChecking(true);
      try {
        const isVerified = await checkEmailVerification(user);
        if (isVerified) {
          onVerificationComplete();
        }
      } catch (error) {
        console.error('Error checking verification:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Kontrollera direkt
    checkVerification();

    // Kontrollera var 5:e sekund
    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, [user, onVerificationComplete]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    setError('');
    
    try {
      await sendVerificationEmail(user);
      setResendCooldown(60); // 60 sekunders cooldown
      onResendEmail();
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      if (error.code === 'auth/too-many-requests') {
        setError('För många försök. Vänta en stund innan du försöker igen.');
        setResendCooldown(300); // 5 minuters cooldown vid för många försök
      } else {
        setError('Kunde inte skicka verifieringsmail. Försök igen senare.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="relative" style={{ minHeight: '100vh', overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.05)', background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))' }}>
      {/* Logo */}
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
          style={{ color: 'transparent' }}
        />
      </div>

      {/* Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)]" />
      
      <div className="w-full h-screen flex items-center justify-center px-4" style={{ zIndex: 10, position: 'relative', overflow: 'hidden', paddingTop: '80px' }}>
        <div className="w-full max-w-[500px]">
          <div className="rounded-3xl p-6 md:p-8 shadow-2xl bg-white/8 backdrop-blur-xl space-y-6" style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <svg 
                  width="32" 
                  height="32" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.9)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              
              <h1 className="text-white/95 text-2xl md:text-3xl font-semibold" style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Verifiera din e-postadress
              </h1>
              
              <p className="text-white/70 text-sm md:text-base leading-relaxed">
                Vi har skickat ett verifieringsmail till:
              </p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
                  <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <span className="text-white/90 font-medium">{user.email}</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <span className="text-blue-400 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">Kontrollera din e-post</p>
                  <p className="text-white/60 text-xs mt-1">Öppna din e-postklient och leta efter ett mail från Avanti</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <span className="text-blue-400 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">Klicka på verifieringslänken</p>
                  <p className="text-white/60 text-xs mt-1">Klicka på länken i mailet för att aktivera ditt konto</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <span className="text-blue-400 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">Kom tillbaka hit</p>
                  <p className="text-white/60 text-xs mt-1">Sidan uppdateras automatiskt när verifieringen är klar</p>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Resend button */}
            <div className="space-y-3">
              <button
                onClick={handleResendEmail}
                disabled={isResending || resendCooldown > 0}
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-300 focus:outline-none"
                style={{
                  background: resendCooldown > 0 
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: resendCooldown > 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.95)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {isResending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin"></div>
                    <span>Skickar...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>Skicka nytt mail ({resendCooldown}s)</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                    <span>Skicka nytt verifieringsmail</span>
                  </>
                )}
              </button>

              {/* Checking status */}
              {isChecking && (
                <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white/60 rounded-full animate-spin"></div>
                  <span>Kontrollerar verifieringsstatus...</span>
                </div>
              )}
            </div>

            {/* Help text */}
            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-white/50 text-xs">
                Hittar du inte mailet? Kontrollera skräppost-mappen eller{' '}
                <button 
                  onClick={handleResendEmail}
                  disabled={isResending || resendCooldown > 0}
                  className="text-white/70 hover:text-white/90 underline transition-colors"
                >
                  skicka ett nytt
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
