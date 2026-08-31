import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { afterSaleProductCategories } from '../data';
import { assetUrl } from '../paths';

export default function HomeOverview({ onNavigate, onQuote }) {
  const [active, setActive] = useState(afterSaleProductCategories[0]);

  return (
    <section className="home-overview section">
      <div className="page-shell home-overview__heading">
        <div><h2>The Ford Protect lineup Bob Maxey can help you buy after the sale.</h2><p>Choose a product family here, then open one focused page for the full detail. GAP, lease-only and original-sale-only products are intentionally excluded.</p></div>
        <img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
      </div>
      <div className="page-shell home-overview__browser">
        <div className="home-overview__nav" role="tablist" aria-label="Ford Protect product families">
          {afterSaleProductCategories.map((category) => <button key={category.id} className={active.id === category.id ? 'is-active' : ''} type="button" role="tab" aria-selected={active.id === category.id} onClick={() => setActive(category)}><span><strong>{category.label}</strong><small>{category.products.length} product paths</small></span><ArrowRight /></button>)}
        </div>
        <article className="home-overview__feature" key={active.id}>
          <div className="home-overview__copy">
            <span>Ford Protect product family</span>
            <h3>{active.title}</h3>
            <p>{active.intro}</p>
            <div>{active.products.slice(0, 5).map((product) => <span key={product.id}><Check /> {product.name}</span>)}</div>
            <div className="home-overview__actions">
              <button className="button button--primary" type="button" onClick={() => onNavigate('products')}>Explore all products <ArrowRight /></button>
              {active.id === 'mechanical' && <button type="button" onClick={() => onNavigate('compare')}>Compare plan levels</button>}
              {active.id === 'electric' && <button type="button" onClick={() => onQuote({ powertrain: 'Electric', planId: 'premium-plus-ev' })}>Start an EV quote</button>}
            </div>
          </div>
          <figure><img src={assetUrl(active.image)} alt={active.imageAlt} /><figcaption>Official Ford / Ford Protect marketing media</figcaption></figure>
        </article>
      </div>
    </section>
  );
}
