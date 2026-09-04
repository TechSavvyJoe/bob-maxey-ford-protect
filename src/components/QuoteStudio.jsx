import { Children, cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react';
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
  getTermMatrix, historicalMatrixNotice, isDeductibleAvailable, isProtectionOptionAvailable, maintenanceChoices,
  protectionOptions,
} from '../quoteData';
import { createAdfXml, CRM_DESTINATION, downloadLeadXml, submitCrmLead } from '../crmLead';
import {
  createDefaultQuoteProductSelection, getQuoteProductCatalog, getWarrantyInspectionStatus,
  getProductTimingPresentation, quoteProducts, validateQuoteProductSelection, VEHICLE_SITUATIONS,
} from '../quoteProducts';
import { buildProposalModel } from '../quoteOutput';
import { CONTACT_CONSENT_TEXT, CONTACT_CONSENT_VERSION, createConsentMetadata } from '../consent';
import { createQuoteId, deleteDraft, saveDraft } from '../draftStorage';
import { decodeVinWithVpic, normalizeVin, VIN_PATTERN } from '../vinDecoder';
import { handleRovingChoiceKeyDown, useDialogFocus } from '../useDialogFocus';

const stepNames = ['Vehicle', 'Coverage', 'Term', 'Options', 'Contact', 'Review'];
const optionIcons = {
  'first-day': CarFront,
  'enhanced-rental': Clock3,
  key: KeyRound,
  lighting: Lightbulb,
  'pickup-delivery': MapPin,
};

const paymentChoices = [
  { value: 'Review interest-free financing if eligible', title: 'Show the interest-free payment option', text: 'Ford currently advertises interest-free financing for eligible Ford Protect Extended Service Plans for up to 30 months. The returned offer controls the down payment and schedule.' },
  { value: 'Pay in full', title: 'Show the total plan price', text: 'Review the complete specialist-confirmed price as one amount.' },
  { value: 'Compare total price and eligible financing', title: 'Compare both choices', text: 'See the complete price and any eligible interest-free payment option together.' },
  { value: 'Not sure yet', title: 'Help me decide', text: 'Ask the Bob Maxey specialist to explain both paths.' },
];

