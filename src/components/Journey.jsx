import { ArrowRight, CarFront, Check, ChevronDown, FileCheck2, ShieldCheck } from 'lucide-react';

const steps = [
  { icon: CarFront, title: 'Tell us about the vehicle', text: 'Add the VIN when available, mileage, in-service date, state, use and whether you already own it or are shopping at Bob Maxey.' },
  { icon: ShieldCheck, title: 'Choose what you want to protect', text: 'Compare repair coverage, maintenance and products available for your ownership stage. Add only the choices you want reviewed.' },
  { icon: FileCheck2, title: 'Bob Maxey verifies the Ford offer', text: 'A specialist confirms the vehicle record, inspection path, current product availability, plan combinations, options and price.' },
  { icon: Check, title: 'Review the agreement and decide', text: 'See the confirmed coverage, exclusions, deductible, benefits, payment schedule and total before you approve anything.' },
];

export default function Journey({ onQuote, onContact }) {
  return (
    <section className="journey journey--professional" id="how-it-works">
      <div className="page-shell journey__hero">
        <div><span>How it works</span><h1>From vehicle details to a confirmed Ford Protect offer.</h1><p>Build a focused coverage request online. Bob Maxey verifies the current Ford-authorized options and price before you decide.</p><button className="button button--primary" type="button" onClick={() => onQuote()}>Start My Request <ArrowRight /></button></div>
        <aside><strong>No purchase commitment</strong><p>Your online selections organize a request. Coverage is not purchased until you review and approve the confirmed offer and agreement.</p></aside>
      </div>

      <div className="page-shell journey-steps" aria-label="Ford Protect request process">
        {steps.map(({ icon: Icon, title, text }, index) => <article key={title}><span>0{index + 1}</span><Icon /><h2>{title}</h2><p>{text}</p></article>)}
      </div>

      <section className="page-shell journey-verification" aria-labelledby="journey-verification-title">
        <div>
          <span>Dealer verification protects the customer</span>
          <h2 id="journey-verification-title">What gets confirmed before an offer is returned.</h2>
          <ul><li><Check /> The VIN and correct Ford enrollment path</li><li><Check /> Available plan, term, mileage and deductible combinations</li><li><Check /> Inspection requirement when applicable</li><li><Check /> Additional-product timing and vehicle eligibility</li><li><Check /> Final price and agreement terms</li></ul>
        </div>
        <details className="journey-payment-note">
          <summary><span><strong>Payment options for eligible plans</strong><small>See how the service payment plan works</small></span><ChevronDown /></summary>
          <div><h3>Interest-free payment choices may be available for eligible plans.</h3><p>Eligible Ford Protect Extended Service Plans may qualify for interest-free financing for up to 30 months. A down payment may apply; the current offer confirms its amount, installments, due dates, method and eligibility. The plan is separate from the vehicle loan.</p></div>
        </details>
      </section>

      <section className="page-shell journey-final-cta">
        <div><small>READY WHEN YOU ARE</small><h2>Build the request. Review the facts. Decide with confidence.</h2></div>
        <button className="button button--primary" type="button" onClick={() => onQuote()}>Check my vehicle <ArrowRight /></button>
        <button type="button" onClick={() => onContact()}>Talk with a specialist</button>
      </section>
    </section>
  );
}
