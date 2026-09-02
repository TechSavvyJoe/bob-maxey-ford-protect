import { ArrowRight, BookOpen, FileCheck2, MessageCircleQuestion, Search, ShieldCheck, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { faqItems } from '../data';

const helpPaths = [
  { icon: ShieldCheck, title: 'Choosing coverage', text: 'Plans, products and the differences between coverage levels.', destination: 'products' },
  { icon: FileCheck2, title: 'Eligibility & inspections', text: 'Enrollment timing, warranty status and vehicle review.', destination: 'eligibility' },
  { icon: Wrench, title: 'Using your coverage', text: 'What to do when you need a covered repair or service.', destination: 'resources', anchor: 'faq-list' },
  { icon: BookOpen, title: 'Purchase & payment', text: 'The request, verification, agreement and payment process.', destination: 'how-it-works' },
];

const groupFor = (question) => {
  if (/repair|rental|roadside|cancel|transfer|use ford/i.test(question)) return 'Using and managing coverage';
  if (/begin|deductible|term|electric|battery|business|snow|upfit/i.test(question)) return 'Eligibility and plan terms';
  return 'Choosing Ford Protect';
};

export default function FaqSection({ onQuote, onContact, onNavigate }) {
  const [query, setQuery] = useState('');
  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return faqItems.reduce((groups, item) => {
      if (normalized && !`${item[0]} ${item[1]}`.toLowerCase().includes(normalized)) return groups;
      const group = groupFor(item[0]);
      groups[group] = [...(groups[group] || []), item];
      return groups;
    }, {});
  }, [query]);

  const followPath = (path) => {
    if (path.destination === 'resources' && path.anchor) document.getElementById(path.anchor)?.scrollIntoView({ behavior: 'smooth' });
    else onNavigate(path.destination);
  };

  return (
    <section className="faq-section faq-section--professional" id="faq">
      <div className="page-shell help-hero">
        <div><span>Bob Maxey Ford Protect help center</span><h1>Ford Protect answers, all in one place.</h1><p>Find coverage guides, eligibility rules, payment information and practical ownership answers—without leaving the Bob Maxey site.</p></div>
        <label className="help-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a question, product or term" /></label>
      </div>

      <div className="page-shell help-paths" aria-label="Help topics">
        {helpPaths.map(({ icon: Icon, ...path }) => <button key={path.title} type="button" onClick={() => followPath(path)}><Icon /><span><strong>{path.title}</strong><small>{path.text}</small></span><ArrowRight /></button>)}
      </div>

      <section className="page-shell help-essentials" aria-labelledby="help-essentials-title">
        <div><small>THREE THINGS TO KEEP</small><h2 id="help-essentials-title">The essentials after you choose coverage.</h2></div>
        <article><span>01</span><h3>Before purchase</h3><p>Review the vehicle-specific offer and issued agreement—not only a general coverage example.</p></article>
        <article><span>02</span><h3>When service is needed</h3><p>Contact a participating Ford or Lincoln dealer so the concern can be diagnosed and authorization confirmed.</p></article>
        <article><span>03</span><h3>For your records</h3><p>Keep the issued agreement and maintenance records with the vehicle.</p></article>
      </section>

      <section className="page-shell help-faq" id="faq-list" aria-labelledby="faq-title">
        <div className="help-faq__intro"><MessageCircleQuestion /><span>Frequently asked questions</span><h2 id="faq-title">Clear answers for choosing and using Ford Protect.</h2><p>Final availability, pricing and coverage are confirmed for your VIN before purchase.</p><button className="button button--primary" type="button" onClick={() => onQuote()}>Check My Vehicle <ArrowRight /></button><button type="button" onClick={() => onContact()}>Talk With a Specialist</button></div>
        <div className="help-faq__groups">
          {Object.entries(grouped).map(([group, items]) => <section key={group}><h3>{group}</h3>{items.map(([question, answer], index) => <details key={question} open={!query && group === 'Choosing Ford Protect' && index === 0}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</section>)}
          {Object.keys(grouped).length === 0 && <p className="help-faq__empty">No exact match. Try a product name, “inspection,” “deductible,” or “repair.”</p>}
        </div>
      </section>
    </section>
  );
}
