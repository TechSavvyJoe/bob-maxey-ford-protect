import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, CalendarDays, CarFront, Check, CheckCircle2,
  ChevronDown, CircleDollarSign, Clock3, Download, FileText, Gauge, Info, KeyRound,
  Lightbulb, Mail, MapPin, MessageSquare, Phone, Send, ShieldCheck, Sparkles, Tag,
  UserRound, Wrench, X, Zap,
} from 'lucide-react';
import Brand from './Brand';
import { evPlanData, locations, modelsByMake, planData, states, years } from '../data';
import { productDetails } from '../productDetails';
import { assetUrl } from '../paths';
import {
  contactPreferences, deductibleOptions, findBestCombination, formatMiles, formatTerm,
  getTermMatrix, historicalMatrixNotice, maintenanceChoices, maintenanceIntervals,
  protectionOptions,
} from '../quoteData';
import { createAdfXml, CRM_DESTINATION, downloadLeadXml, submitCrmLead } from '../crmLead';

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
      {stepNames.map((name, index) => (
        <button
          key={name}
          type="button"
          className={`${step === index ? 'is-current' : ''} ${index < maxStep ? 'is-complete' : ''}`}
          onClick={() => onSelect(index)}
          disabled={index > maxStep}
          aria-current={step === index ? 'step' : undefined}
        >
          <span>{index < maxStep ? <Check size={14} /> : index + 1}</span>
          <em>{name}</em>
        </button>
      ))}
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

