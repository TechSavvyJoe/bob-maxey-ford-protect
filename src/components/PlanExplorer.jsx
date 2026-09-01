import { ArrowRight, Check, CircleAlert, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { evPlanData, planData } from '../data';
import { productDetails } from '../productDetails';
import { assetUrl } from '../paths';

const sharedBenefits = 'Roadside, rental, Ford/Lincoln dealer support, transfer eligibility';

const mechanicalRows = [
  { label: 'Coverage model', values: ['Exclusionary—covered unless excluded', '113 listed components', '84 listed components', '29 listed components'] },
  { label: 'Core systems', values: ['Engine, transmission, axle, steering, brakes, suspension, electrical, climate and more', 'Powertrain + BaseCARE + selected high-tech and climate', 'Powertrain + steering, brakes, suspension, electrical and A/C', 'Engine, transmission and drive axle'] },
  { label: 'High-tech coverage', values: ['Broad factory-installed technology coverage', 'Selected components', 'Not a high-tech plan', 'Not included'] },
  { label: 'Factory turbo / supercharger', values: [true, true, true, true] },
  { label: 'Electrical coverage', values: ['Broad', 'Selected', 'Selected', 'Not included'] },
  { label: 'Steering / brakes / suspension', values: ['Broad eligible coverage', 'Listed components', 'Listed components', 'Not included'] },
  { label: 'Climate control', values: ['A/C and heating', 'A/C and heating', 'Selected A/C', 'Not included'] },
  { label: 'Published maximum', values: ['Up to 10 years / 175,000 miles', 'Up to 10 years / 175,000 miles', 'Up to 10 years / 175,000 miles', 'Up to 10 years / 175,000 miles'] },
  { label: 'Used-plan path', values: ['1 year / 10,000 miles to 6 years / 75,000 miles in published material', '1 year / 10,000 miles to 6 years / 75,000 miles in published material', '6 months / 6,000 miles to 6 years / 75,000 miles in published material', '6 months / 6,000 miles to 6 years / 75,000 miles in published material'] },
  { label: 'Published deductible choices', values: ['$100 standard; eligible $0, $50, $200 or disappearing', '$100 standard; eligible $0, $50, $200 or disappearing', '$100 standard; eligible $0, $50, $200 or disappearing', '$100 standard; eligible $0, $50, $200 or disappearing'] },
  { label: 'Ownership benefits', values: [sharedBenefits, sharedBenefits, sharedBenefits, sharedBenefits] },
  { label: 'Best fit', values: ['Maximum protection and advanced technology', 'Broad daily-use system protection', 'Practical major-system protection', 'Lowest-scope core powertrain protection'] },
];

const evRows = [
  { label: 'Coverage model', values: ['PremiumCARE EV + Premium Maintenance EV', 'Broad eligible EV component coverage', '113 listed components', '84 listed components'] },
  { label: 'Drive motors', values: ['Broad eligible coverage', 'Broad eligible coverage', 'Listed components', 'Listed components'] },
  { label: 'Charging / EV electrical', values: ['Broad eligible coverage', 'Broad eligible coverage', 'Selected electrical', 'Selected electrical'] },
  { label: 'High-tech coverage', values: ['Broad', 'Broad', 'Selected', 'Not included'] },
  { label: 'Steering / brakes / suspension', values: ['Broad eligible coverage', 'Broad eligible coverage', 'Listed components', 'Listed components'] },
  { label: 'Scheduled EV maintenance', values: ['Included', 'Not included', 'Not included', 'Not included'] },
  { label: 'Selected wear items', values: ['Included through maintenance plan', 'Not included', 'Not included', 'Not included'] },
  { label: 'High-voltage battery assembly', values: ['Not covered—separate manufacturer warranty', 'Not covered—separate manufacturer warranty', 'Not covered—separate manufacturer warranty', 'Not covered—separate manufacturer warranty'] },
  { label: 'Published maximum', values: ['Up to 10 years / 150,000 miles', 'Up to 10 years / 150,000 miles', 'Up to 10 years / 150,000 miles', 'Up to 10 years / 150,000 miles'] },
  { label: 'Published deductible choices', values: ['$100 standard; eligible $0, $50, $200 or disappearing', '$100 standard; eligible $0, $50, $200 or disappearing', '$100 standard; eligible $0, $50, $200 or disappearing', '$100 standard; eligible $0, $50, $200 or disappearing'] },
  { label: 'Ownership benefits', values: [sharedBenefits, sharedBenefits, sharedBenefits, sharedBenefits] },
  { label: 'Best fit', values: ['One plan for EV repairs and scheduled care', 'Maximum eligible EV component protection', 'Enhanced EV drivability and technology', 'Focused major-system EV protection'] },
];

const otherProductIds = ['premium-maintenance', 'premium-maintenance-ev', 'continued-service', 'fba-upgrade', 'lincoln-cpo', 'commercial', 'incomplete', 'medium-duty'];

function ComparisonCell({ value }) {
  if (value === true) return <Check aria-label="Included" />;
  if (value === false) return <span className="comparison-dash">—</span>;
  return <span>{value}</span>;
}

export default function PlanExplorer({ onQuote, onOpenProduct }) {
  const [activePlan, setActivePlan] = useState(planData[0]);
  const [mode, setMode] = useState('mechanical');
  const comparisonPlans = mode === 'mechanical' ? planData : evPlanData;
  const rows = mode === 'mechanical' ? mechanicalRows : evRows;
  const activeDetail = productDetails[activePlan.id];
  const otherProducts = useMemo(() => otherProductIds.map((id) => productDetails[id]), []);

  const selectMode = (next) => {
    setMode(next);
    setActivePlan(next === 'mechanical' ? planData[0] : evPlanData[0]);
  };

  return (
    <section className="plan-explorer section" id="plans">
      <div className="page-shell">
        <div className="plan-explorer__heading">
          <div><h1>Compare protection without the guesswork.</h1><p>See coverage structure, systems, terms, deductibles, ownership benefits and purchase timing before you choose a plan.</p></div>
          <img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
        </div>

        <div className="compare-mode" role="tablist" aria-label="Comparison type">
          <button className={mode === 'mechanical' ? 'is-active' : ''} type="button" onClick={() => selectMode('mechanical')}>Gas, hybrid & diesel plans</button>
          <button className={mode === 'electric' ? 'is-active' : ''} type="button" onClick={() => selectMode('electric')}>Electric-vehicle plans</button>
        </div>

        <div className="plan-feature">
          <div className="plan-feature__nav" role="tablist" aria-label="Ford Protect plans">
            {comparisonPlans.map((plan) => (
              <button key={plan.id} className={activePlan.id === plan.id ? 'is-active' : ''} type="button" role="tab" aria-selected={activePlan.id === plan.id} onClick={() => setActivePlan(plan)}>
                <span><strong>{plan.name}</strong><small>{plan.label}</small></span><span><strong>{plan.count}</strong><small>components</small></span><ArrowRight />
              </button>
            ))}
          </div>

          <div className="plan-feature__detail" key={activePlan.id}>
            <div className="plan-feature__copy">
              <p className="product-type">{mode === 'electric' ? 'Ford Protect EV Extended Service Plan' : 'Ford Protect Extended Service Plan'}</p>
              <h3>{activePlan.name}</h3>
              <div className="plan-feature__count"><strong>{activePlan.count}</strong><span>covered<br />components</span></div>
              <p className="plan-feature__best"><strong>Best for:</strong> {activePlan.bestFor}</p>
              <p>{activePlan.description}</p>
              <div className="plan-feature__systems">{activePlan.groups.map((group) => <span key={group}><Check /> {group}</span>)}</div>
              <div className="plan-feature__actions">
                <button className="button button--primary" type="button" onClick={() => onQuote({ planId: activePlan.id, powertrain: mode === 'electric' ? 'Electric' : undefined })}>Build a {activePlan.name} quote <ArrowRight /></button>
                <button className="button button--outline" type="button" onClick={() => onOpenProduct(activePlan.id)}>Full plan details</button>
              </div>
            </div>
            <div className="plan-feature__media"><img src={assetUrl(activeDetail?.image || '/assets/ford-official/ford-why-plan.png')} alt="Official Ford Protect marketing media" /><span>Official Ford Protect marketing media</span></div>
          </div>

          <div className="plan-feature__examples"><strong>Examples shown in Ford component information</strong><div>{(activePlan.examples || activeDetail?.coverageGroups.flatMap((group) => group.items).slice(0, 5) || []).map((example) => <span key={example}><ShieldCheck /> {example}</span>)}</div></div>
        </div>

        <div className="comparison-wrap" id="compare">
          <div className="comparison-heading"><div><h3>Detailed {mode === 'electric' ? 'EV' : 'mechanical'} plan comparison</h3><p>Swipe horizontally on a phone. Select a plan name to open the full internal coverage guide.</p></div><button type="button" onClick={() => onQuote({ powertrain: mode === 'electric' ? 'Electric' : undefined })}>Check my vehicle <ArrowRight /></button></div>
          <div className="detailed-comparison" role="table" aria-label={`Detailed Ford Protect ${mode} plan comparison`}>
            <div className="detailed-comparison__row detailed-comparison__head" role="row"><div role="columnheader">Decision point</div>{comparisonPlans.map((plan) => <button key={plan.id} type="button" role="columnheader" onClick={() => onOpenProduct(plan.id)}><strong>{plan.name}</strong><small>{plan.count} components</small></button>)}</div>
            {rows.map((row) => <div className="detailed-comparison__row" role="row" key={row.label}><div role="rowheader">{row.label}</div>{row.values.map((value, index) => <div key={`${row.label}-${comparisonPlans[index].id}`} role="cell"><ComparisonCell value={value} /></div>)}</div>)}
          </div>
          <p className="comparison-note"><CircleAlert /> Published maximums and brochure choices are not an eligibility promise. VIN, in-service date, mileage, state, use and Ford’s current rules determine the choices returned for a vehicle.</p>
        </div>

        <section className="other-products-compare">
          <div className="other-products-compare__heading"><h2>Other after-sale Ford Protect paths</h2><p>These products are included because they may be relevant after the original vehicle sale or require a Ford record-level review. GAP, LeaseCARE, RentalCARE and vehicle-care products sold only at the original sale are outside this site’s sales scope.</p></div>
          <div className="other-products-table" role="table" aria-label="Other Ford Protect products">
            <div className="other-products-table__head" role="row"><div>Product</div><div>What it does</div><div>When it applies</div><div>Next step</div></div>
            {otherProducts.map((detail) => <div role="row" key={detail.id}><div><strong>{detail.name}</strong><small>{detail.family}</small></div><div>{detail.tagline}</div><div>{detail.eligibility[0]}</div><div><button type="button" onClick={() => onOpenProduct(detail.id)}>View details <ArrowRight /></button></div></div>)}
          </div>
        </section>
      </div>
    </section>
  );
}