const normalizePaymentPreference = (value) => {
  const normalized = value === 'Show me both choices' ? 'Compare total price and eligible financing' : value;
  return paymentChoices.some((choice) => choice.value === normalized) ? normalized : '';
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

const vehicleSituations = [
  {
    id: 'new-purchase',
    purchaseContext: 'shopping',
    label: 'Buying a new vehicle',
    eyebrow: 'AT BOB MAXEY',
    description: 'Plan products for a new-vehicle purchase.',
    Icon: CarFront,
  },
  {
    id: 'used-purchase',
    purchaseContext: 'shopping',
    label: 'Buying a used vehicle',
    eyebrow: 'AT BOB MAXEY',
    description: 'Plan products for a used-vehicle purchase.',
    Icon: CarFront,
  },
  {
    id: 'owned-after-sale',
    purchaseContext: 'owner',
    label: 'I already own it',
    eyebrow: 'AFTER THE SALE',
    description: 'It may have been purchased here or elsewhere.',
    Icon: KeyRound,
  },
];

const coveragePlanIds = new Set([...planData, ...evPlanData].map((item) => item.id));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const normalizeAcceptedReceipt = (receipt) => {
  if (receipt?.accepted !== true || !String(receipt?.leadId || '').trim() || !Number.isFinite(Date.parse(receipt?.receivedAt || ''))) return null;
  return { accepted: true, leadId: String(receipt.leadId).trim(), receivedAt: new Date(receipt.receivedAt).toISOString() };
};

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

const asDisplayItem = (item) => {
  if (typeof item === 'string') return { title: item, text: '' };
  if (!item || typeof item !== 'object') return null;
  const title = item.title || item.label || item.name || item.text || item.description || '';
  const text = item.title || item.label || item.name ? item.text || item.description || item.summary || '' : '';
  return title ? { title, text } : null;
};

function productCoverageHighlights(product) {
  const direct = [
    product.covered,
    product.coverage,
    product.coverageHighlights,
    product.included,
    product.planOptions,
    product.requirements,
  ].find((items) => Array.isArray(items) && items.length);
  if (direct) return direct.map(asDisplayItem).filter(Boolean).slice(0, 8);

  const variant = product.configuration?.variants?.find((item) => item.customerSelectable !== false)
    || product.configuration?.variants?.[0];
  const configured = [
    variant?.purchaseWindowLabel,
    variant?.startBasisLabel,
    ...(variant?.termMonths?.length ? [`Terms available from ${compactTerm(Math.min(...variant.termMonths))} to ${compactTerm(Math.max(...variant.termMonths))}`] : []),
    ...(variant?.serviceIntervals?.length ? [`Service intervals include ${variant.serviceIntervals.map((miles) => `${formatMiles(miles)} miles`).join(', ')}`] : []),
  ].filter(Boolean);
  if (configured.length) return configured.map(asDisplayItem).filter(Boolean).slice(0, 8);

  return (product.highlights || product.benefits || []).map(asDisplayItem).filter(Boolean).slice(0, 8);
}

function productTimingLabel(product, purchaseContext) {
  const timing = getProductTimingPresentation(product);
  if (timing.code) return timing.shortLabel;
  const contexts = getProductPurchaseContexts(product);
  if (contexts.includes('shopping') && contexts.includes('owner')) {
    return purchaseContext === 'owner'
      ? 'Available after the sale, subject to eligibility'
      : 'Available with purchase or during an eligible post-sale window';
  }
  return contexts.includes('owner') ? 'Available after the sale' : 'Must be selected with the vehicle transaction';
}

function PurchaseContextSelector({ value, error, onSelect }) {
  return (
    <section className={`purchase-context-selector ${error ? 'has-error' : ''}`} aria-labelledby="purchase-context-title">
      <div className="purchase-context-selector__intro">
        <span className="purchase-context-selector__icon"><PackagePlus /></span>
        <span><strong id="purchase-context-title">When are you choosing products?</strong><small>This keeps every option tied to the right purchase window.</small></span>
      </div>
      <div className="purchase-context-selector__choices" role="radiogroup" aria-label="Vehicle purchase stage" onKeyDown={handleRovingChoiceKeyDown}>
        {vehicleSituations.map(({ id, label, eyebrow, description, Icon }, index) => {
          const selected = value === id;
          return (
            <button key={id} type="button" role="radio" aria-checked={selected} tabIndex={selected || (!value && index === 0) ? 0 : -1} className={selected ? 'is-selected' : ''} onClick={() => onSelect(id)}>
              <span className="purchase-context-choice__icon"><Icon /></span>
              <span><small>{eyebrow}</small><strong>{label}</strong><em>{description}</em></span>
              <span className="purchase-context-choice__check">{selected && <Check />}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="purchase-context-selector__error" role="alert">Choose whether you are buying a new vehicle, buying a used vehicle, or adding protection after the sale.</p>}
    </section>
  );
}

function Field({ label, hint, error, children }) {
  const labelId = useId();
  const descriptionId = useId();
  let primaryControlFound = false;
  const labelledChildren = Children.map(children, (child) => {
    if (!isValidElement(child) || primaryControlFound || !['input', 'select', 'textarea'].includes(child.type)) return child;
    primaryControlFound = true;
    return cloneElement(child, {
      'aria-labelledby': [child.props['aria-labelledby'], labelId].filter(Boolean).join(' '),
      'aria-describedby': [child.props['aria-describedby'], (error || hint) ? descriptionId : ''].filter(Boolean).join(' ') || undefined,
      'aria-invalid': child.props['aria-invalid'] ?? Boolean(error),
    });
  });
  return (
    <div className={`studio-field ${error ? 'has-error' : ''}`}>
      <span id={labelId}>{label}</span>
      {labelledChildren}
      {error ? <small id={descriptionId} className="field-error" role="alert">{error}</small> : hint ? <small id={descriptionId}>{hint}</small> : null}
    </div>
  );
}

function StepAlert({ issue }) {
  if (!issue) return null;
  return <div className="studio-step-alert" role="alert"><Info /><span><strong>One more step before you continue</strong><small>{issue}</small></span></div>;
}

function Progress({ step, maxStep, onSelect }) {
  return (
    <div className="studio-progress" aria-label="Coverage request progress">
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

function PlanRail({ plans, selectedId, planPath, onSelect, onDetails, compact = false }) {
  const planIsAvailable = (item) => !Array.isArray(item.planPaths) || item.planPaths.includes(planPath);
  const selected = plans.find((item) => item.id === selectedId && planIsAvailable(item)) || null;
  return (
    <div className={`plan-rail-wrap ${compact ? 'is-compact' : ''}`}>
      <div className="studio-plan-rail" role="radiogroup" aria-label="Ford Protect coverage level" onKeyDown={handleRovingChoiceKeyDown}>
        {plans.map((item, index) => {
          const available = planIsAvailable(item);
          const firstAvailable = plans.findIndex(planIsAvailable);
          const selectedItem = available && selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selectedItem}
              aria-describedby={!available ? `${item.id}-path-notice` : undefined}
              disabled={!available}
              tabIndex={selectedItem || (!selected && index === firstAvailable) ? 0 : -1}
              className={`${selectedItem ? 'is-selected' : ''} ${!available ? 'is-unavailable' : ''}`}
              onClick={() => available && onSelect(item.id)}
            >
              <ShieldCheck />
              <span>
                <strong>{item.name}</strong>
                <small>{available ? `${item.count} covered components` : 'New-plan only in the supplied guide'}</small>
                {!available && <small id={`${item.id}-path-notice`}>Ford must verify whether a current offer provides another path.</small>}
              </span>
              {selectedItem && <CheckCircle2 className="plan-rail-check" />}
            </button>
          );
        })}
      </div>
      {!compact && (
        <div className="plan-coverage-table" role="table" aria-label="Coverage level overview">
          <div role="row"><span role="rowheader">Coverage position</span>{plans.map((item) => <strong role="cell" className={selectedId === item.id && planIsAvailable(item) ? 'is-selected' : ''} key={item.id}>{planIsAvailable(item) ? item.label : 'New-plan only'}</strong>)}</div>
          <div role="row"><span role="rowheader">Listed components</span>{plans.map((item) => <strong role="cell" className={selectedId === item.id && planIsAvailable(item) ? 'is-selected' : ''} key={item.id}>{planIsAvailable(item) ? item.count : 'Not in used guide'}</strong>)}</div>
        </div>
      )}
      {selected
        ? <button className="selected-plan-detail" type="button" onClick={() => onDetails(selected.id)}>View {selected.name} coverage details <ArrowRight /></button>
        : <p className="plan-rail-prompt"><Info /> Select a coverage level to continue. You can open its complete guide before moving on.</p>}
    </div>
  );
}

function Summary({ quote, plan, eligibility, selectedProducts = [], inspection }) {
  const selectedOptions = protectionOptions.filter((item) => quote.addOns.includes(item.id));
  const planConfirmed = quote.program === 'esp' ? Boolean(quote.planId && quote.planPath)
    : quote.program === 'csp' ? Boolean(quote.cspLevel)
      : quote.program === 'enginecare' ? Boolean(quote.engineCareLevel) : false;
  const term = !planConfirmed ? 'Choose coverage first' : quote.program === 'csp'
    ? 'Monthly / no annual mileage limit'
    : quote.program === 'enginecare'
      ? '7 years / 200,000 total miles / 8,000 engine hours'
    : quote.termMonths && quote.termMiles
      ? `${formatTerm(quote.termMonths)} / ${formatMiles(quote.termMiles)} ${quote.planPath === 'used' ? 'additional' : 'total'} miles`
      : 'Choose term & mileage';
  const deductible = !planConfirmed ? 'Not selected' : quote.program === 'csp'
    ? 'Confirmed with CSP offer'
    : quote.program === 'enginecare'
      ? '$100'
    : !quote.deductible ? 'Choose a deductible' : quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible}`;
  const vehicle = [quote.year, quote.make, quote.model].filter(Boolean).join(' ') || 'Complete vehicle details';
  const planLabel = planConfirmed ? plan.name : 'Choose a coverage level';
  const rows = [
    [CarFront, 'Vehicle', vehicle],
    [ShieldCheck, 'Plan', planLabel],
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

  const extras = selectedProducts.map((item) => item.name || item.title);
  const compactTerm = quote.program === 'csp'
    ? 'Monthly coverage'
    : quote.program === 'enginecare'
      ? '7 years · 200,000 miles · 8,000 hours'
    : quote.termMonths && quote.termMiles
      ? `${formatTerm(quote.termMonths)} · ${formatMiles(quote.termMiles)} ${quote.planPath === 'used' ? 'additional' : 'total'} miles`
      : 'Term not selected';
  const vehicleLabel = vehicle;

  return (
    <aside className="studio-summary">
      <div className="studio-summary__desktop">
        <div className="studio-summary__eyebrow"><span>Your request</span><strong>{quote.id}</strong></div>
        <h2>Your request</h2>
        {summaryRows}
        <div className="studio-summary__options">
          <small className="studio-summary__section-label">Additional products</small>
          {extras.length ? extras.map((item) => <span key={item}><CheckCircle2 /> {item}</span>) : quote.additionalProductsDecision === 'none' ? <span><CheckCircle2 /> None requested</span> : <span className="is-empty"><PackagePlus /> Decision needed</span>}
          {quote.program === 'esp' && <span className={quote.planBenefitsDecision ? '' : 'is-empty'}><ShieldCheck /> {selectedOptions.length ? `${selectedOptions.length} plan benefit${selectedOptions.length === 1 ? '' : 's'} requested` : quote.planBenefitsDecision === 'none' ? 'No added plan benefits' : 'Plan benefits not reviewed'}</span>}
        </div>
        <div className={`eligibility ${eligibility.tone}`}>
          <CheckCircle2 /><span><strong>{eligibility.title}</strong><small>{eligibility.text}</small></span>
        </div>
        <div className="summary-price">
          <span>Specialist-confirmed pricing</span>
          <strong>Prepared after eligibility review</strong>
          <small>Your Bob Maxey F&amp;I specialist confirms the current Ford-authorized options and price.</small>
        </div>
      </div>
      <details className="studio-summary__mobile">
        <summary>
          <ShieldCheck />
          <span className="studio-summary__mobile-vehicle"><small>Your selection</small><strong>{vehicleLabel}</strong></span>
          <span className="studio-summary__mobile-plan"><strong>{planLabel}</strong><small>{compactTerm}</small></span>
          <span className="studio-summary__mobile-count">{extras.length ? `${extras.length} product${extras.length === 1 ? '' : 's'}` : quote.additionalProductsDecision === 'none' ? 'No products' : 'Products pending'}</span>
          <ChevronDown />
        </summary>
        <div className="studio-summary__mobile-body">
          {summaryRows}
          <div className="studio-summary__options">
            <small className="studio-summary__section-label">Additional products</small>
            {extras.length ? extras.map((item) => <span key={item}><CheckCircle2 /> {item}</span>) : quote.additionalProductsDecision === 'none' ? <span><CheckCircle2 /> None requested</span> : <span className="is-empty"><PackagePlus /> Decision needed</span>}
          </div>
          <div className={`eligibility ${eligibility.tone}`}><CheckCircle2 /><span><strong>{eligibility.title}</strong><small>{eligibility.text}</small></span></div>
        </div>
      </details>
    </aside>
  );
}

function StudioFooter({ step, quote, saved, onBack, onContinue, onSave, onSubmit, submitting, ready, status }) {
  const termAction = quote.program === 'enginecare' ? 'Review plan limits' : quote.program === 'csp' ? 'Review monthly path' : 'Choose term & mileage';
  const labels = ['Continue to coverage', termAction, 'Continue to options', 'Continue to contact details', 'Review request', 'Submit for specialist review'];
  return (
    <footer className={`studio-footer ${step === 0 ? 'is-first-step' : ''}`}>
      <button className={`studio-footer__back ${step === 0 ? 'is-hidden' : ''}`} type="button" onClick={onBack} tabIndex={step === 0 ? -1 : 0}><ArrowLeft /> Back</button>
      <button className={`studio-footer__save ${saved ? 'is-saved' : ''}`} type="button" onClick={onSave}>{saved ? <CheckCircle2 /> : <Bookmark />}<span>{saved ? 'Saved' : 'Save request'} <strong>{quote.id}</strong></span></button>
      <button className="button button--primary studio-footer__continue" type="button" onClick={step === 5 ? onSubmit : onContinue} disabled={submitting || !ready}>{submitting ? 'Sending securely…' : labels[step]} {submitting ? <span className="button-spinner" /> : step === 5 ? <Send /> : <ArrowRight />}</button>
      <small className={ready ? 'is-ready' : 'is-pending'}>{ready ? <CheckCircle2 /> : <Info />} {status || (ready ? 'This step is complete.' : 'Complete the required choices above to continue.')}</small>
    </footer>
  );
}

function PlanHelp({ plan, detail, onClose }) {
  const modalRef = useDialogFocus({ onClose });

  if (!detail) return null;
  return (
    <div className="context-backdrop">
      <article ref={modalRef} className="context-modal context-modal--expanded" role="dialog" aria-modal="true" aria-labelledby="plan-help-title" tabIndex="-1">
        <header>
          <img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
          <span><small>Ford Protect coverage</small><strong>Complete plan guide</strong></span>
          <button type="button" onClick={onClose} aria-label="Close plan details" data-dialog-initial-focus><X /></button>
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
        <footer><button className="button button--secondary" type="button" onClick={onClose}>Back to coverage choices</button><button className="button button--primary" type="button" onClick={onClose}>Use {plan.name} <Check /></button></footer>
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
        <div className="product-configurator__variants" role="radiogroup" aria-label={`${product.name} option`} onKeyDown={handleRovingChoiceKeyDown}>
          {variants.map((variant) => <button key={variant.id} type="button" role="radio" aria-checked={variant.id === activeVariant.id} tabIndex={variant.id === activeVariant.id ? 0 : -1} className={variant.id === activeVariant.id ? 'is-selected' : ''} onClick={() => updateVariant(variant.id)}><span>{variant.label}</span>{variant.id === activeVariant.id && <Check />}</button>)}
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
  const modalRef = useDialogFocus({ onClose });
  const [draft, setDraft] = useState(() => normalizedProductSelection(product, selection, powertrain));
  const [configurationConfirmed, setConfigurationConfirmed] = useState(Boolean(selected && selection?.confirmed));
  useEffect(() => {
    setDraft(normalizedProductSelection(product, selection, powertrain));
    setConfigurationConfirmed(Boolean(selected && selection?.confirmed));
  }, [product?.id, powertrain, selection, selected]);
  if (!product) return null;
  const benefits = (product.benefits || product.highlights || []).map(asDisplayItem).filter(Boolean);
  const covered = productCoverageHighlights(product);
  const considerations = product.considerations || product.limits || product.important || product.cautions || [];
  const purchaseContextFit = productFitsPurchaseContext(product, purchaseContext);
  const selectable = product.selectable !== false && product.status?.eligible !== false && purchaseContextFit;
  const timingLabel = productTimingLabel(product, purchaseContext);
  const eligibilityTitle = product.eligibilityTitle || product.eligibility?.headline || product.status?.label || 'Bob Maxey confirms the current Ford offer';
  const eligibilityText = product.status?.message || product.eligibility?.dealerConfirmation || product.saleWindow || 'Availability depends on the VIN, state, current mileage, warranty status, vehicle use, and current Ford program rules.';
  const validation = validateQuoteProductSelection(product.id, draft || {}, { includeDealerOnly: false });
  return (
    <div className="product-detail-backdrop">
      <article ref={modalRef} className="product-detail-modal" role="dialog" aria-modal="true" aria-labelledby="product-detail-title" tabIndex="-1">
        <header className="product-detail-modal__header">
          <div className="product-detail-modal__brand"><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /><span><small>{timingLabel}</small><strong>Product guide</strong></span></div>
          <button type="button" onClick={onClose} aria-label="Close product details" data-dialog-initial-focus><X /></button>
        </header>
        <div className="product-detail-modal__scroll">
          <div className="product-detail-modal__hero">
            {product.image && <img src={assetUrl(product.image)} alt={product.imageAlt || product.name || product.title} />}
            <div><small>{product.eyebrow || product.familyLabel || 'FORD PROTECT PRODUCT'}</small><h2 id="product-detail-title">{product.name || product.title}</h2><p>{product.value || product.valueStatement || product.description || product.short}</p>{product.badge && <span className="product-badge">{product.badge}</span>}</div>
          </div>
          <div className="product-detail-modal__value"><ShieldCheck /><span><small>WHY CUSTOMERS CONSIDER IT</small><strong>{product.customerValue || product.value || product.valueStatement || product.description}</strong></span></div>
          <div className="product-detail-modal__columns">
            <section><h3>What it can help with</h3><ul>{benefits.map((item, index) => <li key={`${product.id}-benefit-${index}-${item.title}`}><CheckCircle2 /><span><strong>{item.title}</strong>{item.text && <small>{item.text}</small>}</span></li>)}</ul></section>
            <section><h3>{covered.length ? 'Coverage highlights' : 'Key product facts'}</h3><ul>{covered.map((item, index) => <li key={`${product.id}-coverage-${index}-${item.title}`}><Check /><span><strong>{item.title}</strong>{item.text && <small>{item.text}</small>}</span></li>)}</ul></section>
          </div>
          <div className="product-detail-modal__eligibility">
            <ClipboardCheck /><span><small>PURCHASE TIMING &amp; ELIGIBILITY</small><strong>{eligibilityTitle}</strong><p>{eligibilityText}</p></span>
          </div>
          {selectable ? <>
            <ProductConfigurator product={product} selection={draft} powertrain={powertrain} onChange={(next) => { setDraft(next); setConfigurationConfirmed(true); }} />
            <button className={`product-configuration-confirm ${configurationConfirmed ? 'is-confirmed' : ''}`} type="button" aria-pressed={configurationConfirmed} onClick={() => setConfigurationConfirmed(true)}>{configurationConfirmed ? <CheckCircle2 /> : <ClipboardCheck />}<span><strong>{configurationConfirmed ? 'Configuration reviewed' : 'Confirm these product options'}</strong><small>{configurationConfirmed ? 'You can add this product or keep editing the choices above.' : 'The displayed values are recommendations until you confirm them.'}</small></span></button>
          </> : <div className="product-configurator__returned"><Info /><span><strong>This product cannot be configured for the selected vehicle situation.</strong><small>{product.status?.message || 'Review the purchase-timing explanation above. Bob Maxey can answer questions, but this product cannot be added to this request.'}</small></span></div>}
          {product.eligibility?.inspectionPolicy && <div className="product-detail-modal__inspection is-clear"><ClipboardCheck /><span><small>INSPECTION / RECORD REVIEW</small><strong>Product-specific rule</strong><p>{product.eligibility.inspectionPolicy}</p></span></div>}
          {considerations.length > 0 && <section className="product-detail-modal__important"><h3>Important to know</h3><ul>{considerations.map((item, index) => <li key={`${product.id}-consideration-${index}-${typeof item === 'string' ? item : item.title || item.text || 'item'}`}>{typeof item === 'string' ? item : `${item.title}${item.text ? ` — ${item.text}` : ''}`}</li>)}</ul></section>}
          {selectable && !validation.valid && <p className="product-configurator__error" role="alert">{validation.message}</p>}
          <p className="product-detail-modal__agreement">The current Ford offer and issued agreement control eligibility, covered services, limits, exclusions, term, and price.</p>
        </div>
        <footer><button className="button button--secondary" type="button" onClick={onClose}>Back to product choices</button>{selectable ? <button className={`button ${selected ? 'button--selected' : 'button--primary'}`} type="button" disabled={!validation.valid || !configurationConfirmed} onClick={() => { onConfigure(product.id, draft); onClose(); }}>{selected ? <><CheckCircle2 /> Save {product.name} changes</> : <>Add {product.name} <PackagePlus /></>}</button> : <button className="button button--secondary" type="button" disabled aria-disabled="true">Not available for this request</button>}</footer>
      </article>
    </div>
  );
}

function AfterSaleNotice({ purchaseContext, onClose }) {
  const shopping = purchaseContext === 'shopping';
  const modalRef = useDialogFocus({ onClose });
  return (
    <div className="product-detail-backdrop">
      <article ref={modalRef} className="product-detail-modal product-detail-modal--notice" role="dialog" aria-modal="true" aria-labelledby="after-sale-title" tabIndex="-1">
        <header className="product-detail-modal__header"><div className="product-detail-modal__brand"><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /><span><small>Product availability</small><strong>When products can be selected</strong></span></div><button type="button" onClick={onClose} aria-label="Close" data-dialog-initial-focus><X /></button></header>
        <div className="product-detail-modal__scroll">
          <small>{shopping ? 'PLANNING BEFORE YOUR VEHICLE PURCHASE' : 'ADDING PRODUCTS AFTER THE VEHICLE SALE'}</small>
          <h2 id="after-sale-title">{shopping ? 'Build the protection package you want from delivery day.' : 'Only products that remain available after the sale can be selected.'}</h2>
          <p>{shopping ? 'This view includes products that must be chosen as part of the vehicle transaction as well as products that may remain available later. Purchase-timing labels make the difference clear before you add anything.' : 'Products that may still be requested after the sale can be configured here. Purchase-only products remain visible for comparison, but are disabled and explain why they cannot be added after the transaction is complete.'}</p>
          <div className="purchase-rule-summary">
            <article><CarFront /><span><strong>Choose during the vehicle purchase</strong><small>Includes products that must be part of the transaction and products that may also remain available later.</small></span></article>
            <article><KeyRound /><span><strong>May be requested after the sale</strong><small>Available and dealer-verification paths can be configured; purchase-only products stay visible but disabled.</small></span></article>
          </div>
          <div className="product-detail-modal__eligibility"><ShieldCheck /><span><strong>Every request still receives a Ford record review.</strong><p>VIN, warranty status, state, mileage, powertrain, vehicle use, and current program rules determine the final available products.</p></span></div>
        </div>
        <footer><button className="button button--primary" type="button" onClick={onClose}>Back to product choices <ArrowRight /></button></footer>
      </article>
    </div>
  );
}

function ProductCard({ product, selected, selection, purchaseContext, featured = false, onDetails, onRemove }) {
  const highlights = (product.highlights || product.benefits || []).slice(0, 2);
  const availableAfterSale = getProductPurchaseContexts(product).includes('owner');
  const timingLabel = product.purchaseTimingLabel || productTimingLabel(product, purchaseContext);
  const unavailable = product.status?.eligible === false || product.selectable === false;
  return (
    <article className={`quote-product-card ${selected ? 'is-selected' : ''} ${unavailable ? 'is-unavailable' : ''}`} data-product-id={product.id}>
      <div className="quote-product-card__media">
        {product.image && <img src={assetUrl(product.image)} alt={product.imageAlt || product.name || product.title} />}
        {selected && <span className="quote-product-card__selected"><Check /> Selected</span>}
        <span className={`quote-product-card__timing ${availableAfterSale ? 'is-after-sale' : 'is-sale-only'}`}>{timingLabel}</span>
      </div>
      <div className="quote-product-card__body">
        <div className="quote-product-card__title"><span className="quote-product-card__icon">{product.category === 'maintenance' ? <Wrench /> : product.category === 'mobility' ? <CarFront /> : <ShieldCheck />}</span><span><small>{product.eyebrow || product.familyLabel || 'FORD PROTECT'}</small><h3>{product.name || product.title}</h3></span></div>
        <p>{product.cardDescription || product.value || product.valueStatement || product.description || product.short}</p>
        <div className="quote-product-card__highlights">{highlights.map((item) => <span key={typeof item === 'string' ? item : item.title}><CheckCircle2 /> {typeof item === 'string' ? item : item.title}</span>)}</div>
        {unavailable && <div className="quote-product-card__unavailable" role="note"><Info /><span><strong>{product.status?.label || 'Not available for this vehicle situation'}</strong><small>{product.status?.message || 'Bob Maxey can explain the purchase-timing rule, but this product cannot be added to this request.'}</small></span></div>}
        {selected && <div className="quote-product-card__configuration"><span><small>YOUR REQUEST</small><strong>{productSelectionLabel(product, selection)}</strong></span><CheckCircle2 /></div>}
        <div className="quote-product-card__actions"><button className={`button ${selected || unavailable ? 'button--secondary' : 'button--primary'}`} type="button" onClick={() => onDetails(product.id)}>{selected ? 'Edit selection' : unavailable ? 'See why it is unavailable' : 'View details & choose'} <ArrowRight /></button>{selected && <button className="product-remove-link" type="button" onClick={() => onRemove(product.id)}>Remove</button>}</div>
      </div>
    </article>
  );
}

function ProposalPreview({ quote, plan, detail, onClose, onDownload, busy }) {
  const modalRef = useDialogFocus({ onClose });
  const [pageIndex, setPageIndex] = useState(0);
  const model = buildProposalModel({ quote, plan, detail });
  const submitted = quote.submissionReceipt?.accepted === true
    && Boolean(quote.submissionReceipt?.leadId)
    && Number.isFinite(Date.parse(quote.submissionReceipt?.receivedAt));
  const documentStatus = submitted ? 'SUBMITTED REQUEST SUMMARY' : 'DRAFT · NOT SUBMITTED';
  const groups = model.coverage.groups || [];
  const products = model.products.additionalProducts || [];
  const vehicle = model.requestSummary.vehicle;
  const coverage = model.requestSummary.coverage;
  const customer = model.requestSummary.customer;
  const store = model.requestSummary.store;
  const benefits = (model.overview.benefits || []).slice(0, 6);
  const vehicleFacts = [
    ['Current mileage', vehicle.currentMileageLabel],
    ['VIN', vehicle.vin || 'To be confirmed'],
    ['Powertrain', vehicle.powertrain || 'To be confirmed'],
    ['Registered', [vehicle.state, vehicle.zip].filter(Boolean).join(' ') || 'To be confirmed'],
  ];
  const documentFooter = (label, pageNumber) => (
    <footer className="proposal-document__footer">
      <span>{label}</span>
      <strong>{model.document.quoteId}</strong>
      <b>{pageNumber}</b>
    </footer>
  );
  const coveragePageCount = Math.max(1, Math.ceil(groups.length / 4));
  const coverageChunkSize = Math.max(1, Math.ceil(groups.length / coveragePageCount));
  const coverageChunks = groups.length
    ? Array.from({ length: coveragePageCount }, (_, index) => groups.slice(index * coverageChunkSize, (index + 1) * coverageChunkSize)).filter((chunk) => chunk.length)
    : [groups];
  const productsPageNumber = coverageChunks.length + 2;
  const nextStepsPageNumber = productsPageNumber + (products.length ? 1 : 0);
  const pages = [
    {
      title: 'Cover',
      description: 'Vehicle and selected protection',
      content: <section className="proposal-document proposal-document--cover" key="cover">
        <header className="proposal-document__masthead"><span><img src={assetUrl('/assets/bob-maxey-logo.png')} alt="Bob Maxey" /><i /><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /></span><div><small>{documentStatus}</small><strong>{model.document.quoteId}</strong></div></header>
        <div className="proposal-document__hero"><img src={assetUrl(model.cover.vehicleImage)} alt={model.cover.vehicleImageAlt} /><div><span /><h2>{model.cover.headline}</h2><p>{model.cover.subhead}</p></div></div>
        <div className="proposal-document__body proposal-document__body--cover">
          <div className="proposal-document__identity"><div><small>PREPARED FOR</small><h3>{model.cover.preparedFor}</h3><p>{model.cover.purchaseContextLabel}</p></div><div><CarFront /><span><small>YOUR VEHICLE</small><h3>{model.cover.vehicle}</h3><p>{vehicle.currentMileageLabel}</p></span></div></div>
          <div className="proposal-document__vehicle-facts">{vehicleFacts.map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</div>
          <section className="proposal-document__plan-intro"><div><small>YOUR SELECTED PROTECTION</small><h2>{model.cover.planName}</h2><p>{coverage.description || model.overview.coverageModel}</p></div><ShieldCheck /></section>
          <div className="proposal-document__selection"><span><small>Term</small><strong>{model.cover.termLabel}</strong></span><span><small>Mileage</small><strong>{model.cover.mileageLabel}</strong></span><span><small>Deductible</small><strong>{model.cover.deductibleLabel}</strong></span><span><small>Added products</small><strong>{products.length || 'None requested'}</strong></span></div>
          <div className="proposal-document__band"><span><ShieldCheck /><strong>Ford-backed coverage</strong></span><span><MapPin /><strong>Nationwide dealer support</strong></span><span><CarFront /><strong>Rental benefits where included</strong></span></div>
        </div>
        {documentFooter('Personalized Ford Protect request', 1)}
      </section>,
    },
    ...coverageChunks.map((pageGroups, chunkIndex) => {
      const isFirstCoveragePage = chunkIndex === 0;
      const isLastCoveragePage = chunkIndex === coverageChunks.length - 1;
      const pageNumber = chunkIndex + 2;
      return {
        title: coverageChunks.length > 1 ? `${plan.name} ${chunkIndex + 1}` : plan.name,
        description: isFirstCoveragePage ? 'Plan terms and covered systems' : 'Additional covered systems',
        content: <section className="proposal-document proposal-document--coverage" key={`coverage-${chunkIndex}`}>
          <header className="proposal-document__title-band"><div><span /><small>{isFirstCoveragePage ? 'YOUR SELECTED COVERAGE' : 'COVERAGE CONTINUED'}</small><h2>{isFirstCoveragePage ? plan.name : `${plan.name} covered systems`}</h2><p>{isFirstCoveragePage ? model.overview.coverageModel : 'More of the systems and component examples included in your selected protection level.'}</p></div><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /></header>
          <div className="proposal-document__body">
            {isFirstCoveragePage && <div className="proposal-document__plan-facts"><span><small>Coverage model</small><strong>{coverage.programLabel}</strong></span><span><small>Term</small><strong>{model.cover.termLabel}</strong></span><span><small>Mileage</small><strong>{model.cover.mileageLabel}</strong></span><span><small>Deductible</small><strong>{model.cover.deductibleLabel}</strong></span>{model.overview.componentCount && <span><small>Published component count</small><strong>{model.overview.componentCount}</strong></span>}</div>}
            <div className="proposal-document__section-heading"><span><small>{isFirstCoveragePage ? 'KEY COVERED SYSTEMS' : 'MORE COVERED SYSTEMS'}</small><h2>{isFirstCoveragePage ? model.coverage.headline : `Continue exploring ${plan.name}.`}</h2></span><p>{isFirstCoveragePage ? model.overview.bestFor : 'Component examples are organized by vehicle system for easy review.'}</p></div>
            <div className="proposal-document__coverage-grid">{pageGroups.map((group) => <article key={group.title}><CheckCircle2 /><div><h3>{group.title}</h3><p>{group.summary}</p><ul>{group.items.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul></div></article>)}</div>
            {isLastCoveragePage && benefits.length > 0 && <section className="proposal-document__benefits"><small>PLAN BENEFITS</small><div>{benefits.map((benefit) => <span key={benefit.title}><CheckCircle2 /><strong>{benefit.title}</strong>{benefit.text && <small>{benefit.text}</small>}</span>)}</div></section>}
            {isLastCoveragePage && <p className="proposal-document__legal">{model.coverage.note}</p>}
          </div>
          {documentFooter(`${plan.name} coverage ${coverageChunks.length > 1 ? `${chunkIndex + 1} of ${coverageChunks.length}` : 'overview'}`, pageNumber)}
        </section>,
      };
    }),
    ...(products.length ? [{
      title: 'Products',
      description: 'Additional selections and inspection',
      content: <section className="proposal-document proposal-document--products" key="products">
        <header className="proposal-document__title-band"><div><span /><small>YOUR OWNERSHIP PLAN</small><h2>Additional protection selected for your Ford.</h2><p>Each requested product is reviewed for vehicle-specific eligibility and current Ford availability.</p></div><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /></header>
        <div className="proposal-document__body">
          <div className="proposal-document__products">{products.map((product) => <article key={product.id}>{product.image && <img src={assetUrl(product.image)} alt={product.imageAlt || product.name} />}<div><small>{product.familyLabel || 'FORD PROTECT PRODUCT'}</small><h3>{product.name}</h3>{product.configuration?.labels?.length > 0 && <p className="proposal-document__configuration">{product.configuration.labels.join(' · ')}</p>}<p>{product.value || product.description}</p><ul>{product.highlights.slice(0, 4).map((item) => <li key={item}><Check /> {item}</li>)}</ul>{product.eligibility?.headline && <span className="proposal-document__product-status"><CheckCircle2 /> {product.eligibility.headline}</span>}</div></article>)}</div>
          <div className={`proposal-document__inspection ${model.overview.inspection.required ? 'is-required' : 'is-clear'}`}><ClipboardCheck /><span><small>VEHICLE INSPECTION PATH</small><strong>{model.overview.inspection.title}</strong><p>{model.overview.inspection.message}</p>{model.overview.inspection.caveat && <em>{model.overview.inspection.caveat}</em>}</span></div>
          <div className="proposal-document__product-summary"><span><small>PRIMARY COVERAGE</small><strong>{coverage.planName}</strong></span><span><small>ADDITIONAL PRODUCTS</small><strong>{products.length ? products.map((product) => product.name).join(', ') : 'None requested'}</strong></span><span><small>PAYMENT PREFERENCE</small><strong>{model.requestSummary.payment.preference}</strong></span></div>
        </div>
        {documentFooter('Selected products and eligibility path', productsPageNumber)}
      </section>,
    }] : []),
    {
      title: 'Next steps',
      description: 'Specialist review and contact',
      content: <section className="proposal-document proposal-document--next" key="next">
        <header className="proposal-document__title-band"><div><span /><small>BOB MAXEY SUPPORT</small><h2>What happens after your request.</h2><p>Your specialist turns these selections into a current, vehicle-specific Ford Protect offer.</p></div><img src={assetUrl('/assets/bob-maxey-logo.png')} alt="Bob Maxey" /></header>
        <div className="proposal-document__body">
          <div className="proposal-document__next-layout"><section><small>YOUR NEXT STEPS</small><div className="proposal-document__steps">{model.nextSteps.map((item) => <article key={item.number}><strong>{item.number}</strong><span><h3>{item.title}</h3><p>{item.text}</p></span></article>)}</div></section><aside><small>REQUEST CONTACT</small><h3>{customer.fullName}</h3><dl><div><dt>Email</dt><dd>{customer.email || 'To be confirmed'}</dd></div><div><dt>Phone</dt><dd>{customer.phone || 'To be confirmed'}</dd></div><div><dt>Preferred method</dt><dd>{model.requestSummary.contact.preferredMethod}</dd></div><div><dt>Location</dt><dd>{store.descriptor}</dd></div></dl></aside></div>
          <div className="proposal-document__summary"><div><small>REQUEST SUMMARY</small><h3>{vehicle.displayName}</h3><p>{vehicle.currentMileageLabel} · {coverage.planName}</p></div><dl><div><dt>Plan path</dt><dd>{coverage.planPathLabel}</dd></div><div><dt>Term</dt><dd>{coverage.term.label}</dd></div><div><dt>Mileage</dt><dd>{coverage.term.mileageLabel}</dd></div><div><dt>Deductible</dt><dd>{coverage.deductible.label}</dd></div><div><dt>Inspection</dt><dd>{model.overview.inspection.title}</dd></div><div><dt>Reference</dt><dd>{model.document.quoteId}</dd></div></dl></div>
          <div className="proposal-document__pricing"><CircleDollarSign /><span><small>{model.overview.pricing.title}</small><strong>{model.overview.pricing.message}</strong></span></div>
          <p className="proposal-document__legal">{model.disclaimer}</p>
        </div>
        {documentFooter('Bob Maxey specialist handoff', nextStepsPageNumber)}
      </section>,
    },
  ];
  return (
    <div className="proposal-backdrop proposal-backdrop--handoff">
      <div ref={modalRef} className="proposal-preview proposal-preview--handoff" role="dialog" aria-modal="true" aria-label="Personalized Ford Protect proposal preview" tabIndex="-1">
        <header className="proposal-preview__header"><Brand /><div className="proposal-preview__heading"><small>{documentStatus}</small><strong>{vehicle.displayName}</strong><span>Page {pageIndex + 1} of {pages.length} · {model.document.quoteId}</span></div><button type="button" onClick={onClose} aria-label="Close preview" data-dialog-initial-focus><X /></button></header>
        <div className="proposal-preview__workspace"><nav aria-label="Proposal pages">{pages.map((page, index) => <button key={page.title} type="button" aria-current={pageIndex === index ? 'page' : undefined} className={pageIndex === index ? 'is-current' : ''} onClick={() => setPageIndex(index)}><span>{index + 1}</span><i><strong>{page.title}</strong><small>{page.description}</small></i><ChevronRight /></button>)}</nav><div className="proposal-preview__page" key={pageIndex}>{pages[pageIndex].content}</div></div>
        <footer className="proposal-preview__footer"><button className="button button--secondary" type="button" onClick={() => setPageIndex(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0}><ArrowLeft /> Previous</button><div><button className="button button--primary" type="button" onClick={onDownload} disabled={busy}>{busy ? 'Preparing PDF…' : submitted ? 'Download request summary' : 'Download draft proposal'} <Download /></button></div><button className="button button--secondary" type="button" onClick={() => setPageIndex(Math.min(pages.length - 1, pageIndex + 1))} disabled={pageIndex === pages.length - 1}>Next <ArrowRight /></button></footer>
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
          <div className="term-choice-rail" ref={termRailRef} role="radiogroup" aria-label="Protection term" onKeyDown={handleRovingChoiceKeyDown}>
            {matrix.months.map((months) => {
              const wholeYears = months % 12 === 0;
              const selected = quote.termMonths === months;
              const matched = recommendation?.months === months;
              const value = wholeYears ? months / 12 : months;
              const unit = wholeYears ? (months === 12 ? 'year' : 'years') : 'months';
              return (
                <button key={months} type="button" role="radio" aria-checked={selected} tabIndex={selected || (!quote.termMonths && months === matrix.months[0]) ? 0 : -1} aria-label={`${formatTerm(months)}${matched ? ', recommended duration' : ''}`} className={`${selected ? 'is-selected' : ''} ${matched ? 'is-match' : ''}`} onClick={() => onMonth(months)}>
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
            <output aria-live="polite">{quote.termMiles ? `${formatMiles(quote.termMiles)} miles` : 'Select after term'}</output>
          </header>
          <div className="term-choice-rail" ref={mileageRailRef} role="radiogroup" aria-label={quote.planPath === 'used' ? 'Additional mileage' : 'Total mileage limit'} onKeyDown={handleRovingChoiceKeyDown}>
            {validMiles.map((miles) => {
              const selected = quote.termMiles === miles;
              const matched = recommendation?.miles === miles && recommendation?.months === quote.termMonths;
              return (
                <button key={miles} type="button" role="radio" aria-checked={selected} tabIndex={selected || (!quote.termMiles && miles === validMiles[0]) ? 0 : -1} aria-label={`${formatMiles(miles)} miles${matched ? ', recommended mileage for the selected term' : ''}`} className={`${selected ? 'is-selected' : ''} ${matched ? 'is-match' : ''}`} onClick={() => onMiles(miles)}>
                  <strong>{miles / 1000}k</strong><small>miles</small>
                  {matched && <span className="term-choice__recommendation" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {!quote.termMonths && <p className="term-dimension__prompt"><Info /> Choose the protection term first to see its available mileage limits.</p>}
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
  const modalRef = useDialogFocus({ onClose });
  return (
    <div className="matrix-drawer-backdrop">
      <section ref={modalRef} className="matrix-drawer" role="dialog" aria-modal="true" aria-label="All available term and mileage combinations" tabIndex="-1">
        <header><div><small>Complete term matrix</small><h2>Available planning combinations</h2><p>Choose a years-and-mileage pairing shown in this planning guide. Ford record review confirms current availability.</p></div><button type="button" onClick={onClose} aria-label="Close term matrix" data-dialog-initial-focus><X /></button></header>
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
  const initialVehicleSituation = initial.vehicleSituation
    || (initial.purchaseContext === 'owner' ? 'owned-after-sale' : '');
  const initialPurchaseContext = initial.purchaseContext
    || VEHICLE_SITUATIONS[initialVehicleSituation]?.purchaseContext
    || '';
  const initialSubmissionReceipt = normalizeAcceptedReceipt(initial.submissionReceipt);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [planHelp, setPlanHelp] = useState(false);
  const [productHelpId, setProductHelpId] = useState('');
  const [afterSaleNotice, setAfterSaleNotice] = useState(false);
  const [productCategory, setProductCategory] = useState('recommended');
  const [showMatrix, setShowMatrix] = useState(false);
  const [proposalPreview, setProposalPreview] = useState(false);
  const [busy, setBusy] = useState('');
  const [crmStatus, setCrmStatus] = useState(null);
  const [submissionReceipt, setSubmissionReceipt] = useState(initialSubmissionReceipt);
  const [showErrors, setShowErrors] = useState(false);
  const [showVehicleErrors, setShowVehicleErrors] = useState(false);
  const [stepIssue, setStepIssue] = useState(null);
  const [showPurchaseContextError, setShowPurchaseContextError] = useState(false);
  const [vinDecodeStatus, setVinDecodeStatus] = useState(() => initial.decodedVehicle
    ? { tone: 'success', message: 'Saved non-identifying NHTSA vehicle facts loaded. The VIN was not saved; enter it and decode again to refresh these facts.' }
    : { tone: 'idle', message: '' });
  const vinRef = useRef(null);
  const vinDecodeAbortRef = useRef(null);
  const studioMainRef = useRef(null);
  const successHeadingRef = useRef(null);
  const studioDialogRef = useDialogFocus({
    onClose,
    initialFocus: () => initial.focusVin ? vinRef.current : null,
  });
  const [quote, setQuote] = useState(() => ({
    id: initial.id || createQuoteId(),
    purchaseContext: initialPurchaseContext,
    vehicleSituation: initialVehicleSituation,
    vin: initial.vin || '',
    decodedVehicle: initial.decodedVehicle || null,
    year: initial.year || '',
    make: initial.make || 'Ford',
    model: initial.model || '',
    mileage: hasOwn(initial, 'mileage') ? String(initial.mileage) : '',
    purchaseDate: initial.purchaseDate || '',
    zip: initial.zip || '',
    state: initial.state || '',
    inService: initial.inService || '',
    inServiceUnknown: Boolean(initial.inServiceUnknown),
    usage: initial.usage || 'Personal',
    powertrain: initial.powertrain || 'Gas',
    snowPlow: initial.snowPlow || 'No',
    program: initial.program || (coveragePlanIds.has(initial.planId) ? 'esp' : ''),
    planPath: initial.planPath || '',
    planId: coveragePlanIds.has(initial.planId) ? initial.planId : '',
    cspLevel: initial.cspLevel || '',
    engineCareLevel: initial.engineCareLevel || '',
    termMonths: initial.termMonths || (initial.termYears ? Number(initial.termYears) * 12 : null),
    termMiles: hasOwn(initial, 'termMiles') && initial.termMiles !== '' ? Number(initial.termMiles) : null,
    deductible: hasOwn(initial, 'deductible') ? String(initial.deductible ?? '') : '',
    addOns: initial.addOns || [],
    planBenefitsDecision: initial.planBenefitsDecision || (hasOwn(initial, 'addOns') ? (initial.addOns?.length ? 'selected' : 'none') : ''),
    requestedProductIds: initial.requestedProductIds || (initial.productId ? [initial.productId] : []),
    productSelections: initial.productSelections || (initial.productId ? { [initial.productId]: { ...defaultProductSelection(quoteProducts.find((item) => item.id === initial.productId), initial.powertrain || 'Gas', initial.productVariantId || initial.variantId), confirmed: false } } : {}),
    additionalProductsDecision: initial.additionalProductsDecision || (initial.requestedProductIds?.length || initial.productId ? 'selected' : ''),
    maintenanceId: initial.maintenanceId || 'none',
    maintenanceName: initial.maintenanceName || '',
    maintenanceInterval: Number(initial.maintenanceInterval || 7500),
    keepYears: Number(initial.keepYears || 5),
    annualMiles: Number(initial.annualMiles || 12000),
    paymentPreference: normalizePaymentPreference(initial.paymentPreference),
    store: initial.store || '',
    preferredContact: initial.preferredContact || '',
    notes: initial.notes || '',
    consent: Boolean(initial.consent && initial.consentVersion === CONTACT_CONSENT_VERSION && Number.isFinite(Date.parse(initial.consentAcceptedAt || ''))),
    consentText: initial.consentText || CONTACT_CONSENT_TEXT,
    consentVersion: initial.consentVersion || CONTACT_CONSENT_VERSION,
    consentAcceptedAt: initial.consentAcceptedAt || '',
    submissionReceipt: initialSubmissionReceipt,
    submittedAt: initialSubmissionReceipt?.receivedAt || '',
    customer: {
      firstName: initial.customer?.firstName || '',
      lastName: initial.customer?.lastName || '',
      email: initial.customer?.email || '',
      phone: initial.customer?.phone || '',
      city: initial.customer?.city || '',
    },
  }));
  const previousQuoteRef = useRef(quote);

  useEffect(() => {
    if (previousQuoteRef.current === quote) return;
    previousQuoteRef.current = quote;
    setSaved(false);
  }, [quote]);

  const applicablePlans = useMemo(() => quote.powertrain === 'Electric' ? evPlanData : planData, [quote.powertrain]);
  const selectedEspPlan = useMemo(() => applicablePlans.find((item) => item.id === quote.planId) || null, [applicablePlans, quote.planId]);
  const selectedEspPlanPathAllowed = Boolean(selectedEspPlan && (!Array.isArray(selectedEspPlan.planPaths) || selectedEspPlan.planPaths.includes(quote.planPath)));
  const espPlan = useMemo(() => applicablePlans.find((item) => item.id === quote.planId && (!Array.isArray(item.planPaths) || item.planPaths.includes(quote.planPath)))
    ?? applicablePlans.find((item) => !Array.isArray(item.planPaths) || item.planPaths.includes(quote.planPath))
    ?? applicablePlans[0], [applicablePlans, quote.planId, quote.planPath]);
  const cspLevel = cspLevels.find((item) => item.id === quote.cspLevel) || cspLevels[0];
  const dieselCareLevel = dieselCareLevels.find((item) => item.id === quote.engineCareLevel) || dieselCareLevels[0];
  const plan = quote.program === 'csp'
    ? { id: 'continued-service', name: `Continued Service Plan ${cspLevel.name}`, count: 'Monthly', bestFor: cspLevel.label, description: cspLevel.description }
    : quote.program === 'enginecare'
      ? { ...dieselCareLevel, bestFor: dieselCareLevel.label }
      : espPlan;
  const detail = quote.program === 'enginecare' ? dieselCareDetail : productDetails[quote.program === 'csp' ? 'continued-service' : plan.id];
  const modelOptions = [...new Set([quote.model, ...(modelsByMake[quote.make] ?? [])].filter(Boolean))];
  const yearOptions = [...new Set([quote.year, ...years].filter(Boolean))];
  const makeOptions = [...new Set(['Ford', 'Lincoln', quote.make].filter(Boolean))];
  const matrix = useMemo(() => getTermMatrix({ planId: espPlan.id, planPath: quote.planPath, mileage: quote.mileage }), [espPlan.id, quote.planPath, quote.mileage]);
  const recommendation = useMemo(() => findBestCombination({ matrix, planPath: quote.planPath, inService: quote.inService, currentMileage: quote.mileage, keepYears: quote.keepYears, annualMiles: quote.annualMiles }), [matrix, quote.planPath, quote.inService, quote.mileage, quote.keepYears, quote.annualMiles]);
  const availableAddOns = protectionOptions.filter((option) => isProtectionOptionAvailable(option, {
    planId: espPlan.id,
    planPath: quote.planPath,
    termMonths: quote.termMonths,
    termMiles: quote.termMiles,
  }));
  const availableMaintenance = maintenanceChoices.filter((choice) => choice.id === 'none' || (quote.powertrain === 'Electric' ? choice.id === 'premium-maintenance-ev' : choice.id === 'premium-maintenance'));
  const productCatalog = useMemo(() => getQuoteProductCatalog(quote, { vehicleSituation: quote.vehicleSituation })
    .filter((item) => !['extended-service-plan', 'continued-service-plan', 'diesel-enginecare'].includes(item.id))
    .map((item) => ({
      ...item,
      category: item.category || (item.familyId === 'maintenance' ? 'maintenance' : item.familyId === 'mobility' ? 'mobility' : 'specialist'),
    }))
    .sort((left, right) => Number(left.status?.eligible === false) - Number(right.status?.eligible === false)), [quote.year, quote.make, quote.mileage, quote.inService, quote.purchaseDate, quote.powertrain, quote.program, quote.planPath, quote.usage, quote.state, quote.purchaseContext, quote.vehicleSituation, quote.decodedVehicle, quote.productSelections]);
  const selectedProducts = useMemo(() => quoteProducts.filter((item) => quote.requestedProductIds.includes(item.id)), [quote.requestedProductIds]);
  const inspection = useMemo(() => {
    if (quote.program === 'csp') return { required: false, title: 'No CSP enrollment inspection required', shortLabel: 'No inspection required', text: 'Ford’s current Continued Service Plan buyer guide states that CSP enrollment has no waiting period or vehicle inspection requirement.' };
    if (quote.program === 'enginecare') return { required: null, title: 'Diesel program record review', shortLabel: 'Engine, mileage and hours review', text: 'Diesel EngineCARE uses its own Power Stroke engine, time, mileage, engine-hour, vehicle-use, and current-program eligibility review. Any inspection requirement comes from the current Ford offer.' };
    if (quote.program !== 'esp' || !quote.planPath) return { required: null, title: 'Warranty record review needed', shortLabel: 'Inspection path not determined', text: 'Choose the ESP enrollment path and provide the VIN or original in-service date so Bob Maxey can determine whether a used-plan inspection rule applies.' };
    if (quote.planPath === 'new') return { required: false, title: 'New-plan warranty review', shortLabel: 'Used-plan inspection not applicable', text: 'The Used Vehicle Inspection Checklist rule applies to used-plan ESP enrollment outside the New Vehicle Limited Warranty—not to this new-plan path. Ford records must still confirm that the vehicle is within the new-plan purchase window.' };
    const result = getWarrantyInspectionStatus(quote);
    return {
      ...result,
      required: result.inspectionRequiredForUsedEsp,
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
  const emailValid = /\S+@\S+\.\S+/.test(quote.customer.email);
  const contactChannelValid = quote.preferredContact === 'email' ? emailValid
    : ['phone', 'text'].includes(quote.preferredContact) ? phoneDigits.length >= 10 : false;
  const detailsValid = Boolean(
    quote.customer.firstName.trim()
    && quote.customer.lastName.trim()
    && emailValid
    && phoneDigits.length >= 10
    && contactChannelValid
    && quote.store
    && quote.consent
    && quote.consentVersion === CONTACT_CONSENT_VERSION
    && Number.isFinite(Date.parse(quote.consentAcceptedAt)),
  );
  const showCrmTools = import.meta.env.DEV;
  const subsidiaryDialogOpen = Boolean(planHelp || productHelp || afterSaleNotice || proposalPreview || showMatrix);

  const eligibility = useMemo(() => {
    const mileage = Number(quote.mileage || 0);
    if (quote.program === 'csp' && quote.state === 'California') return { tone: 'review', title: 'CSP not available in California', text: 'Choose an Extended Service Plan path or request a specialist review.' };
    if (quote.program === 'enginecare') return { tone: 'review', title: 'Power Stroke specialist review', text: 'Bob Maxey will confirm the engine family, in-service date, current mileage, engine hours, vehicle use, state, and current Ford offer.' };
    if (mileage > 160000) return { tone: 'review', title: 'Specialist path required', text: 'The historical guide’s standard used-plan matrix ends at 160,000 current miles.' };
    if (quote.snowPlow === 'Yes' || quote.usage === 'Business') return { tone: 'review', title: 'Special-use review required', text: 'Commercial or snow-plow use must be rated and verified correctly.' };
    if (quote.program === 'esp' && quote.planPath === 'new' && !quote.inService) return { tone: 'review', title: 'In-service date needed', text: 'New-plan time and mileage are measured from the original in-service date and zero miles.' };
    if (inspection.required) return { tone: 'review', title: 'Dealer inspection required first', text: 'Ford records confirm this used-plan ESP path is outside the New Vehicle Limited Warranty. Bob Maxey must complete the referenced used-vehicle inspection before coverage can be finalized.' };
    return { tone: inspection.required === false ? 'positive' : inspection.tone || 'review', title: inspection.title || 'Ready for Ford record review', text: inspection.text || 'Bob Maxey will confirm the VIN, current eligibility, available combinations, and price.' };
  }, [quote.program, quote.state, quote.mileage, quote.snowPlow, quote.usage, quote.planPath, quote.inService, inspection.required, inspection.title, inspection.text]);

  const vehicleErrors = useMemo(() => ({
    purchaseContext: quote.purchaseContext && quote.vehicleSituation ? '' : 'Choose your vehicle situation.',
    vin: quote.vin && quote.vin.length !== 17 ? 'Enter all 17 VIN characters or leave it blank for now.' : '',
    year: quote.year ? '' : 'Choose the model year.',
    model: quote.model ? '' : 'Choose the vehicle model.',
    mileage: quote.mileage !== '' && Number.isFinite(Number(quote.mileage)) && Number(quote.mileage) >= 0 ? '' : 'Enter the current odometer mileage.',
    state: quote.state ? '' : 'Choose the registration state.',
    zip: /^\d{5}$/.test(quote.zip) ? '' : 'Enter a 5-digit ZIP code.',
    inService: quote.inService || quote.inServiceUnknown ? '' : 'Enter the warranty start date or choose “I don’t know.”',
    usage: quote.usage ? '' : 'Choose personal or business use.',
    powertrain: quote.powertrain ? '' : 'Choose the powertrain.',
    snowPlow: quote.snowPlow ? '' : 'Choose whether the vehicle uses a snow plow.',
  }), [quote.purchaseContext, quote.vehicleSituation, quote.vin, quote.year, quote.model, quote.mileage, quote.state, quote.zip, quote.inService, quote.inServiceUnknown, quote.usage, quote.powertrain, quote.snowPlow]);
  const vehicleValid = Object.values(vehicleErrors).every((error) => !error);
  const coverageValid = quote.program === 'esp'
    ? Boolean(quote.planPath && quote.planId && selectedEspPlanPathAllowed)
    : quote.program === 'csp'
      ? Boolean(quote.cspLevel && quote.state !== 'California')
      : quote.program === 'enginecare'
        ? Boolean(quote.engineCareLevel && quote.powertrain === 'Diesel')
        : false;
  const termValid = quote.program !== 'esp'
    ? coverageValid
    : Boolean(coverageValid && matrix.months.length && quote.termMonths && quote.termMiles && matrix.isAvailable(Number(quote.termMonths), Number(quote.termMiles)));
  const deductibleAllowed = quote.program !== 'esp' || deductibleOptions.some((item) => item.id === quote.deductible && isDeductibleAvailable(item, {
    planId: quote.planId,
    planPath: quote.planPath,
    termMiles: quote.termMiles,
  }));
  const selectedProductSelectionsValid = selectedProducts.length > 0 && selectedProducts.every((product) => {
    const selection = quote.productSelections?.[product.id];
    return Boolean(selection?.confirmed && validateQuoteProductSelection(product.id, selection, { includeDealerOnly: false }).valid);
  });
  const productsDecisionValid = quote.additionalProductsDecision === 'none'
    ? selectedProducts.length === 0
    : quote.additionalProductsDecision === 'selected' && selectedProductSelectionsValid;
  const availableAddOnIds = new Set(availableAddOns.map((item) => item.id));
  const benefitsDecisionValid = quote.program !== 'esp' || (
    quote.planBenefitsDecision === 'none'
      ? quote.addOns.length === 0
      : quote.planBenefitsDecision === 'selected' && quote.addOns.length > 0 && quote.addOns.every((id) => availableAddOnIds.has(id))
  );
  const optionsValid = Boolean(
    coverageValid
    && (quote.program !== 'esp' || (quote.deductible && deductibleAllowed))
    && benefitsDecisionValid
    && productsDecisionValid
    && quote.paymentPreference,
  );
  const stepReadiness = [vehicleValid, coverageValid, termValid, optionsValid, detailsValid, vehicleValid && coverageValid && termValid && optionsValid && detailsValid];
  const stepStatus = [
    vehicleValid ? 'Vehicle and ownership details complete.' : 'Complete the required vehicle and ownership details.',
    coverageValid ? 'Coverage path and level selected.' : 'Select the coverage path and coverage level you want reviewed.',
    termValid ? 'Coverage window reviewed.' : quote.program === 'esp' ? 'Select both a term and its available mileage limit.' : 'Complete the coverage choice first.',
    optionsValid ? 'Deductible, benefits, products, and payment reviewed.' : 'Resolve every item in the options checklist before continuing.',
    detailsValid ? 'Contact details and permission complete.' : 'Complete the required contact, location, preference, and permission fields.',
    vehicleValid && coverageValid && termValid && optionsValid && detailsValid ? 'Request is ready for specialist review.' : 'Return to the highlighted step and complete the missing choices.',
  ];

  const issueForStep = (index) => {
    if (index === 0) return Object.values(vehicleErrors).find(Boolean) || '';
    if (index === 1) {
      if (!quote.program) return 'Choose Extended Service Plan, Continued Service Plan, or Diesel EngineCARE.';
      if (quote.program === 'esp' && !quote.planPath) return 'Choose how Ford should measure time and mileage for this request.';
      if (quote.program === 'esp' && (!quote.planId || !selectedEspPlanPathAllowed)) return 'Choose a Ford Protect coverage level available for this plan path.';
      if (quote.program === 'csp' && quote.state === 'California') return 'Continued Service Plan is not available in California. Choose another coverage path.';
      return 'Choose the coverage level you want Bob Maxey to verify.';
    }
    if (index === 2) return quote.program === 'esp' ? 'Choose a protection term and one of the mileage limits available for that term.' : 'Complete your coverage choice before continuing.';
    if (index === 3) {
      if (quote.program === 'esp' && (!quote.deductible || !deductibleAllowed)) return 'Choose an available deductible.';
      if (!benefitsDecisionValid) return 'Choose plan benefits or explicitly continue with no added plan benefits.';
      if (!productsDecisionValid) return selectedProducts.length ? 'Finish and save the configuration for every selected product.' : 'Choose products or explicitly continue with no additional products.';
      if (!quote.paymentPreference) return 'Choose how you want the specialist to present payment choices.';
      return 'Review every options decision before continuing.';
    }
    if (index === 4) return 'Enter the required contact details, choose a contact method and location, and accept the contact permission.';
    return 'Complete the missing choices before submitting your request.';
  };

  useEffect(() => {
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    return () => {
      vinDecodeAbortRef.current?.abort();
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    if (!submissionReceipt) return undefined;
    const frame = window.requestAnimationFrame(() => successHeadingRef.current?.focus?.({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [submissionReceipt]);

  useEffect(() => {
    if (quote.program !== 'esp' || !quote.planPath || !quote.termMonths || !quote.termMiles) return;
    if (matrix.isAvailable(Number(quote.termMonths), Number(quote.termMiles))) return;
    setQuote((current) => ({ ...current, termMonths: null, termMiles: null }));
  }, [matrix, quote.program, quote.planPath, quote.termMonths, quote.termMiles]);

  useEffect(() => {
    if (quote.program !== 'esp') return;
    setQuote((current) => {
      const deductible = deductibleOptions.some((item) => item.id === current.deductible && isDeductibleAvailable(item, {
        planId: current.planId,
        planPath: current.planPath,
        termMiles: current.termMiles,
      })) ? current.deductible : '';
      const allowedAddOnIds = new Set(protectionOptions.filter((option) => isProtectionOptionAvailable(option, {
        planId: current.planId,
        planPath: current.planPath,
        termMonths: current.termMonths,
        termMiles: current.termMiles,
      })).map((option) => option.id));
      const addOns = current.addOns.filter((id) => allowedAddOnIds.has(id));
      const planBenefitsDecision = current.planBenefitsDecision === 'selected' && !addOns.length ? '' : current.planBenefitsDecision;
      if (deductible === current.deductible && addOns.length === current.addOns.length && planBenefitsDecision === current.planBenefitsDecision) return current;
      return { ...current, deductible, addOns, planBenefitsDecision };
    });
  }, [quote.program, quote.planId, quote.planPath, quote.termMonths, quote.termMiles]);

  useEffect(() => {
    const allowedIds = new Set(productCatalog.filter((item) => item.status?.eligible !== false).map((item) => item.id));
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

  const revealInvalidStep = (index) => {
    const message = issueForStep(index);
    setStepIssue({ step: index, message });
    setShowPurchaseContextError(index === 0 && (!quote.purchaseContext || !quote.vehicleSituation));
    if (index === 0) setShowVehicleErrors(true);
    if (index === 4) setShowErrors(true);
    setStep(index);
    setMaxStep((current) => Math.max(current, index));
    const selectors = [
      '.studio-v5 .purchase-context-selector__choices button, .studio-v5 .studio-field.has-error input, .studio-v5 .studio-field.has-error select',
      '.studio-v5 .program-switch button, .studio-v5 .path-switch button, .studio-v5 .studio-plan-rail button',
      '.studio-v5 .term-choice-rail button, .studio-v5 .term-recommendation button',
      '.studio-v5 .options-readiness, .studio-v5 .deductible-grid button, .studio-v5 .product-decision button',
      '.studio-v5 .studio-field.has-error input, .studio-v5 .contact-choice-grid button, .studio-v5 .consent-check.has-error input',
    ];
    window.setTimeout(() => document.querySelector(selectors[index])?.focus?.(), 80);
    return false;
  };

  const goTo = (next) => {
    if (next > step) {
      for (let index = 0; index < next; index += 1) {
        if (!stepReadiness[index]) return revealInvalidStep(index);
      }
    }
    setStepIssue(null);
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
    window.setTimeout(() => {
      const main = studioMainRef.current;
      if (main) {
        main.scrollTo({ top: 0, behavior: 'smooth' });
        main.focus({ preventScroll: true });
      }
    }, 0);
    return true;
  };

  const update = (field, value) => {
    setQuote((current) => {
      const next = {
        ...current,
        [field]: value,
        ...(field === 'make' ? { model: '' } : {}),
        ...(field === 'inService' && value ? { inServiceUnknown: false } : {}),
        ...(field === 'powertrain' ? { planId: '', termMonths: null, termMiles: null, deductible: '', addOns: [], planBenefitsDecision: '', maintenanceId: 'none', maintenanceName: '', ...(value !== 'Diesel' && current.program === 'enginecare' ? { program: '' } : {}) } : {}),
      };
      if (field === 'program') {
        next.planId = '';
        next.planPath = '';
        next.cspLevel = '';
        next.engineCareLevel = '';
        next.termMonths = null;
        next.termMiles = null;
        next.deductible = '';
        next.addOns = [];
        next.planBenefitsDecision = '';
      }
      if (field === 'planPath') {
        const selectedPlan = applicablePlans.find((item) => item.id === current.planId);
        if (selectedPlan?.planPaths && !selectedPlan.planPaths.includes(value)) next.planId = '';
        next.termMonths = null;
        next.termMiles = null;
        next.deductible = '';
        next.addOns = [];
        next.planBenefitsDecision = '';
      }
      if (field === 'planId') {
        next.termMonths = null;
        next.termMiles = null;
        next.deductible = '';
        next.addOns = [];
        next.planBenefitsDecision = '';
      }
      return next;
    });
    setStepIssue(null);
    setSaved(false);
    setCrmStatus(null);
  };

  const updateVin = (value) => {
    const vin = normalizeVin(value);
    vinDecodeAbortRef.current?.abort();
    vinDecodeAbortRef.current = null;
    setQuote((current) => ({ ...current, vin, decodedVehicle: current.vin === vin ? current.decodedVehicle : null }));
    setVinDecodeStatus({ tone: 'idle', message: vin.length === 17 ? 'Ready to decode with NHTSA.' : '' });
    setStepIssue(null);
    setSaved(false);
    setCrmStatus(null);
  };

  const decodeVin = async () => {
    if (!VIN_PATTERN.test(quote.vin)) {
      setVinDecodeStatus({ tone: 'error', message: 'Enter a complete 17-character VIN before decoding.' });
      vinRef.current?.focus();
      return;
    }
    vinDecodeAbortRef.current?.abort();
    const controller = new AbortController();
    vinDecodeAbortRef.current = controller;
    setVinDecodeStatus({ tone: 'loading', message: 'Checking NHTSA vehicle records…' });
    try {
      const result = await decodeVinWithVpic(quote.vin, { signal: controller.signal });
      const decoded = { ...result.vehicle, source: result.source, decodedAt: result.decodedAt };
      setQuote((current) => {
        if (current.vin !== quote.vin) return current;
        const nextPowertrain = decoded.powertrain || current.powertrain;
        const powertrainChanged = nextPowertrain !== current.powertrain;
        return {
          ...current,
          year: decoded.year || current.year,
          make: decoded.make || current.make,
          model: decoded.model || current.model,
          powertrain: nextPowertrain,
          decodedVehicle: decoded,
          ...(powertrainChanged ? {
            program: current.program === 'enginecare' && nextPowertrain !== 'Diesel' ? '' : current.program,
            planId: '', termMonths: null, termMiles: null, deductible: '', addOns: [], planBenefitsDecision: '',
            requestedProductIds: [], productSelections: {}, additionalProductsDecision: '', maintenanceId: 'none', maintenanceName: '',
          } : {}),
        };
      });
      setVinDecodeStatus({ tone: 'success', message: result.message });
      setStepIssue(null);
      setSaved(false);
      setCrmStatus(null);
    } catch (error) {
      if (error?.code !== 'aborted') setVinDecodeStatus({ tone: 'error', message: error?.message || 'The VIN could not be decoded. Enter the details manually.' });
    } finally {
      if (vinDecodeAbortRef.current === controller) vinDecodeAbortRef.current = null;
    }
  };

  const selectPurchaseContext = (vehicleSituation) => {
    const purchaseContext = VEHICLE_SITUATIONS[vehicleSituation]?.purchaseContext || '';
    setQuote((current) => {
      const nextFacts = { ...current, vehicleSituation, purchaseContext };
      const availableProductIds = new Set(getQuoteProductCatalog(nextFacts)
        .filter((product) => product.status?.eligible !== false && product.customerSelectable !== false)
        .map((product) => product.id));
      const requestedProductIds = current.requestedProductIds.filter((id) => availableProductIds.has(id));
      const selectedMaintenanceStillFits = current.maintenanceId === 'none' || requestedProductIds.includes(current.maintenanceId);
      const productSelections = Object.fromEntries(Object.entries(current.productSelections || {}).filter(([id]) => requestedProductIds.includes(id)));
      return {
        ...current,
        purchaseContext,
        vehicleSituation,
        purchaseDate: purchaseContext === 'owner' ? current.purchaseDate : '',
        program: purchaseContext === 'shopping' && current.program === 'csp' ? 'esp' : current.program,
        requestedProductIds,
        productSelections,
        maintenanceId: selectedMaintenanceStillFits ? current.maintenanceId : 'none',
        maintenanceName: selectedMaintenanceStillFits ? current.maintenanceName : '',
        additionalProductsDecision: requestedProductIds.length ? 'selected' : current.additionalProductsDecision,
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

  const updateConsent = (granted) => {
    setQuote((current) => ({ ...current, ...createConsentMetadata(granted) }));
    setSaved(false);
    setCrmStatus(null);
  };

  const chooseMonth = (months) => {
    const validMiles = matrix.miles.filter((miles) => matrix.isAvailable(months, miles));
    const nextMiles = validMiles.includes(quote.termMiles)
      ? quote.termMiles
      : null;
    setQuote((current) => ({ ...current, termMonths: months, termMiles: nextMiles }));
    setStepIssue(null);
    setSaved(false);
  };

  const toggleAddOn = (id) => {
    setQuote((current) => {
      const addOns = current.addOns.includes(id) ? current.addOns.filter((item) => item !== id) : [...current.addOns, id];
      return { ...current, addOns, planBenefitsDecision: addOns.length ? 'selected' : '' };
    });
    setStepIssue(null);
    setSaved(false);
  };

  const toggleRequestedProduct = (id) => {
    const catalogProduct = productCatalog.find((item) => item.id === id);
    const product = quoteProducts.find((item) => item.id === id);
    if (!product || !catalogProduct || catalogProduct.status?.eligible === false) return;
    setQuote((current) => {
      const alreadySelected = current.requestedProductIds.includes(id);
      let requestedProductIds = alreadySelected
        ? current.requestedProductIds.filter((item) => item !== id)
        : [...current.requestedProductIds, id];
      let productSelections = { ...(current.productSelections || {}) };
      if (alreadySelected) delete productSelections[id];
      else productSelections[id] = { ...defaultProductSelection(product, current.powertrain), confirmed: false };
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
      return { ...current, requestedProductIds, productSelections, maintenanceId, maintenanceName, additionalProductsDecision: requestedProductIds.length ? 'selected' : 'none' };
    });
    setSaved(false);
    setCrmStatus(null);
  };

  const configureRequestedProduct = (id, selection) => {
    const catalogProduct = productCatalog.find((item) => item.id === id);
    const product = quoteProducts.find((item) => item.id === id);
    if (!product || !catalogProduct || catalogProduct.status?.eligible === false) return;
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
      productSelections[id] = { ...selection, productId: id, powertrain: current.powertrain, confirmed: true };
      return {
        ...current,
        requestedProductIds,
        productSelections,
        maintenanceId: maintenanceProduct ? id : current.maintenanceId,
        maintenanceName: maintenanceProduct ? (product.name || product.title) : current.maintenanceName,
        maintenanceInterval: maintenanceProduct && selection?.serviceInterval ? Number(selection.serviceInterval) : current.maintenanceInterval,
        additionalProductsDecision: 'selected',
      };
    });
    setSaved(false);
    setCrmStatus(null);
    setStepIssue(null);
  };

  const selectMaintenance = (id) => {
    const choice = maintenanceChoices.find((item) => item.id === id);
    setQuote((current) => ({ ...current, maintenanceId: id, maintenanceName: choice?.title || '' }));
    setSaved(false);
  };

  const quoteForOutput = () => ({
    ...quote,
    planName: coverageValid ? plan.name : '',
    maintenanceName: quote.maintenanceName || maintenanceChoices.find((item) => item.id === quote.maintenanceId)?.title || '',
    additionalProducts: selectedProducts,
    inspection,
  });

  const saveQuote = (override = {}) => {
    const candidate = { ...quoteForOutput(), ...override };
    const result = saveDraft(candidate);
    if (!result.saved) {
      setSaved(false);
      onToast('This browser could not save the request. Your current selections remain open.');
      return;
    }
    onSaved?.(result.draft);
    setSaved(true);
    onToast(`Planning draft ${result.draft.id} saved for 30 days without VIN or contact details.`);
  };

  const continueQuote = () => {
    goTo(Math.min(5, step + 1));
  };

  const downloadProposal = async () => {
    setBusy('pdf');
    try {
      const { downloadProposalPdf } = await import('../proposalPdf');
      await downloadProposalPdf({ quote: quoteForOutput(), plan, detail });
      onToast(quote.submissionReceipt ? 'Your submitted Bob Maxey Ford Protect request summary is ready.' : 'Your draft Bob Maxey Ford Protect proposal is ready.');
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
    const firstInvalidStep = stepReadiness.slice(0, 5).findIndex((ready) => !ready);
    if (firstInvalidStep !== -1) {
      setCrmStatus({ tone: 'error', title: 'The request is not complete', text: issueForStep(firstInvalidStep) });
      revealInvalidStep(firstInvalidStep);
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
      const receipt = { accepted: true, leadId: result.leadId, receivedAt: result.receivedAt };
      const submissionUpdate = { submittedAt: receipt.receivedAt, submissionReceipt: receipt };
      setQuote((current) => ({ ...current, ...submissionUpdate }));
      deleteDraft(quote.id);
      setSaved(false);
      setSubmissionReceipt(receipt);
      setCrmStatus({ tone: 'success', title: 'Request delivered to Bob Maxey', text: `Request ${quote.id} was accepted by the dealership lead system.` });
    } catch (error) {
      console.error(error);
      setCrmStatus({ tone: 'error', title: 'Request was not delivered', text: error?.message || 'Nothing was marked sent. Please try again or contact the dealership.' });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="studio-backdrop studio-v5">
      <div ref={studioDialogRef} className="quote-studio" role="dialog" aria-modal="true" aria-label="Build your Ford Protect coverage request" aria-hidden={subsidiaryDialogOpen ? 'true' : undefined} tabIndex="-1">
        <header className="studio-header">
          <div className="studio-header__brand"><Brand /><span><small>Bob Maxey coverage center</small><strong>Ford Protect</strong></span></div>
          <div className="studio-header__center"><small>BOB MAXEY FORD PROTECT</small><strong className="studio-header__title">Build your protection request</strong><span>{step === 0 ? quote.purchaseContext === 'shopping' ? 'Planning protection with a Bob Maxey vehicle purchase' : quote.purchaseContext === 'owner' ? 'Adding protection to a vehicle you already own' : 'Choose your vehicle journey to begin' : `${quote.year} ${quote.make} ${quote.model || 'vehicle'} · ${coverageValid ? plan.name : 'Coverage not selected'}`}</span></div>
          <div className="studio-header__utilities"><ShieldCheck /><span><strong>Ford-backed</strong><small>Specialist supported</small></span></div>
          <button className="studio-close" type="button" onClick={onClose} aria-label="Close coverage builder"><X /></button>
        </header>
        <Progress step={step} maxStep={maxStep} onSelect={goTo} />
        <div className={`studio-layout ${step === 5 ? 'is-review' : ''}`}>
          <main ref={studioMainRef} className="studio-main" tabIndex="-1" aria-label={`${stepNames[step]} step`}>
            {step === 0 && (
              <section className="studio-step studio-vehicle-step">
                <div className="studio-step__heading"><small>STEP 1 OF 6</small><h1>Start with your vehicle journey.</h1><p>Tell us when you are choosing products, then add the vehicle details that shape Ford eligibility.</p></div>
                <StepAlert issue={stepIssue?.step === 0 ? stepIssue.message : ''} />
                <div className="studio-section">
                  <PurchaseContextSelector value={quote.vehicleSituation} error={showPurchaseContextError} onSelect={selectPurchaseContext} />
                  <div className="studio-section__heading"><div><span>01</span><h2>Vehicle information</h2></div><small>VIN is optional to explore, but needed for final eligibility.</small></div>
                  <div className="studio-fields studio-fields--four">
                    <Field label="VIN" hint="Optional now · 17 characters" error={showVehicleErrors && vehicleErrors.vin}><input ref={vinRef} name="vin" autoCapitalize="characters" spellCheck="false" value={quote.vin} maxLength="17" placeholder="Enter VIN" onChange={(event) => updateVin(event.target.value)} /><button className="vin-decode-button" type="button" onClick={decodeVin} disabled={!VIN_PATTERN.test(quote.vin) || vinDecodeStatus.tone === 'loading'}>{vinDecodeStatus.tone === 'loading' ? 'Decoding…' : 'Decode VIN'}</button></Field>
                    <Field label="Year *" error={showVehicleErrors && vehicleErrors.year}><select value={quote.year} onChange={(event) => update('year', event.target.value)}><option value="">Select year</option>{yearOptions.map((year) => <option key={year}>{year}</option>)}</select></Field>
                    <Field label="Make"><select value={quote.make} onChange={(event) => update('make', event.target.value)}>{makeOptions.map((make) => <option key={make}>{make}</option>)}</select></Field>
                    <Field label="Model *" error={showVehicleErrors && vehicleErrors.model}><select value={quote.model} onChange={(event) => update('model', event.target.value)}><option value="">Select model</option>{modelOptions.map((model) => <option key={model}>{model}</option>)}</select></Field>
                  </div>
                  {(vinDecodeStatus.message || quote.decodedVehicle) && <div className={`vin-decode-status is-${vinDecodeStatus.tone}`} role="status" aria-live="polite"><Info /><span><strong>{vinDecodeStatus.tone === 'success' ? 'NHTSA vehicle facts found' : vinDecodeStatus.tone === 'error' ? 'VIN was not decoded' : vinDecodeStatus.tone === 'loading' ? 'Decoding VIN' : 'VIN ready'}</strong><small>{vinDecodeStatus.message}</small></span></div>}
                  {quote.decodedVehicle && (
                    <details className="vin-decoded-summary">
                      <summary>Review decoded vehicle details <ChevronDown /></summary>
                      <dl className="vin-decoded-facts">
                        {[
                          ['Trim / series', [quote.decodedVehicle.trim, quote.decodedVehicle.series].filter(Boolean).join(' / ')],
                          ['Body', [quote.decodedVehicle.bodyClass, quote.decodedVehicle.bodyCabType].filter(Boolean).join(' · ')],
                          ['Vehicle type', quote.decodedVehicle.vehicleType],
                          ['Manufacturer', quote.decodedVehicle.manufacturer],
                          ['Drive', quote.decodedVehicle.driveType],
                          ['Fuel / powertrain', [quote.decodedVehicle.fuelType, quote.decodedVehicle.electrificationLevel].filter(Boolean).join(' · ')],
                          ['Engine', quote.decodedVehicle.engineDescription],
                          ['Transmission', quote.decodedVehicle.transmission],
                          ['GVWR', quote.decodedVehicle.gvwr],
                          ['Doors', quote.decodedVehicle.doors],
                          ['Assembly plant', quote.decodedVehicle.plant],
                          ['NHTSA model ID', quote.decodedVehicle.modelId],
                        ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                      </dl>
                      <p>NHTSA vPIC provides vehicle-description data only. It does not provide the original in-service date, warranty status, Ford eligibility, coverage availability, or price.</p>
                    </details>
                  )}
                  <div className="studio-fields studio-fields--four studio-fields--secondary">
                    <Field label="Current mileage *" error={showVehicleErrors && vehicleErrors.mileage}><input type="number" min="0" max="500000" placeholder="Enter mileage" value={quote.mileage} onChange={(event) => update('mileage', event.target.value)} /></Field>
                    <Field label="State registered *" error={showVehicleErrors && vehicleErrors.state}><select value={quote.state} onChange={(event) => update('state', event.target.value)}><option value="">Select state</option>{states.map((state) => <option key={state}>{state}</option>)}</select></Field>
                    <Field label="ZIP code *" error={showVehicleErrors && vehicleErrors.zip}><input inputMode="numeric" maxLength="5" placeholder="Enter ZIP" value={quote.zip} onChange={(event) => update('zip', event.target.value.replace(/\D/g, ''))} /></Field>
                    <Field label="Original in-service date *" hint={quote.inServiceUnknown ? 'Bob Maxey will verify the warranty start date in Ford records.' : 'Enter the warranty start date if known.'} error={showVehicleErrors && vehicleErrors.inService}><input type="date" name="inServiceDate" value={quote.inService} disabled={quote.inServiceUnknown} onChange={(event) => update('inService', event.target.value)} /><button className={`field-link ${quote.inServiceUnknown ? 'is-selected' : ''}`} type="button" aria-pressed={quote.inServiceUnknown} onClick={() => setQuote((current) => ({ ...current, inService: '', inServiceUnknown: !current.inServiceUnknown }))}>{quote.inServiceUnknown ? <><Check /> Date marked unknown</> : 'I don’t know the date'}</button></Field>
                    {quote.vehicleSituation === 'owned-after-sale' && <Field label="Date you purchased the vehicle" hint="Optional · separate from the Ford warranty start date"><input type="date" name="vehiclePurchaseDate" value={quote.purchaseDate} onChange={(event) => update('purchaseDate', event.target.value)} /></Field>}
                  </div>
                  <p className="in-service-record-note"><Info /> VIN decoding cannot supply an original in-service or warranty-start date. Bob Maxey must confirm it in Ford records.</p>
                  <div className={`ownership-profile ownership-profile--required ${showVehicleErrors && (vehicleErrors.usage || vehicleErrors.powertrain || vehicleErrors.snowPlow) ? 'has-error' : ''}`}>
                    <div className="ownership-profile__heading"><span><small>REQUIRED VEHICLE PROFILE</small><strong>Tell us how this vehicle is used.</strong><em>These answers affect rating and eligibility.</em></span></div>
                    <div className="studio-goals-grid">
                      <div className="vehicle-rating-grid">
                        <div><strong id="vehicle-use-label">Vehicle use</strong><div role="radiogroup" aria-labelledby="vehicle-use-label" onKeyDown={handleRovingChoiceKeyDown}>{['Personal', 'Business'].map((value) => <button key={value} role="radio" aria-checked={quote.usage === value} tabIndex={quote.usage === value ? 0 : -1} className={quote.usage === value ? 'is-selected' : ''} type="button" onClick={() => update('usage', value)}>{value}</button>)}</div></div>
                        <div><strong id="powertrain-label">Powertrain</strong><div role="radiogroup" aria-labelledby="powertrain-label" onKeyDown={handleRovingChoiceKeyDown}>{['Gas', 'Hybrid', 'Diesel', 'Electric'].map((value) => <button key={value} role="radio" aria-checked={quote.powertrain === value} tabIndex={quote.powertrain === value ? 0 : -1} className={quote.powertrain === value ? 'is-selected' : ''} type="button" onClick={() => update('powertrain', value)}>{value}</button>)}</div></div>
                        <div><strong id="snow-plow-label">Snow-plow use</strong><div role="radiogroup" aria-labelledby="snow-plow-label" onKeyDown={handleRovingChoiceKeyDown}>{['No', 'Yes'].map((value) => <button key={value} role="radio" aria-checked={quote.snowPlow === value} tabIndex={quote.snowPlow === value ? 0 : -1} className={quote.snowPlow === value ? 'is-selected' : ''} type="button" onClick={() => update('snowPlow', value)}>{value}</button>)}</div></div>
                      </div>
                      <div className="ownership-goals">
                        <Field label="How much longer will you keep it?"><select value={quote.keepYears} onChange={(event) => update('keepYears', Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 8].map((value) => <option value={value} key={value}>{value} {value === 1 ? 'year' : 'years'}</option>)}</select></Field>
                        <Field label="Miles driven each year"><select value={quote.annualMiles} onChange={(event) => update('annualMiles', Number(event.target.value))}>{[5000, 7500, 10000, 12000, 15000, 18000, 20000, 25000, 30000].map((value) => <option value={value} key={value}>{formatMiles(value)} miles</option>)}</select></Field>
                      </div>
                    </div>
                    {showVehicleErrors && (vehicleErrors.usage || vehicleErrors.powertrain || vehicleErrors.snowPlow) && <p className="field-error">Choose vehicle use, powertrain, and snow-plow status.</p>}
                  </div>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="studio-step">
                <VehicleStrip quote={quote} onEdit={() => goTo(0)} />
                <div className="studio-step__heading"><small>STEP 2 OF 6</small><h1>Choose how you want to be protected.</h1><p>Compare Ford Protect paths here without leaving Bob Maxey’s site.</p></div>
                <StepAlert issue={stepIssue?.step === 1 ? stepIssue.message : ''} />
                <div className={`program-switch ${quote.purchaseContext === 'shopping' && quote.powertrain !== 'Diesel' ? 'is-single' : ''} ${quote.purchaseContext === 'owner' && quote.powertrain === 'Diesel' ? 'has-three' : ''}`} role="radiogroup" aria-label="Primary coverage program" onKeyDown={handleRovingChoiceKeyDown}>
                  <button type="button" role="radio" aria-checked={quote.program === 'esp'} tabIndex={quote.program === 'esp' || !quote.program ? 0 : -1} className={quote.program === 'esp' ? 'is-selected' : ''} onClick={() => update('program', 'esp')}><ShieldCheck /><span><strong>Extended Service Plan</strong><small>Choose a plan, fixed term, mileage limit, and deductible.</small></span>{quote.program === 'esp' && <Check />}</button>
                  {quote.purchaseContext === 'owner' && <button type="button" role="radio" aria-checked={quote.program === 'csp'} tabIndex={quote.program === 'csp' ? 0 : -1} className={quote.program === 'csp' ? 'is-selected' : ''} onClick={() => update('program', 'csp')}><CalendarDays /><span><strong>Continued Service Plan</strong><small>Monthly protection for eligible owners whose prior coverage is ending.</small></span>{quote.program === 'csp' && <Check />}</button>}
                  {quote.powertrain === 'Diesel' && <button type="button" role="radio" aria-checked={quote.program === 'enginecare'} tabIndex={quote.program === 'enginecare' ? 0 : -1} className={quote.program === 'enginecare' ? 'is-selected' : ''} onClick={() => update('program', 'enginecare')}><Wrench /><span><strong>Diesel EngineCARE</strong><small>A focused alternative primary plan for eligible Power Stroke engines.</small></span>{quote.program === 'enginecare' && <Check />}</button>}
                </div>
                {!quote.program ? (
                  <div className="coverage-empty-state"><ShieldCheck /><span><strong>Start by choosing a coverage path above.</strong><small>The plan levels and eligibility choices for that path will appear here.</small></span></div>
                ) : quote.program === 'esp' ? (
                  <>
                    <div className="path-switch"><span id="coverage-window-label">How should Ford measure the coverage window?</span><div role="radiogroup" aria-labelledby="coverage-window-label" onKeyDown={handleRovingChoiceKeyDown}><button type="button" role="radio" aria-checked={quote.planPath === 'new'} tabIndex={quote.planPath === 'new' || !quote.planPath ? 0 : -1} className={quote.planPath === 'new' ? 'is-selected' : ''} onClick={() => update('planPath', 'new')}><strong>From the original warranty start</strong><small>Ford’s new-plan method measures time from the in-service date and mileage from zero.</small></button><button type="button" role="radio" aria-checked={quote.planPath === 'used'} tabIndex={quote.planPath === 'used' ? 0 : -1} className={quote.planPath === 'used' ? 'is-selected' : ''} onClick={() => update('planPath', 'used')}><strong>From enrollment and today’s odometer</strong><small>Ford’s used-plan method measures time from the contract date and adds mileage from the current odometer.</small></button></div></div>
                    <div className="studio-section studio-section--plans plan-rail-section">
                      <div className="studio-section__heading"><div><h2>Select a coverage level</h2></div><small>Choose a level here; complete coverage stays in the on-site guide.</small></div>
                      <PlanRail compact plans={applicablePlans} selectedId={quote.planId} planPath={quote.planPath} onSelect={(id) => update('planId', id)} onDetails={(id) => { update('planId', id); setPlanHelp(true); }} />
                      <details className={`inspection-inline ${inspection.required ? 'is-required' : 'is-clear'}`}><summary><ClipboardCheck /><strong>{inspection.shortLabel || inspection.title}</strong><span>Inspection details</span><ChevronDown /></summary><p>{inspection.text}</p></details>
                    </div>
                    <p className="studio-fine-print"><Info /> Planning choices are not live pricing. Bob Maxey confirms Ford eligibility, combinations, and price.</p>
                  </>
                ) : quote.program === 'csp' ? (
                  <div className="studio-section csp-section">
                    <div className="csp-intro"><div><small>MONTHLY CONTINUED COVERAGE</small><h2>Protection that can continue with your vehicle.</h2><p>Ford publishes Continued Service Plan eligibility up to 12 model years / 140,000 miles at enrollment, with coverage potentially continuing to 14 model years / 160,000 miles. No annual mileage limit applies; current rules and state availability must be confirmed.</p></div><span><CalendarDays /><strong>Monthly</strong><small>Cancel or transfer where agreement rules allow</small></span></div>
                    <div className="csp-levels" role="radiogroup" aria-label="Continued Service Plan coverage level" onKeyDown={handleRovingChoiceKeyDown}>{cspLevels.map((item, index) => <button type="button" role="radio" aria-checked={quote.cspLevel === item.id} tabIndex={quote.cspLevel === item.id || (!quote.cspLevel && index === 0) ? 0 : -1} key={item.id} className={quote.cspLevel === item.id ? 'is-selected' : ''} onClick={() => update('cspLevel', item.id)}><span className="selection-dot">{quote.cspLevel === item.id && <Check />}</span><small>{item.label}</small><strong>{item.name}</strong><p>{item.description}</p></button>)}</div>
                    <button className="inline-detail-link" type="button" onClick={() => setPlanHelp(true)}>See the full Continued Service coverage guide <ArrowRight /></button>
                    {quote.state === 'California' && <div className="inline-warning"><Info /><span><strong>California limitation</strong><small>Ford’s current public information says Continued Service Plan is not available in California.</small></span></div>}
                  </div>
                ) : (
                  <div className="studio-section csp-section diesel-care-section">
                    <div className="csp-intro"><div><small>FOCUSED POWER STROKE PROTECTION</small><h2>Choose the diesel coverage level to verify.</h2><p>Diesel EngineCARE is an alternative primary mechanical plan—not an add-on to an ESP. The referenced enrollment window is before the earliest of 5 years, 100,000 miles, or 4,000 engine hours.</p></div><span><Wrench /><strong>7 yrs / 200k</strong><small>8,000-hour referenced maximum where eligible</small></span></div>
                    <div className="csp-levels" role="radiogroup" aria-label="Diesel EngineCARE coverage level" onKeyDown={handleRovingChoiceKeyDown}>{dieselCareLevels.map((item, index) => <button type="button" role="radio" aria-checked={quote.engineCareLevel === item.id} tabIndex={quote.engineCareLevel === item.id || (!quote.engineCareLevel && index === 0) ? 0 : -1} key={item.id} className={quote.engineCareLevel === item.id ? 'is-selected' : ''} onClick={() => update('engineCareLevel', item.id)}><span className="selection-dot">{quote.engineCareLevel === item.id && <Check />}</span><small>{item.label}</small><strong>{item.name}</strong><p>{item.description}</p></button>)}</div>
                    <button className="inline-detail-link" type="button" onClick={() => setPlanHelp(true)}>See Diesel EngineCARE coverage details <ArrowRight /></button>
                  </div>
                )}
              </section>
            )}

            {step === 2 && (
              <section className="studio-step">
                <VehicleStrip quote={quote} onEdit={() => goTo(0)} />
                <div className="studio-step__heading studio-step__heading--compact"><small>STEP 3 OF 6</small><h1>{quote.program === 'csp' ? 'Understand the monthly coverage path.' : quote.program === 'enginecare' ? 'Review the Diesel EngineCARE limits.' : 'Choose how long you want to be protected.'}</h1><p>{quote.program === 'csp' ? 'CSP follows monthly terms rather than a fixed years-and-miles grid.' : quote.program === 'enginecare' ? 'Ford confirms the Power Stroke engine, enrollment window, mileage, hours, use, and current offer.' : 'Pick a term and mileage that fits how you plan to keep and drive your Ford.'}</p></div>
                <StepAlert issue={stepIssue?.step === 2 ? stepIssue.message : ''} />
                {quote.program === 'esp' ? (
                  <div className="term-experience">
                    <div className="studio-section term-builder-section">
                    <div className="term-context"><span><small>SELECTED COVERAGE</small><strong>{plan.name}</strong></span><div className="term-path-switch" role="radiogroup" aria-label="Coverage measurement path" onKeyDown={handleRovingChoiceKeyDown}><button type="button" role="radio" aria-checked={quote.planPath === 'new'} tabIndex={quote.planPath === 'new' ? 0 : -1} className={quote.planPath === 'new' ? 'is-selected' : ''} onClick={() => update('planPath', 'new')}>New plan</button><button type="button" role="radio" aria-checked={quote.planPath === 'used'} tabIndex={quote.planPath === 'used' ? 0 : -1} className={quote.planPath === 'used' ? 'is-selected' : ''} onClick={() => update('planPath', 'used')}>Used plan</button></div></div>
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
                <div className="studio-step__heading studio-step__heading--products"><div><small>STEP 4 OF 6</small><h1>Choose your options and payment review.</h1><p>Required decisions are shown together below. Additional products remain optional, but you must choose products or explicitly continue without them.</p></div><button type="button" onClick={() => setAfterSaleNotice(true)}><Info /> When products can be purchased</button></div>
                <StepAlert issue={stepIssue?.step === 3 ? stepIssue.message : ''} />

                <section className="options-readiness" tabIndex="-1" aria-labelledby="options-readiness-title">
                  <div><small>BEFORE YOU CONTINUE</small><h2 id="options-readiness-title">Four decisions, all in one place.</h2></div>
                  <ul>
                    <li className={quote.program !== 'esp' || (quote.deductible && deductibleAllowed) ? 'is-complete' : 'is-missing'}>{quote.program !== 'esp' || (quote.deductible && deductibleAllowed) ? <CheckCircle2 /> : <span>1</span>}<strong>Deductible</strong><small>{quote.program !== 'esp' ? 'Set by the returned Ford offer' : quote.deductible ? `${quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible}`} selected` : 'Selection needed'}</small></li>
                    <li className={benefitsDecisionValid ? 'is-complete' : 'is-missing'}>{benefitsDecisionValid ? <CheckCircle2 /> : <span>2</span>}<strong>Plan benefits</strong><small>{quote.planBenefitsDecision === 'selected' ? `${quote.addOns.length} requested` : quote.planBenefitsDecision === 'none' || quote.program !== 'esp' ? 'Reviewed—none added' : 'Decision needed'}</small></li>
                    <li className={productsDecisionValid ? 'is-complete' : 'is-missing'}>{productsDecisionValid ? <CheckCircle2 /> : <span>3</span>}<strong>Additional products</strong><small>{quote.additionalProductsDecision === 'selected' ? `${selectedProducts.length} configured` : quote.additionalProductsDecision === 'none' ? 'Reviewed—none added' : 'Decision needed'}</small></li>
                    <li className={quote.paymentPreference ? 'is-complete' : 'is-missing'}>{quote.paymentPreference ? <CheckCircle2 /> : <span>4</span>}<strong>Payment review</strong><small>{quote.paymentPreference ? paymentChoices.find((item) => item.value === quote.paymentPreference)?.title : 'Selection needed'}</small></li>
                  </ul>
                </section>

                <div className="options-decision-grid">
                  {quote.program === 'esp' ? (
                    <section className="studio-section plan-settings-card" aria-labelledby="plan-settings-title">
                      <div className="studio-section__heading"><div><span>01</span><h2 id="plan-settings-title">Deductible and plan benefits</h2></div><small>Both decisions are required</small></div>
                      <div className="plan-settings-card__group"><h3 id="deductible-label">Choose a deductible</h3><div className="deductible-grid" role="radiogroup" aria-labelledby="deductible-label" onKeyDown={handleRovingChoiceKeyDown}>{deductibleOptions.filter((item) => isDeductibleAvailable(item, { planId: quote.planId, planPath: quote.planPath, termMiles: quote.termMiles })).map((item, index) => <button key={item.id} type="button" role="radio" aria-checked={quote.deductible === item.id} tabIndex={quote.deductible === item.id || (!quote.deductible && index === 0) ? 0 : -1} className={`${quote.deductible === item.id ? 'is-selected' : ''} ${item.recommended ? 'is-recommended' : ''}`} onClick={() => update('deductible', item.id)}><span>{quote.deductible === item.id && <Check />}</span><strong>{item.label}</strong><small>{item.help}</small>{item.recommended && <em>COMMON CHOICE</em>}</button>)}</div></div>
                      <div className="plan-settings-card__group"><div className="group-heading"><span><h3>Review plan benefit requests</h3><p>Request only the benefits you want the specialist to verify.</p></span><button type="button" aria-pressed={quote.planBenefitsDecision === 'none'} className={quote.planBenefitsDecision === 'none' ? 'is-selected' : ''} onClick={() => { setQuote((current) => ({ ...current, addOns: [], planBenefitsDecision: 'none' })); setStepIssue(null); }}>No added plan benefits {quote.planBenefitsDecision === 'none' && <Check />}</button></div><div className="addon-grid">{availableAddOns.map((choice) => { const Icon = optionIcons[choice.id] || ShieldCheck; const selected = quote.addOns.includes(choice.id); return <button key={choice.id} className={selected ? 'is-selected' : ''} type="button" aria-pressed={selected} onClick={() => toggleAddOn(choice.id)}><span className="addon-check">{selected && <Check />}</span><Icon /><span><strong>{choice.title}</strong><small>{choice.short}</small></span></button>; })}</div><p>Ford’s returned offer and issued agreement determine which benefits are available with the selected vehicle, plan, and term.</p></div>
                    </section>
                  ) : quote.program === 'csp' ? <section className="studio-section csp-options-note"><ShieldCheck /><span><small>CONTINUED SERVICE PLAN</small><h2>Ford confirms the deductible and included benefits in the returned offer.</h2><p>CSP requires no enrollment inspection. Exact coverage, deductible, and price remain vehicle-specific.</p></span></section> : <section className="studio-section csp-options-note enginecare-options-note"><Wrench /><span><small>DIESEL ENGINECARE</small><h2>{dieselCareLevel.name} uses the published $100 deductible.</h2><p>Bob Maxey verifies the eligible Power Stroke engine, mileage, engine hours, vehicle use, coverage level, limits, and current price.</p></span></section>}

                  <section className="studio-section payment-choice payment-choice--cards" aria-labelledby="payment-choice-title">
                    <div className="studio-section__heading"><div><span>02</span><h2 id="payment-choice-title">How should we present payment choices?</h2></div><small>Choose one</small></div>
                    <p>Ford currently advertises interest-free financing for eligible Ford Protect Extended Service Plans for up to 30 months. The current offer controls the down payment, number of installments, due dates, method, and eligibility.</p>
                    <div className="payment-choice-grid" role="radiogroup" aria-label="Payment review preference" onKeyDown={handleRovingChoiceKeyDown}>{paymentChoices.map((choice, index) => <button key={choice.value} type="button" role="radio" aria-checked={quote.paymentPreference === choice.value} tabIndex={quote.paymentPreference === choice.value || (!quote.paymentPreference && index === 0) ? 0 : -1} className={quote.paymentPreference === choice.value ? 'is-selected' : ''} onClick={() => update('paymentPreference', choice.value)}><span>{quote.paymentPreference === choice.value ? <Check /> : null}</span><strong>{choice.title}</strong><small>{choice.text}</small></button>)}</div>
                  </section>
                </div>

                <section className="product-marketplace" aria-labelledby="additional-products-title">
                  <header className="product-marketplace__header"><div><small>{quote.vehicleSituation === 'new-purchase' ? 'PRODUCTS FOR A NEW BOB MAXEY VEHICLE PURCHASE' : quote.vehicleSituation === 'used-purchase' ? 'PRODUCTS FOR A USED BOB MAXEY VEHICLE PURCHASE' : 'AFTER-SALE ELIGIBILITY & TIMING'}</small><h2 id="additional-products-title">{quote.vehicleSituation === 'new-purchase' ? 'Choose products to review with this new-vehicle purchase.' : quote.vehicleSituation === 'used-purchase' ? 'Choose products to review with this used-vehicle purchase.' : 'See what can still be requested after the sale.'}</h2><p>Available products can be configured. Products outside this vehicle situation remain visible with the reason they cannot be added.</p></div><button type="button" onClick={() => setAfterSaleNotice(true)}>Review purchase timing <ArrowRight /></button></header>
                  <div className="product-decision"><button type="button" aria-pressed={quote.additionalProductsDecision === 'none'} className={quote.additionalProductsDecision === 'none' ? 'is-selected' : ''} onClick={() => { setQuote((current) => ({ ...current, requestedProductIds: [], productSelections: {}, maintenanceId: 'none', maintenanceName: '', additionalProductsDecision: 'none' })); setStepIssue(null); }}><X /> Continue with no additional products {quote.additionalProductsDecision === 'none' && <CheckCircle2 />}</button><span>{selectedProducts.length ? `${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'} selected` : 'No product has been selected yet'}</span></div>
                  <div className="product-category-rail" role="tablist" aria-label="Product categories" onKeyDown={handleRovingChoiceKeyDown}>{productCategories.map((category) => <button id={`product-tab-${category}`} key={category} type="button" role="tab" aria-selected={productCategory === category} aria-controls="product-category-panel" tabIndex={productCategory === category ? 0 : -1} className={productCategory === category ? 'is-selected' : ''} onClick={() => setProductCategory(category)}>{category === 'recommended' ? <Sparkles /> : category === 'all' ? <Grid3X3 /> : category === 'maintenance' ? <Wrench /> : category === 'mobility' ? <CarFront /> : <ShieldCheck />}<span>{category.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</span></button>)}</div>
                  {productCategory === 'recommended' && productCatalog.length > visibleProducts.length && <button className="view-all-products" type="button" onClick={() => setProductCategory('all')}>Showing {visibleProducts.length} recommendations · View all {productCatalog.length} products and timing rules <ArrowRight /></button>}
                  <div id="product-category-panel" className="quote-product-grid" role="tabpanel" aria-labelledby={`product-tab-${productCategory}`}>{visibleProducts.map((product) => <ProductCard key={product.id} product={product} selected={quote.requestedProductIds.includes(product.id)} selection={quote.productSelections?.[product.id]} purchaseContext={quote.purchaseContext} onDetails={setProductHelpId} onRemove={toggleRequestedProduct} />)}</div>
                  {!visibleProducts.length && <div className="product-marketplace__empty"><PackagePlus /><h3>No products in this category match the current profile.</h3><p>A Bob Maxey specialist can review other eligible paths.</p></div>}
                </section>
              </section>
            )}

            {step === 4 && (
              <section className="studio-step studio-contact-step">
                <div className="studio-step__heading"><small>STEP 5 OF 6</small><h1>Where should we reach you?</h1><p>A Ford Protect specialist will use these details to prepare and follow up on your request.</p></div>
                <StepAlert issue={stepIssue?.step === 4 ? stepIssue.message : ''} />
                <div className="details-layout">
                  <div className="studio-section">
                    <div className="studio-section__heading"><div><span>07</span><h2>Customer details</h2></div><small>Required to send your request</small></div>
                    <div className="studio-fields studio-fields--two">
                      <Field label="First name *" error={showErrors && !quote.customer.firstName.trim() ? 'Enter a first name' : ''}><input autoComplete="given-name" aria-invalid={showErrors && !quote.customer.firstName.trim()} value={quote.customer.firstName} onChange={(event) => updateCustomer('firstName', event.target.value)} /></Field>
                      <Field label="Last name *" error={showErrors && !quote.customer.lastName.trim() ? 'Enter a last name' : ''}><input autoComplete="family-name" aria-invalid={showErrors && !quote.customer.lastName.trim()} value={quote.customer.lastName} onChange={(event) => updateCustomer('lastName', event.target.value)} /></Field>
                      <Field label="Email *" error={showErrors && !emailValid ? 'Enter a valid email' : ''}><input type="email" autoComplete="email" aria-invalid={showErrors && !emailValid} value={quote.customer.email} onChange={(event) => updateCustomer('email', event.target.value)} /></Field>
                      <Field label="Mobile phone *" error={showErrors && phoneDigits.length < 10 ? 'Enter a valid phone number' : ''}><input type="tel" autoComplete="tel" aria-invalid={showErrors && phoneDigits.length < 10} value={quote.customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} /></Field>
                      <Field label="City" hint="Optional"><input autoComplete="address-level2" value={quote.customer.city} onChange={(event) => updateCustomer('city', event.target.value)} /></Field>
                      <Field label="Preferred Bob Maxey location *" error={showErrors && !quote.store ? 'Choose a location' : ''}><select value={quote.store} onChange={(event) => update('store', event.target.value)}><option value="">Choose a location</option>{locations.map((location) => <option key={location.name} value={location.name}>{location.descriptor}</option>)}</select></Field>
                    </div>
                  </div>
                  <div className="studio-section contact-preferences">
                    <div className="studio-section__heading"><div><span>08</span><h2>Follow-up preference</h2></div></div>
                    <div className={`contact-choice-grid ${showErrors && !quote.preferredContact ? 'has-error' : ''}`} role="radiogroup" aria-label="Preferred contact method" onKeyDown={handleRovingChoiceKeyDown}>{contactPreferences.map((item, index) => { const Icon = item.value === 'phone' ? Phone : item.value === 'text' ? MessageSquare : Mail; return <button key={item.value} type="button" role="radio" aria-checked={quote.preferredContact === item.value} tabIndex={quote.preferredContact === item.value || (!quote.preferredContact && index === 0) ? 0 : -1} className={quote.preferredContact === item.value ? 'is-selected' : ''} onClick={() => update('preferredContact', item.value)}><Icon /><span>{item.label}</span>{quote.preferredContact === item.value && <Check />}</button>; })}</div>
                    {showErrors && !quote.preferredContact && <small className="field-error">Choose how you want us to contact you.</small>}
                    <Field label="Anything the specialist should know?" hint="Optional"><textarea rows="4" value={quote.notes} placeholder="Questions, best time to call, or coverage priorities" onChange={(event) => update('notes', event.target.value)} /></Field>
                    <label className={`consent-check ${showErrors && !quote.consent ? 'has-error' : ''}`}><input type="checkbox" checked={quote.consent} onChange={(event) => updateConsent(event.target.checked)} /><span><strong>I agree Bob Maxey may contact me about this Ford Protect request.</strong><small>This does not purchase coverage or authorize a contract. Permission is timestamped with this request and can be withdrawn before submission by clearing this box.</small></span></label>
                  </div>
                </div>
                <p className="studio-fine-print"><ShieldCheck /> Your information is used only to prepare and follow up on this Ford Protect request.</p>
              </section>
            )}

            {step === 5 && (
              submissionReceipt ? (
                <section className="studio-step studio-success">
                  <div className="studio-success__mark"><Check /></div><small>REQUEST RECEIVED</small><h1 ref={successHeadingRef} tabIndex="-1">Your Ford Protect request has been received.</h1><p>A Bob Maxey specialist will review your vehicle, coverage, and product selections and contact you by {quote.preferredContact === 'text' ? 'text message' : quote.preferredContact === 'email' ? 'email' : 'phone'}.</p>
                  <div className="studio-success__reference"><span><small>YOUR REFERENCE</small><strong>{quote.id}</strong></span><span><small>DEALERSHIP RECEIPT</small><strong>{submissionReceipt.leadId}</strong></span></div>
                  <div className="studio-success__next"><h2>What happens next</h2><div><span><strong>1</strong><p>We verify the VIN, warranty status, inspection path, and current Ford eligibility.</p></span><span><strong>2</strong><p>Your specialist confirms the exact plan, selected products, and Bob Maxey price.</p></span><span><strong>3</strong><p>You review the issued agreement before deciding whether to purchase coverage.</p></span></div></div>
                  <div className="studio-success__actions"><button className="button button--secondary" type="button" onClick={() => setProposalPreview(true)}><Eye /> Preview proposal</button><button className="button button--primary" type="button" onClick={downloadProposal} disabled={busy === 'pdf'}>{busy === 'pdf' ? 'Preparing…' : 'Download personalized proposal'} <Download /></button></div>
                  {selectedProducts.length > 0 && <section className="selected-product-guides selected-product-guides--success"><div><small>DETAILED PRODUCT GUIDES</small><h2>Keep the details for every product you requested.</h2><p>Your personalized proposal stays concise. These separate guides explain each product in more depth.</p></div><div>{selectedProducts.map((product) => <button key={product.id} type="button" onClick={() => downloadSelectedProductGuide(product)} disabled={busy === `guide-${product.id}`}><FileText /><span><strong>{product.name}</strong><small>{busy === `guide-${product.id}` ? 'Preparing guide…' : 'Download product guide'}</small></span><Download /></button>)}</div></section>}
                </section>
              ) : (
                <section className="studio-step studio-review">
                  <div className="studio-step__heading"><small>STEP 6 OF 6</small><h1>Review your complete protection request.</h1><p>Confirm the vehicle, primary coverage, additional products, and follow-up details before submitting to Bob Maxey.</p></div>
                  <StepAlert issue={stepIssue?.step === 5 ? stepIssue.message : ''} />
                  <div className="review-hero"><div><small>{quote.vin.length === 17 ? 'COMPLETE PROTECTION REQUEST' : 'PLANNING REQUEST · VIN PENDING'}</small><h2>{plan.name}</h2><p>{quote.year} {quote.make} {quote.model} · Reference {quote.id}</p></div><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /></div>
                  <div className="review-section-grid">
                    <article className="review-summary-card"><header><CarFront /><span><small>VEHICLE</small><h2>{quote.year} {quote.make} {quote.model}</h2></span><button type="button" onClick={() => goTo(0)}>Edit</button></header><dl><div><dt>Vehicle situation</dt><dd>{vehicleSituations.find((item) => item.id === quote.vehicleSituation)?.label || 'Not selected'}</dd></div>{quote.vehicleSituation === 'owned-after-sale' ? <div><dt>Your purchase date</dt><dd>{quote.purchaseDate || 'Not provided—specialist will verify if needed'}</dd></div> : null}<div><dt>VIN</dt><dd>{quote.vin || 'Pending—required for final Ford record review'}</dd></div>{quote.decodedVehicle?.trim || quote.decodedVehicle?.series ? <div><dt>Trim / series</dt><dd>{[quote.decodedVehicle.trim, quote.decodedVehicle.series].filter(Boolean).join(' / ')}</dd></div> : null}{quote.decodedVehicle?.engineDescription ? <div><dt>NHTSA engine</dt><dd>{quote.decodedVehicle.engineDescription}</dd></div> : null}{quote.decodedVehicle?.driveType || quote.decodedVehicle?.transmission ? <div><dt>Drive / transmission</dt><dd>{[quote.decodedVehicle.driveType, quote.decodedVehicle.transmission].filter(Boolean).join(' · ')}</dd></div> : null}{quote.decodedVehicle?.gvwr ? <div><dt>GVWR</dt><dd>{quote.decodedVehicle.gvwr}</dd></div> : null}<div><dt>Current mileage</dt><dd>{formatMiles(quote.mileage)} miles</dd></div><div><dt>Warranty / inspection</dt><dd>{inspection.shortLabel}</dd></div><div><dt>Use</dt><dd>{quote.usage} · {quote.powertrain} · {quote.snowPlow === 'Yes' ? 'Snow-plow use' : 'No snow plow'}</dd></div></dl>{quote.decodedVehicle && <p className="in-service-record-note"><Info /> NHTSA vehicle facts do not include the Ford warranty start or original in-service date. Bob Maxey verifies those in Ford records.</p>}</article>
                    <article className="review-summary-card"><header><ShieldCheck /><span><small>PRIMARY COVERAGE</small><h2>{plan.name}</h2></span><button type="button" onClick={() => goTo(1)}>Edit</button></header><dl><div><dt>Coverage method</dt><dd>{quote.program === 'esp' ? quote.planPath === 'used' ? 'From enrollment and current odometer' : 'From original warranty start' : quote.program === 'csp' ? 'Monthly continued coverage' : 'Diesel EngineCARE'}</dd></div><div><dt>Term</dt><dd>{quote.program === 'csp' ? 'Monthly / no annual mileage limit' : quote.program === 'enginecare' ? '7 years / 200,000 total miles / 8,000 engine hours referenced maximum' : `${formatTerm(quote.termMonths)} / ${formatMiles(quote.termMiles)} ${quote.planPath === 'used' ? 'additional' : 'total'} miles`}</dd></div><div><dt>Deductible</dt><dd>{quote.program === 'csp' ? 'Confirmed with offer' : quote.program === 'enginecare' ? '$100' : quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible}`}</dd></div><div><dt>Inspection path</dt><dd>{inspection.shortLabel}</dd></div></dl></article>
                    <article className="review-summary-card review-summary-card--options"><header><PackagePlus /><span><small>OPTIONS &amp; PAYMENT</small><h2>{selectedProducts.length ? `${selectedProducts.length} additional product${selectedProducts.length === 1 ? '' : 's'}` : 'No additional products requested'}</h2></span><button type="button" onClick={() => goTo(3)}>Edit</button></header><dl><div><dt>Plan benefits</dt><dd>{quote.program === 'esp' ? protectionOptions.filter((item) => quote.addOns.includes(item.id)).map((item) => item.title).join(', ') || 'None requested' : 'Confirmed with the returned Ford offer'}</dd></div><div><dt>Payment review</dt><dd>{paymentChoices.find((item) => item.value === quote.paymentPreference)?.title || quote.paymentPreference}</dd></div></dl>{selectedProducts.length ? <div className="review-product-list">{selectedProducts.map((product) => <div key={product.id}><img src={assetUrl(product.image)} alt="" /><span><strong>{product.name}</strong><small>{productSelectionLabel(product, quote.productSelections?.[product.id])}</small></span><CheckCircle2 /></div>)}</div> : <p className="review-empty-choice"><CheckCircle2 /> Additional products were reviewed and declined.</p>}</article>
                    <article className="review-summary-card"><header><UserRound /><span><small>CUSTOMER &amp; FOLLOW-UP</small><h2>{quote.customer.firstName} {quote.customer.lastName}</h2></span><button type="button" onClick={() => goTo(4)}>Edit</button></header><dl><div><dt>Email</dt><dd>{quote.customer.email}</dd></div><div><dt>Phone</dt><dd>{quote.customer.phone}</dd></div><div><dt>Preference</dt><dd>{quote.preferredContact === 'text' ? 'Text message' : quote.preferredContact === 'email' ? 'Email' : 'Phone call'}</dd></div><div><dt>Bob Maxey location</dt><dd>{locations.find((item) => item.name === quote.store)?.descriptor || quote.store}</dd></div></dl></article>
                  </div>
                  <div className="review-action-panel"><div><FileText /><span><small>{quote.vin.length === 17 ? 'PERSONALIZED CUSTOMER PROPOSAL' : 'DRAFT PROPOSAL · VIN PENDING'}</small><h2>A complete record of your protection request.</h2><p>Preview the branded portrait proposal with your vehicle, coverage, options, inspection path, and next steps.</p></span></div><button className="button button--secondary" type="button" onClick={() => setProposalPreview(true)}><Eye /> {quote.vin.length === 17 ? 'Preview proposal' : 'Preview draft proposal'}</button></div>
                  {selectedProducts.length > 0 && <section className="selected-product-guides"><div><small>OPTIONAL DOWNLOADS</small><h2>Detailed guides for your selected products</h2><p>Download only the deeper product information you want to keep.</p></div><div>{selectedProducts.map((product) => <button key={product.id} type="button" onClick={() => downloadSelectedProductGuide(product)} disabled={busy === `guide-${product.id}`}><FileText /><span><strong>{product.name}</strong><small>{productSelectionLabel(product, quote.productSelections?.[product.id])}</small></span><Download /></button>)}</div></section>}
                  {crmStatus && <div className={`crm-status ${crmStatus.tone}`} role={crmStatus.tone === 'error' ? 'alert' : 'status'} aria-live={crmStatus.tone === 'error' ? 'assertive' : 'polite'}><CheckCircle2 /><span><strong>{crmStatus.title}</strong><small>{crmStatus.text}</small></span></div>}
                  <div className="review-notice"><ShieldCheck /><span><strong>Ready for specialist review—not a purchase</strong><small>Submitting sends this request to Bob Maxey. Coverage is issued only after eligibility, price, and the Ford Protect agreement are confirmed and you approve the final offer.</small></span></div>
                  {showCrmTools && <details className="crm-test-tools"><summary><span><Download /> CRM testing tools</span><small>For dealership setup only</small></summary><div><p>Download an ADF/XML test file for the {CRM_DESTINATION} DealerMail route. This does not send customer data.</p><button className="button button--secondary" type="button" onClick={downloadXml}><Download /> Download CRM test</button></div></details>}
                </section>
              )
            )}
          </main>
          <Summary quote={quote} plan={plan} eligibility={eligibility} selectedProducts={selectedProducts} inspection={inspection} />
        </div>
        {!submissionReceipt && <StudioFooter step={step} quote={quote} saved={saved} onBack={() => goTo(Math.max(0, step - 1))} onContinue={continueQuote} onSave={() => saveQuote()} onSubmit={sendLead} submitting={busy === 'crm'} ready={stepReadiness[step]} status={stepStatus[step]} />}
      </div>
      {planHelp && <PlanHelp plan={plan} detail={detail} onClose={() => setPlanHelp(false)} />}
      {productHelp && <ProductDetail product={productHelp} selected={quote.requestedProductIds.includes(productHelp.id)} selection={quote.productSelections?.[productHelp.id]} powertrain={quote.powertrain} purchaseContext={quote.purchaseContext} onConfigure={configureRequestedProduct} onClose={() => setProductHelpId('')} />}
      {afterSaleNotice && <AfterSaleNotice purchaseContext={quote.purchaseContext} onClose={() => setAfterSaleNotice(false)} />}
      {proposalPreview && <ProposalPreview quote={quote} plan={plan} detail={detail} onClose={() => setProposalPreview(false)} onDownload={downloadProposal} busy={busy === 'pdf'} />}
      {showMatrix && <MatrixDrawer matrix={matrix} quote={quote} recommendation={recommendation} onClose={() => setShowMatrix(false)} onMonth={chooseMonth} onMiles={(miles) => update('termMiles', miles)} />}
    </div>
  );
}
