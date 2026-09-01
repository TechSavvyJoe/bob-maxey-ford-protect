import { ArrowRight, BriefcaseBusiness, CarFront, Check, ClipboardCheck, Gauge, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { assetUrl } from '../paths';

const paths = [
  { icon: CarFront, title: 'New or still within factory coverage', text: 'The quote uses the original in-service date, current mileage and Ford warranty record to identify the correct new-plan path.' },
  { icon: Gauge, title: 'Used or higher-mileage vehicle', text: 'Eligible used-plan choices can use different start rules, terms, deductibles and inspection requirements.' },
  { icon: Zap, title: 'Electric vehicle', text: 'Powertrain and battery-warranty information route the vehicle to the EV-specific Ford Protect lineup.' },
  { icon: Sparkles, title: 'Ford Blue Advantage or Lincoln CPO', text: 'Certification records determine whether an upgrade path is available and how it extends included coverage.' },
  { icon: BriefcaseBusiness, title: 'Commercial, snow-plow, upfit or medium duty', text: 'Vehicle class, use, equipment, mileage and hours require dealer review before plan rating.' },
];

const ratingInputs = ['VIN', 'Model year & vehicle', 'Current mileage', 'Original in-service date', 'Registration state', 'Personal or business use', 'Gas, hybrid or electric', 'Snow-plow or upfit status'];

const purchaseSteps = [
  ['1', 'Verify the Ford record', 'VIN, warranty start, mileage, powertrain and vehicle use.'],
  ['2', 'Return eligible products', 'Only the plans, terms and deductibles available for that vehicle.'],
  ['3', 'Show the real agreement', 'Coverage, exclusions, benefits, cancellation and transfer terms.'],
  ['4', 'Select payment', 'Pay in full or use an eligible Ford Protect installment option when available.'],
  ['5', 'Complete Ford enrollment', 'Bob Maxey submits and confirms the issued contract in the authorized Ford process.'],
];

export default function EligibilityHub({ onQuote, onContact }) {
  return (
    <section className="eligibility-hub section" id="eligibility">
      <div className="page-shell eligibility-hub__heading">
        <div><h1>Know your eligibility path<br />before you compare price.</h1><p>Ford Protect rating is vehicle-specific. The site should identify the right contract path before it shows a term, deductible or final price.</p></div>
        <img src={assetUrl('/assets/ford-official/ford-why-1.png')} alt="Ford F-150 Lightning from official Ford Protect marketing media" />
      </div>

      <div className="page-shell eligibility-hub__grid">
        <div className="eligibility-paths">
          <h3>Vehicle pathways</h3>
          {paths.map(({ icon: Icon, title, text }) => <article key={title}><Icon /><div><h4>{title}</h4><p>{text}</p></div></article>)}
        </div>
        <aside className="rating-inputs">
          <ClipboardCheck />
          <h3>What the quote needs</h3>
          <p>These inputs prevent the wrong plan or price from being presented.</p>
          <div>{ratingInputs.map((item) => <span key={item}><Check /> {item}</span>)}</div>
          <button className="button button--primary button--full" type="button" onClick={() => onQuote()}>Check my vehicle <ArrowRight /></button>
          <button className="rating-inputs__link" type="button" onClick={() => onContact()}>I have a specialty vehicle</button>
        </aside>
      </div>

      <div className="page-shell purchase-path">
        <div className="purchase-path__heading"><ShieldCheck /><div><h3>From quote to an issued Ford Protect contract</h3><p>A complete purchase experience should make each status unmistakable.</p></div></div>
        <div className="purchase-path__steps">{purchaseSteps.map(([number, title, text]) => <article key={number}><span>{number}</span><h4>{title}</h4><p>{text}</p></article>)}</div>
        <p className="purchase-path__note">This site prepares the complete selection, proposal and CRM-ready request. Live Ford eligibility and rating, secure payment, contract enrollment and final DealerMail delivery remain dealership-system integrations.</p>
      </div>
    </section>
  );
}
