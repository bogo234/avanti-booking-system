'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Villkor() {
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
        padding: '8rem 3rem 3rem', 
        maxWidth: '900px', 
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
              Villkor
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
            Villkor &amp; Villkor
          </h1>
          <p style={{
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.75)',
            lineHeight: '1.6',
            fontWeight: '300',
            letterSpacing: '0.02em'
          }}>
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>
        </div>

        {/* Terms Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1 */}
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
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              1. Tjänstebeskrivning
            </h2>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              lineHeight: '1.5', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Avanti tillhandahåller designated driver-tjänster där våra chaufförer kör kundens egen bil. 
              Tjänsten är tillgänglig 24/7 och omfattar säker transport från upphämtningsplats till destination.
            </p>
            <ul style={{ 
              color: 'rgba(255, 255, 255, 0.75)', 
              lineHeight: '1.4',
              fontSize: '0.8rem',
              fontWeight: '300'
            }}>
              <li style={{ marginBottom: '0.25rem' }}>• Chauffören kör kundens egen bil</li>
              <li style={{ marginBottom: '0.25rem' }}>• Säker transport till önskad destination</li>
              <li style={{ marginBottom: '0.25rem' }}>• Professionell och diskret service</li>
              <li style={{ marginBottom: '0.25rem' }}>• Försäkring täcker alla resor</li>
            </ul>
          </div>

          {/* Section 2 */}
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
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              2. Bokning &amp; Betalning
            </h2>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              lineHeight: '1.5', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Bokningar görs via vår webbplats eller telefon. Betalning sker via kort eller faktura för företagskunder.
            </p>
            <ul style={{ 
              color: 'rgba(255, 255, 255, 0.75)', 
              lineHeight: '1.4',
              fontSize: '0.8rem',
              fontWeight: '300'
            }}>
              <li style={{ marginBottom: '0.25rem' }}>• Bokning minst 30 minuter i förväg</li>
              <li style={{ marginBottom: '0.25rem' }}>• Betalning via kort eller faktura</li>
              <li style={{ marginBottom: '0.25rem' }}>• Priser inkluderar alla avgifter</li>
              <li style={{ marginBottom: '0.25rem' }}>• Kvitton skickas automatiskt</li>
            </ul>
          </div>

          {/* Section 3 */}
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
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              3. Kundansvar
            </h2>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              lineHeight: '1.5', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Kunden ansvarar för att bilen är i körbart skick och att alla nödvändiga dokument finns tillgängliga.
            </p>
            <ul style={{ 
              color: 'rgba(255, 255, 255, 0.75)', 
              lineHeight: '1.4',
              fontSize: '0.8rem',
              fontWeight: '300'
            }}>
              <li style={{ marginBottom: '0.25rem' }}>• Bilen ska vara i körbart skick</li>
              <li style={{ marginBottom: '0.25rem' }}>• Registreringsbevis ska finnas</li>
              <li style={{ marginBottom: '0.25rem' }}>• Försäkring ska vara giltig</li>
              <li style={{ marginBottom: '0.25rem' }}>• Bränsle ska finnas tillgängligt</li>
            </ul>
          </div>

          {/* Section 4 */}
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
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              4. Avbokning &amp; Ändringar
            </h2>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              lineHeight: '1.5', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Avbokningar kan göras kostnadsfritt upp till 1 timme före avresan. Senare avbokningar kan medföra avgift.
            </p>
            <ul style={{ 
              color: 'rgba(255, 255, 255, 0.75)', 
              lineHeight: '1.4',
              fontSize: '0.8rem',
              fontWeight: '300'
            }}>
              <li style={{ marginBottom: '0.25rem' }}>• Gratis avbokning upp till 1 timme före</li>
              <li style={{ marginBottom: '0.25rem' }}>• 50% avgift vid senare avbokning</li>
              <li style={{ marginBottom: '0.25rem' }}>• 100% avgift vid no-show</li>
              <li style={{ marginBottom: '0.25rem' }}>• Ändringar kan göras via telefon</li>
            </ul>
          </div>

          {/* Section 5 */}
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
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              5. Säkerhet &amp; Försäkring
            </h2>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              lineHeight: '1.5', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Alla våra chaufförer är försäkrade och genomgår regelbundna säkerhetskontroller.
            </p>
            <ul style={{ 
              color: 'rgba(255, 255, 255, 0.75)', 
              lineHeight: '1.4',
              fontSize: '0.8rem',
              fontWeight: '300'
            }}>
              <li style={{ marginBottom: '0.25rem' }}>• Komplett försäkring för alla resor</li>
              <li style={{ marginBottom: '0.25rem' }}>• Säkerhetskontroller av chaufförer</li>
              <li style={{ marginBottom: '0.25rem' }}>• GPS-spårning av alla resor</li>
              <li style={{ marginBottom: '0.25rem' }}>• 24/7 kundsupport</li>
            </ul>
          </div>

          {/* Section 6 */}
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
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              6. Personuppgifter
            </h2>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              lineHeight: '1.5', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              Vi behandlar personuppgifter enligt GDPR. Se vår integritetspolicy för mer information.
            </p>
            <ul style={{ 
              color: 'rgba(255, 255, 255, 0.75)', 
              lineHeight: '1.4',
              fontSize: '0.8rem',
              fontWeight: '300'
            }}>
              <li style={{ marginBottom: '0.25rem' }}>• GDPR-kompatibel behandling</li>
              <li style={{ marginBottom: '0.25rem' }}>• Säker lagring av uppgifter</li>
              <li style={{ marginBottom: '0.25rem' }}>• Rätt att begära radering</li>
              <li style={{ marginBottom: '0.25rem' }}>• Ingen delning med tredje part</li>
            </ul>
          </div>

          {/* Section 7 */}
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
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '400',
              color: 'white',
              marginBottom: '1rem',
              letterSpacing: '0.02em'
            }}>
              7. Kontakt &amp; Support
            </h2>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              lineHeight: '1.5', 
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: '300'
            }}>
              För frågor eller klagomål, kontakta oss via telefon eller email.
            </p>
            <ul style={{ 
              color: 'rgba(255, 255, 255, 0.75)', 
              lineHeight: '1.4',
              fontSize: '0.8rem',
              fontWeight: '300'
            }}>
              <li style={{ marginBottom: '0.25rem' }}>• Telefon: +46 72 123 45 67</li>
              <li style={{ marginBottom: '0.25rem' }}>• Email: hello@avanti-app.se</li>
              <li style={{ marginBottom: '0.25rem' }}>• 24/7 kundsupport</li>
              <li style={{ marginBottom: '0.25rem' }}>• Svar inom 2 timmar</li>
            </ul>
          </div>
        </div>

        {/* Contact Section */}
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)',
          borderRadius: '1rem',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          backdropFilter: 'blur(20px)',
          marginTop: '2.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, transparent 100%)',
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
            Kontakta oss om du behöver hjälp eller har frågor om våra villkor
          </p>
          <Link href="/kontakt" style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.375rem',
            fontWeight: '400',
            fontSize: '0.8rem',
            transition: 'all 0.3s ease',
            border: '1px solid rgba(59, 130, 246, 0.3)',
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


