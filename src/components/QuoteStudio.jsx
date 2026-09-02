import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, CalendarDays, CarFront, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleDollarSign, ClipboardCheck, Clock3, Download, Eye,
  FileText, Gauge, Info, KeyRound, Grid3X3, Lightbulb, Mail, MapPin, MessageSquare,
  PackagePlus, Phone, Send, ShieldCheck, Sparkles, Tag, UserRound, Wrench, X, Zap,
} from 'lucide-react';
import Brand from './Brand';
import { evPlanData, locations, modelsByMake, planData, states, years } from '../data';
import { productDetails } from '../productDetails';
import { assetUrl } from '../paths';
import {
  contactPreferences, deductibleOptions, findBestCombination, formatMiles, formatTerm,
  getTermMatrix, historicalMatrixNotice, maintenanceChoices,
  protectionOptions,
} from '../quoteData';
import { createAdfXml, CRM_DESTINATION, downloadLeadXml, submitCrmLead } from '../crmLead';
import {
  createDefaultQuoteProductSelection, getQuoteProductCatalog, getWarrantyInspectionStatus,
  quoteProducts, validateQuoteProductSelection,
} from '../quoteProducts';
import { buildProposalModel } from '../quoteOutput';

const stepNames = ['Vehicle', 'Protection', 'Term', 'Options', 'Your details', 'Review'];
const optionIcons = {
  'first-day': CarFront,
  'enhanced-rental': Clock3,
  key: KeyRound,
  lighting: Lightbulb,
  'pickup-delivery': MapPin,
};

const cspLevels = [
  {
    id: 'ultimate',
    name: 'Ultimate',
    label: 'Broader continued coverage',
    description: 'The broader Continued Service Plan path for eligible systems and components returned after Ford record review.',
  },
  {
    id: 'standard-plus',
    name: 'Standard Plus',
    label: 'Focused continued coverage',
    description: 'A more focused monthly coverage path for eligible vehicles that still need protection after prior coverage.',
  },
];

const dieselCareLevels = [
  { id: 'diesel-enginecare-plus', name: 'Diesel EngineCARE Plus', count: '21', label: 'Broader diesel protection', description: 'The broader listed-component Ford Protect path for an eligible factory-installed Power Stroke diesel.' },
  { id: 'diesel-enginecare', name: 'Diesel EngineCARE', count: '13', label: 'Focused diesel protection', description: 'A focused listed-component path for eligible high-cost Power Stroke diesel engine components.' },
];

const dieselCareDetail = {
  type: 'FORD PROTECT DIESEL ENGINE COVERAGE',
  tagline: 'Focused Ford-backed protection for eligible Power Stroke diesel engine components.',
  coverageModel: 'Listed-component coverage. The current Ford offer and issued agreement identify the exact eligible components, engine, use, mileage, engine hours, and exclusions.',
  stat: '7 yrs / 200k',
  statLabel: 'referenced maximum, plus 8,000 engine hours',
  maxTerm: '7 years / 200,000 miles / 8,000 engine hours on eligible vehicles',
  coverageGroups: [
    { title: 'Core engine assembly', summary: 'Agreement-listed internal and structural diesel-engine components.', items: ['Cylinder block and heads', 'Internally lubricated parts', 'Timing components', 'Oil pump and pan', 'Water pump'] },
    { title: 'Air, fuel and controls', summary: 'Selected factory-installed diesel support components where listed.', items: ['Factory-installed turbocharger', 'Fuel-delivery components', 'Engine controls and sensors', 'Cooling-system components', 'Selected Plus-level components'] },
  ],
  benefits: [],
  bestFor: 'Eligible 3.0L, 3.2L, or 6.7L Power Stroke owners who want focused diesel-engine protection.',
};

const purchaseContexts = [
  {
    id: 'shopping',
    label: 'I’m shopping at Bob Maxey',
    eyebrow: 'BEFORE I BUY',
    description: 'Choose products to include with my vehicle purchase.',
    Icon: CarFront,
  },
  {
    id: 'owner',
    label: 'I already own the vehicle',
    eyebrow: 'AFTER THE SALE',
    description: 'It can be from Bob Maxey or another dealership.',
    Icon: KeyRound,
  },
];

function getProductPurchaseContexts(product) {
  const declared = product?.purchaseContexts || product?.availabilityContexts;
  if (Array.isArray(declared) && declared.length) return declared;
  const timing = String(product?.purchaseTiming || product?.saleTiming || '').toLowerCase();
  if (['vehicle-sale-only', 'time-of-sale-only', 'sale-only'].includes(timing)) return ['shopping'];
  return ['shopping', 'owner'];
}

function productFitsPurchaseContext(product, purchaseContext) {
  if (!purchaseContext) return true;
  return getProductPurchaseContexts(product).includes(purchaseContext);
}

const productVariant = (product, selection) => product?.configuration?.variants?.find((item) => item.id === selection?.variantId)
  || product?.configuration?.variants?.find((item) => item.customerSelectable)
  || product?.configuration?.variants?.[0]
  || null;

function productVariantsForVehicle(product, powertrain) {
  const variants = (product?.configuration?.variants || []).filter((item) => item.customerSelectable !== false);
  const isElectric = powertrain === 'Electric';
  if (product?.id === 'premium-maintenance') {
    return variants.filter((item) => isElectric ? item.id === 'premium-maintenance-ev' : item.id !== 'premium-maintenance-ev');
  }
  if (!isElectric) return variants.filter((item) => !item.id.endsWith('-ev'));
  return variants;
}

function defaultProductSelection(product, powertrain, requestedVariantId = '') {
  if (!product) return null;
  const variants = productVariantsForVehicle(product, powertrain);
  const preferred = variants.find((item) => item.id === requestedVariantId)
    || variants[0]
    || product?.configuration?.variants?.[0];
  return {
    ...createDefaultQuoteProductSelection(product.id, preferred?.id),
    powertrain,
  };
}

function normalizedProductSelection(product, selection, powertrain) {
  const allowed = productVariantsForVehicle(product, powertrain);
  if (selection && allowed.some((item) => item.id === selection.variantId)) return { ...selection, powertrain };
  return defaultProductSelection(product, powertrain);
}

const compactTerm = (months) => Number(months) % 12 === 0
  ? `${Number(months) / 12} ${Number(months) === 12 ? 'year' : 'years'}`
  : `${Number(months)} months`;

function productSelectionLabel(product, selection) {
  if (!selection) return 'Options not chosen yet';
  const variant = productVariant(product, selection);
  const labels = [];
  if (variant && (product?.configuration?.variants?.length > 1 || variant.label !== product?.name)) labels.push(variant.label);
  if (selection.termMonths) labels.push(compactTerm(selection.termMonths));
  if (selection.termMiles) labels.push(`${formatMiles(selection.termMiles)} miles`);
  if (selection.serviceInterval) labels.push(`service every ${formatMiles(selection.serviceInterval)} miles`);
  if (selection.engineHours) labels.push(`${formatMiles(selection.engineHours)} engine hours`);
  if (selection.benefitAmount) labels.push(`$${formatMiles(selection.benefitAmount)} benefit request`);
  if (!labels.length && ['monthly', 'dealer-returned'].includes(variant?.mode)) labels.push('Vehicle-specific offer requested');
  return labels.join(' · ') || 'Specialist configuration requested';
}

