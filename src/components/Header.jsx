import { useEffect, useState } from 'react';
import { Bookmark, Menu, X } from 'lucide-react';
import Brand from './Brand';

const navItems = [
  ['Plans & Products', 'products'],
  ['Compare', 'compare'],
  ['Eligibility', 'eligibility'],
  ['How It Works', 'how-it-works'],
  ['Help', 'resources'],
];

export default function Header({ onQuote, onSaved, onNavigate, page }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const handleScroll = () => setCompact(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goTo = (id) => {
    onNavigate(id);
    setMenuOpen(false);
  };

  return (
    <header className={`site-header ${compact ? 'site-header--compact' : ''}`}>
      <div className="site-header__inner page-shell">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map(([label, id]) => (
            <button key={id} className={page === id ? 'is-active' : ''} type="button" onClick={() => goTo(id)}>{label}</button>
          ))}
          <button className="nav-saved" type="button" onClick={onSaved}>
            <Bookmark size={17} strokeWidth={1.9} /> Resume Request
          </button>
        </nav>
        <button className="button button--primary header-cta" type="button" onClick={() => onQuote()}>
          Check My Vehicle
        </button>
        <button
          className="menu-button"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      {menuOpen && (
        <div className="mobile-nav">
          {navItems.map(([label, id]) => (
            <button key={id} className={page === id ? 'is-active' : ''} type="button" onClick={() => goTo(id)}>{label}</button>
          ))}
          <button type="button" onClick={() => { setMenuOpen(false); onSaved(); }}>Resume Request</button>
          <button className="button button--primary" type="button" onClick={() => { setMenuOpen(false); onQuote(); }}>
            Check My Vehicle
          </button>
        </div>
      )}
    </header>
  );
}
