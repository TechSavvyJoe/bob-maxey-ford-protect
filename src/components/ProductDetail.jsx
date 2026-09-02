import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert,
  Download, FileCheck2, Search, ShieldCheck,
} from 'lucide-react';
import { productDetails } from '../productDetails';
import { hiddenCustomerProductIds } from '../data';
import { getQuoteProductDefinition } from '../quoteProducts';
import { assetUrl } from '../paths';
import '../product-detail-professional.css';

const hiddenCustomerProductIdSet = new Set(hiddenCustomerProductIds);

const topics = [
  ['coverage', 'Coverage'],
  ['eligibility', 'Eligibility & choices'],
  ['limits', 'Limits'],
  ['use', 'How to use it'],
];

const quoteProductIds = {
  premium: 'extended-service-plan',
  extra: 'extended-service-plan',
  base: 'extended-service-plan',
  powertrain: 'extended-service-plan',
  'premium-plus-ev': 'extended-service-plan',
  'premium-ev': 'extended-service-plan',
  'extra-ev': 'extended-service-plan',
  'base-ev': 'extended-service-plan',
  'premium-maintenance': 'premium-maintenance',
  'premium-maintenance-ev': 'premium-maintenance',
  'continued-service': 'continued-service-plan',
  tirecare: 'tirecare-plus',
  dentcare: 'dentcare',
  windshieldcare: 'windshieldcare',
  'windshieldcare-ev': 'windshieldcare',
  triplecare: 'triplecare-plus',
  surfacecare: 'surfacecare',
  theftcare: 'theftcare',
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const asEligibility = (detail, quoteProduct) => quoteProduct?.eligibility || {
  headline: 'Vehicle-specific eligibility must be confirmed before purchase.',
  requirements: detail.eligibility || [],
  dealerConfirmation: 'Bob Maxey confirms the VIN, vehicle record, current program availability and price.',
  inspectionPolicy: '',
};

function buildDownloadModel(detail, quoteProduct) {
  const eligibility = asEligibility(detail, quoteProduct);
  const variant = quoteProduct?.configuration?.variants?.find((item) => item.id === detail.id)
    || quoteProduct?.configuration?.variants?.find((item) => item.label?.toLowerCase().includes(detail.name.toLowerCase()))
    || quoteProduct?.configuration?.variants?.[0];
  const defaults = variant?.defaults || quoteProduct?.configuration?.defaults || {};
  const detailSections = [
    ...detail.coverageGroups.map((group) => ({
      title: group.title,
      items: unique([group.summary, ...group.items]),
    })),
    ...(quoteProduct?.detailSections || []),
  ];

  return {
    product: {
      ...(quoteProduct || {}),
      id: detail.id,
      name: detail.name,
      shortName: detail.name,
      eyebrow: detail.type,
      familyLabel: detail.family,
      value: detail.tagline,
      description: detail.coverageModel,
      image: detail.image,
      highlights: unique([
        `Best for: ${detail.bestFor}`,
        ...detail.benefits.map((benefit) => `${benefit.title}: ${benefit.text}`),
        ...(quoteProduct?.highlights || []),
      ]),
      detailSections,
      eligibility,
      purchaseTiming: variant?.purchaseWindowLabel || quoteProduct?.purchaseTimingLabel || detail.maxTerm,
      cautions: unique([...(detail.limits || []), ...(quoteProduct?.cautions || [])]),
      configuration: quoteProduct?.configuration,
    },
    selection: {
      variantId: defaults.variantId || variant?.id || null,
      optionName: variant?.label || detail.name,
      termMonths: defaults.termMonths ?? null,
      mileage: defaults.termMiles ?? null,
      termMiles: defaults.termMiles ?? null,
      serviceIntervalMiles: defaults.serviceInterval ?? null,
      engineHours: defaults.engineHours ?? null,
      benefitAmount: defaults.benefitAmount ?? null,
      startBasisLabel: variant?.startBasisLabel,
      purchaseWindowLabel: variant?.purchaseWindowLabel,
      labels: [detail.maxTerm],
    },
    quote: { purchaseContext: 'education' },
  };
}

function InformationList({ title, intro, items, icon: Icon = Check }) {
  return (
    <section className="pdoem-information">
      <div className="pdoem-information__heading">
        <h2>{title}</h2>
        {intro && <p>{intro}</p>}
      </div>
      <div className="pdoem-information__list">
        {items.map((item, index) => (
          <div key={`${typeof item === 'string' ? item : item.title}-${index}`}>
            <Icon aria-hidden="true" />
            <span>{typeof item === 'string' ? item : <><strong>{item.title}</strong><small>{item.text}</small></>}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoverageBrowser({ detail }) {
  const [query, setQuery] = useState('');
  const [openGroup, setOpenGroup] = useState(detail.coverageGroups[0]?.title || '');
  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return detail.coverageGroups;
    return detail.coverageGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => `${group.title} ${group.summary} ${item}`.toLowerCase().includes(normalized)),
      }))
      .filter((group) => group.items.length || `${group.title} ${group.summary}`.toLowerCase().includes(normalized));
  }, [detail, query]);

  return (
    <section className="pdoem-coverage">
      <div className="pdoem-section-heading">
        <div>
          <p className="pdoem-eyebrow">Complete on-site guide</p>
          <h2>Coverage groups and components</h2>
          <p>{detail.coverageModel}</p>
        </div>
        <label className="pdoem-search">
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search components" aria-label="Search covered components" />
        </label>
      </div>
      <div className="pdoem-accordion">
        {groups.map((group) => {
          const expanded = Boolean(query) || openGroup === group.title;
          return (
            <article key={group.title} className={expanded ? 'is-open' : ''}>
              <button type="button" aria-expanded={expanded} onClick={() => setOpenGroup(expanded && !query ? '' : group.title)}>
                <span><strong>{group.title}</strong><small>{group.summary}</small></span>
                <ChevronDown aria-hidden="true" />
              </button>
              {expanded && <ul>{group.items.map((item) => <li key={item}><Check aria-hidden="true" /> <span>{item}</span></li>)}</ul>}
            </article>
          );
        })}
        {!groups.length && <div className="pdoem-empty"><Search aria-hidden="true" /><strong>No matching component found</strong><span>Try a system such as engine, steering, electrical or brakes.</span></div>}
      </div>
      <p className="pdoem-note"><CircleAlert aria-hidden="true" /> Component names are educational summaries of Ford materials. The issued agreement is the complete source for coverage, exclusions and claim decisions.</p>
    </section>
  );
}

