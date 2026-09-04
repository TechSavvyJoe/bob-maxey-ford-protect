import { ArrowRight, BriefcaseBusiness, Check, ClipboardCheck, Gauge, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import { assetUrl } from '../paths';

const ratingInputs = ['VIN', 'Current mileage', 'Original in-service date', 'Registration state', 'Vehicle use', 'Powertrain', 'Snow-plow or upfit status'];

export default function EligibilityHub({ onQuote, onContact }) {
  const [warrantyPath, setWarrantyPath] = useState('within');
  return (
    <section className="eligibility-hub eligibility-hub--professional" id="eligibility">
      <div className="page-shell eligibility-hub__hero">
        <div><span>Vehicle eligibility</span><h1>Check which Ford Protect path fits your vehicle.</h1><p>Your VIN, mileage, warranty status and vehicle use determine the available plans and whether an inspection is needed.</p><button className="button button--primary" type="button" onClick={() => onQuote()}>Check my vehicle <ArrowRight /></button></div>
        <img src={assetUrl('/assets/ford-official/ford-why-1.png')} alt="Ford vehicle from official Ford Protect marketing media" />
      </div>

      <section className="page-shell eligibility-decision" aria-labelledby="eligibility-decision-title">
        <div className="eligibility-decision__heading"><small>EXTENDED SERVICE PLAN INSPECTION</small><h2 id="eligibility-decision-title">Is the vehicle still under the New Vehicle Limited Warranty?</h2></div>
        <div className="eligibility-decision__buttons">
          <button className={warrantyPath === 'within' ? 'is-active' : ''} type="button" aria-pressed={warrantyPath === 'within'} onClick={() => setWarrantyPath('within')}><ShieldCheck /><span><strong>Yes—still under factory warranty</strong><small>Show the in-warranty enrollment path</small></span><ArrowRight /></button>
          <button className={warrantyPath === 'outside' ? 'is-active' : ''} type="button" aria-pressed={warrantyPath === 'outside'} onClick={() => setWarrantyPath('outside')}><Gauge /><span><strong>No—factory warranty has ended</strong><small>Show the out-of-warranty enrollment path</small></span><ArrowRight /></button>
        </div>
        <div className={`eligibility-answer eligibility-answer--${warrantyPath}`} aria-live="polite">
          {warrantyPath === 'within' ? <><ShieldCheck /><div><small>IN-WARRANTY ESP PATH</small><h3>No used-plan inspection when Ford records confirm warranty remains.</h3><p>Ford’s Used Vehicle Inspection Checklist applies when a used-plan ESP vehicle is outside the New Vehicle Limited Warranty. Bob Maxey verifies the VIN and warranty record first.</p></div></> : <><ClipboardCheck /><div><small>OUT-OF-WARRANTY ESP PATH</small><h3>Inspection required if Ford records confirm this path.</h3><p>When Ford records confirm a used-plan ESP vehicle is outside the New Vehicle Limited Warranty, a participating Ford dealership must complete Ford’s Used Vehicle Inspection Checklist before enrollment.</p></div></>}
        </div>
        <p className="eligibility-csp-note"><Check /><span><strong>Continued Service Plan is a separate path:</strong> Ford’s current CSP buyer guide states no enrollment inspection is required.</span></p>
      </section>

      <section className="page-shell eligibility-review" aria-labelledby="eligibility-review-title">
        <div className="eligibility-review__copy">
          <span>What Bob Maxey reviews</span><h2 id="eligibility-review-title">The exact vehicle record—not a generic eligibility guess.</h2>
          <div className="eligibility-review__inputs">{ratingInputs.map((item) => <span key={item}><Check /> {item}</span>)}</div>
        </div>
        <aside className="eligibility-review__special">
          <article><Zap /><div><h3>Electric vehicles</h3><p>EV-specific systems and battery-warranty information route the vehicle to the correct lineup.</p></div></article>
          <article><BriefcaseBusiness /><div><h3>Commercial, plow, upfit or medium duty</h3><p>Vehicle class, use, equipment, mileage and hours require specialist review.</p></div></article>
          <button type="button" onClick={() => onContact()}>Talk with a Bob Maxey Ford Protect specialist <ArrowRight /></button>
        </aside>
      </section>
    </section>
  );
}
