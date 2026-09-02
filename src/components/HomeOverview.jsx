import { ArrowRight, Check, ClipboardCheck, FileCheck2, ShieldCheck, Wrench } from 'lucide-react';
import { planData } from '../data';
import { assetUrl } from '../paths';

const goals = [
  {
    eyebrow: 'Unexpected repairs',
    title: 'Mechanical protection',
    text: 'Choose from powertrain essentials through Ford Protect’s broadest component coverage.',
    image: '/assets/ford-official/ford-why-plan.png',
    action: 'Compare repair coverage',
    destination: 'compare',
  },
  {
    eyebrow: 'Planned ownership costs',
    title: 'Maintenance coverage',
    text: 'Bundle eligible scheduled service and selected wear items around how you drive.',
    image: '/assets/ford-official/ford-maintenance-wide.png',
    action: 'Explore maintenance',
    destination: 'products',
  },
  {
    eyebrow: 'Everyday vehicle care',
    title: 'Protection beyond repairs',
    text: 'Plan tire, wheel, dent, glass, surface, theft and other eligible protection with your vehicle purchase.',
    image: '/assets/ford-official/triplecare.png',
    action: 'See purchase-day products',
    destination: 'products',
  },
];

const steps = [
  { icon: ClipboardCheck, title: 'Tell us about the vehicle', text: 'VIN, mileage and ownership stage route you to the right path.' },
  { icon: ShieldCheck, title: 'Build a focused request', text: 'Choose only the coverage and products you want reviewed.' },
  { icon: FileCheck2, title: 'Bob Maxey confirms the offer', text: 'We verify Ford eligibility, inspection needs, options and price.' },
];

export default function HomeOverview({ onNavigate, onQuote }) {
  const openGoal = (goal) => {
    if (goal.title === 'Protection beyond repairs') {
      onQuote({ purchaseContext: 'shopping' });
      return;
    }
    onNavigate(goal.destination);
  };

  return (
    <section className="home-overview home-overview--professional">
      <div className="page-shell home-section-heading">
        <span>Choose what matters most</span>
        <h2>Protection built around how you own your Ford.</h2>
        <p>Start with the outcome you want. Full coverage, terms, purchase timing and eligibility stay on the dedicated product page.</p>
      </div>

      <div className="page-shell ownership-goals">
        {goals.map((goal) => (
          <article className="ownership-goal" key={goal.title}>
            <img src={assetUrl(goal.image)} alt="" />
            <div>
              <small>{goal.eyebrow}</small>
              <h3>{goal.title}</h3>
              <p>{goal.text}</p>
              <button type="button" onClick={() => openGoal(goal)}>{goal.action} <ArrowRight /></button>
            </div>
          </article>
        ))}
      </div>

      <section className="coverage-level-band" aria-labelledby="coverage-level-title">
        <div className="page-shell">
          <div className="coverage-level-band__heading">
            <div><small>EXTENDED SERVICE PLAN</small><h2 id="coverage-level-title">Four levels. One clear progression.</h2></div>
            <button type="button" onClick={() => onNavigate('compare')}>Compare every difference <ArrowRight /></button>
          </div>
          <div className="coverage-level-rail">
            {planData.map((plan, index) => (
              <button key={plan.id} type="button" onClick={() => onQuote({ planId: plan.id })}>
                <span>0{index + 1}</span>
                <strong>{plan.name}</strong>
                <small>{plan.label}</small>
                <b>{plan.count} <em>components</em></b>
                <ArrowRight />
              </button>
            ))}
          </div>
          <p className="coverage-level-band__note"><Check /> Final availability, pricing and coverage are confirmed for your VIN before purchase.</p>
        </div>
      </section>

      <section className="page-shell ownership-process" aria-labelledby="ownership-process-title">
        <div className="ownership-process__heading">
          <span>Simple by design</span>
          <h2 id="ownership-process-title">From vehicle details to a confirmed Ford Protect offer.</h2>
          <button className="button button--primary" type="button" onClick={() => onQuote()}>Check My Vehicle <ArrowRight /></button>
        </div>
        <div className="ownership-process__steps">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article key={title}><span>0{index + 1}</span><Icon /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>
    </section>
  );
}