function Summary({ quote, plan, detail, eligibility, onSave, onPreview }) {
  const selectedOptions = protectionOptions.filter((item) => quote.addOns.includes(item.id));
  const term = quote.program === 'csp'
    ? 'Monthly / no annual mileage limit'
    : `${formatTerm(quote.termMonths)} / ${formatMiles(quote.termMiles)} ${quote.planPath === 'used' ? 'additional' : 'total'} miles`;
  const deductible = quote.program === 'csp'
    ? 'Confirmed with CSP offer'
    : quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible}`;
  const rows = [
    [CarFront, 'Vehicle', `${quote.year} ${quote.make} ${quote.model || 'Model'}`],
    [ShieldCheck, 'Protection', plan.name],
    [CalendarDays, 'Term', term],
    [CircleDollarSign, 'Deductible', deductible],
    [Wrench, 'Extra products', quote.maintenanceId !== 'none' ? quote.maintenanceName : selectedOptions.length ? `${selectedOptions.length} option${selectedOptions.length === 1 ? '' : 's'}` : 'None requested'],
  ];

  return (
    <aside className="studio-summary">
      <div className="studio-summary__eyebrow"><span>Quote in progress</span><strong>{quote.id}</strong></div>
      <h2>Your selection</h2>
      <div className="studio-summary__rows">
        {rows.map(([Icon, label, value]) => (
          <div key={label}><Icon /><span><small>{label}</small><strong>{value}</strong></span></div>
        ))}
      </div>
      <div className={`eligibility ${eligibility.tone}`}>
        <CheckCircle2 /><span><strong>{eligibility.title}</strong><small>{eligibility.text}</small></span>
      </div>
      <div className="summary-price">
        <span>Bob Maxey price</span>
        <strong>Confirmed after eligibility</strong>
        <small>Current Ford rates and vehicle-specific options are not estimated from last year’s guide.</small>
      </div>
      <button className="button button--white button--full" type="button" onClick={onPreview}><FileText /> Preview proposal</button>
      <div className="studio-summary__utility">
        <button type="button" onClick={onSave}><Bookmark /> Save</button>
        <button type="button" onClick={onPreview}><Download /> PDF</button>
      </div>
      <p>The issued Ford Protect agreement controls exact coverage, eligibility, price, and exclusions.</p>
    </aside>
  );
}

function PlanHelp({ plan, detail, onClose }) {
  if (!detail) return null;
  return (
    <div className="context-backdrop" role="dialog" aria-modal="true" aria-label={`${plan.name} coverage details`}>
      <article className="context-modal context-modal--expanded">
        <header>
          <img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
          <span>Complete plan guide</span>
          <button type="button" onClick={onClose} aria-label="Close plan details"><X /></button>
        </header>
        <div className="context-modal__body">
          <p>{detail.type}</p>
          <h2>{plan.name}</h2>
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
        <footer><button className="button button--primary" type="button" onClick={onClose}>Keep {plan.name} selected <ArrowRight /></button></footer>
      </article>
    </div>
  );
}

function ProposalPreview({ quote, plan, detail, onClose, onDownload, busy }) {
  const groups = detail?.coverageGroups?.slice(0, 6) || [];
  return (
    <div className="proposal-backdrop" role="dialog" aria-modal="true" aria-label="Proposal preview">
      <div className="proposal-preview">
        <header><Brand /><span>Customer proposal preview</span><button type="button" onClick={onClose} aria-label="Close preview"><X /></button></header>
        <div className="proposal-preview__scroll">
          <section className="proposal-sheet proposal-sheet--cover">
            <div className="proposal-hero"><img src={assetUrl('/assets/road-expedition.png')} alt="Ford SUV on a scenic road" /><div><small>PERSONAL COVERAGE PROPOSAL</small><h2>Protect the Ford you chose.</h2><p>Ford-backed protection. Bob Maxey support.</p></div></div>
            <div className="proposal-sheet__body">
              <small>PREPARED FOR</small><h3>{quote.customer.firstName || 'Ford'} {quote.customer.lastName || 'owner'}</h3>
              <p>{quote.year} {quote.make} {quote.model} · {formatMiles(quote.mileage)} miles</p>
              <div className="proposal-selection"><span><small>Plan</small><strong>{plan.name}</strong></span><span><small>Term</small><strong>{quote.program === 'csp' ? 'Monthly' : formatTerm(quote.termMonths)}</strong></span><span><small>Mileage</small><strong>{quote.program === 'csp' ? 'No annual limit' : formatMiles(quote.termMiles)}</strong></span></div>
              <div className="proposal-benefits"><span>Ford-backed</span><span>Roadside help</span><span>Rental support</span><span>Transferable where eligible</span></div>
            </div>
          </section>
          <section className="proposal-sheet proposal-sheet--details">
            <div className="proposal-sheet__body"><small>SELECTED COVERAGE</small><h3>{plan.name}</h3><p>{detail?.coverageModel || plan.description}</p><div className="proposal-group-grid">{groups.map((group) => <article key={group.title}><strong>{group.title}</strong><span>{group.summary}</span></article>)}</div><div className="proposal-legal">The downloaded three-page PDF includes customer, vehicle, selection, coverage, options, important terms, and next steps. The issued agreement controls.</div></div>
          </section>
        </div>
        <footer><button className="back-link" type="button" onClick={onClose}>Close preview</button><button className="button button--primary" type="button" onClick={onDownload} disabled={busy}>{busy ? 'Designing PDF…' : 'Download professional PDF'} <Download /></button></footer>
      </div>
    </div>
  );
}

function TermMatrix({ matrix, quote, recommendation, showMatrix, onToggleMatrix, onMonth, onMiles, onUseMatch }) {
  const validMiles = matrix.miles.filter((miles) => matrix.isAvailable(quote.termMonths, miles));
  return (
    <>
      <div className="match-panel">
        <div><Sparkles /><span><small>{recommendation?.meetsGoal ? 'YOUR MATCH' : 'CLOSEST AVAILABLE IN THIS MATRIX'}</small><strong>{recommendation ? `${formatTerm(recommendation.months)} / ${formatMiles(recommendation.miles)} miles` : 'Specialist review'}</strong><p>{recommendation?.meetsGoal ? `Based on keeping the vehicle ${quote.keepYears} years and driving about ${formatMiles(quote.annualMiles)} miles per year.` : 'This historical matrix does not fully reach your ownership goal. Ask the specialist about CSP or another current path.'}</p></span></div>
        {recommendation && <button type="button" onClick={onUseMatch}>Use this combination</button>}
      </div>
      <div className="guided-term-picker">
        <div>
          <div className="term-row-heading"><span><CalendarDays /> Choose months</span><strong>{formatTerm(quote.termMonths)}</strong></div>
          <div className="term-choice-rail">{matrix.months.map((months) => <button key={months} type="button" className={`${quote.termMonths === months ? 'is-selected' : ''} ${recommendation?.months === months ? 'is-match' : ''}`} onClick={() => onMonth(months)}><strong>{months}</strong><small>{months / 12} yr</small></button>)}</div>
        </div>
        <div>
          <div className="term-row-heading"><span><Gauge /> Choose {quote.planPath === 'used' ? 'additional mileage' : 'total mileage'}</span><strong>{formatMiles(quote.termMiles)} miles</strong></div>
          <div className="term-choice-rail">{validMiles.map((miles) => <button key={miles} type="button" className={`${quote.termMiles === miles ? 'is-selected' : ''} ${recommendation?.miles === miles && recommendation?.months === quote.termMonths ? 'is-match' : ''}`} onClick={() => onMiles(miles)}><strong>{miles / 1000}k</strong><small>miles</small></button>)}</div>
        </div>
      </div>
      <button className={`matrix-toggle ${showMatrix ? 'is-open' : ''}`} type="button" onClick={onToggleMatrix}>View every available combination <ChevronDown /></button>
      {showMatrix && (
        <div className="term-matrix-wrap">
          <div className="term-matrix" style={{ '--term-columns': matrix.months.length }}>
            <div className="term-matrix__corner">Miles \ months</div>
            {matrix.months.map((months) => <div className="term-matrix__month" key={months}>{months}<small>{months / 12} yr</small></div>)}
            {matrix.miles.map((miles) => (
              <div className="term-matrix__row" key={miles}>
                <div className="term-matrix__miles">{miles / 1000}k</div>
                {matrix.months.map((months) => {
                  const available = matrix.isAvailable(months, miles);
                  const selected = quote.termMonths === months && quote.termMiles === miles;
                  const matched = recommendation?.months === months && recommendation?.miles === miles;
                  return <button key={months} type="button" disabled={!available} className={`${selected ? 'is-selected' : ''} ${matched ? 'is-match' : ''}`} onClick={() => { onMonth(months); onMiles(miles); }} aria-label={available ? `${formatTerm(months)}, ${formatMiles(miles)} miles` : 'Combination not available'}>{available ? selected ? <Check /> : matched ? <Sparkles /> : <span className="availability-dot" aria-hidden="true" /> : '—'}</button>;
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function QuoteStudio({ initial = {}, onClose, onToast, onSaved }) {
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [planHelp, setPlanHelp] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [proposalPreview, setProposalPreview] = useState(false);
  const [busy, setBusy] = useState('');
  const [crmStatus, setCrmStatus] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const vinRef = useRef(null);
  const [quote, setQuote] = useState(() => ({
    id: initial.id || `BMX-${Date.now().toString().slice(-8)}`,
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
    termMonths: initial.termMonths || (initial.termYears ? Number(initial.termYears) * 12 : 84),
    termMiles: Number(initial.termMiles || 100000),
    deductible: String(initial.deductible ?? '100'),
    addOns: initial.addOns || ['first-day'],
    maintenanceId: initial.maintenanceId || 'none',
    maintenanceName: initial.maintenanceName || '',
    maintenanceInterval: Number(initial.maintenanceInterval || 7500),
    keepYears: Number(initial.keepYears || 5),
    annualMiles: Number(initial.annualMiles || 12000),
    paymentPreference: initial.paymentPreference || 'Review available interest-free installment options',
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
  const plan = quote.program === 'csp'
    ? { id: 'continued-service', name: `Continued Service Plan ${cspLevel.name}`, count: 'Monthly', bestFor: cspLevel.label, description: cspLevel.description }
    : espPlan;
  const detail = productDetails[quote.program === 'csp' ? 'continued-service' : plan.id];
  const modelOptions = modelsByMake[quote.make] ?? [];
  const matrix = useMemo(() => getTermMatrix({ planId: espPlan.id, planPath: quote.planPath, mileage: quote.mileage }), [espPlan.id, quote.planPath, quote.mileage]);
  const recommendation = useMemo(() => findBestCombination({ matrix, planPath: quote.planPath, inService: quote.inService, currentMileage: quote.mileage, keepYears: quote.keepYears, annualMiles: quote.annualMiles }), [matrix, quote.planPath, quote.inService, quote.mileage, quote.keepYears, quote.annualMiles]);
  const availableAddOns = protectionOptions.filter((option) => option.planIds === 'all' || option.planIds.includes(espPlan.id));
  const availableMaintenance = maintenanceChoices.filter((choice) => choice.id === 'none' || (quote.powertrain === 'Electric' ? choice.id === 'premium-maintenance-ev' : choice.id === 'premium-maintenance'));
  const phoneDigits = quote.customer.phone.replace(/\D/g, '');
  const detailsValid = Boolean(quote.customer.firstName.trim() && quote.customer.lastName.trim() && /\S+@\S+\.\S+/.test(quote.customer.email) && phoneDigits.length >= 10 && quote.consent);

  const eligibility = useMemo(() => {
    const mileage = Number(quote.mileage || 0);
    if (quote.program === 'csp' && quote.state === 'California') return { tone: 'review', title: 'CSP not available in California', text: 'Choose an Extended Service Plan path or request a specialist review.' };
    if (mileage > 160000) return { tone: 'review', title: 'Specialist path required', text: 'The historical guide’s standard used-plan matrix ends at 160,000 current miles.' };
    if (quote.snowPlow === 'Yes' || quote.usage === 'Business') return { tone: 'review', title: 'Special-use review required', text: 'Commercial or snow-plow use must be rated and verified correctly.' };
    if (quote.program === 'esp' && quote.planPath === 'new' && !quote.inService) return { tone: 'review', title: 'In-service date needed', text: 'New-plan time and mileage are measured from the original in-service date and zero miles.' };
    return { tone: 'positive', title: 'Ready for Ford record review', text: 'Bob Maxey will confirm the VIN, current eligibility, available combinations, and price.' };
  }, [quote.program, quote.state, quote.mileage, quote.snowPlow, quote.usage, quote.planPath, quote.inService]);

  useEffect(() => {
    document.body.classList.add('modal-open');
    if (initial.focusVin) window.setTimeout(() => vinRef.current?.focus(), 180);
    const escape = (event) => {
      if (event.key !== 'Escape') return;
      if (proposalPreview) setProposalPreview(false);
      else if (planHelp) setPlanHelp(false);
      else onClose();
    };
    window.addEventListener('keydown', escape);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', escape);
    };
  }, [initial.focusVin, onClose, planHelp, proposalPreview]);

  useEffect(() => {
    if (quote.program !== 'esp' || !matrix.months.length) return;
    if (matrix.isAvailable(quote.termMonths, quote.termMiles)) return;
    const fallback = recommendation || { months: matrix.months[0], miles: matrix.miles.find((miles) => matrix.isAvailable(matrix.months[0], miles)) };
    if (!fallback?.miles) return;
    setQuote((current) => ({ ...current, termMonths: fallback.months, termMiles: fallback.miles }));
  }, [matrix, quote.program, quote.termMonths, quote.termMiles, recommendation]);

  const goTo = (next) => {
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
    const main = document.querySelector('.studio-main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const update = (field, value) => {
    setQuote((current) => {
      const next = {
        ...current,
        [field]: value,
        ...(field === 'make' ? { model: '' } : {}),
        ...(field === 'powertrain' ? { planId: value === 'Electric' ? 'premium-plus-ev' : 'premium', maintenanceId: 'none', maintenanceName: '' } : {}),
      };
      if (field === 'program' && value === 'csp') next.addOns = [];
      if (field === 'planId') next.addOns = current.addOns.filter((id) => {
        const option = protectionOptions.find((item) => item.id === id);
        return option?.planIds === 'all' || option?.planIds.includes(value);
      });
      return next;
    });
    setCrmStatus(null);
  };

  const updateCustomer = (field, value) => {
    setQuote((current) => ({ ...current, customer: { ...current.customer, [field]: value } }));
    setCrmStatus(null);
  };

  const chooseMonth = (months) => {
    const validMiles = matrix.miles.filter((miles) => matrix.isAvailable(months, miles));
    const nextMiles = validMiles.includes(quote.termMiles)
      ? quote.termMiles
      : validMiles.find((miles) => miles >= quote.termMiles) || validMiles.at(-1);
    setQuote((current) => ({ ...current, termMonths: months, termMiles: nextMiles }));
  };

  const toggleAddOn = (id) => setQuote((current) => ({ ...current, addOns: current.addOns.includes(id) ? current.addOns.filter((item) => item !== id) : [...current.addOns, id] }));

  const selectMaintenance = (id) => {
    const choice = maintenanceChoices.find((item) => item.id === id);
    setQuote((current) => ({ ...current, maintenanceId: id, maintenanceName: choice?.title || '' }));
  };

  const quoteForOutput = () => ({ ...quote, planName: plan.name, maintenanceName: quote.maintenanceName || maintenanceChoices.find((item) => item.id === quote.maintenanceId)?.title || '' });

  const saveQuote = () => {
    const saved = { ...quoteForOutput(), savedAt: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('bobMaxeyProtectQuotes') || '[]');
    localStorage.setItem('bobMaxeyProtectQuotes', JSON.stringify([saved, ...existing.filter((item) => item.id !== saved.id)].slice(0, 8)));
    onSaved?.(saved);
    onToast(`Quote ${saved.id} saved in this browser.`);
  };

  const downloadProposal = async () => {
    setBusy('pdf');
    try {
      const { downloadProposalPdf } = await import('../proposalPdf');
      await downloadProposalPdf({ quote: quoteForOutput(), plan, detail });
      onToast('Your three-page Bob Maxey Ford Protect proposal is ready.');
    } catch (error) {
      console.error(error);
      onToast('The proposal could not be created. Please try again.');
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
        setCrmStatus({ tone: 'setup', title: 'Secure CRM connection still needs setup', text: `No data was sent. Connect the dealership lead endpoint before routing XML to ${CRM_DESTINATION}.` });
        return;
      }
      saveQuote();
      setCrmStatus({ tone: 'success', title: 'Request delivered to Bob Maxey', text: `Quote ${quote.id} was submitted as an F&I Product Only Sale lead.` });
    } catch (error) {
      console.error(error);
      setCrmStatus({ tone: 'error', title: 'Request was not delivered', text: 'Nothing was marked sent. Please try again or contact the dealership.' });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="studio-backdrop" role="dialog" aria-modal="true" aria-label="Build your Ford Protect quote">
      <div className="quote-studio">
        <header className="studio-header">
          <Brand />
          <div className="studio-header__utilities"><ShieldCheck /> Ford-backed protection · Bob Maxey support</div>
          <button className="studio-close" type="button" onClick={onClose} aria-label="Close quote builder"><X /></button>
        </header>
        <Progress step={step} maxStep={maxStep} onSelect={goTo} />
        <div className="studio-layout">
          <main className="studio-main">
            {step === 0 && (
              <section className="studio-step">
                <div className="studio-step__heading"><small>STEP 1 OF 6</small><h1>Let’s match protection to your Ford.</h1><p>Vehicle details set the correct plan path. Ownership goals help us surface a sensible term and mileage combination.</p></div>
                <div className="studio-section">
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
                </div>
                <div className="studio-section studio-section--compact">
                  <div className="studio-section__heading"><div><span>02</span><h2>How you use and keep it</h2></div><small>Used only to organize likely options; Ford records determine eligibility.</small></div>
                  <div className="studio-goals-grid">
                    <div className="vehicle-rating-grid">
                      <div><strong>Vehicle use</strong><div>{['Personal', 'Business'].map((value) => <button key={value} className={quote.usage === value ? 'is-selected' : ''} type="button" onClick={() => update('usage', value)}>{value}</button>)}</div></div>
                      <div><strong>Powertrain</strong><div>{['Gas', 'Hybrid', 'Electric'].map((value) => <button key={value} className={quote.powertrain === value ? 'is-selected' : ''} type="button" onClick={() => update('powertrain', value)}>{value}</button>)}</div></div>
                      <div><strong>Snow-plow use</strong><div>{['No', 'Yes'].map((value) => <button key={value} className={quote.snowPlow === value ? 'is-selected' : ''} type="button" onClick={() => update('snowPlow', value)}>{value}</button>)}</div></div>
                    </div>
                    <div className="ownership-goals">
                      <Field label="How much longer will you keep it?"><select value={quote.keepYears} onChange={(event) => update('keepYears', Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 8].map((value) => <option value={value} key={value}>{value} {value === 1 ? 'year' : 'years'}</option>)}</select></Field>
                      <Field label="Miles driven each year"><select value={quote.annualMiles} onChange={(event) => update('annualMiles', Number(event.target.value))}>{[5000, 7500, 10000, 12000, 15000, 18000, 20000, 25000, 30000].map((value) => <option value={value} key={value}>{formatMiles(value)} miles</option>)}</select></Field>
                    </div>
                  </div>
                </div>
                <div className="studio-actions"><span>About 2 minutes to complete</span><button className="button button--primary" type="button" onClick={() => goTo(1)}>See protection paths <ArrowRight /></button></div>
              </section>
            )}

            {step === 1 && (
              <section className="studio-step">
                <div className="studio-step__heading"><small>STEP 2 OF 6</small><h1>Choose how you want to be protected.</h1><p>Compare Ford Protect paths here without leaving Bob Maxey’s site.</p></div>
                <VehicleStrip quote={quote} onEdit={() => goTo(0)} />
                <div className="program-switch">
                  <button type="button" className={quote.program === 'esp' ? 'is-selected' : ''} onClick={() => update('program', 'esp')}><ShieldCheck /><span><strong>Extended Service Plan</strong><small>Choose a plan, fixed term, mileage limit, and deductible.</small></span>{quote.program === 'esp' && <Check />}</button>
                  <button type="button" className={quote.program === 'csp' ? 'is-selected' : ''} onClick={() => update('program', 'csp')}><CalendarDays /><span><strong>Continued Service Plan</strong><small>Monthly protection for eligible older or higher-mileage vehicles.</small></span>{quote.program === 'csp' && <Check />}</button>
                </div>
                {quote.program === 'esp' ? (
                  <>
                    <div className="path-switch"><span>Which eligibility path should we explore?</span><div><button type="button" className={quote.planPath === 'new' ? 'is-selected' : ''} onClick={() => update('planPath', 'new')}><strong>New-plan path</strong><small>Time / mileage from original in-service and 0 miles</small></button><button type="button" className={quote.planPath === 'used' ? 'is-selected' : ''} onClick={() => update('planPath', 'used')}><strong>Used-plan path</strong><small>Time / miles from contract date and current odometer</small></button></div></div>
                    <div className="studio-section studio-section--plans">
                      <div className="studio-section__heading"><div><span>03</span><h2>Select a coverage level</h2></div><small>Open any plan to see its full on-site coverage guide.</small></div>
                      <div className="studio-plan-grid">
                        {applicablePlans.map((item) => (
                          <article key={item.id} className={`studio-plan-card ${espPlan.id === item.id ? 'is-selected' : ''}`}>
                            <button className="studio-plan-select" type="button" onClick={() => update('planId', item.id)}>
                              <span className="selection-dot">{espPlan.id === item.id && <Check />}</span>
                              <small>{item.label}</small><strong>{item.name}</strong>
                              <b>{item.count}</b><em>covered components</em>
                              <p>{item.bestFor}</p>
                            </button>
                            <button className="studio-plan-help" type="button" onClick={() => { update('planId', item.id); setPlanHelp(true); }}>Full coverage details <ArrowRight /></button>
                          </article>
                        ))}
                      </div>
                    </div>
                    <div className="source-note"><Info /><span><strong>Planning matrix, not a price book</strong><small>{historicalMatrixNotice}</small></span></div>
                  </>
                ) : (
                  <div className="studio-section csp-section">
                    <div className="csp-intro"><div><small>MONTHLY CONTINUED COVERAGE</small><h2>Protection that can continue with your vehicle.</h2><p>Ford publishes Continued Service Plan eligibility up to 12 model years / 140,000 miles at enrollment, with coverage potentially continuing to 14 model years / 160,000 miles. No annual mileage limit applies; current rules and state availability must be confirmed.</p></div><span><CalendarDays /><strong>Monthly</strong><small>Cancel or transfer where agreement rules allow</small></span></div>
                    <div className="csp-levels">{cspLevels.map((item) => <button type="button" key={item.id} className={quote.cspLevel === item.id ? 'is-selected' : ''} onClick={() => update('cspLevel', item.id)}><span className="selection-dot">{quote.cspLevel === item.id && <Check />}</span><small>{item.label}</small><strong>{item.name}</strong><p>{item.description}</p></button>)}</div>
                    <button className="inline-detail-link" type="button" onClick={() => setPlanHelp(true)}>See the full Continued Service coverage guide <ArrowRight /></button>
                    {quote.state === 'California' && <div className="inline-warning"><Info /><span><strong>California limitation</strong><small>Ford’s current public information says Continued Service Plan is not available in California.</small></span></div>}
                  </div>
                )}
                <div className="studio-actions"><button className="back-link" type="button" onClick={() => goTo(0)}><ArrowLeft /> Back</button><button className="button button--primary" type="button" onClick={() => goTo(2)}>Choose term and mileage <ArrowRight /></button></div>
              </section>
            )}

            {step === 2 && (
              <section className="studio-step">
                <div className="studio-step__heading"><small>STEP 3 OF 6</small><h1>{quote.program === 'csp' ? 'Understand the monthly coverage path.' : 'Build the time-and-mileage combination.'}</h1><p>{quote.program === 'csp' ? 'CSP follows monthly terms rather than a fixed years-and-miles grid.' : 'Pick months first, then only mileage choices shown as available for that term.'}</p></div>
                <VehicleStrip quote={quote} onEdit={() => goTo(0)} />
                {quote.program === 'esp' ? (
                  <div className="studio-section term-builder-section">
                    <div className="term-context"><span><strong>{plan.name}</strong><small>{quote.planPath === 'used' ? 'Used-plan terms begin at signature/current mileage.' : 'New-plan terms measure from original in-service/zero miles.'}</small></span><button type="button" onClick={() => goTo(1)}>Change plan</button></div>
                    {matrix.months.length ? <TermMatrix matrix={matrix} quote={quote} recommendation={recommendation} showMatrix={showMatrix} onToggleMatrix={() => setShowMatrix((value) => !value)} onMonth={chooseMonth} onMiles={(miles) => update('termMiles', miles)} onUseMatch={() => setQuote((current) => ({ ...current, termMonths: recommendation.months, termMiles: recommendation.miles }))} /> : <div className="no-standard-matrix"><ShieldCheck /><h2>Specialist review needed</h2><p>A standard used-plan term grid is not shown beyond the historical guide’s current-mileage range. Continued Service Plan may be a better path.</p><button className="button button--secondary" type="button" onClick={() => { update('program', 'csp'); goTo(1); }}>Explore Continued Service Plan</button></div>}
                    <div className="source-note source-note--plain"><Info /><span><strong>How the two mileage paths differ</strong><small>New-plan mileage is a total odometer limit. Used-plan mileage is additional mileage added from the contract’s starting odometer. Final Ford eligibility can remove or add combinations.</small></span></div>
                  </div>
                ) : (
                  <div className="studio-section csp-term-card">
                    <div className="csp-term-card__hero"><CalendarDays /><span><small>SELECTED PATH</small><h2>Continued Service Plan {cspLevel.name}</h2><p>A monthly plan with no annual mileage limit for eligible vehicles.</p></span></div>
                    <div className="csp-facts"><div><strong>Monthly</strong><span>Fixed monthly payment shown in the final CSP offer</span></div><div><strong>No annual limit</strong><span>Drive the miles you need while the agreement remains eligible</span></div><div><strong>14 yrs / 160k</strong><span>Published maximum vehicle age / mileage where eligible</span></div></div>
                    <div className="source-note"><Info /><span><strong>Vehicle-specific offer required</strong><small>Coverage level, deductible, monthly amount, effective date, state availability, cancellation, transfer, and expiration are confirmed in the returned CSP agreement.</small></span></div>
                  </div>
                )}
                <div className="studio-actions"><button className="back-link" type="button" onClick={() => goTo(1)}><ArrowLeft /> Back</button><button className="button button--primary" type="button" onClick={() => goTo(3)}>Choose options <ArrowRight /></button></div>
              </section>
            )}

            {step === 3 && (
              <section className="studio-step">
                <div className="studio-step__heading"><small>STEP 4 OF 6</small><h1>Add only what fits your ownership plan.</h1><p>Deductibles and benefits are requests until Ford confirms what is available for the vehicle and term.</p></div>
                {quote.program === 'esp' ? (
                  <>
                    <div className="studio-section">
                      <div className="studio-section__heading"><div><span>04</span><h2>Deductible preference</h2></div><small>$100 is the standard option shown in Ford plan materials.</small></div>
                      <div className="deductible-grid">{deductibleOptions.filter((item) => item.paths.includes(quote.planPath)).map((item) => <button key={item.id} type="button" className={`${quote.deductible === item.id ? 'is-selected' : ''} ${item.recommended ? 'is-recommended' : ''}`} onClick={() => update('deductible', item.id)}><span>{quote.deductible === item.id && <Check />}</span><strong>{item.label}</strong><small>{item.help}</small>{item.recommended && <em>STANDARD</em>}</button>)}</div>
                    </div>
                    <div className="studio-section">
                      <div className="studio-section__heading"><div><span>05</span><h2>Protection options</h2></div><small>Selections are checked against the final plan agreement.</small></div>
                      <div className="addon-grid">{availableAddOns.map((choice) => { const Icon = optionIcons[choice.id] || ShieldCheck; const selected = quote.addOns.includes(choice.id); return <button key={choice.id} className={selected ? 'is-selected' : ''} type="button" onClick={() => toggleAddOn(choice.id)}><span className="addon-check">{selected && <Check />}</span><Icon /><span><strong>{choice.title}</strong><small>{choice.short}</small></span></button>; })}</div>
                    </div>
                  </>
                ) : <div className="studio-section csp-options-note"><ShieldCheck /><span><small>CONTINUED SERVICE PLAN</small><h2>Options and deductible come with the Ford-returned offer.</h2><p>We will carry your selected {cspLevel.name} level to the F&I specialist. The exact deductible and benefits remain part of the vehicle-specific CSP agreement.</p></span></div>}
                <div className="studio-section">
                  <div className="studio-section__heading"><div><span>06</span><h2>Maintenance preference</h2></div><small>Maintenance is separate from a mechanical repair plan unless an EV bundle states otherwise.</small></div>
                  <div className="maintenance-choice-grid">{availableMaintenance.map((choice) => <button key={choice.id} type="button" className={quote.maintenanceId === choice.id ? 'is-selected' : ''} onClick={() => selectMaintenance(choice.id)}><span className="selection-dot">{quote.maintenanceId === choice.id && <Check />}</span>{choice.id === 'none' ? <X /> : quote.powertrain === 'Electric' ? <Zap /> : <Wrench />}<strong>{choice.title}</strong><small>{choice.text}</small></button>)}</div>
                  {quote.maintenanceId !== 'none' && <div className="maintenance-interval"><span><strong>Preferred service interval</strong><small>The vehicle’s maintenance schedule and current program determine the final interval.</small></span><div>{maintenanceIntervals.map((item) => <button key={item.value} type="button" className={quote.maintenanceInterval === item.value ? 'is-selected' : ''} onClick={() => update('maintenanceInterval', item.value)}><strong>{item.label}</strong><small>{item.text}</small></button>)}</div></div>}
                </div>
                <div className="studio-section payment-choice"><div><CircleDollarSign /><span><strong>How would you like to review payment?</strong><small>Ford currently advertises eligible interest-free installment options. Down payment, number of payments, and first due date are confirmed with the current offer.</small></span></div><select value={quote.paymentPreference} onChange={(event) => update('paymentPreference', event.target.value)}><option>Review available interest-free installment options</option><option>Pay in full</option><option>Show me both choices</option><option>Not sure yet</option></select></div>
                <div className="studio-actions"><button className="back-link" type="button" onClick={() => goTo(2)}><ArrowLeft /> Back</button><button className="button button--primary" type="button" onClick={() => goTo(4)}>Add my details <ArrowRight /></button></div>
              </section>
            )}

            {step === 4 && (
              <section className="studio-step">
                <div className="studio-step__heading"><small>STEP 5 OF 6</small><h1>Tell the Ford Protect specialist where to reach you.</h1><p>Your information is used to prepare and follow up on this coverage request—not to issue a contract automatically.</p></div>
                <div className="details-layout">
                  <div className="studio-section">
                    <div className="studio-section__heading"><div><span>07</span><h2>Customer details</h2></div><small>Required for CRM delivery</small></div>
                    <div className="studio-fields studio-fields--two">
                      <Field label="First name" error={showErrors && !quote.customer.firstName.trim() ? 'Enter a first name' : ''}><input autoComplete="given-name" value={quote.customer.firstName} onChange={(event) => updateCustomer('firstName', event.target.value)} /></Field>
                      <Field label="Last name" error={showErrors && !quote.customer.lastName.trim() ? 'Enter a last name' : ''}><input autoComplete="family-name" value={quote.customer.lastName} onChange={(event) => updateCustomer('lastName', event.target.value)} /></Field>
                      <Field label="Email" error={showErrors && !/\S+@\S+\.\S+/.test(quote.customer.email) ? 'Enter a valid email' : ''}><input type="email" autoComplete="email" value={quote.customer.email} onChange={(event) => updateCustomer('email', event.target.value)} /></Field>
                      <Field label="Mobile phone" error={showErrors && phoneDigits.length < 10 ? 'Enter a valid phone number' : ''}><input type="tel" autoComplete="tel" value={quote.customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} /></Field>
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
                <div className="privacy-note"><ShieldCheck /><span><strong>Secure handoff design</strong><small>The public site never contains DealerMail credentials. A configured dealership endpoint is required before customer data can leave the browser.</small></span></div>
                <div className="studio-actions"><button className="back-link" type="button" onClick={() => goTo(3)}><ArrowLeft /> Back</button><button className="button button--primary" type="button" onClick={() => { setShowErrors(true); goTo(5); }}>Review my request <ArrowRight /></button></div>
              </section>
            )}

            {step === 5 && (
              <section className="studio-step studio-review">
                <div className="studio-step__heading"><small>STEP 6 OF 6</small><h1>Your Ford Protect request, ready to review.</h1><p>Download the customer proposal now. CRM delivery stays clearly labeled until the secure dealership connection is configured.</p></div>
                <div className="review-hero"><div><small>PERSONAL PROTECTION SUMMARY</small><h2>{plan.name}</h2><p>{quote.year} {quote.make} {quote.model} · Quote {quote.id}</p></div><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /></div>
                <div className="review-grid">
                  <div className="review-lines">
                    <div><span>Customer</span><strong>{quote.customer.firstName || 'Not entered'} {quote.customer.lastName}</strong><button type="button" onClick={() => goTo(4)}>Edit</button></div>
                    <div><span>Vehicle</span><strong>{quote.year} {quote.make} {quote.model} · {formatMiles(quote.mileage)} miles</strong><button type="button" onClick={() => goTo(0)}>Edit</button></div>
                    <div><span>Coverage</span><strong>{plan.name}</strong><button type="button" onClick={() => goTo(1)}>Edit</button></div>
                    <div><span>Term</span><strong>{quote.program === 'csp' ? 'Monthly / no annual mileage limit' : `${formatTerm(quote.termMonths)} / ${formatMiles(quote.termMiles)} ${quote.planPath === 'used' ? 'additional' : 'total'} miles`}</strong><button type="button" onClick={() => goTo(2)}>Edit</button></div>
                    <div><span>Deductible</span><strong>{quote.program === 'csp' ? 'Confirmed with offer' : quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible}`}</strong><button type="button" onClick={() => goTo(3)}>Edit</button></div>
                    <div><span>Options</span><strong>{quote.program === 'csp' ? `${cspLevel.name} CSP offer requested` : protectionOptions.filter((item) => quote.addOns.includes(item.id)).map((item) => item.title).join(', ') || 'None requested'}</strong><button type="button" onClick={() => goTo(3)}>Edit</button></div>
                    <div><span>Maintenance</span><strong>{quote.maintenanceId === 'none' ? 'None requested' : `${quote.maintenanceName} · every ${formatMiles(quote.maintenanceInterval)} miles preferred`}</strong><button type="button" onClick={() => goTo(3)}>Edit</button></div>
                  </div>
                  <aside className="proposal-cta"><FileText /><small>PROFESSIONAL CUSTOMER PROPOSAL</small><h3>Keep the customer confident after the quote.</h3><p>Three designed pages explain the vehicle, plan, coverage, selected options, important terms, and next steps.</p><button className="button button--primary button--full" type="button" onClick={() => setProposalPreview(true)}>Preview & download PDF <ArrowRight /></button></aside>
                </div>
                <div className="crm-handoff">
                  <div className="crm-handoff__heading"><Send /><span><small>DEALERMAIL CRM HANDOFF</small><h3>F&I Product Only Sale lead</h3><p>Destination: {CRM_DESTINATION}. Includes source, customer, vehicle, selected plan, term, mileage, deductible, products, payment preference, notes, and consent.</p></span></div>
                  {!detailsValid && <div className="crm-validation"><Info /><span><strong>Customer details need attention</strong><small>Return to “Your details” to complete name, email, phone, and contact permission.</small></span><button type="button" onClick={() => goTo(4)}>Fix details</button></div>}
                  {crmStatus && <div className={`crm-status ${crmStatus.tone}`}><CheckCircle2 /><span><strong>{crmStatus.title}</strong><small>{crmStatus.text}</small></span></div>}
                  <div className="crm-actions"><button className="button button--secondary" type="button" onClick={downloadXml}><Download /> Download CRM test XML</button><button className="button button--primary" type="button" onClick={sendLead} disabled={busy === 'crm'}>{busy === 'crm' ? 'Sending…' : 'Send to Bob Maxey F&I'} <Send /></button></div>
                  <small className="crm-disclosure">The button never reports success unless the secure dealership endpoint accepts the lead. With no endpoint configured, nothing is sent.</small>
                </div>
                <div className="review-notice"><ShieldCheck /><span><strong>Price and agreement confirmation</strong><small>This request does not buy coverage. A Bob Maxey representative must return the current Ford-eligible offer and agreement for customer review and approval.</small></span></div>
                <div className="studio-actions"><button className="back-link" type="button" onClick={() => goTo(4)}><ArrowLeft /> Back</button><button className="button button--secondary" type="button" onClick={saveQuote}>Save in this browser <Bookmark /></button></div>
              </section>
            )}
          </main>
          <Summary quote={quote} plan={plan} detail={detail} eligibility={eligibility} onSave={saveQuote} onPreview={() => setProposalPreview(true)} />
        </div>
        <div className="studio-mobile-bar"><span><small>{plan.name}</small><strong>{quote.program === 'csp' ? 'Monthly coverage request' : `${formatTerm(quote.termMonths)} · ${formatMiles(quote.termMiles)} mi`}</strong></span><button type="button" onClick={() => goTo(Math.min(5, step + 1))}>{step === 5 ? 'Review' : 'Continue'} <ArrowRight /></button></div>
      </div>
      {planHelp && <PlanHelp plan={plan} detail={detail} onClose={() => setPlanHelp(false)} />}
      {proposalPreview && <ProposalPreview quote={quote} plan={plan} detail={detail} onClose={() => setProposalPreview(false)} onDownload={downloadProposal} busy={busy === 'pdf'} />}
    </div>
  );
}
