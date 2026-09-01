import { ArrowRight, Check, FileText, MessageCircleQuestion, Printer, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { afterSaleProductCategories, comparisonRows, faqItems, mechanicalCoverageDetails, planData } from '../data';

const libraryCards = [
  ['mechanical', 'Extended service plans', 'Compare the four mechanical coverage levels here.'],
  ['electric', 'Electric vehicle coverage', 'See EV coverage paths and maintenance information here.'],
  ['maintenance', 'Maintenance plans', 'Review scheduled service and wear-item highlights here.'],
  ['specialty', 'Certified & commercial', 'Review dealer-assisted eligibility paths here.'],
  ['agreement', 'Agreement & exclusions', 'Request the exact agreement before purchase.'],
];

const resourceTabs = [
  ['overview', 'Start here'],
  ['compare', 'Compare plans'],
  ['coverage', 'Coverage explorer'],
  ['payment', 'Payment plan'],
  ['guides', 'Guides & FAQs'],
];

const planDifferences = {
  premium: 'The broadest option. It includes the major mechanical systems plus high-tech, audio and safety-system categories shown below.',
  extra: 'A step down from PremiumCARE: it keeps the major systems and selected high-tech components, but does not include the audio and safety-system category in this overview.',
  base: 'Focused on the major systems. It keeps engine, transmission, drive axle, steering, brakes, front suspension, electrical and climate-control categories, but not high-tech or audio and safety categories in this overview.',
  powertrain: 'The core option. It is centered on the engine, transmission and drive axle; steering, brakes, climate, electrical and high-tech categories are not included in this overview.',
};

const findProduct = (guideId) => afterSaleProductCategories.flatMap((category) => category.products.map((product) => ({ ...product, category }))).find((product) => product.id === guideId);

export default function FaqSection({ onQuote, onContact, onOpenProduct }) {
  const requestedGuide = new URLSearchParams(window.location.search).get('guide');
  const requestedProduct = findProduct(requestedGuide);
  const [activeGuide, setActiveGuide] = useState(requestedProduct ? requestedProduct.category.id : 'mechanical');
  const [activeProductId, setActiveProductId] = useState(requestedProduct?.id ?? afterSaleProductCategories[0].products[0].id);
  const [activeSystemId, setActiveSystemId] = useState(mechanicalCoverageDetails[0].id);
  const [resourceView, setResourceView] = useState(requestedProduct ? 'guides' : 'overview');
  const [planPrice, setPlanPrice] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('18');
  const category = afterSaleProductCategories.find((item) => item.id === activeGuide) ?? afterSaleProductCategories[0];
  const product = category.products.find((item) => item.id === activeProductId) ?? category.products[0];
  const activeSystem = mechanicalCoverageDetails.find((system) => system.id === activeSystemId) ?? mechanicalCoverageDetails[0];
  const numericPrice = Number(planPrice);
  const paymentTermMonths = Number(paymentTerm);
  const downPayment = numericPrice > 0 ? numericPrice * 0.2 : 0;
  const estimatedPayment = numericPrice > 0 ? ((numericPrice - downPayment) / paymentTermMonths).toFixed(2) : '';

  const chooseGuide = (guide) => {
    if (guide === 'agreement') {
      onContact();
      return;
    }
    const nextCategory = afterSaleProductCategories.find((item) => item.id === guide) ?? afterSaleProductCategories[0];
    setActiveGuide(nextCategory.id);
    setActiveProductId(nextCategory.products[0].id);
    setResourceView('guides');
  };

  const startQuote = () => {
    if (category.id === 'mechanical') onQuote({ planId: product.id });
    else if (category.id === 'electric') onQuote({ planId: product.id, powertrain: 'Electric' });
    else onContact();
  };

  return (
    <section className="faq-section section" id="faq">
      <div className="page-shell document-center" id="documents">
        <div className="document-center__heading"><div><h1>Ford Protect resources, right here.</h1><p>Coverage guides, product highlights and plan comparisons stay on the Bob Maxey site. We do not send customers to a separate pricing site.</p></div><FileText /></div>
        <div className="resource-view-nav" role="tablist" aria-label="Resource topics">
          {resourceTabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={resourceView === id} className={resourceView === id ? 'is-active' : ''} onClick={() => setResourceView(id)}>{label}</button>)}
        </div>
      </div>

      {resourceView === 'compare' && <>
      <div className="page-shell plan-differences" aria-labelledby="plan-differences-title">
        <div className="plan-differences__heading"><div><span>Mechanical coverage comparison</span><h2 id="plan-differences-title">The major difference between each plan.</h2><p>Start with the systems you want protected. Each lower plan narrows the list; this makes the tradeoff easy to see before you request a price.</p></div><button type="button" onClick={() => onQuote()}>Check my vehicle <ArrowRight /></button></div>
        <div className="plan-differences__grid">
          {planData.map((plan) => {
            const coveredSystems = comparisonRows.filter((_, index) => plan.features[index]);
            return <article key={plan.id} className={`plan-differences__card plan-differences__card--${plan.id}`}>
              <div className="plan-differences__card-head"><div><h3>{plan.name}</h3><span>{plan.label}</span></div><strong>{plan.count}<small>components</small></strong></div>
              <p>{planDifferences[plan.id]}</p>
              <div><b>Major categories shown</b>{coveredSystems.map((system) => <span key={system}><Check /> {system}</span>)}</div>
              <button type="button" onClick={() => onOpenProduct(plan.id)}>Open {plan.name} guide <ArrowRight /></button>
            </article>;
          })}
        </div>
        <p className="plan-differences__notice">These are high-level category comparisons, not a complete component list. Specific covered parts, exclusions, limits, eligibility and final terms are in the Ford Protect agreement issued for your vehicle.</p>
      </div>
      </>}

      {resourceView === 'coverage' && <>
      <section className="page-shell coverage-explorer" aria-labelledby="coverage-explorer-title">
        <div className="coverage-explorer__heading"><div><span>Detailed mechanical coverage explorer</span><h2 id="coverage-explorer-title">See what changes from plan to plan.</h2><p>Choose a vehicle system to see the named component examples Ford publishes for each level. The plan cards explain what you gain as you move up.</p></div><div className="coverage-explorer__key"><span><i className="is-covered" /> Covered category</span><span><i /> Not listed at this level</span></div></div>
        <div className="coverage-explorer__systems" role="tablist" aria-label="Mechanical coverage systems">
          {mechanicalCoverageDetails.map((system) => <button key={system.id} type="button" role="tab" aria-selected={activeSystem.id === system.id} className={activeSystem.id === system.id ? 'is-active' : ''} onClick={() => setActiveSystemId(system.id)}>{system.title}</button>)}
        </div>
        <article className="coverage-explorer__detail" key={activeSystem.id}>
          <header><span>Selected system</span><h3>{activeSystem.title}</h3><p>{activeSystem.intro}</p></header>
          <div className="coverage-explorer__plans">
            {planData.map((plan) => {
              const detail = activeSystem.plans[plan.id];
              return <article key={plan.id} className={detail.covered ? 'is-covered' : 'is-not-covered'}><div className="coverage-explorer__plan-head"><div><h4>{plan.name}</h4><span>{detail.covered ? 'Covered category' : 'Not listed at this level'}</span></div><strong>{plan.count}<small>components</small></strong></div><p>{detail.summary}</p>{detail.examples.length > 0 && <ul>{detail.examples.map((example) => <li key={example}><Check /> {example}</li>)}</ul>}</article>;
            })}
          </div>
          <footer><strong>How to read this:</strong> The examples help explain the difference between levels, but they are not a complete list of covered parts. A covered failure, vehicle eligibility, deductible, exclusions and the final Ford Protect agreement control coverage.</footer>
        </article>
      </section>
      </>}

      {resourceView === 'overview' && <>
      <section className="page-shell coverage-basics" aria-labelledby="coverage-basics-title">
        <div className="coverage-basics__heading"><div><span>What comes with an eligible plan</span><h2 id="coverage-basics-title">Coverage is more than the component list.</h2><p>Ford Protect materials also describe benefits that help when a covered repair interrupts your drive. Final availability and limits depend on the agreement selected for your vehicle.</p></div></div>
        <div className="coverage-basics__grid">
          <article><ShieldCheck /><h3>Covered repair support</h3><p>Eligible repairs include covered parts and labor. Ford describes coverage for failures from defects in materials or workmanship, including normal wear and tear where covered by the agreement.</p></article>
          <article><MessageCircleQuestion /><h3>24-hour roadside help</h3><p>Current Ford materials list tire-change, lockout, out-of-fuel and battery jump-start help, plus towing and eligible travel assistance benefits.</p></article>
          <article><FileText /><h3>Rental assistance</h3><p>Ford’s current Extended Service Plan materials describe up to $60 per day for up to 10 days when a vehicle is kept overnight for an eligible covered repair.</p></article>
          <article><Check /><h3>Ford dealer service</h3><p>Covered repairs are supported at Ford and Lincoln dealers in the U.S., Canada and Mexico, using Ford-authorized parts and factory-trained technicians.</p></article>
        </div>
        <div className="coverage-basics__limits"><strong>Important exclusions to understand</strong><p>Routine maintenance, cosmetic damage, wear items, tires, glass and repairs caused by lack of required maintenance are generally not included unless a specific product or option says otherwise. The signed agreement controls every covered item and exclusion.</p></div>
      </section>
      </>}

      {resourceView === 'payment' && <>
      <section className="page-shell payment-plan" aria-labelledby="payment-plan-title">
        <div className="payment-plan__copy"><span>Budco service payment plan</span><h2 id="payment-plan-title">Put 20% down, then spread the rest out.</h2><p>Choose a Ford Protect plan with Bob Maxey, make a 20% down payment, and set up the remaining balance through the Budco service payment plan instead of paying the full plan price at once.</p><ul><li>The payment plan is separate from your vehicle loan and is designed for eligible Ford Protect service-plan purchases.</li><li>The first scheduled installment is typically due about 20 days after the contract is activated; later payments are due on the same day each month.</li><li>The final schedule, eligibility, available term, payment method and any program terms are confirmed by Bob Maxey and Budco before you enroll.</li></ul><button className="button button--primary" type="button" onClick={() => onQuote({ planId: category.id === 'mechanical' ? product.id : undefined, powertrain: category.id === 'electric' ? 'Electric' : undefined })}>Build my payment quote <ArrowRight /></button></div>
        <div className="payment-plan__calculator" aria-label="Budco service payment plan estimate"><div className="payment-plan__calculator-heading"><h3>Quick payment estimate</h3><p>Enter the price Bob Maxey gives you. This is an even-payment example, not a final Budco payment offer.</p></div><label>Plan price from Bob Maxey<input type="number" min="1" inputMode="decimal" value={planPrice} onChange={(event) => setPlanPrice(event.target.value)} placeholder="Example: 1495" /></label><div className="payment-plan__fields"><label>Down payment<input value={numericPrice > 0 ? `$${downPayment.toFixed(2)} (20%)` : '20% of plan price'} readOnly aria-label="20 percent down payment" /></label><label>Payment period<select value={paymentTerm} onChange={(event) => setPaymentTerm(event.target.value)}><option value="6">6 months</option><option value="12">12 months</option><option value="18">18 months</option><option value="24">24 months</option><option value="30">30 months</option></select></label></div><div className="payment-plan__result"><span>Estimated scheduled payment</span><strong>{estimatedPayment ? `$${estimatedPayment}` : '—'}<small>per month for {paymentTermMonths} months</small></strong><p>{estimatedPayment ? `Estimated using $${downPayment.toFixed(2)} down (20%) plus equal installments. Taxes, plan eligibility and final Budco program terms can change the amount.` : 'Enter the confirmed plan price to see the 20% down payment and estimated monthly balance.'}</p></div></div>
      </section>
      </>}

      {resourceView === 'guides' && <>
      <div className="page-shell document-center__list resource-guide-list">
        {libraryCards.map(([guide, title, text]) => (
          <button key={guide} type="button" onClick={() => chooseGuide(guide)}><FileText /><span><strong>{title}</strong><small>{text}</small></span><ArrowRight /></button>
        ))}
      </div>
      <div className="page-shell onsite-guide" aria-labelledby="onsite-guide-title">
        <div className="onsite-guide__header"><div><span>On-site coverage guide</span><h2 id="onsite-guide-title">{category.title}</h2><p>{category.intro}</p></div><button type="button" className="onsite-guide__print" onClick={() => window.print()}><Printer /> Print this guide</button></div>
        <div className="onsite-guide__tabs" role="tablist" aria-label={`${category.label} coverage guides`}>
          {category.products.map((item) => <button key={item.id} type="button" role="tab" aria-selected={product.id === item.id} className={product.id === item.id ? 'is-active' : ''} onClick={() => setActiveProductId(item.id)}>{item.name}</button>)}
        </div>
        <article className="onsite-guide__body" key={product.id}>
          <div>
            <p className="onsite-guide__label">{product.label}</p>
            <h3>{product.name}</h3>
            {product.count && <p className="onsite-guide__count"><strong>{product.count}</strong> {product.countLabel || 'covered components'}</p>}
            <p><strong>Best for:</strong> {product.bestFor}</p>
            <p>{product.description}</p>
            <div className="onsite-guide__actions"><button className="button button--primary" type="button" onClick={startQuote}>Get my Bob Maxey price <ArrowRight /></button><button type="button" onClick={() => onContact()}>Ask about this coverage</button></div>
          </div>
          <div className="onsite-guide__highlights"><strong>Coverage highlights</strong>{product.groups.map((group) => <span key={group}><Check /> {group}</span>)}{product.examples?.length > 0 && <><strong className="onsite-guide__examples-label">Examples</strong>{product.examples.map((example) => <span key={example}><ShieldCheck /> {example}</span>)}</>}</div>
        </article>
        <p className="onsite-guide__notice">This on-site guide is for education, not a contract. Your Bob Maxey specialist will provide the exact agreement, exclusions, eligibility and final pricing for your vehicle before purchase.</p>
      </div>

      <div className="page-shell faq-section__grid">
        <div className="faq-section__intro">
          <MessageCircleQuestion />
          <h2>Ford Protect questions,<br />answered plainly.</h2>
          <p>Useful answers about coverage, EVs, eligibility, benefits and purchase—without burying the customer in articles.</p>
          <button className="button button--primary" type="button" onClick={() => onQuote()}>Build my quote <ArrowRight /></button>
          <button className="faq-section__contact" type="button" onClick={() => onContact()}>Ask a Bob Maxey specialist</button>
        </div>
        <div className="faq-list">
          {faqItems.map(([question, answer], index) => (
            <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>
          ))}
        </div>
      </div>
      </>}
    </section>
  );
}
