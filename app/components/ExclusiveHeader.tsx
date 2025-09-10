import Image from 'next/image';
import Link from 'next/link';

export default function ExclusiveHeader() {
  return (
    <header className="exclusive-header">
      <div className="header-container">
        {/* Logo */}
        <div className="logo-section">
          <Image 
            src="/avanti-logo.svg" 
            alt="Avanti" 
            width={140} 
            height={40} 
            priority
            className="logo"
          />
          <span className="brand-tagline">Premium Transport</span>
        </div>
        
        {/* Navigation */}
        <nav className="exclusive-nav">
          <Link href="/tjanster" className="nav-link">Tjänster</Link>
          <Link href="/priser" className="nav-link">Priser</Link>
          <Link href="/om-oss" className="nav-link">Om oss</Link>
          <Link href="/kontakt" className="nav-link">Kontakt</Link>
        </nav>

        {/* User Actions */}
        <div className="user-actions">
          <button className="action-btn secondary">
            Logga in
          </button>
          <button className="action-btn primary">
            Registrera
          </button>
        </div>
      </div>
    </header>
  );
}