function PurchaseContextSelector({ value, error, onSelect }) {
  return (
    <section className={`purchase-context-selector ${error ? 'has-error' : ''}`} aria-labelledby="purchase-context-title">
      <div className="purchase-context-selector__intro">
        <span className="purchase-context-selector__icon"><PackagePlus /></span>
        <span><strong id="purchase-context-title">When are you choosing products?</strong><small>This keeps every option tied to the right purchase window.</small></span>
      </div>
      <div className="purchase-context-selector__choices" role="radiogroup" aria-label="Vehicle purchase stage">
        {purchaseContexts.map(({ id, label, eyebrow, description, Icon }) => {
          const selected = value === id;
          return (
            <button key={id} type="button" role="radio" aria-checked={selected} className={selected ? 'is-selected' : ''} onClick={() => onSelect(id)}>
              <span className="purchase-context-choice__icon"><Icon /></span>
              <span><small>{eyebrow}</small><strong>{label}</strong><em>{description}</em></span>
              <span className="purchase-context-choice__check">{selected && <Check />}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="purchase-context-selector__error" role="alert">Choose whether you are shopping for a vehicle or adding protection after the sale.</p>}
    </section>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className={`studio-field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Progress({ step, maxStep, onSelect }) {
  return (
    <div className="studio-progress" aria-label="Quote progress">
      <div className="studio-progress__intro">
        <small>Your protection request</small>
        <strong className="studio-progress__mobile-label">Step {step + 1} of {stepNames.length} · {stepNames[step]}</strong>
      </div>
      <div className="studio-progress__steps">
        {stepNames.map((name, index) => {
          const complete = index < step;
          const current = step === index;
          return (
            <button
              key={name}
              type="button"
              className={`${current ? 'is-current' : ''} ${complete ? 'is-complete' : ''} ${index <= maxStep ? 'is-available' : ''}`}
              onClick={() => onSelect(index)}
              disabled={index > maxStep}
              aria-current={current ? 'step' : undefined}
            >
              <span className="studio-progress__marker">{complete ? <Check /> : index + 1}</span>
              <span className="studio-progress__copy"><small>{current ? 'Current' : complete ? 'Complete' : `Step ${index + 1}`}</small><em>{name}</em></span>
            </button>
          );
        })}
      </div>
      <div className="studio-progress__bar" aria-hidden="true"><span style={{ width: `${((step + 1) / stepNames.length) * 100}%` }} /></div>
    </div>
  );
}

function VehicleStrip({ quote, onEdit }) {
  return (
    <div className="studio-vehicle-strip">
      <CarFront />
      <strong>{quote.year} {quote.make} {quote.model || 'Model not selected'}</strong>
      <span>{formatMiles(quote.mileage)} miles</span>
      <span>{quote.powertrain}</span>
      <span>{quote.state}</span>
      <button type="button" onClick={onEdit}>Edit</button>
    </div>
  );
}

function PlanRail({ plans, selectedId, onSelect, onDetails, compact = false }) {
  const selected = plans.find((item) => item.id === selectedId) || plans[0];
  return (
    <div className={`plan-rail-wrap ${compact ? 'is-compact' : ''}`}>
      <div className="studio-plan-rail" role="radiogroup" aria-label="Ford Protect coverage level">
        {plans.map((item) => (
          <button key={item.id} type="button" role="radio" aria-checked={selectedId === item.id} className={selectedId === item.id ? 'is-selected' : ''} onClick={() => onSelect(item.id)}>
            <ShieldCheck />
            <span><strong>{item.name}</strong><small>{item.count} covered components</small></span>
            {selectedId === item.id && <CheckCircle2 className="plan-rail-check" />}
          </button>
        ))}
      </div>
      {!compact && (
        <div className="plan-coverage-table" role="table" aria-label="Coverage level overview">
          <div role="row"><span role="rowheader">Coverage position</span>{plans.map((item) => <strong role="cell" className={selectedId === item.id ? 'is-selected' : ''} key={item.id}>{item.label}</strong>)}</div>
          <div role="row"><span role="rowheader">Listed components</span>{plans.map((item) => <strong role="cell" className={selectedId === item.id ? 'is-selected' : ''} key={item.id}>{item.count}</strong>)}</div>
        </div>
      )}
      <button className="selected-plan-detail" type="button" onClick={() => onDetails(selected.id)}>See full {selected.name} coverage <ChevronDown /></button>
    </div>
  );
}

function Summary({ quote, plan, eligibility, selectedProducts = [], inspection }) {
  const selectedOptions = protectionOptions.filter((item) => quote.addOns.includes(item.id));
  const term = quote.program === 'csp'
    ? 'Monthly / no annual mileage limit'
    : quote.program === 'enginecare'
      ? '7 years / 200,000 total miles / 8,000 engine hours'
    : `${formatTerm(quote.termMonths)} / ${formatMiles(quote.termMiles)} ${quote.planPath === 'used' ? 'additional' : 'total'} miles`;
  const deductible = quote.program === 'csp'
    ? 'Confirmed with CSP offer'
    : quote.program === 'enginecare'
      ? '$100'
    : quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible}`;
  const rows = [
    [CarFront, 'Vehicle', `${quote.year} ${quote.make} ${quote.model || 'Model'}`],
    [ShieldCheck, 'Plan', plan.name],
    [CalendarDays, 'Term', term],
    [CircleDollarSign, 'Deductible', deductible],
  ];

  const summaryRows = (
    <div className="studio-summary__rows">
      {rows.map(([Icon, label, value]) => (
        <div key={label}><Icon /><span><small>{label}</small><strong>{value}</strong></span></div>
      ))}
    </div>
  );

  const extras = [
    ...selectedOptions.map((item) => item.title),
    ...selectedProducts.map((item) => item.name || item.title),
  ];
  const compactTerm = quote.program === 'csp'
    ? 'Monthly coverage'
    : quote.program === 'enginecare'
      ? '7 years · 200,000 miles · 8,000 hours'
    : `${formatTerm(quote.termMonths)} · ${formatMiles(quote.termMiles)} ${quote.planPath === 'used' ? 'additional' : 'total'} miles`;
  const vehicleLabel = `${quote.year} ${quote.make} ${quote.model || 'Model'}`;

  return (
    <aside className="studio-summary">
      <div className="studio-summary__desktop">
        <div className="studio-summary__eyebrow"><span>Your quote</span><strong>{quote.id}</strong></div>
        <h2>Your quote</h2>
        {summaryRows}
        <div className="studio-summary__options">
          <small className="studio-summary__section-label">Requested additions</small>
          {extras.length ? extras.map((item) => <span key={item}><CheckCircle2 /> {item}</span>) : <span className="is-empty"><PackagePlus /> No additional products yet</span>}
        </div>
        {inspection && <div className={`summary-inspection ${inspection.required ? 'is-required' : 'is-clear'}`}><ClipboardCheck /><span><small>Inspection status</small><strong>{inspection.shortLabel || inspection.title}</strong></span></div>}
        <div className={`eligibility ${eligibility.tone}`}>
          <CheckCircle2 /><span><strong>{eligibility.title}</strong><small>{eligibility.text}</small></span>
        </div>
        <div className="summary-price">
          <span>Specialist-confirmed pricing</span>
          <strong>Prepared after eligibility review</strong>
          <small>Your Bob Maxey F&amp;I specialist confirms the current Ford-authorized options and price.</small>
        </div>
        <p>Ford records and the issued agreement confirm eligibility, coverage, price, and exclusions.</p>
      </div>
      <details className="studio-summary__mobile">
        <summary>
          <ShieldCheck />
          <span className="studio-summary__mobile-vehicle"><small>Your selection</small><strong>{vehicleLabel}</strong></span>
          <span className="studio-summary__mobile-plan"><strong>{plan.name}</strong><small>{compactTerm}</small></span>
          <span className="studio-summary__mobile-count">{extras.length ? `${extras.length} addition${extras.length === 1 ? '' : 's'}` : 'No additions'}</span>
          <ChevronDown />
        </summary>
        <div className="studio-summary__mobile-body">
          {summaryRows}
          <div className="studio-summary__options">
            <small className="studio-summary__section-label">Requested additions</small>
            {extras.length ? extras.map((item) => <span key={item}><CheckCircle2 /> {item}</span>) : <span className="is-empty"><PackagePlus /> No additional products yet</span>}
          </div>
          {inspection && <div className={`summary-inspection ${inspection.required ? 'is-required' : 'is-clear'}`}><ClipboardCheck /><span><small>Inspection status</small><strong>{inspection.shortLabel || inspection.title}</strong></span></div>}
          <div className={`eligibility ${eligibility.tone}`}><CheckCircle2 /><span><strong>{eligibility.title}</strong><small>{eligibility.text}</small></span></div>
        </div>
      </details>
    </aside>
  );
}

function StudioFooter({ step, quote, saved, onBack, onContinue, onSave, onSubmit, submitting }) {
  const termAction = quote.program === 'enginecare' ? 'Review plan limits' : quote.program === 'csp' ? 'Review monthly path' : 'Choose term & mileage';
  const labels = ['See protection paths', termAction, 'Continue to options', 'Add my details', 'Review my request', 'Submit my quote request'];
  return (
    <footer className={`studio-footer ${step === 0 ? 'is-first-step' : ''}`}>
      <button className={`studio-footer__back ${step === 0 ? 'is-hidden' : ''}`} type="button" onClick={onBack} tabIndex={step === 0 ? -1 : 0}><ArrowLeft /> Back</button>
      <button className={`studio-footer__save ${saved ? 'is-saved' : ''}`} type="button" onClick={onSave}>{saved ? <CheckCircle2 /> : <Bookmark />}<span>{saved ? 'Saved' : 'Save quote'} <strong>{quote.id}</strong></span></button>
      <button className="button button--primary studio-footer__continue" type="button" onClick={step === 5 ? onSubmit : onContinue} disabled={submitting}>{submitting ? 'Sending securely…' : labels[step]} {submitting ? <span className="button-spinner" /> : step === 5 ? <Send /> : <ArrowRight />}</button>
      <small><ShieldCheck /> Ford records and the issued agreement confirm eligibility and coverage.</small>
    </footer>
  );
}

function PlanHelp({ plan, detail, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const closeButton = modalRef.current?.querySelector('header button');
    closeButton?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  if (!detail) return null;
  return (
    <div className="context-backdrop" role="dialog" aria-modal="true" aria-labelledby="plan-help-title">
      <article ref={modalRef} className="context-modal context-modal--expanded">
        <header>
          <img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
          <span><small>Ford Protect coverage</small><strong>Complete plan guide</strong></span>
          <button type="button" onClick={onClose} aria-label="Close plan details"><X /></button>
        </header>
        <div className="context-modal__body">
          <p>{detail.type}</p>
          <h2 id="plan-help-title">{plan.name}</h2>
          <strong>{detail.tagline}</strong>
          <span>{detail.coverageModel}</span>
          <div className="context-modal__facts">
            <div><b>{detail.stat}</b><small>{detail.statLabel}</small></div>
            <div><b>{detail.maxTerm.split(' on eligible')[0]}</b><small>published maximum where eligible</small></div>
          </div>
          <h3>Coverage groups and examples</h3>
          <div className="plan-help-groups">
            {detail.coverageGroups.map((group) => (
              <section key={group.title}>
                <h4><Check /> {group.title}</h4>
                <p>{group.summary}</p>
                <ul>{group.items.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            ))}
          </div>
          <div className="context-modal__notice"><ShieldCheck /><span><b>The agreement is the final word</b><small>This on-site guide helps compare plans. Covered components, options, term, price, limits, and exclusions must match the agreement issued for the vehicle.</small></span></div>
        </div>
        <footer><small>Your quote selections stay saved while you review coverage.</small><button className="button button--primary" type="button" onClick={onClose}>Keep {plan.name} selected <ArrowRight /></button></footer>
      </article>
    </div>
  );
}

function ProductConfigurator({ product, selection, powertrain, onChange }) {
  const variants = productVariantsForVehicle(product, powertrain);
  const activeVariant = variants.find((item) => item.id === selection?.variantId) || variants[0] || productVariant(product, selection);
  if (!activeVariant) return null;

  const matrix = activeVariant.termMileageMatrix || [];
  const activeRow = matrix.find((item) => item.months === Number(selection?.termMonths)) || matrix[0];
  const mileChoices = activeRow?.miles || [];
  const mode = activeVariant.mode;
  const updateVariant = (variantId) => onChange(defaultProductSelection(product, powertrain, variantId));
  const updateTerm = (months) => {
    const row = matrix.find((item) => item.months === Number(months));
    const nextMiles = row?.miles?.includes(Number(selection?.termMiles)) ? Number(selection.termMiles) : row?.miles?.[0] ?? null;
    onChange({ ...selection, variantId: activeVariant.id, termMonths: Number(months), termMiles: nextMiles, powertrain });
  };

  return (
    <section className="product-configurator" aria-labelledby="product-configurator-title">
      <header><span><small>BUILD YOUR REQUEST</small><h3 id="product-configurator-title">Choose the option you want Bob Maxey to verify.</h3></span><strong>{productSelectionLabel(product, selection)}</strong></header>
      {variants.length > 1 && (
        <div className="product-configurator__variants" role="radiogroup" aria-label={`${product.name} option`}>
          {variants.map((variant) => <button key={variant.id} type="button" role="radio" aria-checked={variant.id === activeVariant.id} className={variant.id === activeVariant.id ? 'is-selected' : ''} onClick={() => updateVariant(variant.id)}><span>{variant.label}</span>{variant.id === activeVariant.id && <Check />}</button>)}
        </div>
      )}
      {mode === 'dealer-returned' || mode === 'monthly' ? (
        <div className="product-configurator__returned"><ClipboardCheck /><span><strong>{mode === 'monthly' ? 'Monthly vehicle-specific offer' : 'Configured with the original transaction'}</strong><small>The current Ford or Ford Credit offer supplies the final option, term, price, and agreement details.</small></span></div>
      ) : mode === 'fixed' ? (
        <div className="product-configurator__facts"><span><small>TERM</small><strong>{compactTerm(selection?.termMonths || activeVariant.defaults.termMonths)}</strong></span><span><small>MILEAGE</small><strong>{formatMiles(selection?.termMiles || activeVariant.defaults.termMiles)} miles</strong></span><span><small>ENGINE HOURS</small><strong>{formatMiles(selection?.engineHours || activeVariant.defaults.engineHours)}</strong></span></div>
      ) : (
        <div className="product-configurator__fields">
          <label><span>Coverage term</span><select value={selection?.termMonths || activeVariant.defaults.termMonths || ''} onChange={(event) => updateTerm(event.target.value)}>{activeVariant.termMonths.map((months) => <option key={months} value={months}>{compactTerm(months)}</option>)}</select></label>
          {mode === 'term-mileage' && <label><span>Mileage limit</span><select value={selection?.termMiles || activeVariant.defaults.termMiles || ''} onChange={(event) => onChange({ ...selection, variantId: activeVariant.id, termMiles: Number(event.target.value), powertrain })}>{mileChoices.map((miles) => <option key={miles} value={miles}>{formatMiles(miles)} miles</option>)}</select></label>}
          {activeVariant.serviceIntervals?.length > 0 && <label><span>Service interval</span><select value={selection?.serviceInterval || activeVariant.defaults.serviceInterval || ''} onChange={(event) => onChange({ ...selection, variantId: activeVariant.id, serviceInterval: Number(event.target.value), powertrain })}>{activeVariant.serviceIntervals.map((miles) => <option key={miles} value={miles}>Every {formatMiles(miles)} miles</option>)}</select></label>}
          {activeVariant.id === 'theftcare' && <label><span>Benefit preference</span><select value={selection?.benefitAmount || 2500} onChange={(event) => onChange({ ...selection, benefitAmount: Number(event.target.value), powertrain })}><option value="2500">$2,500</option><option value="5000">$5,000</option></select></label>}
        </div>
      )}
      <div className="product-configurator__basis"><Info /><span><strong>When this coverage starts</strong><small>{activeVariant.startBasisLabel}</small></span></div>
    </section>
  );
}

function ProductDetail({ product, selected, selection, powertrain, purchaseContext, onConfigure, onClose }) {
  const modalRef = useRef(null);
  const [draft, setDraft] = useState(() => normalizedProductSelection(product, selection, powertrain));
  useEffect(() => {
    setDraft(normalizedProductSelection(product, selection, powertrain));
  }, [product?.id, powertrain, selection]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    modalRef.current?.querySelector('button')?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const focusable = [...(modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); previousFocus?.focus?.(); };
  }, [onClose]);

  if (!product) return null;
  const benefits = product.benefits || product.highlights || [];
  const covered = product.covered || product.coverage || product.included || product.planOptions || [];
  const considerations = product.considerations || product.limits || product.important || product.cautions || [];
  const purchaseContextFit = productFitsPurchaseContext(product, purchaseContext);
  const selectable = product.selectable !== false && product.status?.eligible !== false && purchaseContextFit;
  const timingLabel = getProductPurchaseContexts(product).includes('owner')
    ? 'Available after vehicle purchase'
    : 'Available with vehicle purchase only';
  const eligibilityTitle = product.eligibilityTitle || product.eligibility?.headline || product.status?.label || 'Bob Maxey confirms the current Ford offer';
  const eligibilityText = product.status?.message || product.eligibility?.dealerConfirmation || product.saleWindow || 'Availability depends on the VIN, state, current mileage, warranty status, vehicle use, and current Ford program rules.';
  const validation = validateQuoteProductSelection(product.id, draft || {}, { includeDealerOnly: false });
  return (
    <div className="product-detail-backdrop" role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
      <article ref={modalRef} className="product-detail-modal">
        <header className="product-detail-modal__header">
          <div className="product-detail-modal__brand"><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /><span><small>{timingLabel}</small><strong>Product guide</strong></span></div>
          <button type="button" onClick={onClose} aria-label="Close product details"><X /></button>
        </header>
        <div className="product-detail-modal__scroll">
          <div className="product-detail-modal__hero">
            {product.image && <img src={assetUrl(product.image)} alt={product.imageAlt || product.name || product.title} />}
            <div><small>{product.eyebrow || product.familyLabel || 'FORD PROTECT PRODUCT'}</small><h2 id="product-detail-title">{product.name || product.title}</h2><p>{product.value || product.valueStatement || product.description || product.short}</p>{product.badge && <span className="product-badge">{product.badge}</span>}</div>
          </div>
          <div className="product-detail-modal__value"><ShieldCheck /><span><small>WHY CUSTOMERS CONSIDER IT</small><strong>{product.customerValue || product.value || product.valueStatement || product.description}</strong></span></div>
          <div className="product-detail-modal__columns">
            <section><h3>What it can help with</h3><ul>{benefits.map((item, index) => <li key={`${product.id}-benefit-${index}-${typeof item === 'string' ? item : item.title || item.text || 'item'}`}><CheckCircle2 /><span><strong>{typeof item === 'string' ? item : item.title}</strong>{typeof item === 'object' && item.text && <small>{item.text}</small>}</span></li>)}</ul></section>
            <section><h3>Coverage highlights</h3><ul>{covered.map((item, index) => <li key={`${product.id}-coverage-${index}-${typeof item === 'string' ? item : item.title || item.text || 'item'}`}><Check /><span>{typeof item === 'string' ? item : item.title}</span></li>)}</ul></section>
          </div>
          <div className="product-detail-modal__eligibility">
            <ClipboardCheck /><span><small>PURCHASE TIMING &amp; ELIGIBILITY</small><strong>{eligibilityTitle}</strong><p>{eligibilityText}</p></span>
          </div>
          <ProductConfigurator product={product} selection={draft} powertrain={powertrain} onChange={setDraft} />
          {product.eligibility?.inspectionPolicy && <div className="product-detail-modal__inspection is-clear"><ClipboardCheck /><span><small>INSPECTION / RECORD REVIEW</small><strong>Product-specific rule</strong><p>{product.eligibility.inspectionPolicy}</p></span></div>}
          {considerations.length > 0 && <section className="product-detail-modal__important"><h3>Important to know</h3><ul>{considerations.map((item, index) => <li key={`${product.id}-consideration-${index}-${typeof item === 'string' ? item : item.title || item.text || 'item'}`}>{typeof item === 'string' ? item : `${item.title}${item.text ? ` — ${item.text}` : ''}`}</li>)}</ul></section>}
          {!validation.valid && <p className="product-configurator__error" role="alert">{validation.message}</p>}
          <p className="product-detail-modal__agreement">The current Ford offer and issued agreement control eligibility, covered services, limits, exclusions, term, and price.</p>
        </div>
        <footer><button className="button button--secondary" type="button" onClick={onClose}>Back to products</button>{selectable && <button className={`button ${selected ? 'button--selected' : 'button--primary'}`} type="button" disabled={!validation.valid} onClick={() => { onConfigure(product.id, draft); onClose(); }}>{selected ? <><CheckCircle2 /> Update my request</> : <>Add configured product <PackagePlus /></>}</button>}</footer>
      </article>
    </div>
  );
}

function AfterSaleNotice({ purchaseContext, onClose }) {
  const shopping = purchaseContext === 'shopping';
  return (
    <div className="product-detail-backdrop" role="dialog" aria-modal="true" aria-labelledby="after-sale-title">
      <article className="product-detail-modal product-detail-modal--notice">
        <header className="product-detail-modal__header"><div className="product-detail-modal__brand"><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /><span><small>Clear purchase timing</small><strong>Why this list changes</strong></span></div><button type="button" onClick={onClose} aria-label="Close"><X /></button></header>
        <div className="product-detail-modal__scroll">
          <small>{shopping ? 'PLANNING BEFORE YOUR VEHICLE PURCHASE' : 'ADDING PRODUCTS AFTER THE VEHICLE SALE'}</small>
          <h2 id="after-sale-title">{shopping ? 'Build the protection package you want from delivery day.' : 'Only products that remain available after the sale can be selected.'}</h2>
          <p>{shopping ? 'This view includes products that must be chosen as part of the vehicle transaction as well as products that may remain available later. Purchase-timing labels make the difference clear before you add anything.' : 'Products Ford requires at the original vehicle purchase or lease signing are left out of an after-sale request. They remain part of the site’s educational guidance, but they cannot be added here after the transaction is complete.'}</p>
          <div className="purchase-rule-summary">
            <article><CarFront /><span><strong>With a Bob Maxey vehicle purchase</strong><small>Request transaction-only products and products that can also be sold later.</small></span></article>
            <article><KeyRound /><span><strong>After the vehicle sale</strong><small>Request only products whose current Ford rules permit post-sale enrollment.</small></span></article>
          </div>
          <div className="product-detail-modal__eligibility"><ShieldCheck /><span><strong>Every request still receives a Ford record review.</strong><p>VIN, warranty status, state, mileage, powertrain, vehicle use, and current program rules determine the final available products.</p></span></div>
        </div>
        <footer><button className="button button--primary" type="button" onClick={onClose}>Return to my quote <ArrowRight /></button></footer>
      </article>
    </div>
  );
}

function ProductCard({ product, selected, selection, featured = false, onDetails, onRemove }) {
  const highlights = (product.highlights || product.benefits || []).slice(0, 2);
  const availableAfterSale = getProductPurchaseContexts(product).includes('owner');
  const timingLabel = product.purchaseTimingLabel || (availableAfterSale ? 'Available after purchase' : 'Vehicle-purchase only');
  return (
    <article className={`quote-product-card ${selected ? 'is-selected' : ''}`} data-product-id={product.id}>
      <div className="quote-product-card__media">
        {product.image && <img src={assetUrl(product.image)} alt={product.imageAlt || product.name || product.title} />}
        {selected && <span className="quote-product-card__selected"><Check /> Selected</span>}
        <span className={`quote-product-card__timing ${availableAfterSale ? 'is-after-sale' : 'is-sale-only'}`}>{timingLabel}</span>
      </div>
      <div className="quote-product-card__body">
        <div className="quote-product-card__title"><span className="quote-product-card__icon">{product.category === 'maintenance' ? <Wrench /> : product.category === 'mobility' ? <CarFront /> : <ShieldCheck />}</span><span><small>{product.eyebrow || product.familyLabel || 'FORD PROTECT'}</small><h3>{product.name || product.title}</h3></span></div>
        <p>{product.cardDescription || product.value || product.valueStatement || product.description || product.short}</p>
        <div className="quote-product-card__highlights">{highlights.map((item) => <span key={typeof item === 'string' ? item : item.title}><CheckCircle2 /> {typeof item === 'string' ? item : item.title}</span>)}</div>
        {selected && <div className="quote-product-card__configuration"><span><small>YOUR REQUEST</small><strong>{productSelectionLabel(product, selection)}</strong></span><CheckCircle2 /></div>}
        <div className="quote-product-card__actions"><button className="product-detail-link" type="button" onClick={() => onDetails(product.id)}>{selected ? 'Edit options' : 'Full details'} <ArrowRight /></button><button className={`button ${selected ? 'button--secondary' : 'button--primary'}`} type="button" onClick={() => selected ? onRemove(product.id) : onDetails(product.id)}>{selected ? <>Remove</> : <>Choose options <PackagePlus /></>}</button></div>
      </div>
    </article>
  );
}

function ProposalPreview({ quote, plan, detail, onClose, onDownload, busy }) {
  const [pageIndex, setPageIndex] = useState(0);
  const model = buildProposalModel({ quote, plan, detail });
  const groups = model.coverage.groups || [];
  const products = model.products.additionalProducts || [];
  const pages = [
    <section className="proposal-document proposal-document--cover" key="cover">
      <header><img src={assetUrl('/assets/bob-maxey-logo.png')} alt="Bob Maxey" /><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /></header>
      <div className="proposal-document__hero"><img src={assetUrl(model.cover.vehicleImage)} alt={model.cover.vehicleImageAlt} /><div><small>{model.cover.eyebrow}</small><h2>{model.cover.headline}</h2><p>{model.cover.subhead}</p></div></div>
      <div className="proposal-document__body"><small>PREPARED FOR</small><h3>{model.cover.preparedFor}</h3><p>{model.cover.vehicle}</p><p className="proposal-document__journey">{model.cover.purchaseContextLabel}</p><div className="proposal-document__selection"><span><small>Selected plan</small><strong>{model.cover.planName}</strong></span><span><small>Term</small><strong>{model.cover.termLabel}</strong></span><span><small>Mileage</small><strong>{model.cover.mileageLabel}</strong></span><span><small>Deductible</small><strong>{model.cover.deductibleLabel}</strong></span></div><div className="proposal-document__band"><ShieldCheck /><span><strong>Ford-backed protection. Bob Maxey support.</strong><small>Reference {model.document.quoteId}</small></span></div></div>
    </section>,
    <section className="proposal-document" key="coverage">
      <header><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /><span><small>YOUR SELECTED COVERAGE</small><strong>{plan.name}</strong></span></header>
      <div className="proposal-document__body"><small>PLAN OVERVIEW</small><h2>{model.coverage.headline}</h2><p>{model.overview.coverageModel}</p><div className="proposal-document__coverage-grid">{groups.map((group) => <article key={group.title}><CheckCircle2 /><div><h3>{group.title}</h3><p>{group.summary}</p><ul>{group.items.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul></div></article>)}</div><p className="proposal-document__legal">{model.coverage.note}</p></div>
    </section>,
    <section className="proposal-document" key="products">
      <header><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /><span><small>PERSONALIZED REQUEST</small><strong>Added protection</strong></span></header>
      <div className="proposal-document__body"><small>ADDITIONAL FORD PROTECT PRODUCTS</small><h2>Protection selected around your ownership needs.</h2>{products.length ? <div className="proposal-document__products">{products.map((product) => <article key={product.id}><img src={assetUrl(product.image)} alt={product.imageAlt} /><div><small>{product.familyLabel}</small><h3>{product.name}</h3>{product.configuration?.labels?.length > 0 && <p className="proposal-document__configuration">{product.configuration.labels.join(' · ')}</p>}<p>{product.value || product.description}</p><ul>{product.highlights.slice(0, 4).map((item) => <li key={item}><Check /> {item}</li>)}</ul></div></article>)}</div> : <div className="proposal-document__empty"><PackagePlus /><h3>No additional products requested</h3><p>The primary coverage request remains ready for specialist review.</p></div>}<div className="proposal-document__inspection"><ClipboardCheck /><span><small>INSPECTION PATH</small><strong>{model.overview.inspection.title}</strong><p>{model.overview.inspection.message}</p></span></div></div>
    </section>,
    <section className="proposal-document" key="next">
      <header><img src={assetUrl('/assets/bob-maxey-logo.png')} alt="Bob Maxey" /><span><small>BOB MAXEY SUPPORT</small><strong>Your next steps</strong></span></header>
      <div className="proposal-document__body"><small>WHAT HAPPENS NEXT</small><h2>Your specialist turns this request into an exact Ford offer.</h2><div className="proposal-document__steps">{model.nextSteps.map((item) => <article key={item.number}><strong>{item.number}</strong><span><h3>{item.title}</h3><p>{item.text}</p></span></article>)}</div><div className="proposal-document__summary"><h3>Request summary</h3><dl><div><dt>Journey</dt><dd>{model.requestSummary.purchaseContextLabel}</dd></div><div><dt>Customer</dt><dd>{model.requestSummary.customer.fullName}</dd></div><div><dt>Vehicle</dt><dd>{model.requestSummary.vehicle.displayName}</dd></div><div><dt>Coverage</dt><dd>{model.requestSummary.coverage.planName}</dd></div><div><dt>Payment preference</dt><dd>{model.requestSummary.payment.preference}</dd></div><div><dt>Preferred location</dt><dd>{model.requestSummary.store.descriptor}</dd></div><div><dt>Reference</dt><dd>{model.document.quoteId}</dd></div></dl></div><p className="proposal-document__legal">{model.disclaimer}</p></div>
    </section>,
  ];
  return (
    <div className="proposal-backdrop" role="dialog" aria-modal="true" aria-label="Proposal preview">
      <div className="proposal-preview">
        <header><Brand /><div><small>PERSONALIZED CUSTOMER PROPOSAL</small><strong>Page {pageIndex + 1} of {pages.length}</strong></div><button type="button" onClick={onClose} aria-label="Close preview"><X /></button></header>
        <div className="proposal-preview__workspace"><nav aria-label="Proposal pages">{pages.map((_, index) => <button key={index} type="button" className={pageIndex === index ? 'is-current' : ''} onClick={() => setPageIndex(index)}><span>{index + 1}</span><small>{['Cover', 'Coverage', 'Products', 'Next steps'][index]}</small></button>)}</nav><div className="proposal-preview__page">{pages[pageIndex]}</div></div>
        <footer><button className="button button--secondary" type="button" onClick={() => setPageIndex(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0}><ArrowLeft /> Previous</button><span><button className="back-link" type="button" onClick={onClose}>Close preview</button><button className="button button--primary" type="button" onClick={onDownload} disabled={busy}>{busy ? 'Designing PDF…' : 'Download professional PDF'} <Download /></button></span><button className="button button--secondary" type="button" onClick={() => setPageIndex(Math.min(pages.length - 1, pageIndex + 1))} disabled={pageIndex === pages.length - 1}>Next <ArrowRight /></button></footer>
      </div>
    </div>
  );
}

function TermMatrix({ matrix, quote, recommendation, onOpenMatrix, onMonth, onMiles, onUseMatch }) {
  const validMiles = matrix.miles.filter((miles) => matrix.isAvailable(quote.termMonths, miles));
  const termRailRef = useRef(null);
  const mileageRailRef = useRef(null);
  const recommendationSelected = Boolean(
    recommendation
    && quote.termMonths === recommendation.months
    && quote.termMiles === recommendation.miles,
  );

  useEffect(() => {
    const centerSelection = () => {
      [termRailRef.current, mileageRailRef.current].forEach((rail) => {
        const selected = rail?.querySelector('[aria-pressed="true"]');
        const selectedRadio = rail?.querySelector('[aria-checked="true"]');
        const activeChoice = selected || selectedRadio;
        if (!activeChoice || rail.scrollWidth <= rail.clientWidth) return;
        rail.scrollLeft = Math.max(0, activeChoice.offsetLeft - (rail.clientWidth - activeChoice.offsetWidth) / 2);
      });
    };
    const frame = window.requestAnimationFrame(centerSelection);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(centerSelection);
    [termRailRef.current, mileageRailRef.current].forEach((rail) => rail && observer?.observe(rail));
    window.addEventListener('resize', centerSelection);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', centerSelection);
    };
  }, [quote.termMonths, quote.termMiles, validMiles.length]);

  return (
    <div className="term-configurator">
      {recommendation && (
        <section className={`term-recommendation ${recommendationSelected ? 'is-applied' : ''}`} aria-label="Recommended term and mileage">
          <span className="term-recommendation__icon">{recommendationSelected ? <Check /> : <Sparkles />}</span>
          <span className="term-recommendation__copy">
            <small>{recommendation?.meetsGoal ? 'MATCHED TO YOUR DRIVING' : 'CLOSEST PUBLISHED OPTION'}</small>
            <strong>{formatTerm(recommendation.months)} · {formatMiles(recommendation.miles)} miles</strong>
            <span>{recommendation?.meetsGoal ? `Based on keeping your Ford about ${quote.keepYears} years and driving ${formatMiles(quote.annualMiles)} miles per year.` : 'This is the closest published combination to your ownership goal.'}</span>
          </span>
          <button type="button" onClick={onUseMatch} disabled={recommendationSelected} aria-label={recommendationSelected ? 'Recommended option is selected' : 'Use recommended term and mileage'}>
            <span className="term-recommendation__action-full">{recommendationSelected ? 'Recommended option selected' : 'Use recommended option'}</span>
            <span className="term-recommendation__action-compact">{recommendationSelected ? 'Selected' : 'Use'}</span>
            {!recommendationSelected && <ArrowRight />}
          </button>
        </section>
      )}

      <div className="guided-term-picker">
        <section className="term-dimension" aria-labelledby="term-duration-label">
          <header className="term-row-heading">
            <span><CalendarDays /><span><small>DURATION</small><strong id="term-duration-label">Protection term</strong></span></span>
            <output aria-live="polite">{formatTerm(quote.termMonths)}</output>
          </header>
          <div className="term-choice-rail" ref={termRailRef} role="radiogroup" aria-label="Protection term">
            {matrix.months.map((months) => {
              const wholeYears = months % 12 === 0;
              const selected = quote.termMonths === months;
              const matched = recommendation?.months === months;
              const value = wholeYears ? months / 12 : months;
              const unit = wholeYears ? (months === 12 ? 'year' : 'years') : 'months';
              return (
                <button key={months} type="button" role="radio" aria-checked={selected} aria-label={`${formatTerm(months)}${matched ? ', recommended duration' : ''}`} className={`${selected ? 'is-selected' : ''} ${matched ? 'is-match' : ''}`} onClick={() => onMonth(months)}>
                  <strong>{value}</strong><small>{unit}</small>
                  {matched && <span className="term-choice__recommendation" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="term-dimension" aria-labelledby="term-mileage-label">
          <header className="term-row-heading">
            <span><Gauge /><span><small>{quote.planPath === 'used' ? 'FROM CONTRACT START' : 'ODOMETER LIMIT'}</small><strong id="term-mileage-label">{quote.planPath === 'used' ? 'Additional mileage' : 'Mileage limit'}</strong></span></span>
            <output aria-live="polite">{formatMiles(quote.termMiles)} miles</output>
          </header>
          <div className="term-choice-rail" ref={mileageRailRef} role="radiogroup" aria-label={quote.planPath === 'used' ? 'Additional mileage' : 'Total mileage limit'}>
            {validMiles.map((miles) => {
              const selected = quote.termMiles === miles;
              const matched = recommendation?.miles === miles && recommendation?.months === quote.termMonths;
              return (
                <button key={miles} type="button" role="radio" aria-checked={selected} aria-label={`${formatMiles(miles)} miles${matched ? ', recommended mileage for the selected term' : ''}`} className={`${selected ? 'is-selected' : ''} ${matched ? 'is-match' : ''}`} onClick={() => onMiles(miles)}>
                  <strong>{miles / 1000}k</strong><small>miles</small>
                  {matched && <span className="term-choice__recommendation" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <footer className="term-configurator__footer">
          <p><Info /> {quote.planPath === 'used' ? 'Mileage is added from the odometer reading when coverage begins.' : 'Mileage is the total odometer limit for the plan.'}</p>
          <button className="matrix-toggle" type="button" onClick={onOpenMatrix}><Grid3X3 /> Compare all combinations <ArrowRight /></button>
        </footer>
      </div>
    </div>
  );
}

function MatrixDrawer({ matrix, quote, recommendation, onClose, onMonth, onMiles }) {
  return (
    <div className="matrix-drawer-backdrop" role="dialog" aria-modal="true" aria-label="All available term and mileage combinations">
      <section className="matrix-drawer">
        <header><div><small>Complete term matrix</small><h2>Every available combination</h2><p>Choose any available years-and-mileage pairing. Ford record review confirms the final options.</p></div><button type="button" onClick={onClose} aria-label="Close term matrix"><X /></button></header>
        <div className="matrix-drawer__scroll">
          <div className="term-matrix" style={{ '--term-columns': matrix.months.length }}>
            <div className="term-matrix__corner">{quote.planPath === 'used' ? 'Additional miles' : 'Total mileage'}</div>
            {matrix.months.map((months) => <div className={`term-matrix__month ${quote.termMonths === months ? 'is-selected' : ''}`} key={months}>{months / 12}<small>years</small></div>)}
            {matrix.miles.map((miles) => (
              <div className="term-matrix__row" key={miles}>
                <div className="term-matrix__miles">{miles / 1000}k</div>
                {matrix.months.map((months) => {
                  const available = matrix.isAvailable(months, miles);
                  const selected = quote.termMonths === months && quote.termMiles === miles;
                  const matched = recommendation?.months === months && recommendation?.miles === miles;
                  return <button key={months} type="button" disabled={!available} className={`${selected ? 'is-selected' : ''} ${matched ? 'is-match' : ''}`} onClick={() => { onMonth(months); onMiles(miles); }} aria-label={available ? `${formatTerm(months)}, ${formatMiles(miles)} miles` : 'Combination not available'}>{available ? selected ? <Check /> : matched ? <Sparkles /> : <span className="availability-dot" /> : '—'}</button>;
                })}
              </div>
            ))}
          </div>
        </div>
        <footer><span><small>Selected combination</small><strong>{formatTerm(quote.termMonths)} · {formatMiles(quote.termMiles)} miles</strong></span><button className="button button--primary" type="button" onClick={onClose}>Use selected combination <Check /></button></footer>
      </section>
    </div>
  );
}

export default function QuoteStudio({ initial = {}, onClose, onToast, onSaved }) {
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [planHelp, setPlanHelp] = useState(false);
  const [productHelpId, setProductHelpId] = useState('');
  const [afterSaleNotice, setAfterSaleNotice] = useState(false);
  const [productCategory, setProductCategory] = useState('recommended');
  const [optionsPanel, setOptionsPanel] = useState('products');
  const [showMatrix, setShowMatrix] = useState(false);
  const [proposalPreview, setProposalPreview] = useState(false);
  const [busy, setBusy] = useState('');
  const [crmStatus, setCrmStatus] = useState(null);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [showPurchaseContextError, setShowPurchaseContextError] = useState(false);
  const vinRef = useRef(null);
  const [quote, setQuote] = useState(() => ({
    id: initial.id || `BMX-${Date.now().toString().slice(-8)}`,
    purchaseContext: initial.purchaseContext || '',
    vin: initial.vin || '',
    year: initial.year || '2024',
    make: initial.make || 'Ford',
    model: initial.model || 'Edge AWD',
    mileage: initial.mileage || '25000',
    zip: initial.zip || '',
    state: initial.state || 'Michigan',
    inService: initial.inService || '2024-02-15',
    usage: initial.usage || 'Personal',
    powertrain: initial.powertrain || 'Gas',
    snowPlow: initial.snowPlow || 'No',
    program: initial.program || 'esp',
    planPath: initial.planPath || 'new',
    planId: initial.planId || (initial.powertrain === 'Electric' ? 'premium-plus-ev' : 'premium'),
    cspLevel: initial.cspLevel || 'ultimate',
    engineCareLevel: initial.engineCareLevel || 'diesel-enginecare-plus',
    termMonths: initial.termMonths || (initial.termYears ? Number(initial.termYears) * 12 : 84),
    termMiles: Number(initial.termMiles || 100000),
    deductible: String(initial.deductible ?? '100'),
    addOns: initial.addOns || [],
    requestedProductIds: initial.requestedProductIds || [],
    productSelections: initial.productSelections || {},
    maintenanceId: initial.maintenanceId || 'none',
    maintenanceName: initial.maintenanceName || '',
    maintenanceInterval: Number(initial.maintenanceInterval || 7500),
    keepYears: Number(initial.keepYears || 5),
    annualMiles: Number(initial.annualMiles || 12000),
    paymentPreference: initial.paymentPreference || 'Review the small-down-payment, 0%-interest option',
    store: initial.store || 'Howell',
    preferredContact: initial.preferredContact || 'phone',
    notes: initial.notes || '',
    consent: Boolean(initial.consent),
    customer: {
      firstName: initial.customer?.firstName || '',
      lastName: initial.customer?.lastName || '',
      email: initial.customer?.email || '',
      phone: initial.customer?.phone || '',
      city: initial.customer?.city || '',
    },
  }));

  const applicablePlans = useMemo(() => quote.powertrain === 'Electric' ? evPlanData : planData, [quote.powertrain]);
  const espPlan = useMemo(() => applicablePlans.find((item) => item.id === quote.planId) ?? applicablePlans[0], [applicablePlans, quote.planId]);
  const cspLevel = cspLevels.find((item) => item.id === quote.cspLevel) || cspLevels[0];
  const dieselCareLevel = dieselCareLevels.find((item) => item.id === quote.engineCareLevel) || dieselCareLevels[0];
  const plan = quote.program === 'csp'
    ? { id: 'continued-service', name: `Continued Service Plan ${cspLevel.name}`, count: 'Monthly', bestFor: cspLevel.label, description: cspLevel.description }
    : quote.program === 'enginecare'
      ? { ...dieselCareLevel, bestFor: dieselCareLevel.label }
      : espPlan;
  const detail = quote.program === 'enginecare' ? dieselCareDetail : productDetails[quote.program === 'csp' ? 'continued-service' : plan.id];
  const modelOptions = modelsByMake[quote.make] ?? [];
  const matrix = useMemo(() => getTermMatrix({ planId: espPlan.id, planPath: quote.planPath, mileage: quote.mileage }), [espPlan.id, quote.planPath, quote.mileage]);
  const recommendation = useMemo(() => findBestCombination({ matrix, planPath: quote.planPath, inService: quote.inService, currentMileage: quote.mileage, keepYears: quote.keepYears, annualMiles: quote.annualMiles }), [matrix, quote.planPath, quote.inService, quote.mileage, quote.keepYears, quote.annualMiles]);
  const availableAddOns = protectionOptions.filter((option) => option.planIds === 'all' || option.planIds.includes(espPlan.id));
  const availableMaintenance = maintenanceChoices.filter((choice) => choice.id === 'none' || (quote.powertrain === 'Electric' ? choice.id === 'premium-maintenance-ev' : choice.id === 'premium-maintenance'));
  const productCatalog = useMemo(() => getQuoteProductCatalog(quote)
    .filter((item) => !['extended-service-plan', 'continued-service-plan', 'diesel-enginecare'].includes(item.id) && item.status?.eligible !== false)
    .filter((item) => productFitsPurchaseContext(item, quote.purchaseContext))
    .map((item) => ({
      ...item,
      category: item.category || (item.familyId === 'maintenance' ? 'maintenance' : item.familyId === 'mobility' ? 'mobility' : 'specialist'),
    })), [quote.year, quote.make, quote.mileage, quote.inService, quote.powertrain, quote.program, quote.planPath, quote.usage, quote.state, quote.purchaseContext]);
  const selectedProducts = useMemo(() => quoteProducts.filter((item) => quote.requestedProductIds.includes(item.id)), [quote.requestedProductIds]);
  const inspection = useMemo(() => {
    if (quote.program === 'csp') return { required: false, title: 'No CSP enrollment inspection required', shortLabel: 'No inspection required', text: 'Ford’s current Continued Service Plan buyer guide states that CSP enrollment has no waiting period or vehicle inspection requirement.' };
    if (quote.program === 'enginecare') return { required: null, title: 'Diesel program record review', shortLabel: 'Engine, mileage and hours review', text: 'Diesel EngineCARE uses its own Power Stroke engine, time, mileage, engine-hour, vehicle-use, and current-program eligibility review. Any inspection requirement comes from the current Ford offer.' };
    const result = getWarrantyInspectionStatus(quote);
    return {
      ...result,
      required: result.inspectionRequiredForUsedEsp === true,
      title: result.label,
      shortLabel: result.inspectionRequiredForUsedEsp === true ? 'Inspection required before enrollment' : result.inspectionRequiredForUsedEsp === false ? 'No used-vehicle inspection expected' : 'Ford record review needed',
      text: result.message,
    };
  }, [quote.year, quote.make, quote.mileage, quote.inService, quote.program, quote.planPath]);
  const productHelp = productCatalog.find((item) => item.id === productHelpId) || quoteProducts.find((item) => item.id === productHelpId);
  const productCategories = useMemo(() => {
    const categories = [...new Set(productCatalog.map((item) => item.category).filter(Boolean))];
    return ['recommended', 'all', ...categories];
  }, [productCatalog]);
  const visibleProducts = productCategory === 'recommended'
    ? productCatalog.slice(0, 3)
    : productCategory === 'all'
      ? productCatalog
      : productCatalog.filter((item) => item.category === productCategory);
  const phoneDigits = quote.customer.phone.replace(/\D/g, '');
  const detailsValid = Boolean(quote.customer.firstName.trim() && quote.customer.lastName.trim() && /\S+@\S+\.\S+/.test(quote.customer.email) && phoneDigits.length >= 10 && quote.consent);

  const eligibility = useMemo(() => {
    const mileage = Number(quote.mileage || 0);
    if (quote.program === 'csp' && quote.state === 'California') return { tone: 'review', title: 'CSP not available in California', text: 'Choose an Extended Service Plan path or request a specialist review.' };
    if (quote.program === 'enginecare') return { tone: 'review', title: 'Power Stroke specialist review', text: 'Bob Maxey will confirm the engine family, in-service date, current mileage, engine hours, vehicle use, state, and current Ford offer.' };
    if (mileage > 160000) return { tone: 'review', title: 'Specialist path required', text: 'The historical guide’s standard used-plan matrix ends at 160,000 current miles.' };
    if (quote.snowPlow === 'Yes' || quote.usage === 'Business') return { tone: 'review', title: 'Special-use review required', text: 'Commercial or snow-plow use must be rated and verified correctly.' };
    if (quote.program === 'esp' && quote.planPath === 'new' && !quote.inService) return { tone: 'review', title: 'In-service date needed', text: 'New-plan time and mileage are measured from the original in-service date and zero miles.' };
    if (inspection.required) return { tone: 'review', title: 'Dealer inspection required first', text: 'This vehicle appears outside the New Vehicle Limited Warranty. Bob Maxey must complete the used-vehicle inspection before ESP coverage can be finalized.' };
    return { tone: 'positive', title: inspection.title || 'Ready for Ford record review', text: inspection.text || 'Bob Maxey will confirm the VIN, current eligibility, available combinations, and price.' };
  }, [quote.program, quote.state, quote.mileage, quote.snowPlow, quote.usage, quote.planPath, quote.inService, inspection.required, inspection.title, inspection.text]);

  useEffect(() => {
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    if (initial.focusVin) window.setTimeout(() => vinRef.current?.focus(), 180);
    const escape = (event) => {
      if (event.key !== 'Escape') return;
      if (proposalPreview) setProposalPreview(false);
      else if (productHelpId) setProductHelpId('');
      else if (afterSaleNotice) setAfterSaleNotice(false);
      else if (planHelp) setPlanHelp(false);
      else onClose();
    };
    window.addEventListener('keydown', escape);
    return () => {
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', escape);
    };
  }, [initial.focusVin, onClose, planHelp, proposalPreview, productHelpId, afterSaleNotice]);

  useEffect(() => {
    if (quote.program !== 'esp' || !matrix.months.length) return;
    if (matrix.isAvailable(quote.termMonths, quote.termMiles)) return;
    const fallback = recommendation || { months: matrix.months[0], miles: matrix.miles.find((miles) => matrix.isAvailable(matrix.months[0], miles)) };
    if (!fallback?.miles) return;
    setQuote((current) => ({ ...current, termMonths: fallback.months, termMiles: fallback.miles }));
  }, [matrix, quote.program, quote.termMonths, quote.termMiles, recommendation]);

  useEffect(() => {
    const allowedIds = new Set(productCatalog.map((item) => item.id));
    setQuote((current) => {
      const requestedProductIds = current.requestedProductIds.filter((id) => allowedIds.has(id));
      const productSelections = {};
      requestedProductIds.forEach((id) => {
        const product = quoteProducts.find((item) => item.id === id);
        if (product) productSelections[id] = normalizedProductSelection(product, current.productSelections?.[id], current.powertrain);
      });
      const idsChanged = requestedProductIds.length !== current.requestedProductIds.length;
      const selectionsChanged = JSON.stringify(productSelections) !== JSON.stringify(current.productSelections || {});
      if (!idsChanged && !selectionsChanged) return current;
      const maintenanceSelected = requestedProductIds.includes(current.maintenanceId);
      return {
        ...current,
        requestedProductIds,
        productSelections,
        maintenanceId: maintenanceSelected ? current.maintenanceId : 'none',
        maintenanceName: maintenanceSelected ? current.maintenanceName : '',
      };
    });
  }, [productCatalog]);

  const goTo = (next) => {
    if (step === 0 && next > 0 && !quote.purchaseContext) {
      setShowPurchaseContextError(true);
      window.setTimeout(() => document.querySelector('.studio-v5 .purchase-context-selector__choices button')?.focus(), 80);
      return false;
    }
    if (next === 5 && !detailsValid) {
      setShowErrors(true);
      setStep(4);
      setMaxStep((current) => Math.max(current, 4));
      window.setTimeout(() => document.querySelector('.studio-v5 .studio-field.has-error input, .studio-v5 .consent-check.has-error input')?.focus(), 80);
      return false;
    }
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
    const main = document.querySelector('.studio-main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  const update = (field, value) => {
    setQuote((current) => {
      const next = {
        ...current,
        [field]: value,
        ...(field === 'make' ? { model: '' } : {}),
        ...(field === 'powertrain' ? { planId: value === 'Electric' ? 'premium-plus-ev' : 'premium', maintenanceId: 'none', maintenanceName: '', ...(value !== 'Diesel' && current.program === 'enginecare' ? { program: 'esp' } : {}) } : {}),
      };
      if (field === 'program' && value !== 'esp') next.addOns = [];
      if (field === 'planId') next.addOns = current.addOns.filter((id) => {
        const option = protectionOptions.find((item) => item.id === id);
        return option?.planIds === 'all' || option?.planIds.includes(value);
      });
      return next;
    });
    setSaved(false);
    setCrmStatus(null);
  };

  const selectPurchaseContext = (purchaseContext) => {
    setQuote((current) => {
      const requestedProductIds = current.requestedProductIds.filter((id) => {
        const product = quoteProducts.find((item) => item.id === id);
        return !product || productFitsPurchaseContext(product, purchaseContext);
      });
      const selectedMaintenanceStillFits = current.maintenanceId === 'none' || requestedProductIds.includes(current.maintenanceId);
      const productSelections = Object.fromEntries(Object.entries(current.productSelections || {}).filter(([id]) => requestedProductIds.includes(id)));
      return {
        ...current,
        purchaseContext,
        program: purchaseContext === 'shopping' && current.program === 'csp' ? 'esp' : current.program,
        requestedProductIds,
        productSelections,
        maintenanceId: selectedMaintenanceStillFits ? current.maintenanceId : 'none',
        maintenanceName: selectedMaintenanceStillFits ? current.maintenanceName : '',
      };
    });
    setShowPurchaseContextError(false);
    setProductHelpId('');
    setSaved(false);
    setCrmStatus(null);
  };

  const updateCustomer = (field, value) => {
    setQuote((current) => ({ ...current, customer: { ...current.customer, [field]: value } }));
    setSaved(false);
    setCrmStatus(null);
  };

  const chooseMonth = (months) => {
    const validMiles = matrix.miles.filter((miles) => matrix.isAvailable(months, miles));
    const nextMiles = validMiles.includes(quote.termMiles)
      ? quote.termMiles
      : validMiles.find((miles) => miles >= quote.termMiles) || validMiles.at(-1);
    setQuote((current) => ({ ...current, termMonths: months, termMiles: nextMiles }));
    setSaved(false);
  };

  const toggleAddOn = (id) => {
    setQuote((current) => ({ ...current, addOns: current.addOns.includes(id) ? current.addOns.filter((item) => item !== id) : [...current.addOns, id] }));
    setSaved(false);
  };

  const toggleRequestedProduct = (id) => {
    const product = quoteProducts.find((item) => item.id === id);
    if (!product) return;
    setQuote((current) => {
      const alreadySelected = current.requestedProductIds.includes(id);
      let requestedProductIds = alreadySelected
        ? current.requestedProductIds.filter((item) => item !== id)
        : [...current.requestedProductIds, id];
      let productSelections = { ...(current.productSelections || {}) };
      if (alreadySelected) delete productSelections[id];
      else productSelections[id] = defaultProductSelection(product, current.powertrain);
      let maintenanceId = current.maintenanceId;
      let maintenanceName = current.maintenanceName;
      if (product.family === 'maintenance' || product.familyId === 'maintenance' || product.category === 'maintenance') {
        const maintenanceIds = quoteProducts.filter((item) => item.family === 'maintenance' || item.familyId === 'maintenance' || item.category === 'maintenance').map((item) => item.id);
        requestedProductIds = alreadySelected
          ? requestedProductIds
          : [...requestedProductIds.filter((item) => !maintenanceIds.includes(item)), id];
        if (!alreadySelected) maintenanceIds.filter((item) => item !== id).forEach((item) => { delete productSelections[item]; });
        maintenanceId = alreadySelected ? 'none' : id;
        maintenanceName = alreadySelected ? '' : (product.name || product.title);
      }
      return { ...current, requestedProductIds, productSelections, maintenanceId, maintenanceName };
    });
    setSaved(false);
    setCrmStatus(null);
  };

  const configureRequestedProduct = (id, selection) => {
    const product = quoteProducts.find((item) => item.id === id);
    if (!product) return;
    setQuote((current) => {
      const maintenanceProduct = product.family === 'maintenance' || product.familyId === 'maintenance' || product.category === 'maintenance';
      const maintenanceIds = maintenanceProduct
        ? quoteProducts.filter((item) => item.family === 'maintenance' || item.familyId === 'maintenance' || item.category === 'maintenance').map((item) => item.id)
        : [];
      const requestedProductIds = maintenanceProduct
        ? [...current.requestedProductIds.filter((item) => !maintenanceIds.includes(item)), id]
        : current.requestedProductIds.includes(id) ? current.requestedProductIds : [...current.requestedProductIds, id];
      const productSelections = { ...(current.productSelections || {}) };
      maintenanceIds.filter((item) => item !== id).forEach((item) => { delete productSelections[item]; });
      productSelections[id] = { ...selection, productId: id, powertrain: current.powertrain };
      return {
        ...current,
        requestedProductIds,
        productSelections,
        maintenanceId: maintenanceProduct ? id : current.maintenanceId,
        maintenanceName: maintenanceProduct ? (product.name || product.title) : current.maintenanceName,
        maintenanceInterval: maintenanceProduct && selection?.serviceInterval ? Number(selection.serviceInterval) : current.maintenanceInterval,
      };
    });
    setSaved(false);
    setCrmStatus(null);
  };

  const selectMaintenance = (id) => {
    const choice = maintenanceChoices.find((item) => item.id === id);
    setQuote((current) => ({ ...current, maintenanceId: id, maintenanceName: choice?.title || '' }));
    setSaved(false);
  };

  const quoteForOutput = () => ({
    ...quote,
    planName: plan.name,
    maintenanceName: quote.maintenanceName || maintenanceChoices.find((item) => item.id === quote.maintenanceId)?.title || '',
    additionalProducts: selectedProducts,
    inspection,
  });

  const saveQuote = () => {
    const saved = { ...quoteForOutput(), savedAt: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('bobMaxeyProtectQuotes') || '[]');
    localStorage.setItem('bobMaxeyProtectQuotes', JSON.stringify([saved, ...existing.filter((item) => item.id !== saved.id)].slice(0, 8)));
    onSaved?.(saved);
    setSaved(true);
    onToast(`Quote ${saved.id} saved in this browser.`);
  };

  const continueQuote = () => {
    if (step === 4) {
      setShowErrors(true);
      if (!detailsValid) {
        window.setTimeout(() => document.querySelector('.studio-v5 .studio-field.has-error input, .studio-v5 .consent-check.has-error input')?.focus(), 80);
        return;
      }
    }
    goTo(Math.min(5, step + 1));
  };

  const downloadProposal = async () => {
    setBusy('pdf');
    try {
      const { downloadProposalPdf } = await import('../proposalPdf');
      await downloadProposalPdf({ quote: quoteForOutput(), plan, detail });
      onToast('Your personalized Bob Maxey Ford Protect proposal is ready.');
    } catch (error) {
      console.error(error);
      onToast('The proposal could not be created. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const downloadSelectedProductGuide = async (product) => {
    const busyKey = `guide-${product.id}`;
    setBusy(busyKey);
    try {
      const { downloadProductGuidePdf } = await import('../proposalPdf');
      await downloadProductGuidePdf({
        product,
        selection: quote.productSelections?.[product.id] || {},
        quote: quoteForOutput(),
      });
      onToast(`${product.name} product guide is ready.`);
    } catch (error) {
      console.error(error);
      onToast('The product guide could not be created. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const leadXml = () => createAdfXml({ quote: quoteForOutput(), plan, pageUrl: window.location.href, referrer: document.referrer });

  const downloadXml = () => {
    downloadLeadXml(leadXml(), quote.id);
    setCrmStatus({ tone: 'setup', title: 'CRM test file downloaded', text: `No customer data was sent. The XML is formatted for the ${CRM_DESTINATION} DealerMail lead route.` });
  };

  const sendLead = async () => {
    setShowErrors(true);
    if (!detailsValid) {
      setCrmStatus({ tone: 'error', title: 'Contact details are incomplete', text: 'Add the required customer details and permission before sending the request.' });
      return;
    }
    setBusy('crm');
    try {
      const xml = leadXml();
      const result = await submitCrmLead({ xml, quote: quoteForOutput() });
      if (!result.configured) {
        setCrmStatus({ tone: 'setup', title: 'We could not send your request yet', text: 'No customer data was sent. Please try again or contact your preferred Bob Maxey location for help.' });
        return;
      }
      if (!result.accepted) throw new Error('The request could not be confirmed as received. No success message was shown.');
      saveQuote();
      const receipt = { leadId: result.leadId || quote.id, receivedAt: result.receivedAt || new Date().toISOString() };
      setSubmissionReceipt(receipt);
      setCrmStatus({ tone: 'success', title: 'Request delivered to Bob Maxey', text: `Quote ${quote.id} was accepted as an F&I Product Only Sale lead.` });
    } catch (error) {
      console.error(error);
      setCrmStatus({ tone: 'error', title: 'Request was not delivered', text: 'Nothing was marked sent. Please try again or contact the dealership.' });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="studio-backdrop studio-v5" role="dialog" aria-modal="true" aria-label="Build your Ford Protect quote">
      <div className="quote-studio">
        <header className="studio-header">
          <div className="studio-header__brand"><Brand /><span><small>Bob Maxey coverage center</small><strong>Ford Protect</strong></span></div>
          <div className="studio-header__center"><small>BOB MAXEY FORD PROTECT</small><strong className="studio-header__title">Build your protection request</strong><span>{step === 0 ? quote.purchaseContext === 'shopping' ? 'Planning protection with a Bob Maxey vehicle purchase' : quote.purchaseContext === 'owner' ? 'Adding protection to a vehicle you already own' : 'Choose your vehicle journey to begin' : `${quote.year} ${quote.make} ${quote.model || 'vehicle'} · ${plan.name}`}</span></div>
          <div className="studio-header__utilities"><ShieldCheck /><span><strong>Ford-backed</strong><small>Specialist supported</small></span></div>
          <button className="studio-close" type="button" onClick={onClose} aria-label="Close quote builder"><X /></button>
        </header>
        <Progress step={step} maxStep={maxStep} onSelect={goTo} />
        <div className={`studio-layout ${step === 5 ? 'is-review' : ''}`}>
          <main className="studio-main">
            {step === 0 && (
              <section className="studio-step studio-vehicle-step">
                <div className="studio-step__heading"><small>STEP 1 OF 6</small><h1>Start with your vehicle journey.</h1><p>Tell us when you are choosing products, then add the vehicle details that shape Ford eligibility.</p></div>
                <div className="studio-section">
                  <PurchaseContextSelector value={quote.purchaseContext} error={showPurchaseContextError} onSelect={selectPurchaseContext} />
                  <div className="studio-section__heading"><div><span>01</span><h2>Vehicle information</h2></div><small>VIN is optional to explore, but needed for final eligibility.</small></div>
                  <div className="studio-fields studio-fields--four">
                    <Field label="VIN" hint="Optional now · 17 characters"><input ref={vinRef} value={quote.vin} maxLength="17" placeholder="Enter VIN" onChange={(event) => update('vin', event.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))} /></Field>
                    <Field label="Year"><select value={quote.year} onChange={(event) => update('year', event.target.value)}>{years.map((year) => <option key={year}>{year}</option>)}</select></Field>
                    <Field label="Make"><select value={quote.make} onChange={(event) => update('make', event.target.value)}><option>Ford</option><option>Lincoln</option></select></Field>
                    <Field label="Model"><select value={quote.model} onChange={(event) => update('model', event.target.value)}><option value="">Select model</option>{modelOptions.map((model) => <option key={model}>{model}</option>)}</select></Field>
                  </div>
                  <div className="studio-fields studio-fields--four studio-fields--secondary">
                    <Field label="Current mileage"><input type="number" min="0" max="500000" value={quote.mileage} onChange={(event) => update('mileage', event.target.value)} /></Field>
                    <Field label="State registered"><select value={quote.state} onChange={(event) => update('state', event.target.value)}>{states.map((state) => <option key={state}>{state}</option>)}</select></Field>
                    <Field label="ZIP code"><input inputMode="numeric" maxLength="5" placeholder="Enter ZIP" value={quote.zip} onChange={(event) => update('zip', event.target.value.replace(/\D/g, ''))} /></Field>
                    <Field label="Original in-service date" hint="Warranty start date"><input type="date" value={quote.inService} onChange={(event) => update('inService', event.target.value)} /><button className="field-link" type="button" onClick={() => update('inService', '')}>I don’t know it</button></Field>
                  </div>
                  <details className="ownership-profile">
                    <summary><span><small>DRIVING PROFILE</small><strong>Personalize my recommendation</strong><em>{quote.usage} · {quote.powertrain} · {quote.snowPlow === 'Yes' ? 'Snow-plow use' : 'No snow plow'} · {quote.keepYears} years · {formatMiles(quote.annualMiles)} mi/year</em></span><ChevronDown /></summary>
                    <div className="studio-goals-grid">
                      <div className="vehicle-rating-grid">
                        <div><strong>Vehicle use</strong><div>{['Personal', 'Business'].map((value) => <button key={value} className={quote.usage === value ? 'is-selected' : ''} type="button" onClick={() => update('usage', value)}>{value}</button>)}</div></div>
                        <div><strong>Powertrain</strong><div>{['Gas', 'Hybrid', 'Diesel', 'Electric'].map((value) => <button key={value} className={quote.powertrain === value ? 'is-selected' : ''} type="button" onClick={() => update('powertrain', value)}>{value}</button>)}</div></div>
                        <div><strong>Snow-plow use</strong><div>{['No', 'Yes'].map((value) => <button key={value} className={quote.snowPlow === value ? 'is-selected' : ''} type="button" onClick={() => update('snowPlow', value)}>{value}</button>)}</div></div>
                      </div>
                      <div className="ownership-goals">
                        <Field label="How much longer will you keep it?"><select value={quote.keepYears} onChange={(event) => update('keepYears', Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 8].map((value) => <option value={value} key={value}>{value} {value === 1 ? 'year' : 'years'}</option>)}</select></Field>
                        <Field label="Miles driven each year"><select value={quote.annualMiles} onChange={(event) => update('annualMiles', Number(event.target.value))}>{[5000, 7500, 10000, 12000, 15000, 18000, 20000, 25000, 30000].map((value) => <option value={value} key={value}>{formatMiles(value)} miles</option>)}</select></Field>
                      </div>
                    </div>
                  </details>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="studio-step">
                <VehicleStrip quote={quote} onEdit={() => goTo(0)} />
                <div className="studio-step__heading"><small>STEP 2 OF 6</small><h1>Choose how you want to be protected.</h1><p>Compare Ford Protect paths here without leaving Bob Maxey’s site.</p></div>
                <div className={`program-switch ${quote.purchaseContext === 'shopping' && quote.powertrain !== 'Diesel' ? 'is-single' : ''} ${quote.purchaseContext === 'owner' && quote.powertrain === 'Diesel' ? 'has-three' : ''}`}>
                  <button type="button" className={quote.program === 'esp' ? 'is-selected' : ''} onClick={() => update('program', 'esp')}><ShieldCheck /><span><strong>Extended Service Plan</strong><small>Choose a plan, fixed term, mileage limit, and deductible.</small></span>{quote.program === 'esp' && <Check />}</button>
                  {quote.purchaseContext === 'owner' && <button type="button" className={quote.program === 'csp' ? 'is-selected' : ''} onClick={() => update('program', 'csp')}><CalendarDays /><span><strong>Continued Service Plan</strong><small>Monthly protection for eligible owners whose prior coverage is ending.</small></span>{quote.program === 'csp' && <Check />}</button>}
                  {quote.powertrain === 'Diesel' && <button type="button" className={quote.program === 'enginecare' ? 'is-selected' : ''} onClick={() => update('program', 'enginecare')}><Wrench /><span><strong>Diesel EngineCARE</strong><small>A focused alternative primary plan for eligible Power Stroke engines.</small></span>{quote.program === 'enginecare' && <Check />}</button>}
                </div>
                {quote.program === 'esp' ? (
                  <>
                    <div className="path-switch"><span>Which eligibility path should we explore?</span><div><button type="button" className={quote.planPath === 'new' ? 'is-selected' : ''} onClick={() => update('planPath', 'new')}><strong>New-plan path</strong><small>Time / mileage from original in-service and 0 miles</small></button><button type="button" className={quote.planPath === 'used' ? 'is-selected' : ''} onClick={() => update('planPath', 'used')}><strong>Used-plan path</strong><small>Time / miles from contract date and current odometer</small></button></div></div>
                    <div className="studio-section studio-section--plans plan-rail-section">
                      <div className="studio-section__heading"><div><h2>Select a coverage level</h2></div><small>Choose a level here; complete coverage stays in the on-site guide.</small></div>
                      <PlanRail compact plans={applicablePlans} selectedId={espPlan.id} onSelect={(id) => update('planId', id)} onDetails={(id) => { update('planId', id); setPlanHelp(true); }} />
                      <details className={`inspection-inline ${inspection.required ? 'is-required' : 'is-clear'}`}><summary><ClipboardCheck /><strong>{inspection.shortLabel || inspection.title}</strong><span>Inspection details</span><ChevronDown /></summary><p>{inspection.text}</p></details>
                    </div>
                    <p className="studio-fine-print"><Info /> Planning choices are not live pricing. Bob Maxey confirms Ford eligibility, combinations, and price.</p>
                  </>
                ) : quote.program === 'csp' ? (
                  <div className="studio-section csp-section">
                    <div className="csp-intro"><div><small>MONTHLY CONTINUED COVERAGE</small><h2>Protection that can continue with your vehicle.</h2><p>Ford publishes Continued Service Plan eligibility up to 12 model years / 140,000 miles at enrollment, with coverage potentially continuing to 14 model years / 160,000 miles. No annual mileage limit applies; current rules and state availability must be confirmed.</p></div><span><CalendarDays /><strong>Monthly</strong><small>Cancel or transfer where agreement rules allow</small></span></div>
                    <div className="csp-levels">{cspLevels.map((item) => <button type="button" key={item.id} className={quote.cspLevel === item.id ? 'is-selected' : ''} onClick={() => update('cspLevel', item.id)}><span className="selection-dot">{quote.cspLevel === item.id && <Check />}</span><small>{item.label}</small><strong>{item.name}</strong><p>{item.description}</p></button>)}</div>
                    <button className="inline-detail-link" type="button" onClick={() => setPlanHelp(true)}>See the full Continued Service coverage guide <ArrowRight /></button>
                    {quote.state === 'California' && <div className="inline-warning"><Info /><span><strong>California limitation</strong><small>Ford’s current public information says Continued Service Plan is not available in California.</small></span></div>}
                  </div>
                ) : (
                  <div className="studio-section csp-section diesel-care-section">
                    <div className="csp-intro"><div><small>FOCUSED POWER STROKE PROTECTION</small><h2>Choose the diesel coverage level to verify.</h2><p>Diesel EngineCARE is an alternative primary mechanical plan—not an add-on to an ESP. The referenced enrollment window is before the earliest of 5 years, 100,000 miles, or 4,000 engine hours.</p></div><span><Wrench /><strong>7 yrs / 200k</strong><small>8,000-hour referenced maximum where eligible</small></span></div>
                    <div className="csp-levels">{dieselCareLevels.map((item) => <button type="button" key={item.id} className={quote.engineCareLevel === item.id ? 'is-selected' : ''} onClick={() => update('engineCareLevel', item.id)}><span className="selection-dot">{quote.engineCareLevel === item.id && <Check />}</span><small>{item.label}</small><strong>{item.name}</strong><p>{item.description}</p></button>)}</div>
                    <button className="inline-detail-link" type="button" onClick={() => setPlanHelp(true)}>See Diesel EngineCARE coverage details <ArrowRight /></button>
                  </div>
                )}
              </section>
            )}

            {step === 2 && (
              <section className="studio-step">
                <VehicleStrip quote={quote} onEdit={() => goTo(0)} />
                <div className="studio-step__heading studio-step__heading--compact"><small>STEP 3 OF 6</small><h1>{quote.program === 'csp' ? 'Understand the monthly coverage path.' : quote.program === 'enginecare' ? 'Review the Diesel EngineCARE limits.' : 'Choose how long you want to be protected.'}</h1><p>{quote.program === 'csp' ? 'CSP follows monthly terms rather than a fixed years-and-miles grid.' : quote.program === 'enginecare' ? 'Ford confirms the Power Stroke engine, enrollment window, mileage, hours, use, and current offer.' : 'Pick a term and mileage that fits how you plan to keep and drive your Ford.'}</p></div>
                {quote.program === 'esp' ? (
                  <div className="term-experience">
                    <div className="studio-section term-builder-section">
                    <div className="term-context"><span><small>SELECTED COVERAGE</small><strong>{plan.name}</strong></span><div className="term-path-switch"><button type="button" className={quote.planPath === 'new' ? 'is-selected' : ''} onClick={() => update('planPath', 'new')}>New plan</button><button type="button" className={quote.planPath === 'used' ? 'is-selected' : ''} onClick={() => update('planPath', 'used')}>Used plan</button></div></div>
                    {matrix.months.length ? <TermMatrix matrix={matrix} quote={quote} recommendation={recommendation} onOpenMatrix={() => setShowMatrix(true)} onMonth={chooseMonth} onMiles={(miles) => update('termMiles', miles)} onUseMatch={() => { setQuote((current) => ({ ...current, termMonths: recommendation.months, termMiles: recommendation.miles })); setSaved(false); }} /> : <div className="no-standard-matrix"><ShieldCheck /><h2>Specialist review needed</h2><p>A standard used-plan term grid is not shown beyond the historical guide’s current-mileage range. Continued Service Plan may be a better path.</p><button className="button button--secondary" type="button" onClick={() => { update('program', 'csp'); goTo(1); }}>Explore Continued Service Plan</button></div>}
                    </div>
                  </div>
                ) : quote.program === 'csp' ? (
                  <div className="studio-section csp-term-card">
                    <div className="csp-term-card__hero"><CalendarDays /><span><small>SELECTED PATH</small><h2>Continued Service Plan {cspLevel.name}</h2><p>A monthly plan with no annual mileage limit for eligible vehicles.</p></span></div>
                    <div className="csp-facts"><div><strong>Monthly</strong><span>Fixed monthly payment shown in the final CSP offer</span></div><div><strong>No annual limit</strong><span>Drive the miles you need while the agreement remains eligible</span></div><div><strong>14 yrs / 160k</strong><span>Published maximum vehicle age / mileage where eligible</span></div></div>
                    <div className="source-note"><Info /><span><strong>Vehicle-specific offer required</strong><small>Coverage level, deductible, monthly amount, effective date, state availability, cancellation, transfer, and expiration are confirmed in the returned CSP agreement.</small></span></div>
                  </div>
                ) : (
                  <div className="studio-section csp-term-card enginecare-term-card">
                    <div className="csp-term-card__hero"><Wrench /><span><small>SELECTED POWER STROKE PATH</small><h2>{dieselCareLevel.name}</h2><p>{dieselCareLevel.description}</p></span></div>
                    <div className="csp-facts"><div><strong>7 years</strong><span>84-month referenced maximum where eligible</span></div><div><strong>200,000 miles</strong><span>Published total-mileage maximum where eligible</span></div><div><strong>8,000 hours</strong><span>Published engine-hour maximum where eligible</span></div></div>
                    <div className="enginecare-eligibility-strip"><ClipboardCheck /><div><small>ENROLLMENT WINDOW</small><strong>Before the earliest of 5 years, 100,000 miles, or 4,000 engine hours</strong><span>Eligible 3.0L, 3.2L, or 6.7L Power Stroke engine, vehicle use, state, and the current Ford offer must be confirmed.</span></div><em>$100 deductible</em></div>
                    <div className="source-note"><Info /><span><strong>Referenced limits—not an automatic offer</strong><small>The returned Ford Protect agreement controls the approved coverage level, effective date, term, mileage, hours, deductible, price, exclusions, transfer, and cancellation provisions.</small></span></div>
                  </div>
                )}
              </section>
            )}

            {step === 3 && (
              <section className="studio-step studio-products-step">
                <VehicleStrip quote={quote} onEdit={() => goTo(0)} />
                <div className="studio-step__heading studio-step__heading--products"><div><small>STEP 4 OF 6</small><h1>Shape the rest of your protection.</h1><p>{quote.purchaseContext === 'shopping' ? 'Choose products for the vehicle purchase you are planning. Every request is verified against the current Ford offer.' : 'Choose products that may remain available after the vehicle sale. Every request is verified against the current Ford offer.'}</p></div><button type="button" onClick={() => setAfterSaleNotice(true)}><Info /> Purchase timing</button></div>
                <nav className="options-panel-tabs" aria-label="Options sections">
                  <button type="button" className={optionsPanel === 'products' ? 'is-selected' : ''} onClick={() => setOptionsPanel('products')}><PackagePlus /><span><strong>Products</strong><small>{quote.requestedProductIds.length} requested</small></span></button>
                  <button type="button" className={optionsPanel === 'plan' ? 'is-selected' : ''} onClick={() => setOptionsPanel('plan')}><ShieldCheck /><span><strong>Plan settings</strong><small>{quote.program === 'esp' ? `${quote.addOns.length} benefits · ${quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible}`}` : quote.program === 'enginecare' ? `${dieselCareLevel.name} · $100` : 'Ford-returned offer'}</small></span></button>
                  <button type="button" className={optionsPanel === 'payment' ? 'is-selected' : ''} onClick={() => setOptionsPanel('payment')}><CircleDollarSign /><span><strong>Payment</strong><small>Choose how to review</small></span></button>
                </nav>
                {optionsPanel === 'plan' && quote.program === 'esp' ? (
                  <details className="studio-contract-settings" open>
                    <summary><span><ShieldCheck /><span><small>YOUR EXTENDED SERVICE PLAN SETTINGS</small><strong>{quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible}`} deductible · {quote.addOns.length} benefit request{quote.addOns.length === 1 ? '' : 's'}</strong></span></span><span>Review settings <ChevronDown /></span></summary>
                    <div className="studio-contract-settings__body"><section><h2>Deductible preference</h2><div className="deductible-grid">{deductibleOptions.filter((item) => item.paths.includes(quote.planPath)).map((item) => <button key={item.id} type="button" className={`${quote.deductible === item.id ? 'is-selected' : ''} ${item.recommended ? 'is-recommended' : ''}`} onClick={() => update('deductible', item.id)}><span>{quote.deductible === item.id && <Check />}</span><strong>{item.label}</strong><small>{item.help}</small>{item.recommended && <em>STANDARD</em>}</button>)}</div></section><section><h2>Plan benefit requests</h2><div className="addon-grid">{availableAddOns.map((choice) => { const Icon = optionIcons[choice.id] || ShieldCheck; const selected = quote.addOns.includes(choice.id); return <button key={choice.id} className={selected ? 'is-selected' : ''} type="button" aria-pressed={selected} onClick={() => toggleAddOn(choice.id)}><span className="addon-check">{selected && <Check />}</span><Icon /><span><strong>{choice.title}</strong><small>{choice.short}</small></span></button>; })}</div><p>Ford’s returned offer and issued agreement determine which benefits are available with the selected vehicle, plan, and term.</p></section></div>
                  </details>
                ) : optionsPanel === 'plan' && quote.program === 'csp' ? <div className="studio-section csp-options-note"><ShieldCheck /><span><small>CONTINUED SERVICE PLAN</small><h2>Ford confirms the deductible and benefits in the returned offer.</h2><p>CSP requires no enrollment inspection. Exact coverage, deductible, and price remain vehicle-specific.</p></span></div> : optionsPanel === 'plan' ? <div className="studio-section csp-options-note enginecare-options-note"><Wrench /><span><small>DIESEL ENGINECARE</small><h2>{dieselCareLevel.name} uses the published $100 deductible.</h2><p>Bob Maxey will verify the eligible Power Stroke engine, current mileage, engine hours, vehicle use, coverage level, referenced limits, and current Ford-authorized price.</p></span></div> : null}
                {optionsPanel === 'products' && <section className="product-marketplace" aria-labelledby="additional-products-title">
                  <header className="product-marketplace__header"><div><small>{quote.purchaseContext === 'shopping' ? 'AVAILABLE WITH YOUR BOB MAXEY VEHICLE PURCHASE' : 'AVAILABLE AFTER THE VEHICLE SALE'}</small><h2 id="additional-products-title">{quote.purchaseContext === 'shopping' ? 'Build your protection package for delivery day.' : 'Add eligible protection to the vehicle you own.'}</h2></div><button type="button" onClick={() => setAfterSaleNotice(true)}>How purchase timing works <ArrowRight /></button></header>
                  <div className="product-category-rail" role="tablist" aria-label="Product categories">{productCategories.map((category) => <button key={category} type="button" role="tab" aria-selected={productCategory === category} className={productCategory === category ? 'is-selected' : ''} onClick={() => setProductCategory(category)}>{category === 'recommended' ? <Sparkles /> : category === 'all' ? <Grid3X3 /> : category === 'maintenance' ? <Wrench /> : category === 'mobility' ? <CarFront /> : <ShieldCheck />}<span>{category.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</span></button>)}</div>
                  <div className="quote-product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} selected={quote.requestedProductIds.includes(product.id)} selection={quote.productSelections?.[product.id]} onDetails={setProductHelpId} onRemove={toggleRequestedProduct} />)}</div>
                  {!visibleProducts.length && <div className="product-marketplace__empty"><PackagePlus /><h3>No products in this category match the current profile.</h3><p>A Bob Maxey specialist can review other eligible paths.</p></div>}
                </section>}
                {optionsPanel === 'payment' && <div className="studio-section payment-choice payment-choice--premium"><div><CircleDollarSign /><span><small>PAYMENT PREFERENCE</small><strong>How would you like to review payment choices?</strong><p>Eligible plans may use a small down payment, with the remaining balance financed at 0% interest. The current offer confirms the exact terms.</p></span></div><select value={quote.paymentPreference} onChange={(event) => update('paymentPreference', event.target.value)}><option>Review the small-down-payment, 0%-interest option</option><option>Pay in full</option><option>Show me both choices</option><option>Not sure yet</option></select></div>}
              </section>
            )}

            {step === 4 && (
              <section className="studio-step studio-contact-step">
                <div className="studio-step__heading"><small>STEP 5 OF 6</small><h1>Where should we reach you?</h1><p>A Ford Protect specialist will use these details to prepare and follow up on your request.</p></div>
                <div className="details-layout">
                  <div className="studio-section">
                    <div className="studio-section__heading"><div><span>07</span><h2>Customer details</h2></div><small>Required to send your request</small></div>
                    <div className="studio-fields studio-fields--two">
                      <Field label="First name" error={showErrors && !quote.customer.firstName.trim() ? 'Enter a first name' : ''}><input autoComplete="given-name" aria-invalid={showErrors && !quote.customer.firstName.trim()} value={quote.customer.firstName} onChange={(event) => updateCustomer('firstName', event.target.value)} /></Field>
                      <Field label="Last name" error={showErrors && !quote.customer.lastName.trim() ? 'Enter a last name' : ''}><input autoComplete="family-name" aria-invalid={showErrors && !quote.customer.lastName.trim()} value={quote.customer.lastName} onChange={(event) => updateCustomer('lastName', event.target.value)} /></Field>
                      <Field label="Email" error={showErrors && !/\S+@\S+\.\S+/.test(quote.customer.email) ? 'Enter a valid email' : ''}><input type="email" autoComplete="email" aria-invalid={showErrors && !/\S+@\S+\.\S+/.test(quote.customer.email)} value={quote.customer.email} onChange={(event) => updateCustomer('email', event.target.value)} /></Field>
                      <Field label="Mobile phone" error={showErrors && phoneDigits.length < 10 ? 'Enter a valid phone number' : ''}><input type="tel" autoComplete="tel" aria-invalid={showErrors && phoneDigits.length < 10} value={quote.customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} /></Field>
                      <Field label="City" hint="Optional"><input autoComplete="address-level2" value={quote.customer.city} onChange={(event) => updateCustomer('city', event.target.value)} /></Field>
                      <Field label="Preferred Bob Maxey location"><select value={quote.store} onChange={(event) => update('store', event.target.value)}>{locations.map((location) => <option key={location.name} value={location.name}>{location.descriptor}</option>)}</select></Field>
                    </div>
                  </div>
                  <div className="studio-section contact-preferences">
                    <div className="studio-section__heading"><div><span>08</span><h2>Follow-up preference</h2></div></div>
                    <div className="contact-choice-grid">{contactPreferences.map((item) => { const Icon = item.value === 'phone' ? Phone : item.value === 'text' ? MessageSquare : Mail; return <button key={item.value} type="button" className={quote.preferredContact === item.value ? 'is-selected' : ''} onClick={() => update('preferredContact', item.value)}><Icon /><span>{item.label}</span>{quote.preferredContact === item.value && <Check />}</button>; })}</div>
                    <Field label="Anything the specialist should know?" hint="Optional"><textarea rows="4" value={quote.notes} placeholder="Questions, best time to call, or coverage priorities" onChange={(event) => update('notes', event.target.value)} /></Field>
                    <label className={`consent-check ${showErrors && !quote.consent ? 'has-error' : ''}`}><input type="checkbox" checked={quote.consent} onChange={(event) => update('consent', event.target.checked)} /><span><strong>I agree Bob Maxey may contact me about this Ford Protect request.</strong><small>This does not purchase coverage or authorize a contract.</small></span></label>
                  </div>
                </div>
                <p className="studio-fine-print"><ShieldCheck /> Your information is used only to prepare and follow up on this Ford Protect request.</p>
              </section>
            )}

            {step === 5 && (
              submissionReceipt ? (
                <section className="studio-step studio-success">
                  <div className="studio-success__mark"><Check /></div><small>REQUEST ACCEPTED</small><h1>Your Ford Protect request is on its way.</h1><p>A Bob Maxey specialist will review your vehicle, coverage, and product selections and contact you by {quote.preferredContact === 'text' ? 'text message' : quote.preferredContact === 'email' ? 'email' : 'phone'}.</p>
                  <div className="studio-success__reference"><span><small>REFERENCE</small><strong>{quote.id}</strong></span><span><small>CRM RECEIPT</small><strong>{submissionReceipt.leadId}</strong></span></div>
                  <div className="studio-success__next"><h2>What happens next</h2><div><span><strong>1</strong><p>We verify the VIN, warranty status, inspection path, and current Ford eligibility.</p></span><span><strong>2</strong><p>Your specialist confirms the exact plan, selected products, and Bob Maxey price.</p></span><span><strong>3</strong><p>You review the issued agreement before deciding whether to purchase coverage.</p></span></div></div>
                  <div className="studio-success__actions"><button className="button button--secondary" type="button" onClick={() => setProposalPreview(true)}><Eye /> Preview proposal</button><button className="button button--primary" type="button" onClick={downloadProposal} disabled={busy === 'pdf'}>{busy === 'pdf' ? 'Preparing…' : 'Download personalized proposal'} <Download /></button></div>
                  {selectedProducts.length > 0 && <section className="selected-product-guides selected-product-guides--success"><div><small>DETAILED PRODUCT GUIDES</small><h2>Keep the details for every product you requested.</h2><p>Your personalized proposal stays concise. These separate guides explain each product in more depth.</p></div><div>{selectedProducts.map((product) => <button key={product.id} type="button" onClick={() => downloadSelectedProductGuide(product)} disabled={busy === `guide-${product.id}`}><FileText /><span><strong>{product.name}</strong><small>{busy === `guide-${product.id}` ? 'Preparing guide…' : 'Download product guide'}</small></span><Download /></button>)}</div></section>}
                </section>
              ) : (
                <section className="studio-step studio-review">
                  <div className="studio-step__heading"><small>STEP 6 OF 6</small><h1>Review your complete protection request.</h1><p>Confirm the vehicle, primary coverage, additional products, and follow-up details before submitting to Bob Maxey.</p></div>
                  <div className="review-hero"><div><small>PERSONAL PROTECTION SUMMARY</small><h2>{plan.name}</h2><p>{quote.year} {quote.make} {quote.model} · Quote {quote.id}</p></div><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /></div>
                  <div className="review-section-grid">
                    <details className="review-disclosure"><summary><CarFront /><span><small>VEHICLE</small><h2>{quote.year} {quote.make} {quote.model}</h2></span><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); goTo(0); }}>Edit</button><ChevronDown className="review-chevron" /></summary><dl><div><dt>VIN</dt><dd>{quote.vin || 'To be confirmed'}</dd></div><div><dt>Current mileage</dt><dd>{formatMiles(quote.mileage)} miles</dd></div><div><dt>Warranty / inspection</dt><dd>{inspection.shortLabel}</dd></div></dl></details>
                    <details className="review-disclosure"><summary><ShieldCheck /><span><small>PRIMARY COVERAGE</small><h2>{plan.name}</h2></span><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); goTo(1); }}>Edit</button><ChevronDown className="review-chevron" /></summary><dl><div><dt>Term</dt><dd>{quote.program === 'csp' ? 'Monthly / no annual mileage limit' : quote.program === 'enginecare' ? '7 years / 200,000 total miles / 8,000 engine hours referenced maximum' : `${formatTerm(quote.termMonths)} / ${formatMiles(quote.termMiles)} ${quote.planPath === 'used' ? 'additional' : 'total'} miles`}</dd></div><div><dt>Deductible</dt><dd>{quote.program === 'csp' ? 'Confirmed with offer' : quote.program === 'enginecare' ? '$100' : quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible}`}</dd></div><div><dt>{quote.program === 'enginecare' ? 'Eligibility review' : 'Benefit requests'}</dt><dd>{quote.program === 'csp' ? `${cspLevel.name} CSP offer` : quote.program === 'enginecare' ? 'Power Stroke engine, mileage, hours, use, and current Ford offer' : protectionOptions.filter((item) => quote.addOns.includes(item.id)).map((item) => item.title).join(', ') || 'None requested'}</dd></div></dl></details>
                    <details className="review-disclosure review-products"><summary><PackagePlus /><span><small>ADDITIONAL PRODUCTS</small><h2>{selectedProducts.length ? `${selectedProducts.length} requested` : 'No additions yet'}</h2></span><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); goTo(3); }}>Edit</button><ChevronDown className="review-chevron" /></summary>{selectedProducts.length ? <div>{selectedProducts.map((product) => <article key={product.id}><img src={assetUrl(product.image)} alt="" /><span><strong>{product.name}</strong><small>{productSelectionLabel(product, quote.productSelections?.[product.id])}</small></span><CheckCircle2 /></article>)}</div> : <p>Return to Options to explore the products available for this purchase journey.</p>}</details>
                    <details className="review-disclosure"><summary><UserRound /><span><small>CUSTOMER &amp; FOLLOW-UP</small><h2>{quote.customer.firstName} {quote.customer.lastName}</h2></span><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); goTo(4); }}>Edit</button><ChevronDown className="review-chevron" /></summary><dl><div><dt>Contact</dt><dd>{quote.customer.email}<br />{quote.customer.phone}</dd></div><div><dt>Preference</dt><dd>{quote.preferredContact === 'text' ? 'Text message' : quote.preferredContact === 'email' ? 'Email' : 'Phone call'}</dd></div><div><dt>Bob Maxey location</dt><dd>{locations.find((item) => item.name === quote.store)?.descriptor || quote.store}</dd></div></dl></details>
                  </div>
                  <div className="review-action-panel"><div><FileText /><span><small>PERSONALIZED CUSTOMER PROPOSAL</small><h2>A concise record of your protection request.</h2><p>Preview the branded portrait proposal with your vehicle, selections, inspection path, and next steps.</p></span></div><button className="button button--secondary" type="button" onClick={() => setProposalPreview(true)}><Eye /> Preview proposal</button></div>
                  {selectedProducts.length > 0 && <section className="selected-product-guides"><div><small>OPTIONAL DOWNLOADS</small><h2>Detailed guides for your selected products</h2><p>Download only the deeper product information you want to keep.</p></div><div>{selectedProducts.map((product) => <button key={product.id} type="button" onClick={() => downloadSelectedProductGuide(product)} disabled={busy === `guide-${product.id}`}><FileText /><span><strong>{product.name}</strong><small>{productSelectionLabel(product, quote.productSelections?.[product.id])}</small></span><Download /></button>)}</div></section>}
                  {crmStatus && <div className={`crm-status ${crmStatus.tone}`}><CheckCircle2 /><span><strong>{crmStatus.title}</strong><small>{crmStatus.text}</small></span></div>}
                  <div className="review-notice"><ShieldCheck /><span><strong>Ready for specialist review—not a purchase</strong><small>Submitting sends this request to Bob Maxey. Coverage is issued only after eligibility, price, and the Ford Protect agreement are confirmed and you approve the final offer.</small></span></div>
                  <details className="crm-test-tools"><summary><span><Download /> CRM testing tools</span><small>For dealership setup only</small></summary><div><p>Download an ADF/XML test file for the {CRM_DESTINATION} DealerMail route. This does not send customer data.</p><button className="button button--secondary" type="button" onClick={downloadXml}><Download /> Download CRM test</button></div></details>
                </section>
              )
            )}
          </main>
          <Summary quote={quote} plan={plan} eligibility={eligibility} selectedProducts={selectedProducts} inspection={inspection} />
        </div>
        {!submissionReceipt && <StudioFooter step={step} quote={quote} saved={saved} onBack={() => goTo(Math.max(0, step - 1))} onContinue={continueQuote} onSave={saveQuote} onSubmit={sendLead} submitting={busy === 'crm'} />}
      </div>
      {planHelp && <PlanHelp plan={plan} detail={detail} onClose={() => setPlanHelp(false)} />}
      {productHelp && <ProductDetail product={productHelp} selected={quote.requestedProductIds.includes(productHelp.id)} selection={quote.productSelections?.[productHelp.id]} powertrain={quote.powertrain} purchaseContext={quote.purchaseContext} onConfigure={configureRequestedProduct} onClose={() => setProductHelpId('')} />}
      {afterSaleNotice && <AfterSaleNotice purchaseContext={quote.purchaseContext} onClose={() => setAfterSaleNotice(false)} />}
      {proposalPreview && <ProposalPreview quote={quote} plan={plan} detail={detail} onClose={() => setProposalPreview(false)} onDownload={downloadProposal} busy={busy === 'pdf'} />}
      {showMatrix && <MatrixDrawer matrix={matrix} quote={quote} recommendation={recommendation} onClose={() => setShowMatrix(false)} onMonth={chooseMonth} onMiles={(miles) => update('termMiles', miles)} />}
    </div>
  );
}
