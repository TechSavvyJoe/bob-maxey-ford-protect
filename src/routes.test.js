import test from 'node:test';
import assert from 'node:assert/strict';
import { publicRouteEntries, resolveRoute } from './routes.js';

test('every generated public entry resolves to the intended page', () => {
  for (const route of publicRouteEntries) {
    assert.equal(resolveRoute(route.path).page, route.page);
    assert.equal(resolveRoute(`${route.path}/`).page, route.page);
  }
  assert.equal(new Set(publicRouteEntries.map((entry) => entry.path)).size, publicRouteEntries.length);
});
test('unknown paths and trailing segments cannot impersonate real pages', () => {
  for (const path of ['/missing', '/compare/extra', '/products/missing', '/products/premium/extra']) {
    assert.equal(resolveRoute(path).page, 'not-found', path);
  }
});
test('archived certified pages resolve only to the active catalog', () => {
  for (const id of ['fba-upgrade', 'lincoln-cpo']) {
    assert.deepEqual(resolveRoute(`/products/${id}`), { page: 'products', productId: '', redirect: '/products' });
    assert.ok(!publicRouteEntries.some((entry) => entry.path.endsWith(`/${id}`)));
  }
});
