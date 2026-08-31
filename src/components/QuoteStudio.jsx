import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, CalendarDays, CarFront, Check, CheckCircle2,
  CircleDollarSign, Clock3, KeyRound, Lightbulb, Mail, MapPin, ShieldCheck, Tag, X,
} from 'lucide-react';
import Brand from './Brand';
import { evPlanData, modelsByMake, planData, states, years } from '../data';
import { productDetails } from '../productDetails';
import { assetUrl } from '../paths';

const stepNames = ['Vehicle', 'Coverage', 'Customize', 'Review'];
const addOnChoices = [
  { id: 'first-day', title: 'First Day Rental', text: 'Rental support beginning on day one of a covered repair.', icon: CarFront },
  { id: 'enhanced-rental', title: 'Enhanced Rental', text: 'Additional rental assistance for longer covered repairs.', icon: Clock3 },
  { id: 'key', title: 'Key Services', text: 'Key fob replacement and related services.', icon: KeyRound },
  { id: 'lighting', title: 'Interior/Exterior Lighting', text: 'Coverage options for eligible bulbs, LEDs and assemblies.', icon: Lightbulb },
];

function Field({ label, hint, children }) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Progress({ step, setStep }) {
  return (
    <div className="studio-progress">
      {stepNames.map((name, index) => (
        <button
          key={name}
          type="button"
          className={`${step === index ? 'is-current' : ''} ${step > index ? 'is-complete' : ''}`}
          onClick={() => index <= step && setStep(index)}
          disabled={index > step}
        >
          <span>{step > index ? <Check size={16} /> : index + 1}</span>
          {name}
        </button>
      ))}
    </div>
  );
}

function Summary({ quote, plan, eligibility, onToast }) {
  const addOns = addOnChoices.filter((choice) => quote.addOns.includes(choice.id)).map((choice) => choice.title);
  const summaryRows = [
    [CarFront, 'Vehicle', `${quote.year || 'Year'} ${quote.make || 'Ford'} ${quote.model || 'Model'}`],
    [ShieldCheck, 'Plan', plan.name],
    [CalendarDays, 'Term', `${quote.termYears} years / ${Number(quote.termMiles).toLocaleString()} miles`],
    [CircleDollarSign, 'Deductible', `$${quote.deductible}`],
    [Tag, 'Add-ons', addOns.length ? addOns.join(', ') : 'None selected'],
  ];

  return (
    <aside className="studio-summary">
      <h2>Your quote</h2>
      <div className="studio-summary__rows">
        {summaryRows.map(([Icon, label, value]) => (
          <div key={label}><Icon /><span><small>{label}</small><strong>{value}</strong></span></div>
        ))}
      </div>
      <div className={`eligibility ${eligibility.tone}`}>
        <CheckCircle2 /><span><strong>{eligibility.title}</strong><small>{eligibility.text}</small></span>
      </div>
      <div className="pricing-connection">
        <Tag />
        <span><small>Secure production connection</small><strong>Live Ford pricing</strong><em>Vehicle eligibility and current Ford rates will appear here after integration.</em></span>
      </div>
      <button className="button button--white button--full" type="button" onClick={() => onToast('Final pricing will come from Ford eligibility and rate data through a secure Bob Maxey integration.')}>How live pricing works <ArrowRight /></button>
      <div className="studio-summary__utility">
        <button type="button" onClick={() => onToast('Your current selections are saved automatically in this browser.')}><Bookmark /> Save quote</button>
        <button type="button" onClick={() => onToast('Email delivery will connect to the dealership CRM at deployment.')}><Mail /> Email quote</button>
      </div>
      <p>Quotes are not final until eligibility, pricing and contract issuance are confirmed by Bob Maxey Ford.</p>
    </aside>
  );
}

function PlanHelp({ plan, onClose }) {
  const detail = productDetails[plan.id];
  if (!detail) return null;
  return (
    <div className="context-backdrop" role="dialog" aria-modal="true" aria-label={`${plan.name} plan details`}>
      <article className="context-modal">
        <header><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /><button type="button" onClick={onClose} aria-label="Close plan details"><X /></button></header>
        <div className="context-modal__body">
          <p>{detail.type}</p><h2>{detail.name}</h2><strong>{detail.tagline}</strong><span>{detail.coverageModel}</span>
          <div className="context-modal__facts"><div><b>{detail.stat}</b><small>{detail.statLabel}</small></div><div><b>{detail.maxTerm.split(' on eligible')[0]}</b><small>published maximum where eligible</small></div></div>
          <h3>Coverage highlights</h3>
          <ul>{detail.coverageGroups.slice(0, 6).map((group) => <li key={group.title}><Check /> <span><b>{group.title}</b><small>{group.summary}</small></span></li>)}</ul>
          <div className="context-modal__notice"><ShieldCheck /><span><b>Vehicle-specific confirmation</b><small>The final component list, term, deductible and price come from the agreement returned for this VIN.</small></span></div>
        </div>
        <footer><button className="button button--primary" type="button" onClick={onClose}>Choose {detail.name} <ArrowRight /></button></footer>
      </article>
    </div>
  );
}

