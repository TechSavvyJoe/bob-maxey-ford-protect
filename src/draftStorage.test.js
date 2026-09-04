import test from 'node:test';
import assert from 'node:assert/strict';
import { clearDrafts, createQuoteId, deleteDraft, DRAFT_STORAGE_KEY, loadDrafts, saveDraft, safeParseJson } from './draftStorage.js';

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test('safeParseJson returns its fallback for malformed data', () => {
  assert.deepEqual(safeParseJson('{broken', []), []);
});

test('failed draft deletion never hides a record that is still persisted', () => {
  const storage = memoryStorage();
  saveDraft({ id: 'BMX-RETAIN' }, storage);
  storage.setItem = () => { throw new Error('Read-only storage'); };
  assert.equal(deleteDraft('BMX-RETAIN', storage)[0].id, 'BMX-RETAIN');
  assert.equal(loadDrafts(storage)[0].id, 'BMX-RETAIN');
  assert.equal(clearDrafts({ getItem: () => null }), false);
});

test('drafts retain numeric zero-mile inputs as editable field values', () => {
  const storage = memoryStorage();
  const { draft } = saveDraft({ id: 'BMX-ZERO', year: 2026, mileage: 0 }, storage);
  assert.equal(draft.year, '2026');
  assert.equal(draft.mileage, '0');
});

test('saved drafts omit customer PII, VIN-derived facts, ZIP, notes and consent', () => {
  const storage = memoryStorage();
  const now = new Date('2026-09-03T12:00:00.000Z');
  saveDraft({
    id: 'BMX-EXAMPLE', year: '2024', make: 'Ford', model: 'Edge', vin: '1EXAMPLEVINVALUE1', zip: '48081',
    notes: 'Call after 5', consent: true, customer: { firstName: 'Pat', email: 'pat@example.com', phone: '5551234567' },
    decodedVehicle: { vin: '1EXAMPLEVINVALUE1', trim: 'ST-Line', bodyClass: 'SUV' },
    productSelections: { tirecare: { variantId: 'tirecare-plus', termMonths: 36, confirmed: true, customerNote: 'Sensitive free text' } },
  }, storage, now);
  const [draft] = loadDrafts(storage, now);
  assert.equal(draft.model, 'Edge');
  assert.equal('vin' in draft, false);
  assert.equal('zip' in draft, false);
  assert.equal('notes' in draft, false);
  assert.equal('consent' in draft, false);
  assert.equal('customer' in draft, false);
  assert.equal('decodedVehicle' in draft, false);
  assert.equal(draft.productSelections.tirecare.variantId, 'tirecare-plus');
  assert.equal('customerNote' in draft.productSelections.tirecare, false);
});

test('saved drafts retain non-sensitive product-rule decisions and Off-Road dependency data', () => {
  const storage = memoryStorage();
  const now = new Date('2026-09-03T12:00:00.000Z');
  saveDraft({
    id: 'BMX-RULE-DRAFT',
    vehicleSituation: 'owned-after-sale',
    purchaseContext: 'owner',
    transactionMethod: 'undecided',
    program: 'products-only',
    cspPriorCoverageStatus: 'ford-protect-active-or-ending',
    currentEngineHours: '2450',
    offRoadUnderlyingProductId: 'triplecare-plus',
    requestedProductIds: ['off-road-coverage'],
    productSelections: {
      'off-road-coverage': {
        variantId: 'off-road-coverage',
        underlyingProductId: 'triplecare-plus',
        confirmed: true,
      },
    },
    vin: '1EXAMPLEVINVALUE1',
    decodedVehicle: { trim: 'Badlands', engineDescription: '2.7L V6' },
    zip: '48081',
    notes: 'Call after 5',
    consent: true,
    customer: { firstName: 'Pat', email: 'pat@example.com', phone: '5551234567' },
  }, storage, now);

  const [draft] = loadDrafts(storage, now);
  assert.equal(draft.transactionMethod, 'undecided');
  assert.equal(draft.cspPriorCoverageStatus, 'ford-protect-active-or-ending');
  assert.equal(draft.currentEngineHours, 2450);
  assert.equal(draft.offRoadUnderlyingProductId, 'triplecare-plus');
  assert.equal(draft.productSelections['off-road-coverage'].underlyingProductId, 'triplecare-plus');
  assert.equal('vin' in draft, false);
  assert.equal('decodedVehicle' in draft, false);
  assert.equal('zip' in draft, false);
  assert.equal('notes' in draft, false);
  assert.equal('consent' in draft, false);
  assert.equal('customer' in draft, false);
});

test('loading a legacy draft removes its VIN and decoded facts together', () => {
  const storage = memoryStorage();
  const now = new Date('2026-09-03T12:00:00.000Z');
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify([{
    id: 'BMX-LEGACY',
    savedAt: now.toISOString(),
    vin: '1EXAMPLEVINVALUE1',
    decodedVehicle: { vin: '1EXAMPLEVINVALUE1', trim: 'ST-Line', source: 'NHTSA vPIC' },
    year: '2024',
    make: 'Ford',
    model: 'Edge',
  }]));

  const [draft] = loadDrafts(storage, now);
  assert.equal(draft.id, 'BMX-LEGACY');
  assert.equal('vin' in draft, false);
  assert.equal('decodedVehicle' in draft, false);
});

test('blocked browser storage fails closed without breaking the quote flow', () => {
  const blockedStorage = { getItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(loadDrafts(blockedStorage), []);
});

test('expired drafts are removed', () => {
  const storage = memoryStorage();
  saveDraft({ id: 'BMX-OLD', year: '2024' }, storage, new Date('2026-01-01T00:00:00.000Z'));
  assert.deepEqual(loadDrafts(storage, new Date('2026-02-15T00:00:00.000Z')), []);
});

test('corrupt or future save dates cannot indefinitely renew retained requests', () => {
  const storage = memoryStorage();
  const now = new Date('2026-09-04T12:00:00Z');
  storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify([
    { id: 'BMX-MISSING-DATE' },
    { id: 'BMX-BAD-DATE', savedAt: 'not-a-date' },
    { id: 'BMX-FUTURE-DATE', savedAt: '2099-01-01T00:00:00Z' },
  ]));
  assert.deepEqual(loadDrafts(storage, now), []);
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), '[]');
});

test('quote references use 64 bits of supplied cryptographic randomness', () => {
  const cryptoApi = { getRandomValues: (bytes) => bytes.fill(0xab) };
  assert.equal(createQuoteId(cryptoApi), 'BMX-ABABABABABABABAB');
});
