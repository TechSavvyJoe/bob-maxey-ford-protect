const SITE_NAME = 'Bob Maxey Ford Protect';

const pageLabels = Object.freeze({
  home: 'Ford Protect coverage',
  products: 'Plans and products',
  compare: 'Compare protection plans',
  eligibility: 'Coverage eligibility',
  'how-it-works': 'How it works',
  resources: 'Help and resources',
});

export function routeAnnouncement(page, productName = '') {
  if (page === 'products' && productName) return `${productName} product details`;
  return pageLabels[page] || pageLabels.home;
}

export function routeDocumentTitle(page, productName = '') {
  if (page === 'home' && !productName) return SITE_NAME;
  const label = page === 'products' && productName ? productName : routeAnnouncement(page);
  return `${label} | ${SITE_NAME}`;
}