function BenefitRail({ detail, eligibility, purchaseWindow }) {
  return (
    <aside className="pdoem-rail" aria-label={`${detail.name} at a glance`}>
      <div className="pdoem-rail__section">
        <p className="pdoem-eyebrow">At a glance</p>
        <h2>Why owners consider it</h2>
        {detail.benefits.slice(0, 4).map((benefit) => (
          <div className="pdoem-benefit" key={benefit.title}>
            <ShieldCheck aria-hidden="true" />
            <span><strong>{benefit.title}</strong><small>{benefit.text}</small></span>
          </div>
        ))}
      </div>
      <div className="pdoem-rail__section pdoem-rail__review">
        <p className="pdoem-eyebrow">Before purchase</p>
        <strong>{eligibility.headline}</strong>
        <span>{purchaseWindow || 'Current Ford records and the vehicle-specific agreement determine the available plan.'}</span>
      </div>
    </aside>
  );
}

export default function ProductDetail({ productId, onBack, onQuote, onContact, onCompare }) {
  const hiddenFromCustomers = hiddenCustomerProductIdSet.has(productId);
  const detail = hiddenFromCustomers ? null : productDetails[productId] || productDetails.premium;
  const [topic, setTopic] = useState('coverage');
  const [downloadState, setDownloadState] = useState('idle');

  if (hiddenFromCustomers) {
    return (
      <article className="product-detail-page pdoem-page">
        <div className="pdoem-shell pdoem-hidden-product">
          <button className="pdoem-back" type="button" onClick={onBack}><ArrowLeft /> All products</button>
          <h1>This product is not in the customer catalog.</h1>
          <p>Certified-vehicle upgrades are tied to an eligible certified sale, so they are not presented as normal after-sale purchase paths.</p>
          <button className="pdoem-button pdoem-button--primary" type="button" onClick={onBack}>Explore available products <ArrowRight /></button>
        </div>
      </article>
    );
  }

  const quoteProduct = getQuoteProductDefinition(quoteProductIds[detail.id] || detail.id);
  const eligibility = asEligibility(detail, quoteProduct);
  const variant = quoteProduct?.configuration?.variants?.[0];
  const purchaseWindow = variant?.purchaseWindowLabel || detail.maxTerm;
  const requestableDealerProduct = detail.quoteMode === 'dealer' && Boolean(quoteProduct?.purchaseContexts?.length);
  const requiredPurchaseContext = quoteProduct?.purchaseContexts?.length === 1 ? quoteProduct.purchaseContexts[0] : undefined;
  const primaryActionLabel = requestableDealerProduct ? 'Add to my request' : detail.quoteMode === 'dealer' ? 'Talk with a specialist' : 'Check my vehicle';
  const start = () => requestableDealerProduct
    ? onQuote({ purchaseContext: requiredPurchaseContext, productId: quoteProduct.id })
    : detail.quoteMode === 'dealer'
      ? onContact()
      : onQuote({ planId: detail.id, powertrain: detail.quoteMode === 'electric' ? 'Electric' : undefined });
  const downloadGuide = async () => {
    if (downloadState === 'working') return;
    setDownloadState('working');
    try {
      const { downloadProductGuidePdf } = await import('../proposalPdf');
      await downloadProductGuidePdf(buildDownloadModel(detail, quoteProduct));
      setDownloadState('complete');
    } catch (error) {
      console.error(error);
      setDownloadState('error');
    }
  };

  return (
    <article className="product-detail-page pdoem-page">
      <div className="pdoem-shell pdoem-breadcrumb">
        <button type="button" onClick={onBack}><ArrowLeft /> All products</button>
        <span aria-hidden="true">/</span><span>{detail.family}</span><span aria-hidden="true">/</span><strong>{detail.name}</strong>
      </div>

      <section className="pdoem-shell pdoem-hero">
        <div className="pdoem-hero__copy">
          <img className="pdoem-hero__brand" src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
          <p className="pdoem-eyebrow">{detail.type}</p>
          <h1>{detail.name}</h1>
          <p className="pdoem-hero__tagline">{detail.tagline}</p>
          <p className="pdoem-hero__best"><strong>Designed for</strong><span>{detail.bestFor}</span></p>
          <div className="pdoem-actions">
            <button className="pdoem-button pdoem-button--primary" type="button" onClick={start}>{primaryActionLabel} <ArrowRight /></button>
            <button className="pdoem-button pdoem-button--secondary" type="button" onClick={downloadGuide} disabled={downloadState === 'working'}><Download /> {downloadState === 'working' ? 'Preparing guide…' : 'Download product guide'}</button>
            {detail.family.includes('Mechanical') && <button className="pdoem-button pdoem-button--text" type="button" onClick={onCompare}>Compare plans</button>}
          </div>
          <p className={`pdoem-download-status is-${downloadState}`} aria-live="polite">
            {downloadState === 'complete' && 'Your detailed product guide is ready.'}
            {downloadState === 'error' && 'The guide could not be created. Please try again.'}
          </p>
        </div>
        <div className="pdoem-hero__visual">
          <figure><img src={assetUrl(detail.image)} alt={`Ford Protect media for ${detail.name}`} /></figure>
          <div className="pdoem-facts">
            <div><strong>{detail.stat}</strong><span>{detail.statLabel}</span></div>
            <div><strong>{detail.maxTerm.split(' / ')[0]}</strong><span>{detail.maxTerm.includes(' / ') ? detail.maxTerm.split(' / ').slice(1).join(' / ') : detail.maxTerm}</span></div>
            <div><strong>Ford-backed</strong><span>Specialist-confirmed eligibility</span></div>
          </div>
        </div>
      </section>

      <nav className="pdoem-topic-nav" aria-label={`${detail.name} guide topics`}>
        <div className="pdoem-shell">
          {topics.map(([id, label], index) => (
            <button key={id} className={topic === id ? 'is-active' : ''} type="button" aria-current={topic === id ? 'page' : undefined} onClick={() => setTopic(id)}>
              <span>{String(index + 1).padStart(2, '0')}</span>{label}
            </button>
          ))}
        </div>
      </nav>

      <div className="pdoem-shell pdoem-workspace">
        <main>
          {topic === 'coverage' && <CoverageBrowser detail={detail} />}
          {topic === 'eligibility' && (
            <div className="pdoem-topic-panel">
              <div className="pdoem-decision-note">
                <span>Purchase timing</span>
                <strong>{eligibility.headline}</strong>
                <p>{purchaseWindow}</p>
              </div>
              <div className="pdoem-two-column">
                <InformationList title="Who may qualify" items={detail.eligibility} />
                <InformationList title="Choices you can make" items={detail.options} />
              </div>
              {(eligibility.dealerConfirmation || eligibility.inspectionPolicy) && (
                <div className="pdoem-verification-grid">
                  {eligibility.dealerConfirmation && <div><ShieldCheck /><span><strong>Dealer verification</strong><small>{eligibility.dealerConfirmation}</small></span></div>}
                  {eligibility.inspectionPolicy && <div><FileCheck2 /><span><strong>Inspection guidance</strong><small>{eligibility.inspectionPolicy}</small></span></div>}
                </div>
              )}
            </div>
          )}
          {topic === 'limits' && (
            <div className="pdoem-topic-panel">
              <InformationList title="Important limits and exclusions" intro="Understand these points before choosing a plan." items={unique([...(detail.limits || []), ...(quoteProduct?.cautions || [])])} icon={CircleAlert} />
              <div className="pdoem-agreement"><FileCheck2 /><span><strong>The issued agreement controls</strong><small>Coverage, exclusions, deductibles, limits, claim provisions and cancellation or transfer terms must match the agreement issued for the vehicle and state.</small></span></div>
            </div>
          )}
          {topic === 'use' && (
            <div className="pdoem-topic-panel">
              <section className="pdoem-use-flow">
                <div className="pdoem-section-heading"><div><p className="pdoem-eyebrow">When service is needed</p><h2>How to use your plan</h2></div></div>
                {detail.useSteps.map((step, index) => <div key={step}><span>{index + 1}</span><p>{step}</p></div>)}
              </section>
              <section className="pdoem-agreement pdoem-agreement--action">
                <FileCheck2 />
                <span><strong>Request your vehicle-specific agreement</strong><small>It confirms covered items, exclusions, limits and claim provisions for the selected vehicle, coverage and state.</small></span>
                <button type="button" onClick={onContact}>Request agreement <ArrowRight /></button>
              </section>
            </div>
          )}
        </main>
        <BenefitRail detail={detail} eligibility={eligibility} purchaseWindow={purchaseWindow} />
      </div>

      <section className="pdoem-footer-cta">
        <div className="pdoem-shell">
          <div><p className="pdoem-eyebrow">Next step</p><h2>Match {detail.name} to your vehicle.</h2><span>Bob Maxey confirms eligibility, available choices and current pricing.</span></div>
          <div><button className="pdoem-button pdoem-button--primary" type="button" onClick={start}>{primaryActionLabel} <ArrowRight /></button><button className="pdoem-button pdoem-button--secondary" type="button" onClick={downloadGuide}><Download /> Product guide</button></div>
        </div>
      </section>
    </article>
  );
}
