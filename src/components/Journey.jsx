import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  CarFront,
  Check,
  ChevronDown,
  CreditCard,
  FileCheck2,
  FileSignature,
  ShieldCheck,
} from 'lucide-react';

const steps = [
  { number: '1', title: 'Tell us about the vehicle', text: 'Add the VIN when available, plus the year, model, mileage, state, in-service date and vehicle use.', detail: 'These details allow Bob Maxey to check the correct Ford record and enrollment path.', icon: CarFront },
  { number: '2', title: 'Choose your protection goal', text: 'Tell us whether you are focused on repairs, maintenance, mobility or everyday vehicle care.', detail: 'The Products page explains each product; the request keeps only the choices you want reviewed.', icon: ShieldCheck },
  { number: '3', title: 'Confirm eligibility', text: 'Bob Maxey reviews the vehicle record, enrollment timing, use and any inspection requirement.', detail: 'The Eligibility page explains when an in-warranty vehicle can enroll without an inspection and when an out-of-warranty vehicle must be inspected first.', icon: FileCheck2 },
  { number: '4', title: 'Build the request', text: 'Choose the preferred plan, term, mileage, deductible and eligible additional products.', detail: 'Ford-authorized availability is confirmed for the specific VIN before an offer is prepared.', icon: Calculator },
  { number: '5', title: 'Review price and payment', text: 'See the confirmed plan price and the payment choices available with the current offer.', detail: 'Eligible plans may use a small down payment with the remaining balance financed at 0% interest.', icon: CreditCard },
  { number: '6', title: 'Review and receive the agreement', text: 'Approve only after the coverage, exclusions, benefits, deductible, payment schedule and total are clear.', detail: 'After purchase, Bob Maxey verifies that the Ford Protect agreement is issued and provides the customer copy.', icon: FileSignature },
];

const outcomes = [
  ['Your request', 'Your vehicle, ownership needs and selected products are organized into one clear request for Bob Maxey.'],
  ['Dealer verification', 'A specialist confirms current Ford eligibility, available combinations, price, payment structure and agreement terms.'],
  ['Your decision', 'You receive the exact offer and agreement details needed to make an informed choice before purchase.'],
];

export default function Journey({ onQuote, onContact, onNavigate }) {
  return (
    <section className="journey section" id="how-it-works">
      <div className="page-shell journey__hero">
        <div>
          <span>How it works</span>
          <h1>One clear path from your vehicle to an issued Ford Protect agreement.</h1>
          <p>Build a focused request online. Bob Maxey then confirms the vehicle-specific eligibility, current price, payment choices and final agreement before you decide.</p>
          <div className="journey__hero-actions">
            <button className="button button--primary" type="button" onClick={() => onQuote()}>Start with my vehicle <ArrowRight /></button>
            <button type="button" onClick={() => onNavigate('products')}>Explore the products</button>
          </div>
        </div>
        <aside className="journey__hero-card">
          <BadgeCheck aria-hidden="true" />
          <h2>Know what happens before you begin.</h2>
          <ul>
            <li><Check /> Build a request without committing to purchase</li>
            <li><Check /> Review the exact vehicle-specific offer</li>
            <li><Check /> Receive the issued agreement after purchase</li>
          </ul>
        </aside>
      </div>

      <div className="page-shell journey__timeline" aria-label="Ford Protect purchase process">
        {steps.map((step) => {
          const Icon = step.icon;
          return <details key={step.number} className="journey-timeline__step"><summary><span className="journey-timeline__number">{step.number}</span><Icon aria-hidden="true" /><h2>{step.title}</h2><ChevronDown className="journey-timeline__chevron" /></summary><div><p>{step.text}</p><small>{step.detail}</small></div></details>;
        })}
      </div>

      <section className="page-shell journey__pathways" aria-labelledby="journey-details-title">
        <div className="journey__section-heading">
          <span>Details live where they belong</span>
          <h2 id="journey-details-title">Learn more without repeating the whole process.</h2>
          <p>Use the dedicated pages for full product education and vehicle enrollment rules, then return here when you are ready to build a request.</p>
        </div>
        <div className="journey__pathway-grid journey__pathway-grid--links">
          <article><ShieldCheck aria-hidden="true" /><div><span>Coverage and product education</span><h3>Explore Ford Protect products</h3><p>See what each product is designed to protect and open its full detail page.</p><button type="button" onClick={() => onNavigate('products')}>Browse products <ArrowRight /></button></div></article>
          <article><FileCheck2 aria-hidden="true" /><div><span>Vehicle enrollment rules</span><h3>Understand eligibility</h3><p>Review timing, vehicle-use and inspection requirements before requesting an offer.</p><button type="button" onClick={() => onNavigate('eligibility')}>Check eligibility <ArrowRight /></button></div></article>
        </div>
      </section>

      <section className="page-shell journey__payment" aria-labelledby="journey-payment-title">
        <div className="journey__payment-copy">
          <span>Eligible service payment plans</span>
          <h2 id="journey-payment-title">A small down payment, then the remaining balance at 0% interest.</h2>
          <p>Eligible Ford Protect purchases may be divided into scheduled payments rather than paid in full at enrollment. The payment plan is separate from the vehicle loan.</p>
          <ul>
            <li><Check /> The current offer confirms the exact down payment.</li>
            <li><Check /> The number of payments, schedule and first due date are shown before enrollment.</li>
            <li><Check /> Eligibility, payment method and program terms are confirmed with the selected plan.</li>
          </ul>
        </div>
        <div className="journey__payment-card">
          <span>Confirmed with the current offer</span>
          <div><small>Down payment</small><strong>Small initial payment</strong></div>
          <div><small>Remaining balance</small><strong>0% interest when eligible</strong></div>
          <div><small>Payment schedule</small><strong>Shown before you decide</strong></div>
          <button className="button button--primary" type="button" onClick={() => onQuote()}>Build my request <ArrowRight /></button>
        </div>
      </section>

      <section className="page-shell journey__outcomes" aria-labelledby="outcomes-title">
        <div className="journey__section-heading"><span>Clear responsibilities</span><h2 id="outcomes-title">What happens at the handoff.</h2></div>
        <div>{outcomes.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="page-shell journey__agreement">
        <FileCheck2 aria-hidden="true" />
        <div><h2>Review the actual agreement before purchase.</h2><p>The issued agreement makes the covered repairs, exclusions, state terms, deductible, payment schedule and benefits specific to the vehicle.</p></div>
        <button className="button button--primary" type="button" onClick={() => onContact()}>Talk to a specialist <ArrowRight /></button>
      </section>
    </section>
  );
}
