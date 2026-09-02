import { ArrowRight, CarFront, CheckCircle2, Download, FileCheck2, MapPin, Search, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Brand from './Brand';
import { locations } from '../data';

function ModalShell({ title, children, onClose }) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    const escape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', escape);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', escape);
    };
  }, [onClose]);

  return (
    <div className="utility-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="utility-modal">
        <div className="utility-modal__header"><Brand /><button type="button" onClick={onClose} aria-label="Close"><X /></button></div>
        {children}
      </div>
    </div>
  );
}

export function SavedQuotes({ onClose, onLoad }) {
  const [search, setSearch] = useState('');
  const quotes = useMemo(() => JSON.parse(localStorage.getItem('bobMaxeyProtectQuotes') || '[]'), []);
  const filtered = quotes.filter((quote) => quote.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <ModalShell title="Find a saved quote" onClose={onClose}>
      <div className="utility-modal__body">
        <h1>Find a saved quote</h1>
        <p>Saved drafts stay in this browser so you can return to them before submitting a completed request.</p>
        <label className="search-field"><Search /><input placeholder="Enter quote number" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="saved-list">
          {filtered.map((quote) => (
            <button key={quote.id} type="button" onClick={() => onLoad(quote)}>
              <CarFront />
              <span><strong>{quote.id}</strong><small>{quote.year} {quote.make} {quote.model} · {quote.planName}</small></span>
              <ArrowRight />
            </button>
          ))}
          {!filtered.length && <div className="empty-saved"><CarFront /><strong>No matching saved quotes</strong><span>Start a quote and choose “Save quote” to keep a draft here.</span></div>}
        </div>
      </div>
    </ModalShell>
  );
}

export function ContactPanel({ onClose, initialLocation, onToast }) {
  const [location, setLocation] = useState(initialLocation || 'Howell');
  const selected = locations.find((item) => item.name === location) ?? locations[0];

  return (
    <ModalShell title="Talk to a Bob Maxey specialist" onClose={onClose}>
      <div className="utility-modal__body contact-panel">
        <h1>Talk to a Ford Protect specialist</h1>
        <p>Choose the Bob Maxey location you want connected to the final quote and purchase workflow.</p>
        <div className="contact-locations">
          {locations.map((item) => (
            <button key={item.name} type="button" className={location === item.name ? 'is-selected' : ''} onClick={() => setLocation(item.name)}>
              <MapPin /><span><strong>{item.name}</strong><small>{item.descriptor}</small></span>{location === item.name && <CheckCircle2 />}
            </button>
          ))}
        </div>
        <div className="contact-summary"><span>Selected dealership</span><strong>{selected.descriptor}</strong></div>
        <button className="button button--primary button--full" type="button" onClick={() => onToast(`${selected.descriptor} is now your preferred Bob Maxey location.`)}>Select this dealership <ArrowRight /></button>
      </div>
    </ModalShell>
  );
}

const resourceContent = {
  documents: {
    title: 'Coverage documents',
    intro: 'Give customers one place to review official plan provisions before they buy.',
    items: ['PremiumCARE plan provisions', 'ExtraCARE plan provisions', 'BaseCARE & PowertrainCARE provisions', 'Maintenance and TripleCARE+ documents'],
  },
  eligibility: {
    title: 'Vehicle eligibility',
    intro: 'An early eligibility check uses the vehicle class, mileage, in-service date, use type, state and selected plan.',
    items: ['New and used plan pathways', 'EV, hybrid and commercial categories', 'State-specific availability checks', 'Final Ford record verification before purchase'],
  },
  faq: {
    title: 'Frequently asked questions',
    intro: 'Straight answers reduce uncertainty before a customer starts a quote.',
    items: ['When does Ford Protect coverage begin?', 'Can I use the plan at another Ford dealer?', 'How do deductibles and rental options work?', 'What information is needed to confirm eligibility?'],
  },
  privacy: {
    title: 'Privacy',
    intro: 'The production privacy page will explain exactly what quote information is collected, how it is used and how customers can request changes.',
    items: ['Vehicle and quote information', 'Contact preferences and consent', 'CRM and Ford-system disclosures', 'Data access and deletion requests'],
  },
  terms: {
    title: 'Terms',
    intro: 'Website estimates are not contracts. Final eligibility, price and coverage come from the executed Ford Protect agreement.',
    items: ['Quote validity and price changes', 'Plan provisions and exclusions', 'Payment and cancellation terms', 'Dealer and manufacturer responsibilities'],
  },
  accessibility: {
    title: 'Accessibility',
    intro: 'The experience is designed for keyboard navigation, readable contrast, visible focus states and responsive text.',
    items: ['Keyboard-operable quote workflow', 'Semantic labels and status announcements', 'Reduced-motion support', 'Mobile touch targets and responsive layout'],
  },
};

export function ResourcePanel({ resourceKey, onClose, onToast }) {
  const content = resourceContent[resourceKey] ?? resourceContent.documents;
  const isDocuments = resourceKey === 'documents';

  return (
    <ModalShell title={content.title} onClose={onClose}>
      <div className="utility-modal__body resource-panel">
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
        <div className="resource-panel__list">
          {content.items.map((item) => (
            <button key={item} type="button" onClick={() => onToast(isDocuments ? 'Official Ford document links connect during dealer-system setup.' : `${item} content is staged for the production content library.`)}>
              {isDocuments ? <FileCheck2 /> : <ShieldCheck />}
              <span>{item}</span>
              {isDocuments ? <Download /> : <ArrowRight />}
            </button>
          ))}
        </div>
        <div className="resource-panel__notice"><CheckCircle2 /><span><strong>Production-ready structure</strong><small>Final legal language and official Ford documents must be approved before public launch.</small></span></div>
      </div>
    </ModalShell>
  );
}
