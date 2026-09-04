import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import Header from './components/Header';
import Hero from './components/Hero';
import HomeOverview from './components/HomeOverview';
import Journey from './components/Journey';
import PlanExplorer from './components/PlanExplorer';
import ProductLibrary from './components/ProductLibrary';
import ProductDetail from './components/ProductDetail';
import EligibilityHub from './components/EligibilityHub';
import FaqSection from './components/FaqSection';
import QuoteStudio from './components/QuoteStudio';
import TrustFooter from './components/TrustFooter';
import { ContactPanel, ResourcePanel, SavedQuotes } from './components/UtilityModal';
import { hiddenCustomerProductIds, productCategories } from './data';
import { appPathname, appUrl } from './paths';
import { routeAnnouncement, routeDocumentTitle } from './routeAccessibility';

const validPages = ['home', 'products', 'compare', 'eligibility', 'how-it-works', 'resources'];
const hiddenCustomerProductIdSet = new Set(hiddenCustomerProductIds);
const availableProducts = productCategories
  .flatMap((category) => category.products)
  .filter((product) => !hiddenCustomerProductIdSet.has(product.id));
const availableProductIds = new Set(availableProducts.map((product) => product.id));
const availableProductById = new Map(availableProducts.map((product) => [product.id, product]));
const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
const skipLinkStyle = {
  position: 'fixed',
  zIndex: 10000,
  top: '12px',
  left: '12px',
  padding: '12px 16px',
  border: '2px solid #0068d9',
  borderRadius: '4px',
  background: '#ffffff',
  color: '#001f49',
  fontWeight: 800,
  textDecoration: 'none',
  transform: 'translateY(-160%)',
};
const pageFromPath = () => {
  const slug = appPathname().split('/').filter(Boolean)[0] || 'home';
  return validPages.includes(slug) ? slug : 'home';
};
const productFromPath = () => {
  const parts = appPathname().split('/').filter(Boolean);
  return parts[0] === 'products' && availableProductIds.has(parts[1]) ? parts[1] : '';
};
const normalizeHiddenProductPath = () => {
  const parts = appPathname().split('/').filter(Boolean);
  if (parts[0] !== 'products' || !hiddenCustomerProductIdSet.has(parts[1])) return false;
  window.history.replaceState({}, '', appUrl('/products'));
  return true;
};

export default function App() {
  const [page, setPage] = useState(pageFromPath);
  const [productId, setProductId] = useState(productFromPath);
  const [quoteInitial, setQuoteInitial] = useState(null);
  const [utility, setUtility] = useState(null);
  const [contactLocation, setContactLocation] = useState('');
  const [resourceKey, setResourceKey] = useState('');
  const [toast, setToast] = useState('');
  const [skipLinkFocused, setSkipLinkFocused] = useState(false);
  const mainRef = useRef(null);
  const initialRouteHandledRef = useRef(false);
  const productName = availableProductById.get(productId)?.name || '';
  const routeLabel = routeAnnouncement(page, productName);
  const routeTitle = routeDocumentTitle(page, productName);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    normalizeHiddenProductPath();
    const handlePopState = () => {
      normalizeHiddenProductPath();
      setPage(pageFromPath());
      setProductId(productFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    document.title = routeTitle;
    if (!initialRouteHandledRef.current) {
      initialRouteHandledRef.current = true;
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => mainRef.current?.focus?.({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [routeTitle]);

  const navigate = useCallback((nextPage) => {
    const next = validPages.includes(nextPage) ? nextPage : 'home';
    const path = appUrl(next === 'home' ? '/' : `/${next}`);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setPage(next);
    setProductId('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openProduct = useCallback((id) => {
    if (!availableProductIds.has(id)) return;
    window.history.pushState({}, '', appUrl(`/products/${id}`));
    setPage('products');
    setProductId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openQuote = useCallback((initial = {}) => {
    setUtility(null);
    setQuoteInitial({ ...initial, sessionKey: Date.now() });
  }, []);

  const openContact = useCallback((location = '') => {
    setContactLocation(location);
    setUtility('contact');
  }, []);

  const openResource = useCallback((key) => {
    const pageByKey = { comparison: 'compare', documents: 'resources', eligibility: 'eligibility', faq: 'resources' };
    if (pageByKey[key]) {
      navigate(pageByKey[key]);
      return;
    }
    setResourceKey(key);
    setUtility('resource');
  }, [navigate]);

  return (
    <div className="app-shell">
      <a
        href="#main-content"
        style={{ ...skipLinkStyle, transform: skipLinkFocused ? 'translateY(0)' : skipLinkStyle.transform }}
        onFocus={() => setSkipLinkFocused(true)}
        onBlur={() => setSkipLinkFocused(false)}
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus?.();
          mainRef.current?.scrollIntoView?.({ block: 'start' });
        }}
      >
        Skip to main content
      </a>
      <p role="status" aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>{routeLabel}</p>
      <Header onQuote={openQuote} onSaved={() => setUtility('saved')} onNavigate={navigate} page={page} />
      <main ref={mainRef} id="main-content" tabIndex="-1" aria-label={routeLabel} className={`site-page site-page--${page}`}>
        {page === 'home' && <><Hero onQuote={openQuote} onCompare={() => navigate('compare')} /><HomeOverview onNavigate={navigate} onQuote={openQuote} /></>}
        {page === 'products' && (productId
          ? <ProductDetail productId={productId} onBack={() => navigate('products')} onQuote={openQuote} onContact={openContact} onCompare={() => navigate('compare')} />
          : <ProductLibrary onQuote={openQuote} onContact={openContact} onOpenProduct={openProduct} />)}
        {page === 'compare' && <PlanExplorer onQuote={openQuote} onOpenProduct={openProduct} />}
        {page === 'eligibility' && <EligibilityHub onQuote={openQuote} onContact={openContact} onNavigate={navigate} />}
        {page === 'how-it-works' && <Journey onQuote={openQuote} onContact={openContact} onNavigate={navigate} />}
        {page === 'resources' && <FaqSection onQuote={openQuote} onContact={openContact} onNavigate={navigate} />}
      </main>
      <TrustFooter compact={page !== 'home'} onQuote={openQuote} onContact={openContact} onResource={openResource} />

      {quoteInitial && (
        <QuoteStudio
          key={quoteInitial.sessionKey}
          initial={quoteInitial}
          onClose={() => setQuoteInitial(null)}
          onToast={setToast}
          onSaved={() => {}}
        />
      )}
      {utility === 'saved' && (
        <SavedQuotes
          onClose={() => setUtility(null)}
          onLoad={(quote) => openQuote({ ...quote, planId: quote.planId })}
        />
      )}
      {utility === 'contact' && (
        <ContactPanel
          initialLocation={contactLocation}
          onClose={() => setUtility(null)}
          onStartRequest={(initial) => {
            setUtility(null);
            openQuote(initial);
          }}
        />
      )}
      {utility === 'resource' && (
        <ResourcePanel
          resourceKey={resourceKey}
          onClose={() => setUtility(null)}
          onToast={setToast}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 /> <span>{toast}</span><button type="button" onClick={() => setToast('')} aria-label="Dismiss"><X /></button>
        </div>
      )}
      {!productId && <button className="mobile-sticky-cta" type="button" onClick={() => openQuote()}>Check my vehicle <span>→</span></button>}
    </div>
  );
}
