'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Inter } from 'next/font/google';
import GooglePlacesAutocomplete from './components/GooglePlacesAutocomplete';
import { useAuth } from './contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuItemsVisible, setMenuItemsVisible] = useState<boolean[]>([]);
  const [menuSectionsVisible, setMenuSectionsVisible] = useState<boolean[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user, userRole, logout } = useAuth();

  // Start video as early as possible
  useEffect(() => {
    // Try to start video immediately when component is created
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          // Retry if failed
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play().catch(console.log);
            }
          }, 100);
        });
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle user interaction to enable autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(console.log);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(console.log);
      }
    };

    // Listen for any user interaction
    const events = ['click', 'touchstart', 'keydown', 'mousemove', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Function to ensure video always plays
  const ensureVideoPlaying = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      if (video.paused || video.ended) {
        video.play().catch(error => {
          console.log('Video play failed:', error);
          // Retry after a short delay
          setTimeout(() => {
            video.play().catch(console.log);
          }, 100);
        });
      }
    }
  };

  // Handle video events
  const handleVideoLoad = () => {
    ensureVideoPlaying();
  };

  // Start video immediately when ref is available
  const handleVideoRef = (video: HTMLVideoElement | null) => {
    if (video) {
      videoRef.current = video;
      // Try to start immediately
      video.play().catch(() => {
        // If autoplay fails, try again multiple times
        setTimeout(() => video.play().catch(console.log), 50);
        setTimeout(() => video.play().catch(console.log), 200);
        setTimeout(() => video.play().catch(console.log), 500);
      });
    }
  };

  const handleVideoPause = () => {
    // Immediately restart if paused
    setTimeout(ensureVideoPlaying, 50);
  };

  const handleVideoEnded = () => {
    // Restart video when it ends
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      ensureVideoPlaying();
    }
  };

  // Effect to ensure video always plays - start immediately
  useEffect(() => {
    // Start video immediately when component mounts
    const startVideo = () => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          // If autoplay fails, try again after a short delay
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play().catch(console.log);
            }
          }, 100);
        });
      }
    };
    
    // Start immediately
    startVideo();
    
    // Also start when video is ready
    if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', startVideo);
      videoRef.current.addEventListener('canplay', startVideo);
    }
    
    // Set up interval to check video status every 1 second (more frequent)
    const videoCheckInterval = setInterval(ensureVideoPlaying, 1000);
    
    // Cleanup
    return () => {
      clearInterval(videoCheckInterval);
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadeddata', startVideo);
        videoRef.current.removeEventListener('canplay', startVideo);
      }
    };
  }, []);

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
    if (!isMenuOpen) {
      setIsMenuOpen(true);
      // Start domino animation for menu sections (fällkniv-effekt)
      const menuItems = [
        'hem', 'driver', 'customer', 'faq', 
        'integritet', 'kakor', 'kontakt', 'om-oss', 'tjanster', 'villkor'
      ];
      if (!user) menuItems.push('auth'); // Add login button if not logged in
      if (user && userRole === 'admin') menuItems.push('admin'); // Add admin button if admin
      if (user) menuItems.push('logout'); // Add logout button if logged in
      
      // Initialize all sections as hidden
      setMenuSectionsVisible(new Array(menuItems.length).fill(false));
      setMenuItemsVisible(new Array(menuItems.length).fill(false));
      
      // Create fällkniv effect - each section appears with domino timing
      menuItems.forEach((_, index) => {
        setTimeout(() => {
          setMenuSectionsVisible(prev => {
            const newState = [...prev];
            newState[index] = true;
            return newState;
          });
          
          // Show the actual menu item with a slight delay after section appears
          setTimeout(() => {
            setMenuItemsVisible(prev => {
              const newState = [...prev];
              newState[index] = true;
              return newState;
            });
          }, 200); // Original delay after section appears
        }, index * 80); // Original 80ms delay between each item
      });
    } else {
      // Close menu immediately without animation
      setIsMenuOpen(false);
      setMenuItemsVisible([]);
      setMenuSectionsVisible([]);
    }
  };

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Add a small delay to prevent conflicts with button clicks
      setTimeout(() => {
        const target = event.target as Node;
        const isMenuClick = menuRef.current && menuRef.current.contains(target);
        const isButtonClick = buttonRef.current && buttonRef.current.contains(target);
        
        if (!isMenuClick && !isButtonClick && isMenuOpen) {
          // Close menu immediately without animation
          setIsMenuOpen(false);
          setMenuItemsVisible([]);
          setMenuSectionsVisible([]);
        }
      }, 10);
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
    <>
      <style jsx global>{`
        /* Prevent scrolling on the entire page */
        html, body {
          overflow: hidden;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        
        /* Custom scrollbar styling for dropdown menu */
        .dropdown-menu::-webkit-scrollbar {
          width: 6px;
        }
        
        .dropdown-menu::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 3px;
        }
        
        .dropdown-menu::-webkit-scrollbar-thumb {
          background: rgba(79, 195, 247, 0.3);
          border-radius: 3px;
          transition: background 0.3s ease;
        }
        
        .dropdown-menu::-webkit-scrollbar-thumb:hover {
          background: rgba(79, 195, 247, 0.5);
        }
        
        /* Smooth scrolling and ensure proper display */
        .dropdown-menu {
          scroll-behavior: smooth;
          display: block !important;
          position: absolute !important;
          z-index: 9999 !important;
        }
        
        /* Ensure menu items are visible */
        .dropdown-menu a {
          display: block !important;
          color: rgba(255, 255, 255, 0.9) !important;
          text-decoration: none !important;
          padding: 0.75rem 1rem !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          transition: all 0.2s ease !important;
        }
        
        .dropdown-menu a:hover {
          background-color: rgba(79, 195, 247, 0.1) !important;
          color: rgba(255, 255, 255, 1) !important;
        }
        
        /* Enhanced domino animation for menu items */
        .menu-item {
          opacity: 0;
          transform: translateX(20px) scale(0.95);
          transition: all 1.0s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          filter: blur(2px);
          text-align: left;
        }
        
        .menu-item.visible {
          opacity: 1;
          transform: translateX(0) scale(1);
          filter: blur(0px);
        }
        
        /* Fällkniv effect for menu sections */
        .menu-section {
          opacity: 0;
          transform: translateX(50%) scaleY(0);
          transform-origin: center center;
          transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: hidden;
        }
        
        .menu-section.visible {
          opacity: 1;
          transform: translateX(0) scaleY(1);
        }
        
        /* Staggered animation delays for each menu item - 80ms intervals */
        .menu-item:nth-child(1).visible { animation-delay: 0ms; }
        .menu-item:nth-child(2).visible { animation-delay: 80ms; }
        .menu-item:nth-child(3).visible { animation-delay: 160ms; }
        .menu-item:nth-child(4).visible { animation-delay: 240ms; }
        .menu-item:nth-child(5).visible { animation-delay: 320ms; }
        .menu-item:nth-child(6).visible { animation-delay: 400ms; }
        .menu-item:nth-child(7).visible { animation-delay: 480ms; }
        .menu-item:nth-child(8).visible { animation-delay: 560ms; }
        .menu-item:nth-child(9).visible { animation-delay: 640ms; }
        .menu-item:nth-child(10).visible { animation-delay: 720ms; }
        .menu-item:nth-child(11).visible { animation-delay: 800ms; }
        .menu-item:nth-child(12).visible { animation-delay: 880ms; }
        .menu-item:nth-child(13).visible { animation-delay: 960ms; }
      `}</style>
      <div style={{
        height: '100vh',
        backgroundColor: 'black',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
      {/* Background Video - Now covers entire page */}
      <video
        ref={handleVideoRef}
        autoPlay
        muted
        loop
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        onLoadStart={handleVideoLoad}
        onLoadedData={handleVideoLoad}
        onCanPlay={handleVideoLoad}
        onCanPlayThrough={handleVideoLoad}
        onPause={handleVideoPause}
        onEnded={handleVideoEnded}
        onError={handleVideoLoad}
        onStalled={handleVideoLoad}
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
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Image
              src="/avanti-logo.svg"
              alt="Avanti"
              width={120}
              height={35}
              priority
              style={{
                color: 'transparent',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.opacity = '1';
              }}
            />
          </Link>
        </div>

        {/* Hamburger Menu */}
        <div style={{ position: 'relative' }}>
          <button
            ref={buttonRef}
            onClick={toggleMenu}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              borderRadius: '0.5rem',
              position: 'relative',
              width: '44px',
              height: '44px',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget;
              target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget;
              target.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{
              width: '18px',
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '0.5px',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: isMenuOpen ? 'rotate(45deg) translate(3px, 3px)' : 'none',
              transformOrigin: 'center'
            }} />
            <div style={{
              width: '18px',
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '0.5px',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              opacity: isMenuOpen ? 0 : 1,
              transform: isMenuOpen ? 'scaleX(0)' : 'scaleX(1)'
            }} />
            <div style={{
              width: '18px',
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '0.5px',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: isMenuOpen ? 'rotate(-45deg) translate(3px, -3px)' : 'none',
              transformOrigin: 'center'
            }} />
          </button>

          {/* Dropdown Menu */}
          <div 
            ref={menuRef}
            className="dropdown-menu"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: 'rgba(0, 0, 0, 0.98)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '0.75rem',
              padding: '0.75rem 0',
              minWidth: '200px',
              maxWidth: '280px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
              textAlign: 'left',
              maxHeight: '70vh',
              overflowY: 'auto',
              opacity: isMenuOpen ? 1 : 0,
              visibility: isMenuOpen ? 'visible' : 'hidden',
              transform: isMenuOpen ? 'translateY(0) scale(1) rotateX(0deg)' : 'translateY(-12px) scale(0.95) rotateX(-10deg)',
              transition: 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              zIndex: 1001,
              marginTop: '0.5rem',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(79, 195, 247, 0.3) transparent'
            }}>
            <div className={`menu-section ${menuSectionsVisible[0] ? 'visible' : ''}`}>
              <Link 
                href="/" 
                className={`menu-item ${menuItemsVisible[0] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                Hem
              </Link>
            </div>
            <div className={`menu-section ${menuSectionsVisible[1] ? 'visible' : ''}`}>
              <Link 
                href="/driver" 
                className={`menu-item ${menuItemsVisible[1] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                Förare
              </Link>
            </div>
            <div className={`menu-section ${menuSectionsVisible[2] ? 'visible' : ''}`}>
              <Link 
                href="/customer" 
                className={`menu-item ${menuItemsVisible[2] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                Kund
              </Link>
            </div>
            {!user && (
              <div className={`menu-section ${menuSectionsVisible[3] ? 'visible' : ''}`}>
                <Link 
                  href="/auth" 
                  className={`menu-item ${menuItemsVisible[3] ? 'visible' : ''}`}
                  style={{
                  display: 'block',
                  padding: '1rem 1.25rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  letterSpacing: '0.025em',
                  transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  position: 'relative'
                }}
                onClick={() => setIsMenuOpen(false)}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                  (e.target as HTMLElement).style.paddingLeft = '1.75rem';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                  (e.target as HTMLElement).style.paddingLeft = '1.5rem';
                }}
                >
                  Logga in
                </Link>
              </div>
            )}
            <div className={`menu-section ${menuSectionsVisible[4] ? 'visible' : ''}`}>
              <Link 
                href="/faq" 
                className={`menu-item ${menuItemsVisible[4] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                FAQ
              </Link>
            </div>
            <div className={`menu-section ${menuSectionsVisible[5] ? 'visible' : ''}`}>
              <Link 
                href="/integritet" 
                className={`menu-item ${menuItemsVisible[5] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                Integritet
              </Link>
            </div>
            <div className={`menu-section ${menuSectionsVisible[6] ? 'visible' : ''}`}>
              <Link 
                href="/kakor" 
                className={`menu-item ${menuItemsVisible[6] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                Kakor
              </Link>
            </div>
            <div className={`menu-section ${menuSectionsVisible[7] ? 'visible' : ''}`}>
              <Link 
                href="/kontakt" 
                className={`menu-item ${menuItemsVisible[7] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                Kontakt
              </Link>
            </div>
            <div className={`menu-section ${menuSectionsVisible[8] ? 'visible' : ''}`}>
              <Link 
                href="/om-oss" 
                className={`menu-item ${menuItemsVisible[8] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                Om oss
              </Link>
            </div>
            <div className={`menu-section ${menuSectionsVisible[9] ? 'visible' : ''}`}>
              <Link 
                href="/tjanster" 
                className={`menu-item ${menuItemsVisible[9] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                Tjänster
              </Link>
            </div>
            <div className={`menu-section ${menuSectionsVisible[10] ? 'visible' : ''}`}>
              <Link 
                href="/villkor" 
                className={`menu-item ${menuItemsVisible[10] ? 'visible' : ''}`}
                style={{
                display: 'block',
                padding: '1rem 1.25rem',
                color: 'rgba(255, 255, 255, 0.85)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '400',
                letterSpacing: '0.025em',
                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                position: 'relative'
              }}
              onClick={() => setIsMenuOpen(false)}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                (e.target as HTMLElement).style.paddingLeft = '1.75rem';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                (e.target as HTMLElement).style.paddingLeft = '1.5rem';
              }}
              >
                Villkor
              </Link>
            </div>
            {user && userRole === 'admin' && (
              <div className={`menu-section ${menuSectionsVisible[10] ? 'visible' : ''}`}>
                <Link 
                  href="/admin" 
                  className={`menu-item ${menuItemsVisible[10] ? 'visible' : ''}`}
                  style={{
                  display: 'block',
                  padding: '1rem 1.25rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  letterSpacing: '0.025em',
                  transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  position: 'relative'
                }}
                onClick={() => setIsMenuOpen(false)}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                  (e.target as HTMLElement).style.paddingLeft = '1.75rem';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.85)';
                  (e.target as HTMLElement).style.paddingLeft = '1.5rem';
                }}
                >
                  Admin Panel
                </Link>
              </div>
            )}
            {user && (
              <div className={`menu-section ${menuSectionsVisible[userRole === 'admin' ? 12 : 11] ? 'visible' : ''}`}>
                <button
                  className={`menu-item ${menuItemsVisible[userRole === 'admin' ? 12 : 11] ? 'visible' : ''}`}
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  style={{
                  display: 'block',
                  width: '100%',
                  padding: '1rem 1.25rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.875rem',
                  fontWeight: '400',
                  letterSpacing: '0.025em',
                  transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  target.style.color = 'rgba(255, 255, 255, 1)';
                  target.style.paddingLeft = '1.75rem';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = 'transparent';
                  target.style.color = 'rgba(255, 255, 255, 0.85)';
                  target.style.paddingLeft = '1.5rem';
                }}
                  >
                    Logga ut
                  </button>
              </div>
            )}
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
                outline: 'none',
                border: 'none',
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
    </>
  );
}
