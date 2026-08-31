import { ArrowRight, BadgeCheck, Calculator, CarFront, Check, ClipboardList, CreditCard, FileCheck2, FileSignature, ShieldCheck } from 'lucide-react';

const steps = [
  { number: '1', title: 'Start with your vehicle', text: 'Enter the VIN when available, then confirm year, model, mileage, state, in-service date, vehicle use and powertrain.', detail: 'Why it matters: Ford eligibility, plan type, terms and deductibles can change with the vehicle record.', icon: CarFront },
  { number: '2', title: 'Confirm the coverage path', text: 'Choose mechanical, EV, maintenance, commercial or continued-coverage needs.', detail: 'Already have Ford Protect? Bob Maxey confirms whether a Continued Service Plan path applies instead of duplicating current coverage.', icon: ClipboardList },
  { number: '3', title: 'Compare plan levels', text: 'See the systems and examples in PremiumCARE, ExtraCARE, BaseCARE and PowertrainCARE before choosing a plan.', detail: 'Use the on-site comparison to see exactly what is gained—or not listed—at each level.', icon: ShieldCheck },
  { number: '4', title: 'Customize your protection', text: 'Select the term, mileage, deductible and any eligible coverage options that fit how you drive.', detail: 'The final choice is based on Ford-approved options for the vehicle, state and plan—not generic estimates.', icon: Calculator },
  { number: '5', title: 'Review price and payment', text: 'Bob Maxey confirms the actual Ford Protect price. Eligible Budco payment plans use 20% down, then scheduled payments for the balance.', detail: 'You see the final payment schedule, agreement and any applicable tax before enrollment.', icon: CreditCard },
  { number: '6', title: 'Approve and receive your contract', text: 'After the final agreement is reviewed and payment is completed, Bob Maxey verifies that the Ford Protect contract is issued.', detail: 'Keep the issued contract with your vehicle records; it is the source of truth for covered repairs and benefits.', icon: FileSignature },
];

const outcomes = [
  ['What you can do online now', 'Review coverage, compare plans, build a vehicle-specific request and estimate the 20%-down payment structure.'],
  ['What Bob Maxey confirms', 'Live Ford eligibility, current pricing, available terms, deductible, state rules, payment setup and the final agreement.'],
  ['What you receive after purchase', 'A verified Ford Protect contract—not a lead form—with the exact plan, term, deductible and benefit terms for your vehicle.'],
];

export default function Journey({ onQuote, onContact, onNavigate }) {
  return (
    <section className="journey section" id="how-it-works">
      <div className="page-shell journey__hero">
        <div><span>How Ford Protect works with Bob Maxey</span><h1>A clear path from vehicle details to an issued contract.</h1><p>We make the plan differences and payment choices easy to understand first. Then Bob Maxey confirms the exact Ford eligibility, price and agreement before you buy.</p><div className="journey__hero-actions"><button className="button button--primary" type="button" onClick={() => onQuote()}>Start with my vehicle <ArrowRight /></button><button type="button" onClick={() => onNavigate('resources')}>Explore coverage details</button></div></div>
        <aside className="journey__hero-card"><BadgeCheck /><h2>No guessing at the finish line.</h2><ul><li><Check /> No public price-shopping link</li><li><Check /> Final plan and agreement shown before purchase</li><li><Check /> Bob Maxey stays with you through issued-contract confirmation</li></ul></aside>
      </div>

      <div className="page-shell journey__timeline" aria-label="Ford Protect purchase journey">
        {steps.map((step) => {
          const Icon = step.icon;
          return <article key={step.number} className="journey-timeline__step"><span className="journey-timeline__number">{step.number}</span><Icon /><div><h2>{step.title}</h2><p>{step.text}</p><small>{step.detail}</small></div></article>;
        })}
      </div>

      <section className="page-shell journey__pathways" aria-labelledby="pathways-title">
        <div className="journey__section-heading"><span>Choose the right starting point</span><h2 id="pathways-title">New protection or continued coverage?</h2><p>These are different paths. Starting in the right place keeps the plan and payment conversation accurate.</p></div>
        <div className="journey__pathway-grid">
          <article><CarFront /><div><span>New or eligible used vehicle</span><h3>Extended Service Plan</h3><p>Use this path when you are selecting new mechanical, EV or maintenance protection. Start with your vehicle details, compare plan levels and build the requested coverage.</p><button type="button" onClick={() => onQuote()}>Build an Extended Service Plan request <ArrowRight /></button></div></article>
          <article><FileCheck2 /><div><span>Existing Ford Protect coverage</span><h3>Continued Service Plan review</h3><p>Use this path when a current Ford Protect plan is nearing expiration. Bob Maxey checks eligibility and confirms whether continued coverage is appropriate rather than duplicating an existing plan.</p><button type="button" onClick={() => onContact()}>Ask about continued coverage <ArrowRight /></button></div></article>
        </div>
      </section>

      <section className="page-shell journey__outcomes" aria-labelledby="outcomes-title">
        <div className="journey__section-heading"><span>Clear responsibilities</span><h2 id="outcomes-title">What happens at each point.</h2></div>
        <div>{outcomes.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="page-shell journey__agreement"><FileCheck2 /><div><h2>Before you purchase, you review the actual agreement.</h2><p>Coverage examples are useful for comparing plans. The final Ford Protect agreement is where the covered repairs, exclusions, state terms, deductible, payment schedule and benefits become specific to your vehicle.</p></div><button className="button button--primary" type="button" onClick={() => onContact()}>Talk to a specialist <ArrowRight /></button></section>
    </section>
  );
}
