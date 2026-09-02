import { ArrowRight, Check, CircleAlert, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { evPlanData, planData } from '../data';
import { assetUrl } from '../paths';

const mechanicalRows = [
  { label: 'Coverage approach', values: ['Exclusionary—covered unless excluded', '113 listed components', '84 listed components', '29 listed components'] },
  { label: 'What expands', values: ['The broadest mechanical, electrical and factory-installed technology protection', 'Adds selected high-tech, climate and daily-use systems', 'Adds steering, brakes, suspension, electrical and selected A/C', 'Focuses on engine, transmission and drive axle'] },
  { label: 'High-tech coverage', values: ['Broad factory-installed technology coverage', 'Selected components', 'Not a high-tech plan', 'Not included'] },
  { label: 'Electrical coverage', values: ['Broad', 'Selected', 'Selected', 'Not included'] },
  { label: 'Steering / brakes / suspension', values: ['Broad eligible coverage', 'Listed components', 'Listed components', 'Not included'] },
  { label: 'Climate control', values: ['A/C and heating', 'A/C and heating', 'Selected A/C', 'Not included'] },
  { label: 'Published used-plan range', values: ['1 year / 10,000 miles to 6 years / 75,000 miles', '1 year / 10,000 miles to 6 years / 75,000 miles', '6 months / 6,000 miles to 6 years / 75,000 miles', '6 months / 6,000 miles to 6 years / 75,000 miles'] },
  { label: 'Best fit', values: ['Maximum protection and advanced technology', 'Broad daily-use system protection', 'Practical major-system protection', 'Lowest-scope core powertrain protection'] },
];

const evRows = [
  { label: 'Coverage approach', values: ['PremiumCARE EV + Premium Maintenance EV', 'Broad eligible EV component coverage', '113 listed components', '84 listed components'] },
  { label: 'Drive motors', values: ['Broad eligible coverage', 'Broad eligible coverage', 'Listed components', 'Listed components'] },
  { label: 'Charging / EV electrical', values: ['Broad eligible coverage', 'Broad eligible coverage', 'Selected electrical', 'Selected electrical'] },
  { label: 'High-tech coverage', values: ['Broad', 'Broad', 'Selected', 'Not included'] },
  { label: 'Steering / brakes / suspension', values: ['Broad eligible coverage', 'Broad eligible coverage', 'Listed components', 'Listed components'] },
  { label: 'Scheduled EV maintenance', values: ['Included', 'Not included', 'Not included', 'Not included'] },
  { label: 'Selected wear items', values: ['Included through maintenance plan', 'Not included', 'Not included', 'Not included'] },
  { label: 'Best fit', values: ['One plan for EV repairs and scheduled care', 'Maximum eligible EV component protection', 'Enhanced EV drivability and technology', 'Focused major-system EV protection'] },
];

const commonBenefits = [
  'Ford and Lincoln dealer service support',
  'Roadside assistance',
  'Rental support for eligible covered repairs',
  'Transfer eligibility when the agreement allows',
];

function ComparisonCell({ value }) {
  if (value === true) return <Check aria-label="Included" />;
  if (value === false) return <span className="comparison-dash">—</span>;
  return <span>{value}</span>;
}

export default function PlanExplorer({ onQuote, onOpenProduct }) {
  const [mode, setMode] = useState('mechanical');
  const comparisonPlans = mode === 'mechanical' ? planData : evPlanData;
  const rows = mode === 'mechanical' ? mechanicalRows : evRows;

  return (
    <section className="plan-explorer section" id="plans">
      <div className="page-shell">
        <div className="plan-explorer__heading">
          <div>
            <h1>Compare only what changes from plan to plan.</h1>
            <p>Use this page to see the meaningful coverage differences. Open any plan name for its complete coverage guide, or check your vehicle for the combinations Ford currently makes available.</p>
          </div>
          <img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
        </div>

        <div className="compare-mode" role="tablist" aria-label="Comparison type">
          <button className={mode === 'mechanical' ? 'is-active' : ''} type="button" onClick={() => setMode('mechanical')}>Gas, hybrid & diesel plans</button>
          <button className={mode === 'electric' ? 'is-active' : ''} type="button" onClick={() => setMode('electric')}>Electric-vehicle plans</button>
        </div>

        <section className="comparison-common" aria-labelledby="comparison-common-title">
          <div className="comparison-common__intro">
            <ShieldCheck />
            <div><small>WITH EVERY ELIGIBLE PLAN</small><h2 id="comparison-common-title">Core ownership support stays consistent.</h2></div>
          </div>
          <div className="comparison-common__items">{commonBenefits.map((benefit) => <span key={benefit}><Check /> {benefit}</span>)}</div>
        </section>

        <div className="comparison-wrap" id="compare">
          <div className="comparison-heading">
            <div><h3>{mode === 'electric' ? 'EV' : 'Mechanical'} coverage differences</h3><p>Plan names open the complete on-site coverage guide. Swipe the table horizontally on a phone.</p></div>
            <button type="button" onClick={() => onQuote({ powertrain: mode === 'electric' ? 'Electric' : undefined })}>Check my vehicle <ArrowRight /></button>
          </div>
          <div className="detailed-comparison" role="table" aria-label={`Ford Protect ${mode} plan differences`}>
            <div className="detailed-comparison__row detailed-comparison__head" role="row">
              <div role="columnheader">Decision point</div>
              {comparisonPlans.map((plan) => <button key={plan.id} type="button" role="columnheader" onClick={() => onOpenProduct(plan.id)}><strong>{plan.name}</strong><small>{plan.count} components</small></button>)}
            </div>
            {rows.map((row) => <div className="detailed-comparison__row" role="row" key={row.label}><div role="rowheader">{row.label}</div>{row.values.map((value, index) => <div key={`${row.label}-${comparisonPlans[index].id}`} role="cell"><ComparisonCell value={value} /></div>)}</div>)}
          </div>
          {mode === 'electric' && <p className="comparison-note"><CircleAlert /> The high-voltage battery assembly remains under its separate manufacturer warranty and is not included in these plan comparisons.</p>}
          <p className="comparison-note"><CircleAlert /> Published maximums, deductible choices and used-plan ranges are planning references—not an eligibility promise. VIN, in-service date, mileage, state, use and Ford’s current rules determine the choices returned for a vehicle.</p>
        </div>
      </div>
    </section>
  );
}
