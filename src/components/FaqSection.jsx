import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FolderCheck,
  MessageCircleQuestion,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { faqItems } from '../data';

const routeCards = [
  {
    title: 'Explore every product',
    text: 'Start with a concise overview, then open the dedicated page for full coverage and eligibility details.',
    action: 'Browse products',
    destination: 'products',
    icon: ShieldCheck,
  },
  {
    title: 'Compare plan levels',
    text: 'See the meaningful differences between PremiumCARE, ExtraCARE, BaseCARE and PowertrainCARE.',
    action: 'Compare plans',
    destination: 'compare',
    icon: ClipboardCheck,
  },
  {
    title: 'Check eligibility',
    text: 'Understand enrollment timing, vehicle use and when a dealership inspection may be required.',
    action: 'Review eligibility',
    destination: 'eligibility',
    icon: FileCheck2,
  },
  {
    title: 'See how purchase works',
    text: 'Follow the request, verification, payment and issued-contract process from beginning to end.',
    action: 'View the process',
    destination: 'how-it-works',
    icon: BookOpen,
  },
];

const supportGuides = [
  {
    title: 'Before you choose',
    text: 'Use the product pages and comparison to narrow the choices, then request the exact vehicle-specific agreement before purchase.',
    icon: ShieldCheck,
  },
  {
    title: 'When you need a repair',
    text: 'Contact a participating Ford or Lincoln dealer. The service team diagnoses the concern and confirms coverage before an eligible repair is authorized.',
    icon: Wrench,
  },
  {
    title: 'Keep with your records',
    text: 'Save the issued agreement and maintenance records. The agreement contains the controlling coverage, exclusions, limits, cancellation and transfer terms.',
    icon: FolderCheck,
  },
];

const glossary = [
  ['In-service date', 'The date the vehicle warranty period originally began.'],
  ['Coverage term', 'How long the agreement can remain active, subject to its stated limits.'],
  ['Mileage limit', 'The odometer or additional-mileage limit shown in the selected agreement.'],
  ['Deductible', 'The customer amount that may apply to an eligible covered repair visit.'],
  ['Listed-component coverage', 'Coverage for the specific parts named in the agreement.'],
  ['Vehicle-specific eligibility', 'The Ford-confirmed products, terms and options available for one VIN, mileage, state and use.'],
];

export default function FaqSection({ onQuote, onContact, onNavigate }) {
  return (
    <section className="faq-section section" id="faq">
      <div className="page-shell document-center help-center__hero" id="documents">
        <div className="document-center__heading">
          <div>
            <span className="help-center__eyebrow">Bob Maxey Ford Protect help center</span>
            <h1>Find the right answer without reading the same plan information twice.</h1>
            <p>Use this page for practical guidance and frequently asked questions. Product coverage, plan differences, eligibility and the purchase process each have one dedicated place.</p>
          </div>
          <FileText aria-hidden="true" />
        </div>
        <div className="help-center__hero-actions">
          <button className="button button--primary" type="button" onClick={() => onQuote()}>Build my request <ArrowRight /></button>
          <button type="button" onClick={() => onContact()}>Ask a Bob Maxey specialist</button>
        </div>
      </div>

      <section className="page-shell help-center__section" aria-labelledby="help-center-routes-title">
        <div className="help-center__section-heading">
          <span>Go straight to the source</span>
          <h2 id="help-center-routes-title">What do you want to learn?</h2>
          <p>Each topic opens the page that owns those details, so comparisons and explanations stay consistent across the site.</p>
        </div>
        <div className="help-center__routes">
          {routeCards.map(({ title, text, action, destination, icon: Icon }) => (
            <button className="help-center__route" key={destination} type="button" onClick={() => onNavigate(destination)}>
              <Icon aria-hidden="true" />
              <span><strong>{title}</strong><small>{text}</small></span>
              <b>{action} <ArrowRight /></b>
            </button>
          ))}
        </div>
      </section>

      <section className="page-shell help-center__section" aria-labelledby="support-guides-title">
        <div className="help-center__section-heading">
          <span>Using your coverage</span>
          <h2 id="support-guides-title">From agreement review to a covered repair.</h2>
          <p>A simple reference for the moments when customers most often need direction.</p>
        </div>
        <div className="help-center__guides">
          {supportGuides.map(({ title, text, icon: Icon }, index) => (
            <article key={title}>
              <div><span>0{index + 1}</span><Icon aria-hidden="true" /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="help-center__agreement">
          <FileCheck2 aria-hidden="true" />
          <div><strong>The issued agreement is the final word.</strong><p>Coverage examples help with shopping, but the agreement issued for the vehicle controls covered repairs, exclusions, benefits, deductible, limits and state-specific terms.</p></div>
          <button type="button" onClick={() => onContact()}>Request an agreement <ArrowRight /></button>
        </div>
      </section>

      <section className="page-shell help-center__section help-center__glossary" aria-labelledby="glossary-title">
        <div className="help-center__section-heading">
          <span>Plain-language glossary</span>
          <h2 id="glossary-title">Terms worth knowing before you compare.</h2>
        </div>
        <dl>
          {glossary.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}
        </dl>
      </section>

      <section className="page-shell help-center__section help-center__faq" aria-labelledby="faq-title">
        <div className="faq-section__intro">
          <MessageCircleQuestion aria-hidden="true" />
          <span className="help-center__eyebrow">Frequently asked questions</span>
          <h2 id="faq-title">Clear answers, right here.</h2>
          <p>Still unsure which path applies? A Bob Maxey specialist can review the vehicle record and the current Ford-authorized choices.</p>
          <button className="button button--primary" type="button" onClick={() => onQuote()}>Start with my vehicle <ArrowRight /></button>
          <button className="faq-section__contact" type="button" onClick={() => onContact()}>Ask a specialist</button>
        </div>
        <div className="faq-list">
          {faqItems.map(([question, answer], index) => (
            <details key={question} open={index === 0}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>
          ))}
        </div>
      </section>
    </section>
  );
}
