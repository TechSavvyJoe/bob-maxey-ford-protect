import { ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { afterSaleProductCategories, fordBenefits } from '../data';
import { assetUrl } from '../paths';

function ProductCard({ category, product, onOpenProduct, onStart }) {
  return (
    <article className="product-catalog-card">
      <div className="product-catalog-card__body">
        <span className="product-catalog-card__eyebrow">{category.label}</span>
        <h3>{product.name}</h3>
        <p className="product-catalog-card__label">{product.label}</p>
        <p>{product.description}</p>
        <p className="product-catalog-card__best"><strong>Good fit for:</strong> {product.bestFor}</p>
        <div className="product-catalog-card__highlights" aria-label={`${product.name} highlights`}>
          {(product.groups || []).slice(0, 3).map((group) => <span key={group}>{group}</span>)}
        </div>
        <div className="product-catalog-card__actions">
          <button className="button button--primary" type="button" onClick={() => onOpenProduct(product.id)}>Explore details <ArrowRight /></button>
          <button type="button" onClick={() => onStart(category, product)}>{product.dealerAssisted ? 'Ask a specialist' : 'Start with my vehicle'}</button>
        </div>
      </div>
    </article>
  );
}

export default function ProductLibrary({ onQuote, onContact, onOpenProduct }) {
  const [categoryId, setCategoryId] = useState(afterSaleProductCategories[0].id);
  const [query, setQuery] = useState('');
  const category = useMemo(
    () => afterSaleProductCategories.find((item) => item.id === categoryId) ?? afterSaleProductCategories[0],
    [categoryId],
  );
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return afterSaleProductCategories
      .flatMap((item) => item.products.map((product) => ({ category: item, product })))
      .filter(({ category: item, product }) => (
        `${item.label} ${item.title} ${product.name} ${product.label} ${product.description} ${product.bestFor} ${(product.groups || []).join(' ')}`
          .toLowerCase()
          .includes(normalized)
      ));
  }, [query]);

  const startProduct = (itemCategory, product) => {
    if (itemCategory.id === 'mechanical') return onQuote({ planId: product.id });
    if (itemCategory.id === 'electric') return onQuote({ planId: product.id, powertrain: 'Electric' });
    return onContact();
  };

  const visibleProducts = query
    ? searchResults
    : category.products.map((product) => ({ category, product }));

  return (
    <section className="product-library section" id="products">
      <div className="page-shell">
        <div className="product-library__heading">
          <div>
            <span className="product-type">Ford Protect product center</span>
            <h1>Protection for the way you own your Ford.</h1>
            <p>Start with the type of help you want, then review coverage, eligibility, choices, exclusions and next steps for each product.</p>
          </div>
          <div className="product-library__source"><img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" /><span>Genuine Ford Protect products, with vehicle-specific availability confirmed by Bob Maxey.</span></div>
        </div>

        <div className="product-library__tools">
          <div className="product-category-nav" role="tablist" aria-label="Ford Protect product categories">
            {afterSaleProductCategories.map((item) => (
              <button
                key={item.id}
                className={!query && category.id === item.id ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={!query && category.id === item.id}
                onClick={() => { setCategoryId(item.id); setQuery(''); }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="product-library__search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or coverage needs" aria-label="Search Ford Protect products" /></label>
        </div>

        <div className={`product-catalog__heading${query ? ' is-search' : ''}`}>
          <div>
            <span>{query ? 'Search results' : category.label}</span>
            <h2>{query ? `${visibleProducts.length} product${visibleProducts.length === 1 ? '' : 's'} found` : category.title}</h2>
          </div>
          <p>{query ? 'Open a product for complete details and vehicle-specific next steps.' : category.intro}</p>
          {!query && <figure><img src={assetUrl(category.image)} alt={category.imageAlt} /></figure>}
          {query && <button type="button" onClick={() => setQuery('')}>Clear search</button>}
        </div>

        <div className="product-catalog-grid">
          {visibleProducts.map(({ category: itemCategory, product }) => (
            <ProductCard
              key={product.id}
              category={itemCategory}
              product={product}
              onOpenProduct={onOpenProduct}
              onStart={startProduct}
            />
          ))}
        </div>

        {!visibleProducts.length && (
          <div className="product-catalog-empty"><Search /><h2>No matching product found.</h2><p>Try “electric,” “maintenance,” “commercial,” or a coverage need such as “turbocharger.”</p><button type="button" onClick={() => setQuery('')}>View all product families</button></div>
        )}

        <div className="product-catalog__note"><ShieldCheck /><p><strong>Your agreement confirms the details.</strong> Eligibility, covered items, limits, exclusions, provider and state rules can vary. Bob Maxey confirms the applicable Ford Protect agreement before purchase.</p></div>
      </div>

      <div className="ford-benefits">
        <div className="page-shell ford-benefits__heading"><div><h2>Why genuine Ford Protect matters</h2><p>Ford-backed ownership support with benefits confirmed by the selected product and agreement.</p></div><img src={assetUrl('/assets/ford-official/ford-oval.png')} alt="Ford" /></div>
        <div className="page-shell ford-benefits__grid">
          {fordBenefits.slice(0, 6).map((benefit) => <article key={benefit.title}><img src={assetUrl(benefit.image)} alt="" /><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></article>)}
        </div>
      </div>
    </section>
  );
}
