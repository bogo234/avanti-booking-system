'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Kakor() {
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
        padding: '6rem 1.5rem 3rem',
        maxWidth: '800px',
        margin: '0 auto',
        minHeight: '100vh'
      }}>
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '2rem',
            marginBottom: '1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{
              fontSize: '0.7rem',
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: '300'
            }}>Kakor</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(2rem, 6vw, 2.5rem)',
            fontWeight: '200',
            color: 'white',
            marginBottom: '1rem',
            letterSpacing: '-0.02em',
            lineHeight: '1.2'
          }}>
            Cookie-policy
          </h1>
          <p style={{
            fontSize: 'clamp(0.9rem, 3vw, 1rem)',
            color: 'rgba(255, 255, 255, 0.75)',
            lineHeight: '1.6',
            fontWeight: '300',
            letterSpacing: '0.02em',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Information om hur vi använder cookies på vår webbplats
          </p>
        </div>

        {/* Content Sections */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          {/* Section 1 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '0.75rem',
            padding: '2rem',
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
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              Vad är cookies?
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              fontSize: '0.9rem',
              fontWeight: '300'
            }}>
              Cookies är små textfiler som lagras på din enhet när du besöker vår webbplats. De hjälper oss att förbättra din upplevelse och webbplatsens funktionalitet.
            </p>
          </div>

          {/* Section 2 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '0.75rem',
            padding: '2rem',
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
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              Vilka cookies använder vi?
            </h2>
            <div style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              fontSize: '0.9rem',
              fontWeight: '300'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.75rem',
                marginTop: '1.5rem'
              }}>
                Nödvändiga cookies
              </h3>
              <p style={{ marginBottom: '1rem' }}>
                Dessa cookies är essentiella för att webbplatsen ska fungera korrekt. De kan inte stängas av och inkluderar cookies för säkerhet och grundläggande funktionalitet.
              </p>
              
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.75rem',
                marginTop: '1.5rem'
              }}>
                Prestanda-cookies
              </h3>
              <p style={{ marginBottom: '1rem' }}>
                Hjälper oss att förstå hur besökare interagerar med webbplatsen genom att samla in information anonymt. Detta hjälper oss att förbättra webbplatsens prestanda.
              </p>
              
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '400',
                color: 'white',
                marginBottom: '0.75rem',
                marginTop: '1.5rem'
              }}>
                Funktionalitets-cookies
              </h3>
              <p>
                Låter webbplatsen komma ihåg dina val och ge förbättrade funktioner. Dessa cookies kan inkludera språkval och regioninställningar.
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '0.75rem',
            padding: '2rem',
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
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              Hantera cookies
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              fontSize: '0.9rem',
              fontWeight: '300',
              marginBottom: '1rem'
            }}>
              Du kan hantera cookies genom din webbläsares inställningar. Observera att om du stänger av vissa cookies kan det påverka webbplatsens funktionalitet.
            </p>
            <div style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem',
              fontWeight: '300'
            }}>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Chrome:</strong> Inställningar &gt; Avancerat &gt; Sekretess och säkerhet &gt; Cookies
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Safari:</strong> Inställningar &gt; Sekretess &gt; Hantera webbplatsdata
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Firefox:</strong> Inställningar &gt; Sekretess och säkerhet &gt; Cookies
              </p>
              <p>
                <strong>Edge:</strong> Inställningar &gt; Cookies och webbplatsbehörigheter
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '0.75rem',
            padding: '2rem',
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
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              Tredjepartscookies
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              fontSize: '0.9rem',
              fontWeight: '300',
              marginBottom: '1rem'
            }}>
              Vi kan använda tjänster från tredje part som också placerar cookies på din enhet. Dessa inkluderar:
            </p>
            <ul style={{
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              fontSize: '0.9rem',
              fontWeight: '300',
              paddingLeft: '1.5rem'
            }}>
              <li style={{ marginBottom: '0.5rem' }}>Analysverktyg för att förbättra webbplatsen</li>
              <li style={{ marginBottom: '0.5rem' }}>Betalningsprocessorer för säkra transaktioner</li>
              <li style={{ marginBottom: '0.5rem' }}>Karttjänster för lokalisering</li>
              <li style={{ marginBottom: '0.5rem' }}>Sociala medier för delning</li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden',
          marginTop: '3rem'
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
            marginBottom: '0.75rem',
            letterSpacing: '-0.01em'
          }}>
            Har du frågor?
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            fontWeight: '300'
          }}>
            Kontakta oss för mer information om vår cookie-policy
          </p>
          <Link href="/kontakt" style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.375rem',
            fontWeight: '400',
            fontSize: '0.8rem',
            transition: 'all 0.3s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            Kontakta Oss
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '1.5rem 1.5rem',
        marginTop: '3rem'
      }}>
        <div style={{
          maxWidth: '72rem',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
          </div>
        </div>
      </footer>
    </div>
  );
}
