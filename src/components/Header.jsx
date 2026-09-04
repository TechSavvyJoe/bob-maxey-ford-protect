import { useEffect, useRef, useState } from 'react';
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
  const [crowded, setCrowded] = useState(false);
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    const header = headerRef.current;
    const inner = header?.querySelector('.site-header__inner');
    const nav = header?.querySelector('.desktop-nav');
    const brand = header?.querySelector('.brand');
    const cta = header?.querySelector('.header-cta');
    if (!inner || !nav || !brand || !cta) return undefined;
    const measure = () => {
      if (window.innerWidth <= 1100) {
        setCrowded(false);
        return;
      }
      const gap = parseFloat(getComputedStyle(inner).columnGap) || 0;
      const required = nav.scrollWidth + brand.getBoundingClientRect().width + cta.scrollWidth + gap * 2;
      const needsMenu = required > inner.clientWidth - 4;
      setCrowded(needsMenu);
      if (!needsMenu) setMenuOpen(false);
    };
    const observer = new ResizeObserver(measure);
    [inner, nav, brand, cta].forEach((element) => observer.observe(element));
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

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
    <header ref={headerRef} className={`site-header ${compact ? 'site-header--compact' : ''}${crowded ? ' site-header--crowded' : ''}`}>
      <div className="site-header__inner page-shell">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary navigation" aria-hidden={crowded || undefined} inert={crowded || undefined}>
          {navItems.map(([label, id]) => (
            <button key={id} className={page === id ? 'is-active' : ''} aria-current={page === id ? 'page' : undefined} type="button" onClick={() => goTo(id)}>{label}</button>
          ))}
          <button className="nav-saved" type="button" onClick={onSaved}>
            <Bookmark size={17} strokeWidth={1.9} /> Resume request
          </button>
        </nav>
        <button className="button button--primary header-cta" type="button" onClick={() => onQuote()}>
          Check my vehicle
        </button>
        <button
          className="menu-button"
          ref={menuButtonRef}
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-primary-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      {menuOpen && (
        <nav id="mobile-primary-navigation" className="mobile-nav" aria-label="Mobile primary navigation">
          {navItems.map(([label, id]) => (
            <button key={id} className={page === id ? 'is-active' : ''} aria-current={page === id ? 'page' : undefined} type="button" onClick={() => goTo(id)}>{label}</button>
          ))}
          <button type="button" onClick={() => { setMenuOpen(false); onSaved(); }}>Resume request</button>
          <button className="button button--primary" type="button" onClick={() => { setMenuOpen(false); onQuote(); }}>
            Check my vehicle
          </button>
        </nav>
      )}
    </header>
  );
}
