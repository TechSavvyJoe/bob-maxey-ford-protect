import test from 'node:test';
import assert from 'node:assert/strict';
import { routeAnnouncement, routeDocumentTitle } from './routeAccessibility.js';

test('route titles identify each SPA destination', () => {
  assert.equal(routeDocumentTitle('home'), 'Bob Maxey Ford Protect');
  assert.equal(routeDocumentTitle('compare'), 'Compare protection plans | Bob Maxey Ford Protect');
  assert.equal(routeDocumentTitle('products', 'PremiumCARE'), 'PremiumCARE | Bob Maxey Ford Protect');
});

test('route announcements describe product details and safely handle unknown pages', () => {
  assert.equal(routeAnnouncement('products', 'TireCARE Plus'), 'TireCARE Plus product details');
  assert.equal(routeAnnouncement('unknown'), 'Ford Protect coverage');
});
