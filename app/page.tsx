'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Inter } from 'next/font/google';
import GooglePlacesAutocomplete from './components/GooglePlacesAutocomplete';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleBooking = () => {
    // Skicka adressdata via URL parameters
    const params = new URLSearchParams();
    if (pickupLocation.trim()) {
      params.set('pickup', encodeURIComponent(pickupLocation.trim()));
    }
    if (destination.trim()) {
      params.set('destination', encodeURIComponent(destination.trim()));
    }
    
    const url = params.toString() ? `/booking?${params.toString()}` : '/booking';
    window.location.href = url;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = e.currentTarget;
    target.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
    target.style.color = 'rgba(255, 255, 255, 1)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = e.currentTarget;
    target.style.backgroundColor = 'transparent';
    target.style.color = 'rgba(255, 255, 255, 0.9)';
  };

  return (
    <div style={{
      height: '100vh',
      backgroundColor: 'black',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden !important',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Background Video - Now covers entire page */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0
        }}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay for better text readability */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 1
      }} />

      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(30px)',
        borderBottom: '2px solid',
        borderImage: 'linear-gradient(to right, rgba(79, 195, 247, 0.3), rgba(79, 195, 247, 0.1), transparent) 1',
        boxShadow: '0 4px 20px rgba(79, 195, 247, 0.15), 0 2px 10px rgba(0, 0, 0, 0.3)',
        animation: 'headerPulse 3s ease-in-out infinite',
        zIndex: 1000
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
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

        {/* Hamburger Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleMenu}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: '0.375rem',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget;
              target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget;
              target.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{
              width: '20px',
              height: '1.5px',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '1px',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isMenuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none',
              transformOrigin: 'center'
            }} />
            <div style={{
              width: '20px',
              height: '1.5px',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '1px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: isMenuOpen ? 0 : 1,
              transform: isMenuOpen ? 'scaleX(0)' : 'scaleX(1)'
            }} />
            <div style={{
              width: '20px',
              height: '1.5px',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '1px',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isMenuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none',
              transformOrigin: 'center'
            }} />
          </button>

          {/* Dropdown Menu */}
          <div 
            ref={menuRef}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(79, 195, 247, 0.2)',
              borderRadius: '0.5rem',
              padding: '0.5rem 0',
              minWidth: '160px',
              opacity: isMenuOpen ? 1 : 0,
              visibility: isMenuOpen ? 'visible' : 'hidden',
              transform: isMenuOpen ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              zIndex: 1001
            }}>
            <Link href="/booking" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Boka resa
            </Link>
            <Link href="/driver" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Förare
            </Link>
            <Link href="/customer" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Kund
            </Link>
            <Link href="/auth" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Logga in
            </Link>
            <Link href="/faq" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              FAQ
            </Link>
            <Link href="/integritet" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Integritet
            </Link>
            <Link href="/kakor" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Kakor
            </Link>
            <Link href="/kontakt" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Kontakt
            </Link>
            <Link href="/om-oss" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Om oss
            </Link>
            <Link href="/tjanster" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Tjänster
            </Link>
            <Link href="/villkor" style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '300',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Villkor
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        position: 'relative',
        zIndex: 2,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: '120px',
        paddingBottom: '0',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem'
      }}>
        {/* Content Container */}
        <div style={{ 
          width: '100%',
          maxWidth: '380px',
          margin: '0 auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%'
        }}>
          {/* Hero Section */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem'
          }}>
            <div style={{ 
              width: '100%',
              textAlign: 'center'
            }}>
              <h1 style={{
                fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                fontWeight: '200',
                color: 'white',
                marginBottom: '0.25rem',
                lineHeight: '1.1',
                letterSpacing: '0.03em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0',
                textAlign: 'center',
                marginLeft: '3.5rem',
                fontFamily: inter.style.fontFamily
              }}>
                <span style={{ marginRight: '0' }}>Välkommen till</span>
                <Image
                  src="/avanti-logo.svg"
                  alt="Avanti"
                  width={140}
                  height={42}
                  style={{
                    opacity: 0.9,
                    marginLeft: '-1rem'
                  }}
                />
              </h1>
              <p style={{
                fontSize: 'clamp(0.85rem, 3.5vw, 1rem)',
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '0.5rem',
                lineHeight: '1.5',
                fontWeight: '300',
                letterSpacing: '0.04em',
                textAlign: 'center'
              }}>
                Din bil. Din resa. Vår körning
              </p>

              {/* Booking Interface */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.75rem',
                maxWidth: '320px',
                margin: '0 auto 1rem'
              }}>
                <div>
                  <label style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.75rem',
                    marginBottom: '0.25rem',
                    display: 'block',
                    fontWeight: '400',
                    letterSpacing: '0.025em'
                  }}>
                    Från
                  </label>
                  <GooglePlacesAutocomplete
                    value={pickupLocation}
                    onChange={setPickupLocation}
                    placeholder="Ange vart bilen hämtas"
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      fontWeight: '300',
                      letterSpacing: '0.02em',
                      transition: 'all 0.3s ease',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.75rem',
                    marginBottom: '0.25rem',
                    display: 'block',
                    fontWeight: '400',
                    letterSpacing: '0.025em'
                  }}>
                    Till
                  </label>
                  <GooglePlacesAutocomplete
                    value={destination}
                    onChange={setDestination}
                    placeholder="Ange vart bilen lämnas"
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      fontWeight: '300',
                      letterSpacing: '0.02em',
                      transition: 'all 0.3s ease',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </div>

                <button
                  onClick={handleBooking}
                  style={{
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(90deg, rgba(79, 195, 247, 0.8) 0%, rgba(79, 195, 247, 0.9) 100%)',
                    border: '1px solid rgba(79, 195, 247, 0.3)',
                    borderRadius: '0.375rem',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '400',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.025em',
                    marginTop: '0.5rem',
                    boxShadow: '0 2px 8px rgba(79, 195, 247, 0.2)',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    minHeight: '44px'
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.background = 'linear-gradient(90deg, rgba(79, 195, 247, 0.9) 0%, rgba(79, 195, 247, 1) 100%)';
                    target.style.borderColor = 'rgba(79, 195, 247, 0.5)';
                    target.style.transform = 'translateY(-1px)';
                    target.style.boxShadow = '0 4px 12px rgba(79, 195, 247, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.background = 'linear-gradient(90deg, rgba(79, 195, 247, 0.8) 0%, rgba(79, 195, 247, 0.9) 100%)';
                    target.style.borderColor = 'rgba(79, 195, 247, 0.3)';
                    target.style.transform = 'translateY(0)';
                    target.style.boxShadow = '0 2px 8px rgba(79, 195, 247, 0.2)';
                  }}
                >
                  Boka en resa
                </button>
              </div>

              {/* Features Section */}
              <div style={{
                marginBottom: '1rem'
              }}>
                <h2 style={{
                  fontSize: 'clamp(0.85rem, 3vw, 0.95rem)',
                  fontWeight: '400',
                  color: 'white',
                  marginBottom: '0.5rem',
                  letterSpacing: '0.025em'
                }}>
                  Pålitliga förare
                </h2>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.5rem',
                    width: '100%',
                    maxWidth: '200px'
                  }}>
                    <span style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.75rem',
                      minWidth: '12px'
                    }}>✓</span>
                    <span style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.7rem',
                      fontWeight: '300'
                    }}>Välutbildade</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.5rem',
                    width: '100%',
                    maxWidth: '200px'
                  }}>
                    <span style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.75rem',
                      minWidth: '12px'
                    }}>✓</span>
                    <span style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.7rem',
                      fontWeight: '300'
                    }}>Kör med hög säkerhet</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.5rem',
                    width: '100%',
                    maxWidth: '200px'
                  }}>
                    <span style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.75rem',
                      minWidth: '12px'
                    }}>✓</span>
                    <span style={{ 
                      color: 'rgba(255, 255, 255, 0.8)', 
                      fontSize: '0.7rem',
                      fontWeight: '300'
                    }}>Skatt och besiktad bil</span>
                  </div>
                </div>
                
                <Link href="/kontakt" style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  textDecoration: 'none',
                  fontSize: '0.7rem',
                  fontWeight: '300',
                  letterSpacing: '0.025em',
                  marginTop: '0.75rem',
                  display: 'block'
                }}>
                  Kontakta oss
                </Link>
              </div>

              {/* BankID Section */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.75rem'
              }}>
                <span style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.7rem',
                  fontWeight: '300',
                  letterSpacing: '0.025em'
                }}>
                  Avtal med Bank ID
                </span>
                <Image
                  src="/bankid-logo.svg"
                  alt="BankID"
                  width={20}
                  height={20}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0.75rem 1.5rem',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '72rem',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {/* Company Info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <p style={{
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: '500'
            }}>
              Avanti
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem',
              lineHeight: '1.4',
              fontWeight: '300'
            }}>
              Vi kör hem din bil – tryggt, diskret och professionellt.
            </p>
          </div>

          {/* Contact Info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <p style={{
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: '500'
            }}>
              Kontakt
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem',
              fontWeight: '300'
            }}>
              Telefon: <a href="tel:+46721234567" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                transition: 'color 0.3s ease'
              }}>+46 72 123 45 67</a>
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem',
              fontWeight: '300'
            }}>
              E‑post: <a href="mailto:hello@avanti-app.se" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                transition: 'color 0.3s ease'
              }}>hello@avanti-app.se</a>
            </p>
          </div>

          {/* Company Details */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <p style={{
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: '500'
            }}>
              Företagsinfo
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem',
              fontWeight: '300'
            }}>
              Org.nr: 5590-0000
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem',
              fontWeight: '300'
            }}>
              Adress: Exempelgatan 1, 111 22 Stockholm
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <Link href="/faq" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.7rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>FAQ</Link>
              <Link href="/integritet" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.7rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>Integritet</Link>
              <Link href="/kakor" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.7rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>Kakor</Link>
              <Link href="/villkor" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.7rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>Villkor</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
