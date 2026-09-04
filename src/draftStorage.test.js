import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuoteId, loadDrafts, saveDraft, safeParseJson } from './draftStorage.js';

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

test('saved drafts omit customer PII, VIN, ZIP, notes and consent', () => {
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
  assert.equal('vin' in draft.decodedVehicle, false);
  assert.equal(draft.decodedVehicle.trim, 'ST-Line');
  assert.equal(draft.productSelections.tirecare.variantId, 'tirecare-plus');
  assert.equal('customerNote' in draft.productSelections.tirecare, false);
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

test('quote references use 64 bits of supplied cryptographic randomness', () => {
  const cryptoApi = { getRandomValues: (bytes) => bytes.fill(0xab) };
  assert.equal(createQuoteId(cryptoApi), 'BMX-ABABABABABABABAB');
});