export default function QuoteStudio({ initial = {}, onClose, onToast, onSaved }) {
  const [step, setStep] = useState(0);
  const [planHelp, setPlanHelp] = useState(null);
  const [quote, setQuote] = useState({
    vin: '',
    year: initial.year || '2024',
    make: initial.make || 'Ford',
    model: initial.model || 'Edge AWD',
    mileage: initial.mileage || '25000',
    zip: initial.zip || '',
    state: 'Michigan',
    inService: '2024-02-15',
    usage: 'Personal',
    powertrain: initial.powertrain || 'Gas',
    snowPlow: 'No',
    planId: initial.planId || (initial.powertrain === 'Electric' ? 'premium-plus-ev' : 'premium'),
    termYears: 4,
    termMiles: 100000,
    deductible: 100,
    addOns: ['first-day'],
    store: 'Howell',
  });
  const vinRef = useRef(null);
  const applicablePlans = useMemo(() => quote.powertrain === 'Electric' ? evPlanData : planData, [quote.powertrain]);
  const plan = useMemo(() => applicablePlans.find((item) => item.id === quote.planId) ?? applicablePlans[0], [applicablePlans, quote.planId]);
  const modelOptions = modelsByMake[quote.make] ?? [];
  const eligibility = useMemo(() => {
    const mileage = Number(quote.mileage || 0);
    if (mileage > 100000) return { tone: 'review', title: 'Specialist review needed', text: 'Higher-mileage vehicles may require additional eligibility review.' };
    if (!quote.inService) return { tone: 'review', title: 'In-service date needed', text: 'Bob Maxey can help verify the original warranty start date.' };
    return { tone: 'positive', title: 'Initial details look eligible', text: 'Final eligibility is confirmed against Ford records before purchase.' };
  }, [quote.mileage, quote.inService]);

  useEffect(() => {
    document.body.classList.add('modal-open');
    if (initial.focusVin) window.setTimeout(() => vinRef.current?.focus(), 180);
    const escape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', escape);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', escape);
    };
  }, [initial.focusVin, onClose]);

  const update = (field, value) => {
    setQuote((current) => ({
      ...current,
      [field]: value,
      ...(field === 'make' ? { model: '' } : {}),
      ...(field === 'powertrain' ? { planId: value === 'Electric' ? 'premium-plus-ev' : 'premium' } : {}),
    }));
  };

  const toggleAddOn = (id) => {
    setQuote((current) => ({
      ...current,
      addOns: current.addOns.includes(id) ? current.addOns.filter((item) => item !== id) : [...current.addOns, id],
    }));
  };

  const saveQuote = () => {
    const id = `BMX-${Date.now().toString().slice(-7)}`;
    const saved = { ...quote, id, planName: plan.name, savedAt: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('bobMaxeyProtectQuotes') || '[]');
    localStorage.setItem('bobMaxeyProtectQuotes', JSON.stringify([saved, ...existing].slice(0, 8)));
    onSaved(saved);
    onToast(`Quote summary ${id} saved in this browser.`);
  };

  return (
    <div className="studio-backdrop" role="dialog" aria-modal="true" aria-label="Build your Ford Protect quote">
      <div className="quote-studio">
        <header className="studio-header">
          <Brand />
          <div className="studio-header__utilities"><MapPin /> Bob Maxey dealership network</div>
          <button className="studio-close" type="button" onClick={onClose} aria-label="Close quote builder"><X /></button>
        </header>
        <Progress step={step} setStep={setStep} />
        <div className="studio-layout">
          <main className="studio-main">
            {step === 0 && (
              <section className="studio-step">
                <div className="studio-step__heading"><h1>Build your Ford Protect quote</h1><p>Start with your vehicle. You can verify or change every detail before review.</p></div>
                <div className="studio-section">
                  <h2>Vehicle information</h2>
                  <div className="studio-fields studio-fields--four">
                    <Field label="VIN (optional)" hint="17 characters"><input ref={vinRef} value={quote.vin} maxLength="17" placeholder="Enter VIN" onChange={(event) => update('vin', event.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))} /></Field>
                    <Field label="Year"><select value={quote.year} onChange={(event) => update('year', event.target.value)}>{years.map((year) => <option key={year}>{year}</option>)}</select></Field>
                    <Field label="Make"><select value={quote.make} onChange={(event) => update('make', event.target.value)}><option>Ford</option><option>Lincoln</option></select></Field>
                    <Field label="Model"><select value={quote.model} onChange={(event) => update('model', event.target.value)}>{modelOptions.map((model) => <option key={model}>{model}</option>)}</select></Field>
                  </div>
                  <div className="studio-fields studio-fields--four studio-fields--secondary">
                    <Field label="Current mileage"><input type="number" min="0" value={quote.mileage} onChange={(event) => update('mileage', event.target.value)} /></Field>
                    <Field label="State registered"><select value={quote.state} onChange={(event) => update('state', event.target.value)}>{states.map((state) => <option key={state}>{state}</option>)}</select></Field>
                    <Field label="ZIP code"><input inputMode="numeric" maxLength="5" placeholder="Enter ZIP" value={quote.zip} onChange={(event) => update('zip', event.target.value.replace(/\D/g, ''))} /></Field>
                    <Field label="In-service date"><input type="date" value={quote.inService} onChange={(event) => update('inService', event.target.value)} /><button className="field-link" type="button" onClick={() => update('inService', '')}>I don’t know my in-service date</button></Field>
                  </div>
                </div>
                <div className="studio-section vehicle-rating-section">
                  <div className="vehicle-rating-section__heading">
                    <div><h2>Vehicle use and powertrain</h2><p>These details can affect plan availability and Ford rating categories.</p></div>
                    <span>VIN decoding can automate these fields after integration.</span>
                  </div>
                  <div className="vehicle-rating-grid">
                    <div><strong>Vehicle use</strong><div>{['Personal', 'Business'].map((value) => <button key={value} className={quote.usage === value ? 'is-selected' : ''} type="button" onClick={() => update('usage', value)}>{value}</button>)}</div></div>
                    <div><strong>Powertrain</strong><div>{['Gas', 'Hybrid', 'Electric'].map((value) => <button key={value} className={quote.powertrain === value ? 'is-selected' : ''} type="button" onClick={() => update('powertrain', value)}>{value}</button>)}</div></div>
                    <div><strong>Snow-plow use</strong><div>{['No', 'Yes'].map((value) => <button key={value} className={quote.snowPlow === value ? 'is-selected' : ''} type="button" onClick={() => update('snowPlow', value)}>{value}</button>)}</div></div>
                  </div>
                </div>
                <div className="studio-actions"><span /><button className="button button--primary" type="button" onClick={() => setStep(1)}>Choose coverage <ArrowRight /></button></div>
              </section>
            )}

            {step === 1 && (
              <section className="studio-step">
                <div className="studio-step__heading"><h1>Choose the protection that fits your Ford</h1><p>We matched these plans to your vehicle and ownership goals.</p></div>
                <div className="studio-vehicle-strip"><CarFront /><strong>{quote.year} {quote.make} {quote.model}</strong><span>{Number(quote.mileage || 0).toLocaleString()} miles</span><span>{quote.state}</span><button type="button" onClick={() => setStep(0)}>Edit vehicle</button></div>
                <div className="studio-section studio-section--plans">
                  <div className="studio-section__heading"><h2>Select a plan</h2><span>Open a plan for complete coverage details.</span></div>
                  <div className="studio-plan-list">
                    {applicablePlans.map((item) => (
                      <div key={item.id} className={`studio-plan-row ${quote.planId === item.id ? 'is-selected' : ''}`}>
                        <button className="studio-plan-select" type="button" onClick={() => update('planId', item.id)}>
                          <span className="selection-dot">{quote.planId === item.id && <Check />}</span>
                          <span><strong>{item.name}</strong><small>{item.description}</small></span>
                          <span className="component-count"><strong>{item.count}</strong><small>covered components</small></span>
                        </button>
                        <button className="studio-plan-help" type="button" onClick={() => setPlanHelp(item)}>Plan details</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="studio-section studio-term-section">
                  <div className="term-explainer"><CircleDollarSign /><span><strong>Why this changes your price</strong><small>Longer time or mileage means more protection and more potential covered repairs. Only Ford-eligible combinations are shown in production.</small></span></div>
                  <div><h2>Years</h2><div className="choice-row">{[4, 5, 6, 7, 8].map((value) => <button key={value} type="button" className={quote.termYears === value ? 'is-selected' : ''} onClick={() => update('termYears', value)}>{value}</button>)}</div><small>{quote.termYears} years selected</small></div>
                  <div><h2>Mileage</h2><div className="choice-row">{[60000, 75000, 100000, 125000].map((value) => <button key={value} type="button" className={quote.termMiles === value ? 'is-selected' : ''} onClick={() => update('termMiles', value)}>{(value / 1000)}k</button>)}</div><small>{Number(quote.termMiles).toLocaleString()} miles selected</small></div>
                </div>
                <div className="studio-actions"><button className="back-link" type="button" onClick={() => setStep(0)}><ArrowLeft /> Back</button><button className="button button--primary" type="button" onClick={() => setStep(2)}>Customize coverage <ArrowRight /></button></div>
              </section>
            )}

            {step === 2 && (
              <section className="studio-step">
                <div className="studio-step__heading"><h1>Customize your protection</h1><p>Set your deductible and add only the options that matter to you.</p></div>
                <div className="studio-section">
                  <h2>Deductible</h2>
                  <div className="deductible-row">{[0, 50, 100, 200].map((value) => <button key={value} type="button" className={quote.deductible === value ? 'is-selected' : ''} onClick={() => update('deductible', value)}>${value}{quote.deductible === value && <Check />}</button>)}</div>
                </div>
                <div className="studio-section">
                  <h2>Protection options</h2>
                  <div className="addon-grid">
                    {addOnChoices.map((choice) => {
                      const Icon = choice.icon;
                      const selected = quote.addOns.includes(choice.id);
                      return (
                        <button key={choice.id} className={selected ? 'is-selected' : ''} type="button" onClick={() => toggleAddOn(choice.id)}>
                          <span className="addon-check">{selected && <Check />}</span><Icon /><span><strong>{choice.title}</strong><small>{choice.text}</small></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="studio-actions"><button className="back-link" type="button" onClick={() => setStep(1)}><ArrowLeft /> Back</button><button className="button button--primary" type="button" onClick={() => setStep(3)}>Review selections <ArrowRight /></button></div>
              </section>
            )}

            {step === 3 && (
              <section className="studio-step studio-review">
                <div className="studio-step__heading"><h1>Review your selections</h1><p>Everything remains editable until Bob Maxey confirms your final Ford Protect eligibility and price.</p></div>
                <div className="review-vehicle"><CarFront /><div><small>Vehicle</small><h2>{quote.year} {quote.make} {quote.model}</h2><p>{Number(quote.mileage || 0).toLocaleString()} miles · {quote.state}</p></div><button type="button" onClick={() => setStep(0)}>Edit</button></div>
                <div className="review-lines">
                  <div><span>Coverage</span><strong>{plan.name}</strong><button type="button" onClick={() => setStep(1)}>Edit</button></div>
                  <div><span>Term</span><strong>{quote.termYears} years / {Number(quote.termMiles).toLocaleString()} miles</strong><button type="button" onClick={() => setStep(1)}>Edit</button></div>
                  <div><span>Deductible</span><strong>${quote.deductible}</strong><button type="button" onClick={() => setStep(2)}>Edit</button></div>
                  <div><span>Protection options</span><strong>{addOnChoices.filter((item) => quote.addOns.includes(item.id)).map((item) => item.title).join(', ') || 'None selected'}</strong><button type="button" onClick={() => setStep(2)}>Edit</button></div>
                </div>
                <div className="review-notice"><ShieldCheck /><span><strong>Dealer-confirmed pricing</strong><small>The production version will retrieve current Ford rates and apply Bob Maxey pricing before purchase.</small></span></div>
                <div className="studio-actions"><button className="back-link" type="button" onClick={() => setStep(2)}><ArrowLeft /> Back</button><button className="button button--primary" type="button" onClick={saveQuote}>Save quote summary <Bookmark /></button></div>
              </section>
            )}
          </main>
          <Summary quote={quote} plan={plan} eligibility={eligibility} onToast={onToast} />
        </div>
      </div>
      {planHelp && <PlanHelp plan={planHelp} onClose={() => setPlanHelp(null)} />}
    </div>
  );
}
