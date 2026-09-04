import { hiddenCustomerProductIds, productCategories } from './data.js';

export const publicPages = ['home', 'products', 'compare', 'eligibility', 'how-it-works', 'resources'];
const hiddenIds = new Set(hiddenCustomerProductIds);
export const publicProducts = productCategories.flatMap((category) => category.products)
  .filter((product) => !hiddenIds.has(product.id));
const productIds = new Set(publicProducts.map((product) => product.id));

// Match the whole route: a typo must not silently masquerade as another page.
export function resolveRoute(pathname) {
  const parts = String(pathname).split('/').filter(Boolean);
  if (!parts.length) return { page: 'home', productId: '' };
  if (parts.length === 1 && publicPages.includes(parts[0])) return { page: parts[0], productId: '' };
  if (parts.length === 2 && parts[0] === 'products') {
    if (hiddenIds.has(parts[1])) return { page: 'products', productId: '', redirect: '/products' };
    if (productIds.has(parts[1])) return { page: 'products', productId: parts[1] };
  }
  return { page: 'not-found', productId: '' };
}

export const publicRouteEntries = [
  ...publicPages.map((page) => ({ path: page === 'home' ? '/' : `/${page}`, page, productName: '' })),
  ...publicProducts.map((product) => ({ path: `/products/${product.id}`, page: 'products', productName: product.name })),
];
