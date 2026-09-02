import { ArrowRight, CarFront, CheckCircle2, FileCheck2, MapPin, Search, ShieldCheck, X } from 'lucide-react';
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
    <ModalShell title="Find a saved request" onClose={onClose}>
      <div className="utility-modal__body">
        <h1>Find a saved request</h1>
        <p>Saved drafts stay in this browser so you can return to them before submitting a completed request.</p>
        <label className="search-field"><Search /><input placeholder="Enter request number" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="saved-list">
          {filtered.map((quote) => (
            <button key={quote.id} type="button" onClick={() => onLoad(quote)}>
              <CarFront />
              <span><strong>{quote.id}</strong><small>{quote.year} {quote.make} {quote.model} · {quote.planName}</small></span>
              <ArrowRight />
            </button>
          ))}
          {!filtered.length && <div className="empty-saved"><CarFront /><strong>No matching saved requests</strong><span>Start a request and choose “Save request” to keep a draft in this browser.</span></div>}
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
        <p>Choose the Bob Maxey location you want connected to your coverage request and follow-up.</p>
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
    title: 'Coverage guides',
    intro: 'Review the on-site product guides before asking Bob Maxey to confirm the vehicle-specific offer.',
    items: ['PremiumCARE coverage guide', 'ExtraCARE coverage guide', 'BaseCARE and PowertrainCARE guides', 'Maintenance and vehicle-care product guides'],
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
    intro: 'Bob Maxey uses the information you submit to review eligibility, prepare a Ford Protect offer and contact you about your request.',
    items: ['Vehicle and coverage-request information', 'Contact details and follow-up preference', 'Draft requests stored only in this browser', 'Dealership lead delivery after you choose Send My Request'],
  },
  terms: {
    title: 'Terms',
    intro: 'Online selections are a coverage request, not a contract or purchase. Final eligibility, price and coverage come from the Ford Protect offer and issued agreement.',
    items: ['Vehicle-specific eligibility and availability', 'Plan provisions, exclusions and limits', 'Payment, cancellation and transfer terms', 'Customer approval before coverage is purchased'],
  },
  accessibility: {
    title: 'Accessibility',
    intro: 'The experience is designed for keyboard navigation, readable contrast, visible focus states and responsive text.',
    items: ['Keyboard-operable request workflow', 'Semantic labels and status announcements', 'Reduced-motion support', 'Mobile touch targets and responsive layout'],
  },
};

export function ResourcePanel({ resourceKey, onClose }) {
  const content = resourceContent[resourceKey] ?? resourceContent.documents;
  const isDocuments = resourceKey === 'documents';

  return (
    <ModalShell title={content.title} onClose={onClose}>
      <div className="utility-modal__body resource-panel">
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
        <div className="resource-panel__list">
          {content.items.map((item) => (
            <div key={item}>
              {isDocuments ? <FileCheck2 /> : <ShieldCheck />}
              <span>{item}</span>
              <CheckCircle2 />
            </div>
          ))}
        </div>
        <div className="resource-panel__notice"><CheckCircle2 /><span><strong>The vehicle-specific agreement controls</strong><small>Bob Maxey confirms current availability, pricing, coverage, exclusions and terms before you decide to purchase.</small></span></div>
      </div>
    </ModalShell>
  );
}
