import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert,
  FileCheck2, Search, ShieldCheck,
} from 'lucide-react';
import { productDetails } from '../productDetails';
import { hiddenCustomerProductIds } from '../data';
import { assetUrl } from '../paths';

const hiddenCustomerProductIdSet = new Set(hiddenCustomerProductIds);

const topics = [
  ['coverage', 'What it covers'],
  ['eligibility', 'Eligibility & options'],
  ['limits', 'Not covered'],
  ['use', 'Using your plan'],
];

function InformationList({ title, intro, items, icon: Icon = Check }) {
  return (
    <section className="detail-information">
      <div className="detail-information__heading"><h2>{title}</h2>{intro && <p>{intro}</p>}</div>
      <div className="detail-information__list">
        {items.map((item) => (
          <div key={typeof item === 'string' ? item : item.title}>
            <Icon />
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
    <section className="coverage-browser">
      <div className="coverage-browser__heading">
        <div><h2>What {detail.name} covers</h2><p>{detail.coverageModel}</p></div>
        <label className="coverage-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search covered components" aria-label="Search covered components" /></label>
      </div>
      <div className="coverage-accordion">
        {groups.map((group) => {
          const expanded = Boolean(query) || openGroup === group.title;
          return (
            <article key={group.title} className={expanded ? 'is-open' : ''}>
              <button type="button" aria-expanded={expanded} onClick={() => setOpenGroup(expanded && !query ? '' : group.title)}>
                <span><strong>{group.title}</strong><small>{group.summary}</small></span><ChevronDown />
              </button>
              {expanded && <ul>{group.items.map((item) => <li key={item}><Check /> {item}</li>)}</ul>}
            </article>
          );
        })}
        {!groups.length && <div className="coverage-empty"><Search /><strong>No matching component found.</strong><span>Try a system name such as engine, steering, electrical or brakes.</span></div>}
      </div>
      <p className="coverage-browser__note"><CircleAlert /> Component names are educational summaries of current Ford materials. The issued agreement is the complete source for coverage, exclusions and claim decisions.</p>
    </section>
  );
}

function BenefitRail({ detail, onQuote, onContact }) {
  const start = () => detail.quoteMode === 'dealer' ? onContact() : onQuote({ planId: detail.id, powertrain: detail.quoteMode === 'electric' ? 'Electric' : undefined });
  return (
    <aside className="detail-benefit-rail">
      <h2>At a glance</h2>
      {detail.benefits.slice(0, 3).map((benefit) => <div key={benefit.title}><ShieldCheck /><span><strong>{benefit.title}</strong><small>{benefit.text}</small></span></div>)}
      <div className="detail-benefit-rail__cta"><strong>Ready to protect your Ford?</strong><span>Start with the vehicle so Bob Maxey can verify the correct plan.</span><button type="button" onClick={start}>{detail.quoteMode === 'dealer' ? 'Ask a specialist' : 'Build my quote'} <ArrowRight /></button></div>
    </aside>
  );
}

export default function ProductDetail({ productId, onBack, onQuote, onContact, onCompare }) {
  const hiddenFromCustomers = hiddenCustomerProductIdSet.has(productId);
  const detail = hiddenFromCustomers ? null : productDetails[productId] || productDetails.premium;
  const [topic, setTopic] = useState('coverage');
  if (hiddenFromCustomers) {
    return (
      <article className="product-detail-page">
        <div className="detail-breadcrumb page-shell"><button type="button" onClick={onBack}><ArrowLeft /> All products</button></div>
        <section className="page-shell detail-information">
          <div className="detail-information__heading"><h1>This product is not available in the after-sale catalog.</h1><p>Certified-vehicle upgrades are tied to an eligible certified sale, so they are not shown as normal customer purchase paths.</p></div>
          <button className="button button--primary" type="button" onClick={onBack}>Explore available products <ArrowRight /></button>
        </section>
      </article>
    );
  }
  const start = () => detail.quoteMode === 'dealer' ? onContact() : onQuote({ planId: detail.id, powertrain: detail.quoteMode === 'electric' ? 'Electric' : undefined });

  return (
    <article className="product-detail-page">
      <div className="detail-breadcrumb page-shell"><button type="button" onClick={onBack}><ArrowLeft /> All products</button><span>/</span><span>{detail.family}</span><span>/</span><strong>{detail.name}</strong></div>
      <section className="detail-hero">
        <div className="detail-hero__media"><img src={assetUrl(detail.image)} alt={`Official Ford Protect media for ${detail.name}`} /></div>
        <div className="detail-hero__copy">
          <img className="detail-hero__brand" src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
          <p className="detail-hero__type">{detail.type}</p>
          <h1>{detail.name}</h1>
          <p className="detail-hero__tagline">{detail.tagline}</p>
          <div className="detail-hero__facts">
            <div><strong>{detail.stat}</strong><span>{detail.statLabel}</span></div>
            <div><strong>{detail.maxTerm.split(' / ')[0]}</strong><span>{detail.maxTerm.includes(' / ') ? detail.maxTerm.split(' / ').slice(1).join(' / ') : detail.maxTerm}</span></div>
            <div><ShieldCheck /><strong>Ford-backed</strong><span>Genuine Ford Protect</span></div>
          </div>
          <p className="detail-hero__best"><strong>Best for:</strong> {detail.bestFor}</p>
          <div className="detail-hero__actions"><button className="button button--primary" type="button" onClick={start}>{detail.quoteMode === 'dealer' ? 'Talk to a specialist' : 'Build my quote'} <ArrowRight /></button>{detail.family.includes('Mechanical') && <button className="button button--outline" type="button" onClick={onCompare}>Compare plans</button>}</div>
        </div>
      </section>

      <nav className="detail-topic-nav" aria-label={`${detail.name} topics`}>
        <div className="page-shell">{topics.map(([id, label]) => <button key={id} className={topic === id ? 'is-active' : ''} type="button" onClick={() => setTopic(id)}>{label}</button>)}</div>
      </nav>

      <div className="page-shell detail-workspace">
        <main>
          {topic === 'coverage' && <CoverageBrowser detail={detail} />}
          {topic === 'eligibility' && <div className="detail-two-column"><InformationList title="Who may qualify" items={detail.eligibility} icon={Check} /><InformationList title="Choices you can make" items={detail.options} icon={Check} /></div>}
          {topic === 'limits' && <InformationList title="Important limits and exclusions" intro="These are the practical points to understand before purchase." items={detail.limits} icon={CircleAlert} />}
          {topic === 'use' && <>
            <section className="plan-use-flow"><h2>How to use your plan</h2>{detail.useSteps.map((step, index) => <div key={step}><span>{index + 1}</span><p>{step}</p></div>)}</section>
            <section className="source-documents"><div><FileCheck2 /><span><h2>Your vehicle-specific agreement</h2><p>Request the agreement that applies to your vehicle, selected coverage and state. It confirms covered items, exclusions, limits and claim provisions.</p></span></div><button type="button" onClick={() => onContact()}>Request my agreement <ArrowRight /></button></section>
          </>}
        </main>
        <BenefitRail detail={detail} onQuote={onQuote} onContact={onContact} />
      </div>
    </article>
  );
}
