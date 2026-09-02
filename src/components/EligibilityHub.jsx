import { ArrowRight, BriefcaseBusiness, Check, ClipboardCheck, Gauge, ShieldCheck, Zap } from 'lucide-react';
import { assetUrl } from '../paths';

const specialProfiles = [
  { icon: Zap, title: 'Electric vehicle', text: 'Powertrain and battery-warranty information route the vehicle to the EV-specific Ford Protect lineup.' },
  { icon: BriefcaseBusiness, title: 'Commercial, snow-plow, upfit or medium duty', text: 'Vehicle class, use, equipment, mileage and hours require dealer review before plan rating.' },
];

const ratingInputs = ['VIN', 'Model year & vehicle', 'Current mileage', 'Original in-service date', 'Registration state', 'Personal or business use', 'Gas, hybrid or electric', 'Snow-plow or upfit status'];

export default function EligibilityHub({ onQuote, onContact, onNavigate }) {
  return (
    <section className="eligibility-hub section" id="eligibility">
      <div className="page-shell eligibility-hub__heading">
        <div><h1>Know the vehicle’s eligibility path before choosing a plan.</h1><p>Ford Protect eligibility starts with the vehicle record. Warranty status determines the inspection path; VIN, mileage, in-service date, state and use determine the products and combinations Bob Maxey can confirm.</p></div>
        <img src={assetUrl('/assets/ford-official/ford-why-1.png')} alt="Ford F-150 Lightning from official Ford Protect marketing media" />
      </div>

      <section className="page-shell inspection-decision" aria-labelledby="inspection-decision-title">
        <div className="inspection-decision__heading"><ClipboardCheck /><div><small>INSPECTION DECISION</small><h2 id="inspection-decision-title">Factory-warranty status sets the next step.</h2></div></div>
        <div className="inspection-decision__grid">
          <article className="is-covered"><ShieldCheck /><div><small>WITHIN THE NEW VEHICLE LIMITED WARRANTY</small><h3>No used-vehicle inspection is required.</h3><p>For an eligible ESP used-plan enrollment completed while the vehicle remains within the New Vehicle Limited Warranty, no used-vehicle inspection is required. Ford records still confirm final eligibility.</p></div></article>
          <article className="is-inspection"><Gauge /><div><small>OUTSIDE FACTORY WARRANTY</small><h3>A dealership inspection is required first.</h3><p>Before an eligible Ford Protect sale can be completed, a participating dealership must inspect the vehicle and confirm it meets the current program requirements.</p></div></article>
        </div>
      </section>

      <div className="page-shell eligibility-hub__grid">
        <div className="eligibility-paths">
          <h3>Profiles that need added review</h3>
          {specialProfiles.map(({ icon: Icon, title, text }) => <article key={title}><Icon /><div><h4>{title}</h4><p>{text}</p></div></article>)}
          <div className="eligibility-paths__links">
            <button type="button" onClick={() => onNavigate?.('products')}>Review product details <ArrowRight /></button>
            <button type="button" onClick={() => onNavigate?.('how-it-works')}>See how the process works <ArrowRight /></button>
          </div>
        </div>
        <aside className="rating-inputs">
          <ClipboardCheck />
          <h3>What the quote needs</h3>
          <p>These details help prevent an ineligible plan, term or deductible from being presented as available.</p>
          <div>{ratingInputs.map((item) => <span key={item}><Check /> {item}</span>)}</div>
          <button className="button button--primary button--full" type="button" onClick={() => onQuote()}>Check my vehicle <ArrowRight /></button>
          <button className="rating-inputs__link" type="button" onClick={() => onContact()}>I have a specialty vehicle</button>
        </aside>
      </div>
    </section>
  );
}
