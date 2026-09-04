import { ArrowRight, CarFront, Check, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { hiddenCustomerProductIds, productCategories } from '../data';
import { assetUrl } from '../paths';

const hiddenIds = new Set(hiddenCustomerProductIds);

const availableCategories = (context) => {
  return productCategories
    .map((category) => ({
      ...category,
      products: category.products.filter((product) => (
        !hiddenIds.has(product.id)
        && (product.purchaseContexts || ['shopping', 'owner']).includes(context)
      )),
    }))
    .filter((category) => category.products.length > 0);
};

const timingLabel = (category, product, context) => {
  if (product.purchaseTimingLabel) return product.purchaseTimingLabel;
  if (product.purchaseContexts?.length === 1 && product.purchaseContexts[0] === 'shopping') return 'Original eligible vehicle transaction only';
  if (product.id === 'continued-service') return 'As eligible OEM warranty or Ford Protect coverage is ending';
  if (product.id.includes('maintenance')) return context === 'owner' ? 'After-sale availability depends on warranty status' : 'Available with purchase or during the eligible warranty window';
  if (category.id === 'mechanical' || category.id === 'electric') return 'Vehicle-specific new and used coverage paths';
  return 'Bob Maxey specialist verification required';
};

const requestLabel = (product, context) => {
  if (product.id === 'off-road-coverage') return 'Request dealer verification';
  if (product.purchaseContexts?.length === 1 && product.purchaseContexts[0] === 'shopping') return 'Add to purchase plan';
  if (context === 'owner') return 'Start eligibility request';
  return 'Add to my purchase plan';
};

function ProductRow({ category, product, context, onOpenProduct, onStart }) {
  const image = product.image || category.image;
  const highlights = (product.groups || []).slice(0, 3);
  return (
    <article className={`product-row product-row--${category.id}`}>
      <figure><img src={assetUrl(image)} alt="" /></figure>
      <div className="product-row__content">
        <div className="product-row__meta"><span>{category.label}</span><b>{timingLabel(category, product, context)}</b></div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-row__highlights">
          {highlights.map((item) => <span key={item}><Check /> {item}</span>)}
        </div>
      </div>
      <div className="product-row__actions">
        {product.count && <strong><b>{product.count}</b><small>{product.countLabel || 'covered components'}</small></strong>}
        <button className="button button--primary" type="button" onClick={() => onOpenProduct(product.id)}>See coverage details <ArrowRight /></button>
        <button type="button" onClick={() => onStart(product)}>{requestLabel(product, context)}</button>
      </div>
    </article>
  );
}

export default function ProductLibrary({ onQuote, onOpenProduct }) {
  const [context, setContext] = useState('owner');
  const [categoryId, setCategoryId] = useState('mechanical');
  const [query, setQuery] = useState('');
  const categories = useMemo(() => availableCategories(context), [context]);

  useEffect(() => {
    if (!categories.some((category) => category.id === categoryId)) setCategoryId(categories[0]?.id || 'mechanical');
  }, [categories, categoryId]);

  const category = categories.find((item) => item.id === categoryId) || categories[0];
  const products = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const pool = normalized ? categories.flatMap((item) => item.products.map((product) => ({ category: item, product }))) : (category?.products || []).map((product) => ({ category, product }));
    if (!normalized) return pool;
    return pool.filter(({ category: item, product }) => `${item.label} ${item.title} ${product.name} ${product.description} ${(product.groups || []).join(' ')}`.toLowerCase().includes(normalized));
  }, [categories, category, query]);

  const startProduct = (product) => onQuote({ purchaseContext: context, ...(product.quoteSeed || {}) });

  return (
    <section className="product-library product-library--professional" id="products">
      <div className="page-shell product-library__hero">
        <div>
          <span>Ford Protect plans and products</span>
          <h1>Find Ford Protect coverage for where you are in ownership.</h1>
          <p>Start with whether you already own the vehicle or are planning a new or used vehicle purchase. Each product shows when it may be requested and what Bob Maxey must verify.</p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </div>

      <div className="page-shell product-context-switch" aria-label="Choose ownership stage">
        <button className={context === 'owner' ? 'is-active' : ''} type="button" aria-pressed={context === 'owner'} onClick={() => { setContext('owner'); setQuery(''); }}>
          <ShieldCheck /><span><strong>I already own a Ford</strong><small>Explore coverage Ford may permit after the original sale, including vehicles bought elsewhere.</small></span><ArrowRight />
        </button>
        <button className={context === 'shopping' ? 'is-active' : ''} type="button" aria-pressed={context === 'shopping'} onClick={() => { setContext('shopping'); setQuery(''); }}>
          <CarFront /><span><strong>I’m buying a new or used vehicle from Bob Maxey</strong><small>Plan both original-transaction products and coverage that may also be available later.</small></span><ArrowRight />
        </button>
      </div>

      <div className="page-shell product-library__workspace">
        <div className="product-library__toolbar">
          <div className="product-category-nav" role="tablist" aria-label="Product families">
            {categories.map((item) => (
              <button key={item.id} className={!query && category?.id === item.id ? 'is-active' : ''} type="button" role="tab" aria-selected={!query && category?.id === item.id} onClick={() => { setQuery(''); setCategoryId(item.id); }}>{item.label}</button>
            ))}
          </div>
          <label className="product-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or coverage needs" /></label>
        </div>

        {!query && category && (
          <header className="product-family-heading">
            <div><small>{context === 'owner' ? 'AFTER-SALE PATH' : 'VEHICLE-PURCHASE PLANNING'}</small><h2>{category.title}</h2><p>{category.intro}</p></div>
            <img src={assetUrl(category.image)} alt="" />
          </header>
        )}

        <div className="product-list" aria-live="polite">
          {products.map(({ category: item, product }) => <ProductRow key={`${item.id}-${product.id}`} category={item} product={product} context={context} onOpenProduct={onOpenProduct} onStart={startProduct} />)}
        </div>

        <div className="product-library__confirmation"><ShieldCheck /><p><strong>One rule across every product:</strong> final availability, pricing, term choices and coverage are confirmed for your VIN before purchase.</p><button type="button" onClick={() => onQuote({ purchaseContext: context })}>Check my vehicle <ArrowRight /></button></div>
      </div>
    </section>
  );
}
