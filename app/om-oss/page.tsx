'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function OmOss() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
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
          <div style={{
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
              e.target.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              e.target.style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.9)';
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
              transition: 'all 0.2s ease',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              e.target.style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Villkor
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
              e.target.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              e.target.style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Om oss
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
              e.target.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              e.target.style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Kontakt
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
              e.target.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              e.target.style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.9)';
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
              e.target.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              e.target.style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.9)';
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
              e.target.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              e.target.style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Kakor
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
              e.target.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
              e.target.style.color = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            >
              Villkor
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        padding: '8rem 3rem 3rem', 
        maxWidth: '1000px', 
        margin: '0 auto',
        minHeight: '100vh'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '2rem',
            marginBottom: '2rem',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: '300'
            }}>
              Om oss
            </span>
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '200',
            color: 'white',
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em',
            lineHeight: '1.2'
          }}>
            Om Avanti
          </h1>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.75)',
            lineHeight: '1.6',
            fontWeight: '300',
            letterSpacing: '0.02em',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Vi är Sveriges ledande designated driver-tjänst, dedikerade till säker och pålitlig transport
          </p>
        </div>

        {/* Hero Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3rem',
          marginBottom: '4rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '300',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '-0.01em'
            }}>
              Vår Historia
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              fontWeight: '300'
            }}>
              Avanti grundades 2023 med en enkel vision: att göra det säkert och enkelt att komma hem 
              när du inte kan köra själv. Vi började i Stockholm och har nu expanderat till hela Sverige.
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              fontSize: '0.9rem',
              fontWeight: '300'
            }}>
              Idag är vi stolta över att ha hjälpt tusentals kunder att komma hem säkert, 
              och vi fortsätter att växa med fokus på kvalitet och säkerhet.
            </p>
          </div>

        </div>

        {/* Mission &amp; Values */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {/* Mission */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '0.75rem',
            padding: '1.75rem',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
              pointerEvents: 'none'
            }}></div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              Vårt Uppdrag
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.5',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Att erbjuda den säkraste och mest pålitliga designated driver-tjänsten i Sverige. 
              Vi tror att alla förtjänar att komma hem säkert, oavsett situation.
            </p>
          </div>

          {/* Values */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '0.75rem',
            padding: '1.75rem',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
              pointerEvents: 'none'
            }}></div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              Våra Värderingar
            </h3>
            <ul style={{ 
              color: 'rgba(255, 255, 255, 0.75)', 
              lineHeight: '1.4',
              fontSize: '0.8rem',
              fontWeight: '300'
            }}>
              <li style={{ marginBottom: '0.25rem' }}>• Säkerhet först</li>
              <li style={{ marginBottom: '0.25rem' }}>• Professionell service</li>
              <li style={{ marginBottom: '0.25rem' }}>• Kundfokus</li>
              <li style={{ marginBottom: '0.25rem' }}>• Innovation</li>
            </ul>
          </div>
        </div>

        {/* Stats Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '1rem',
          padding: '2rem',
          marginBottom: '3rem',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
            pointerEvents: 'none'
          }}></div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '300',
            color: 'white',
            marginBottom: '1.5rem',
            letterSpacing: '-0.01em'
          }}>
            Våra Siffror
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.5rem'
          }}>
            <div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: '300', 
                color: 'rgba(255, 255, 255, 0.9)', 
                marginBottom: '0.25rem' 
              }}>
                10,000+
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', fontWeight: '300' }}>Lyckade resor</div>
            </div>
            <div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: '300', 
                color: 'rgba(255, 255, 255, 0.9)', 
                marginBottom: '0.25rem' 
              }}>
                500+
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', fontWeight: '300' }}>Nöjda kunder</div>
            </div>
            <div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: '300', 
                color: 'rgba(255, 255, 255, 0.9)', 
                marginBottom: '0.25rem' 
              }}>
                50+
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', fontWeight: '300' }}>Certifierade chaufförer</div>
            </div>
            <div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: '300', 
                color: 'rgba(255, 255, 255, 0.9)', 
                marginBottom: '0.25rem' 
              }}>
                24/7
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', fontWeight: '300' }}>Tillgänglighet</div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '300',
            color: 'white',
            marginBottom: '1.5rem',
            textAlign: 'center',
            letterSpacing: '-0.01em'
          }}>
            Vårt Team
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Team Member 1 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '0.75rem',
              padding: '1.75rem',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                pointerEvents: 'none'
              }}></div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.25rem',
                letterSpacing: '0.02em'
              }}>
                Marcus Andersson
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '0.75rem',
                fontWeight: '400',
                fontSize: '0.8rem'
              }}>
                VD &amp; Grundare
              </p>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.5',
                fontSize: '0.8rem',
                fontWeight: '300'
              }}>
                Marcus har över 15 års erfarenhet inom transportbranschen och 
                grundade Avanti med visionen om säker transport för alla.
              </p>
            </div>

            {/* Team Member 2 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '0.75rem',
              padding: '1.75rem',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                pointerEvents: 'none'
              }}></div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.25rem',
                letterSpacing: '0.02em'
              }}>
                Anna Lindberg
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '0.75rem',
                fontWeight: '400',
                fontSize: '0.8rem'
              }}>
                Operativ Chef
              </p>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.5',
                fontSize: '0.8rem',
                fontWeight: '300'
              }}>
                Anna ansvarar för den dagliga verksamheten och säkerställer 
                att alla resor genomförs med högsta kvalitet och säkerhet.
              </p>
            </div>

            {/* Team Member 3 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '0.75rem',
              padding: '1.75rem',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
                pointerEvents: 'none'
              }}></div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.25rem',
                letterSpacing: '0.02em'
              }}>
                Erik Johansson
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '0.75rem',
                fontWeight: '400',
                fontSize: '0.8rem'
              }}>
                Teknisk Chef
              </p>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.5',
                fontSize: '0.8rem',
                fontWeight: '300'
              }}>
                Erik leder vårt tekniska team och säkerställer att vår plattform 
                fungerar smidigt för både kunder och chaufförer.
              </p>
            </div>
          </div>
        </div>


      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '2rem 3rem',
        marginTop: '3rem'
      }}>
        <div style={{
          maxWidth: '72rem',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem'
        }}>
          {/* Company Info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <p style={{
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}>
              Avanti
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              fontWeight: '300'
            }}>
              Vi kör hem din bil – tryggt, diskret och professionellt.
            </p>
          </div>

          {/* Contact Info */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <p style={{
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}>
              Kontakt
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
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
              fontSize: '0.85rem',
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
            gap: '0.5rem'
          }}>
            <p style={{
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              letterSpacing: '0.02em'
            }}>
              Företagsinfo
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Org.nr: 5590-0000
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Adress: Exempelgatan 1, 111 22 Stockholm
            </p>
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              marginTop: '0.75rem'
            }}>
              <Link href="/faq" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.8rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>FAQ</Link>
              <Link href="/integritet" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.8rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>Integritet</Link>
              <Link href="/kakor" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.8rem',
                transition: 'color 0.3s ease',
                fontWeight: '300'
              }}>Kakor</Link>
              <Link href="/villkor" style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                fontSize: '0.8rem',
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


