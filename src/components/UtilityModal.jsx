import { ArrowRight, CarFront, CheckCircle2, FileCheck2, MapPin, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import Brand from './Brand';
import { locations } from '../data';
import { clearDrafts, deleteDraft, DRAFT_TTL_DAYS, loadDrafts } from '../draftStorage';
import { handleRovingChoiceKeyDown, useDialogFocus } from '../useDialogFocus';

function ModalShell({ title, children, onClose }) {
  const titleId = useId();
  const dialogRef = useDialogFocus({ onClose });
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="utility-backdrop">
      <div ref={dialogRef} className="utility-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex="-1">
        <div className="utility-modal__header"><Brand /><strong id={titleId}>{title}</strong><button type="button" onClick={onClose} aria-label={`Close ${title}`} data-dialog-initial-focus><X /></button></div>
        {children}
      </div>
    </div>
  );
}

export function SavedQuotes({ onClose, onLoad }) {
  const [search, setSearch] = useState('');
  const [quotes, setQuotes] = useState(() => loadDrafts());
  const [confirmingClear, setConfirmingClear] = useState(false);
  const filtered = useMemo(() => quotes.filter((quote) => String(quote.id || '').toLowerCase().includes(search.toLowerCase())), [quotes, search]);

  const removeQuote = (id) => setQuotes(deleteDraft(id));
  const removeAll = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    if (clearDrafts()) setQuotes([]);
    setConfirmingClear(false);
  };

  return (
    <ModalShell title="Find a saved request" onClose={onClose}>
      <div className="utility-modal__body">
        <h1>Find a saved request</h1>
        <p>Saved drafts keep planning selections in this browser for up to {DRAFT_TTL_DAYS} days. VIN, decoded NHTSA facts, ZIP code, contact details, notes and consent are never included.</p>
        <label className="search-field"><Search /><span className="sr-only">Search saved requests</span><input aria-label="Search saved requests" placeholder="Enter request number" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="saved-list" aria-live="polite">
          {filtered.map((quote) => (
            <article className="saved-list__item" key={quote.id}>
              <button className="saved-list__load" type="button" onClick={() => onLoad(quote)}>
                <CarFront />
                <span><strong>{quote.id}</strong><small>{quote.year} {quote.make} {quote.model} · {quote.planName || quote.planId || 'Coverage planning'}</small></span>
                <ArrowRight />
              </button>
              <button className="saved-list__delete" type="button" onClick={() => removeQuote(quote.id)} aria-label={`Delete saved request ${quote.id}`}><Trash2 /></button>
            </article>
          ))}
          {!filtered.length && <div className="empty-saved"><CarFront /><strong>No matching saved requests</strong><span>Start a request and choose “Save request” to keep a draft in this browser.</span></div>}
        </div>
        {quotes.length > 0 && <button className="button button--secondary button--full" type="button" onClick={removeAll} onBlur={() => setConfirmingClear(false)}><Trash2 /> {confirmingClear ? 'Confirm delete all saved requests' : 'Delete all saved requests'}</button>}
      </div>
    </ModalShell>
  );
}

export function ContactPanel({ onClose, initialLocation, onStartRequest }) {
  const [location, setLocation] = useState(initialLocation || 'Howell');
  const selected = locations.find((item) => item.name === location) ?? locations[0];

  return (
    <ModalShell title="Talk to a Bob Maxey specialist" onClose={onClose}>
      <div className="utility-modal__body contact-panel">
        <h1>Talk to a Bob Maxey Ford Protect specialist</h1>
        <p>Choose the Bob Maxey location you want to work with, then start a request. This panel does not send a message or create a lead.</p>
        <div className="contact-locations" role="radiogroup" aria-label="Preferred Bob Maxey location" onKeyDown={handleRovingChoiceKeyDown}>
          {locations.map((item, index) => (
            <button key={item.name} type="button" role="radio" aria-checked={location === item.name} tabIndex={location === item.name || (!location && index === 0) ? 0 : -1} className={location === item.name ? 'is-selected' : ''} onClick={() => setLocation(item.name)}>
              <MapPin /><span><strong>{item.name}</strong><small>{item.descriptor}</small></span>{location === item.name && <CheckCircle2 />}
            </button>
          ))}
        </div>
        <div className="contact-summary"><span>Selected dealership</span><strong>{selected.descriptor}</strong></div>
        <button className="button button--primary button--full" type="button" onClick={() => onStartRequest?.({ store: selected.name })}>Start a request with this location <ArrowRight /></button>
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
    intro: 'This is a public preview. It should not be used for live customer submissions until Bob Maxey approves the final privacy notice and secure dealership connection.',
    items: ['Saved drafts keep non-contact planning choices for up to 30 days', 'VIN, decoded NHTSA facts, ZIP code, contact details, notes and consent are not saved in browser drafts', 'A VIN is sent to the public NHTSA vPIC service only when you choose Decode VIN', 'A request is shown as received only after a configured dealership system returns an accepted receipt'],
  },
  terms: {
    title: 'Terms',
    intro: 'This preview provides planning information, not live pricing, a binding offer, a contract or a purchase. Current Ford records and the issued agreement control.',
    items: ['Ford and Bob Maxey must confirm vehicle-specific eligibility and availability', 'Published examples may change and do not replace the issued agreement', 'Payment, cancellation, transfer, exclusions and limits require agreement review', 'No coverage is purchased until the customer reviews and approves the final offer'],
  },
  accessibility: {
    title: 'Accessibility',
    intro: 'We are improving keyboard, screen-reader, zoom and responsive support. This preview has not yet received a formal accessibility conformance certification.',
    items: ['Dialog focus is contained and returned to the launching control', 'Form errors and changing status messages are announced', 'Reduced-motion and mobile touch support are included', 'Report any barrier to a Bob Maxey representative so an alternate process can be provided'],
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
