import { ArrowRight, Check, FileCheck2, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { afterSaleProductCategories, fordBenefits } from '../data';
import { assetUrl } from '../paths';

export default function ProductLibrary({ onQuote, onContact, onOpenProduct }) {
  const [categoryId, setCategoryId] = useState(afterSaleProductCategories[0].id);
  const [productId, setProductId] = useState(afterSaleProductCategories[0].products[0].id);
  const [query, setQuery] = useState('');
  const category = useMemo(() => afterSaleProductCategories.find((item) => item.id === categoryId) ?? afterSaleProductCategories[0], [categoryId]);
  const product = useMemo(() => category.products.find((item) => item.id === productId) ?? category.products[0], [category, productId]);
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return afterSaleProductCategories
      .flatMap((item) => item.products.map((entry) => ({ ...entry, family: item.label })))
      .filter((item) => `${item.name} ${item.label} ${item.description} ${item.bestFor} ${(item.groups || []).join(' ')} ${(item.examples || []).join(' ')}`.toLowerCase().includes(normalized));
  }, [query]);

  const chooseCategory = (next) => {
    setCategoryId(next.id);
    setProductId(next.products[0].id);
  };

  const startProduct = () => {
    if (category.id === 'mechanical') return onQuote({ planId: product.id });
    if (category.id === 'electric') return onQuote({ planId: product.id, powertrain: 'Electric' });
    return onContact();
  };

  return (
    <section className="product-library section" id="products">
      <div className="page-shell">
        <div className="product-library__heading">
          <div>
            <h2>Every relevant Ford Protect product, clearly explained.</h2>
            <p>Explore mechanical, EV, maintenance, certified and commercial protection that may be considered after the vehicle sale. Time-of-sale-only, GAP and lease-only products are intentionally excluded.</p>
          </div>
          <div className="product-library__source"><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /><span>Product information organized from current Ford Protect materials.</span></div>
        </div>

        <label className="product-library__search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plans, coverage or vehicle use" aria-label="Search Ford Protect products" /></label>

        {query ? (
          <div className="product-search-results">
            <div><strong>{searchResults.length} matching products</strong><button type="button" onClick={() => setQuery('')}>Clear search</button></div>
            {searchResults.map((item) => (
              <button key={item.id} type="button" onClick={() => onOpenProduct(item.id)}>
                <span><small>{item.family}</small><strong>{item.name}</strong><em>{item.description}</em></span><ArrowRight />
              </button>
            ))}
            {!searchResults.length && <p>No matching product found. Try “electric,” “maintenance,” “commercial,” or a component such as “turbocharger.”</p>}
          </div>
        ) : <>
          <div className="product-category-nav" role="tablist" aria-label="Ford Protect product categories">
            {afterSaleProductCategories.map((item) => (
              <button key={item.id} className={category.id === item.id ? 'is-active' : ''} type="button" role="tab" aria-selected={category.id === item.id} onClick={() => chooseCategory(item)}>{item.label}</button>
            ))}
          </div>

          <div className="product-library__intro"><h3>{category.title}</h3><p>{category.intro}</p></div>

          <div className="product-browser">
            <div className="product-browser__list" role="tablist" aria-label={`${category.label} products`}>
              {category.products.map((item) => (
                <button key={item.id} className={product.id === item.id ? 'is-active' : ''} type="button" role="tab" aria-selected={product.id === item.id} onClick={() => setProductId(item.id)}>
                  <span><strong>{item.name}</strong><small>{item.label}</small></span><ArrowRight />
                </button>
              ))}
            </div>

            <article className="product-browser__detail" key={`${category.id}-${product.id}`}>
              <div className="product-browser__copy">
                <span className="product-browser__category">{category.label}</span>
                <h3>{product.name}</h3>
                {product.count && <div className="product-browser__count"><strong>{product.count}</strong><span>{product.countLabel || 'covered components'}</span></div>}
                <p className="product-browser__best"><strong>Best for:</strong> {product.bestFor}</p>
                <p>{product.description}</p>
                <div className="product-browser__included">
                  <strong>Coverage or service highlights</strong>
                  {product.groups.map((group) => <span key={group}><Check /> {group}</span>)}
                </div>
                {product.examples && <details className="product-browser__examples"><summary>See item examples</summary><ul>{product.examples.map((example) => <li key={example}>{example}</li>)}</ul></details>}
                <div className="product-browser__actions">
                  <button className="button button--primary" type="button" onClick={() => onOpenProduct(product.id)}>View full product details <ArrowRight /></button>
                  <button className="product-browser__start" type="button" onClick={startProduct}>{product.dealerAssisted ? 'Talk to a Bob Maxey specialist' : 'Start with my vehicle'}</button>
                </div>
              </div>
              <figure className="product-browser__media">
                <img src={assetUrl(product.image || category.image)} alt={product.image ? `${product.name} official Ford Protect marketing image` : category.imageAlt} />
                <figcaption>Official Ford / Ford Protect marketing media</figcaption>
              </figure>
            </article>
          </div>

          <div className="product-browser__notice"><FileCheck2 /><p><strong>The agreement is the source of truth.</strong> Product availability, covered items, limits, exclusions, provider and state rules can vary. Bob Maxey provides the applicable agreement before purchase.</p></div>
        </>}
      </div>

      <div className="ford-benefits">
        <div className="page-shell ford-benefits__heading"><div><h2>Why genuine Ford Protect matters</h2><p>Factory-backed coverage, service support and ownership benefits—presented with Ford’s official program media.</p></div><img src={assetUrl('/assets/ford-official/ford-oval.png')} alt="Ford" /></div>
        <div className="page-shell ford-benefits__grid">
          {fordBenefits.map((benefit) => <article key={benefit.title}><img src={assetUrl(benefit.image)} alt="" /><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></article>)}
          <article className="ford-benefits__final"><ShieldCheck /><div><h3>Contract-level clarity</h3><p>We show the plan overview first, then confirm the exact Ford agreement for the vehicle.</p></div></article>
        </div>
      </div>
    </section>
  );
}
