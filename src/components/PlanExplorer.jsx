import { ArrowRight, Check, CircleAlert, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { evPlanData, planData } from '../data';
import { assetUrl } from '../paths';

const mechanicalRows = [
  { label: 'Coverage approach', values: ['Exclusionary—covered unless excluded', '113 listed components', '84 listed components', '29 listed components'] },
  { label: 'What expands', values: ['Broadest mechanical, electrical and factory-installed technology coverage', 'Selected high-tech, climate and daily-use systems', 'Steering, brakes, suspension, electrical and selected A/C', 'Engine, transmission and drive axle'] },
  { label: 'High-tech', values: ['Broad factory-installed technology coverage', 'Selected components', 'Not included as a high-tech category', 'Not included'] },
  { label: 'Electrical', values: ['Broad eligible coverage', 'Selected components', 'Selected components', 'Not included'] },
  { label: 'Steering, brakes & suspension', values: ['Broad eligible coverage', 'Listed components', 'Listed components', 'Not included'] },
  { label: 'Climate control', values: ['A/C and heating', 'A/C and heating', 'Selected A/C components', 'Not included'] },
  { label: 'Best for', values: ['Maximum protection and advanced technology', 'Broad daily-use system protection', 'Practical major-system protection', 'Core powertrain protection'] },
];

const evRows = [
  { label: 'Coverage structure', values: ['PremiumCARE EV plus scheduled maintenance', '1,000+ eligible EV components', '113 listed EV components', '84 listed EV components'] },
  { label: 'Drive motors', values: ['Included where eligible', 'Included where eligible', 'Selected components', 'Selected components'] },
  { label: 'Charging & electrical', values: ['Broad eligible electrical systems', 'Broad eligible electrical systems', 'Selected electrical components', 'Selected electrical components'] },
  { label: 'Factory-installed technology', values: ['Broad eligible coverage', 'Broad eligible coverage', 'Not listed as a category', 'Not listed as a category'] },
  { label: 'Steering, brakes & suspension', values: ['Broad eligible coverage', 'Broad eligible coverage', 'Selected components', 'Selected components'] },
  { label: 'Climate control', values: ['Included where eligible', 'Included where eligible', 'Selected components', 'Not listed as a category'] },
  { label: 'Scheduled EV maintenance', values: ['Included', 'Not included', 'Not included', 'Not included'] },
  { label: 'Best for', values: ['EV repair coverage plus scheduled care', 'Maximum eligible EV component protection', 'Enhanced EV drivability and technology', 'Focused major-system EV protection'] },
];

export default function PlanExplorer({ onQuote, onOpenProduct }) {
  const [mode, setMode] = useState('mechanical');
  const [leftId, setLeftId] = useState('premium');
  const [rightId, setRightId] = useState('extra');
  const plans = mode === 'mechanical' ? planData : evPlanData;
  const rows = mode === 'mechanical' ? mechanicalRows : evRows;

  const selection = useMemo(() => {
    const fallbackLeft = plans[0];
    const fallbackRight = plans[1] || plans[0];
    return [plans.find((plan) => plan.id === leftId) || fallbackLeft, plans.find((plan) => plan.id === rightId) || fallbackRight];
  }, [plans, leftId, rightId]);

  const switchMode = (next) => {
    setMode(next);
    const nextPlans = next === 'mechanical' ? planData : evPlanData;
    setLeftId(nextPlans[0].id);
    setRightId(nextPlans[1].id);
  };

  return (
    <section className="plan-explorer plan-explorer--professional" id="plans">
      <div className="page-shell plan-explorer__heading">
        <div><span>Ford Protect plan comparison</span><h1>Compare Ford Protect plans.</h1><p>Review coverage structure, component counts and key system differences before Bob Maxey confirms the plan available for your VIN.</p></div>
        <img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
      </div>

      <div className="page-shell compare-toolbar">
        <div className="compare-mode" role="group" aria-label="Comparison type">
          <button className={mode === 'mechanical' ? 'is-active' : ''} aria-pressed={mode === 'mechanical'} type="button" onClick={() => switchMode('mechanical')}>Gas, hybrid & diesel</button>
          <button className={mode === 'electric' ? 'is-active' : ''} aria-pressed={mode === 'electric'} type="button" onClick={() => switchMode('electric')}>Electric vehicles</button>
        </div>
        <button className="button button--primary" type="button" onClick={() => onQuote({ powertrain: mode === 'electric' ? 'Electric' : undefined })}>Check my vehicle <ArrowRight /></button>
      </div>

      <section className="page-shell comparison-common" aria-label="Shared Ford Protect support">
        <ShieldCheck /><strong>Every eligible plan includes Ford-backed support.</strong>
        <span><Check /> Ford and Lincoln dealer service</span>
        <span><Check /> Roadside and rental benefits where included</span>
        <span><Check /> Transfer provisions where the agreement allows</span>
      </section>

      <div className="page-shell comparison-wrap">
        <div className="comparison-heading"><div><h2>{mode === 'electric' ? 'Compare EV plan coverage' : 'Compare mechanical plan coverage'}</h2><p>Select a plan name to open its complete on-site coverage guide.</p></div></div>

        <div className="detailed-comparison detailed-comparison--desktop" role="table" aria-label={`Ford Protect ${mode} plan differences`}>
          <div className="detailed-comparison__row detailed-comparison__head" role="row">
            <div role="columnheader">Coverage area</div>
            {plans.map((plan) => <div key={plan.id} role="columnheader"><button type="button" aria-label={`View ${plan.name} details`} onClick={() => onOpenProduct(plan.id)}><strong>{plan.name}</strong><small>{plan.count} components</small><span>View plan details <ArrowRight /></span></button></div>)}
          </div>
          {rows.map((row) => <div className="detailed-comparison__row" role="row" key={row.label}><div role="rowheader">{row.label}</div>{row.values.map((value, index) => <div key={`${row.label}-${plans[index].id}`} role="cell">{value}</div>)}</div>)}
        </div>

        <div className="mobile-comparison" aria-label="Compare two plans">
          <div className="mobile-comparison__selectors">
            <label><span>Plan A</span><select value={selection[0].id} onChange={(event) => setLeftId(event.target.value)}>{plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name}</option>)}</select></label>
            <label><span>Plan B</span><select value={selection[1].id} onChange={(event) => setRightId(event.target.value)}>{plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name}</option>)}</select></label>
          </div>
          <div className="mobile-comparison__rows">
            {rows.map((row) => {
              const leftIndex = plans.findIndex((plan) => plan.id === selection[0].id);
              const rightIndex = plans.findIndex((plan) => plan.id === selection[1].id);
              return <article key={row.label}><h3>{row.label}</h3><div><span>{selection[0].name}</span><p>{row.values[leftIndex]}</p></div><div><span>{selection[1].name}</span><p>{row.values[rightIndex]}</p></div></article>;
            })}
          </div>
          <div className="mobile-comparison__actions"><button type="button" onClick={() => onOpenProduct(selection[0].id)}>See {selection[0].name} details</button><button type="button" onClick={() => onOpenProduct(selection[1].id)}>See {selection[1].name} details</button></div>
        </div>

        {mode === 'electric' && <p className="comparison-note"><CircleAlert /> The high-voltage traction-battery assembly has its own 8-year/100,000-mile manufacturer warranty and is not eligible for Ford Protect Extended Service Plan coverage. Ford warranty records and the issued agreement control the vehicle-specific result.</p>}
        <p className="comparison-note"><CircleAlert /> We’ll confirm the plans and terms available for your VIN before you choose.</p>
      </div>
    </section>
  );
}
