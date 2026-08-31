import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, CircleAlert,
  FileCheck2, Search, ShieldCheck, Wrench,
} from 'lucide-react';
import { productDetails } from '../productDetails';
import { assetUrl } from '../paths';

const topics = [
  ['overview', 'Overview'],
  ['coverage', 'What it covers'],
  ['benefits', 'Benefits'],
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
      <h2>Your Ford Protect benefits</h2>
      {detail.benefits.slice(0, 4).map((benefit) => <div key={benefit.title}><ShieldCheck /><span><strong>{benefit.title}</strong><small>{benefit.text}</small></span></div>)}
      <div className="detail-benefit-rail__cta"><strong>Ready to protect your Ford?</strong><span>Start with the vehicle so Bob Maxey can verify the correct plan.</span><button type="button" onClick={start}>{detail.quoteMode === 'dealer' ? 'Ask a specialist' : 'Build my quote'} <ArrowRight /></button></div>
    </aside>
  );
}

export default function ProductDetail({ productId, onBack, onQuote, onContact, onCompare }) {
  const detail = productDetails[productId] || productDetails.premium;
  const [topic, setTopic] = useState('coverage');
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
          {topic === 'overview' && <>
            <section className="detail-overview"><div><BookOpen /><h2>Understand the plan in minutes</h2><p>{detail.coverageModel}</p></div><div><Wrench /><h2>How to choose it</h2><p>{detail.bestFor}</p></div></section>
            <InformationList title="Coverage at a glance" intro="Open What it covers for the searchable component-level view." items={detail.coverageGroups.map((group) => ({ title: group.title, text: group.summary }))} />
          </>}
          {topic === 'coverage' && <CoverageBrowser detail={detail} />}
          {topic === 'benefits' && <InformationList title={`${detail.name} ownership benefits`} intro="Benefits and limits depend on the selected plan and issued agreement." items={detail.benefits} icon={ShieldCheck} />}
          {topic === 'eligibility' && <div className="detail-two-column"><InformationList title="Who may qualify" items={detail.eligibility} icon={Check} /><InformationList title="Choices you can make" items={detail.options} icon={Check} /></div>}
          {topic === 'limits' && <InformationList title="Important limits and exclusions" intro="These are the practical points to understand before purchase." items={detail.limits} icon={CircleAlert} />}
          {topic === 'use' && <>
            <section className="plan-use-flow"><h2>How to use your plan</h2>{detail.useSteps.map((step, index) => <div key={step}><span>{index + 1}</span><p>{step}</p></div>)}</section>
            <section className="source-documents"><div><FileCheck2 /><span><h2>Exact agreement</h2><p>Approved agreement files will be hosted here when Bob Maxey selects the versions for customer use. Until then, request the vehicle-specific agreement without leaving this site.</p></span></div><button type="button" onClick={() => onContact()}>Request my agreement <ArrowRight /></button></section>
          </>}
        </main>
        <BenefitRail detail={detail} onQuote={onQuote} onContact={onContact} />
      </div>
    </article>
  );
}
