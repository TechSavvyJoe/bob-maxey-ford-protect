import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadComments, createAdfXml, minimizeLeadUrl, submitCrmLead } from './crmLead.js';
import { CONTACT_CONSENT_TEXT, CONTACT_CONSENT_VERSION } from './consent.js';

const consentedQuote = {
  id: 'BMX-ABABABABABABABAB',
  consent: true,
  consentText: CONTACT_CONSENT_TEXT,
  consentVersion: CONTACT_CONSENT_VERSION,
  consentAcceptedAt: '2026-09-03T12:00:00.000Z',
};

test('CRM delivery requires current, timestamped contact permission', async () => {
  await assert.rejects(
    submitCrmLead({
      xml: '<adf />',
      quote: { ...consentedQuote, consent: false },
      endpoint: 'https://dealer.example.test/leads',
      fetchImpl: async () => { throw new Error('must not be called'); },
    }),
    /contact permission is required/i,
  );
});

test('CRM delivery accepts only a complete server receipt', async () => {
  const result = await submitCrmLead({
    xml: '<adf />',
    quote: consentedQuote,
    endpoint: 'https://dealer.example.test/leads',
    fetchImpl: async (_url, options) => {
      assert.equal(options.redirect, 'error');
      assert.equal(options.referrerPolicy, 'no-referrer');
      return {
      ok: true,
      json: async () => ({ accepted: true, leadId: 'DM-123', receivedAt: '2026-09-03T12:01:00.000Z' }),
      };
    },
  });
  assert.deepEqual(result, {
    configured: true,
    sent: true,
    accepted: true,
    leadId: 'DM-123',
    receivedAt: '2026-09-03T12:01:00.000Z',
  });
});

test('CRM delivery rejects a success flag without a complete receipt', async () => {
  await assert.rejects(
    submitCrmLead({
      xml: '<adf />',
      quote: consentedQuote,
      endpoint: 'https://dealer.example.test/leads',
      fetchImpl: async () => ({ ok: true, json: async () => ({ accepted: true }) }),
    }),
    /complete accepted receipt/i,
  );
});

test('CRM XML carries vehicle situation, decoded facts, and exact consent metadata', () => {
  const xml = createAdfXml({
    quote: {
      ...consentedQuote,
      vehicleSituation: 'used-purchase',
      purchaseContext: 'shopping',
      year: '2024', make: 'Ford', model: 'Edge', mileage: '25000',
      decodedVehicle: { trim: 'ST-Line', engineDescription: '2.0L 4 cylinders', driveType: 'AWD' },
      customer: {},
    },
    plan: { name: 'PremiumCARE' },
  });
  assert.match(xml, /<vehicle interest="buy" status="used">/);
  assert.match(xml, /<trim>ST-Line<\/trim>/);
  assert.match(xml, /VEHICLE SITUATION: used-purchase/);
  assert.match(xml, new RegExp(`CONTACT CONSENT VERSION: ${CONTACT_CONSENT_VERSION}`));
  assert.match(xml, /CONTACT CONSENT ACCEPTED AT: 2026-09-03T12:00:00.000Z/);
  assert.match(xml, /ENGINE: 2.0L 4 cylinders/);
});

test('CRM source URLs omit arbitrary query data while retaining explicit campaign fields', () => {
  assert.equal(
    minimizeLeadUrl('https://example.test/products?email=customer%40example.test&utm_source=ford&utm_campaign=fall#quote', { keepCampaign: true }),
    'https://example.test/products?utm_source=ford&utm_campaign=fall',
  );
  assert.equal(
    minimizeLeadUrl('https://search.example.test/path?q=private&utm_source=ignored'),
    'https://search.example.test/path',
  );
  assert.equal(minimizeLeadUrl('javascript:alert(1)'), '');
});

test('products-only CRM comments do not invent a mechanical plan, term, mileage, or deductible', () => {
  const comments = buildLeadComments({
    ...consentedQuote,
    vehicleSituation: 'new-purchase',
    purchaseContext: 'shopping',
    transactionMethod: 'finance',
    year: '2026',
    make: 'Ford',
    model: 'Escape',
    mileage: 500,
    inServiceUnknown: true,
    state: 'Michigan',
    program: 'products-only',
    paymentPreference: 'Pay in full',
    preferredContact: 'phone',
    requestedProductIds: ['tirecare-plus'],
    productSelections: {
      'tirecare-plus': { variantId: 'tirecare-plus', termMonths: 60, termMiles: null, confirmed: true },
    },
  });

  assert.match(comments, /REQUEST TYPE: Ford Protect products only/);
  assert.match(comments, /PRODUCTS REQUESTED: TireCARE Plus/);
  assert.match(comments, /PAYMENT PREFERENCE: Show the total price/);
  assert.match(comments, /PREFERRED CONTACT: Phone call/);
  assert.doesNotMatch(comments, /PAYMENT PREFERENCE: Pay in full/);
  assert.doesNotMatch(comments, /PRIMARY MECHANICAL COVERAGE:/);
  assert.doesNotMatch(comments, /SERVICE-CONTRACT DEDUCTIBLE:/);
  assert.doesNotMatch(comments, /COVERAGE PATH: New plan/);
  assert.doesNotMatch(comments, /TERM: 0 months/);
  assert.doesNotMatch(comments, /TOTAL ODOMETER LIMIT: 0 miles/);
  assert.doesNotMatch(comments, /DEDUCTIBLE REQUEST: \$100/);
  assert.doesNotMatch(comments, /PLAN OPTIONS REQUESTED:/);
});

test('an unconfigured CRM returns a non-success result without attempting delivery', async () => {
  let called = false;
  const result = await submitCrmLead({
    xml: '<adf />',
    quote: consentedQuote,
    endpoint: '',
    fetchImpl: async () => { called = true; },
  });
  assert.deepEqual(result, { configured: false, sent: false });
  assert.equal(called, false);
});

test('CRM output does not invent absent mileage, deductible, or invalid coverage', () => {
  const comments = buildLeadComments({ program: 'esp', planId: 'premium', store: 'howell' }, { name: 'PremiumCARE' });
  assert.match(comments, /CURRENT MILEAGE: Mileage to be confirmed/);
  assert.match(comments, /COVERAGE: Selection needs attention/);
  assert.match(comments, /STORE: Bob Maxey Ford of Howell/);
  assert.doesNotMatch(comments, /DEDUCTIBLE REQUEST: \$100/);
  assert.doesNotMatch(comments, /TERM: 0/);
});

test('XML escapes customer markup and removes illegal XML control characters', () => {
  const xml = createAdfXml({ quote: { customer: { firstName: 'A\u0000&B<test>', lastName: 'Name\u000B' } } });
  assert.match(xml, /A&amp;B&lt;test&gt;/);
  assert.doesNotMatch(xml, /[\u0000\u000B]/);
});

test('ADF uses the normalized dealership and distinguishes missing mileage from a new zero-mile vehicle', () => {
  const missing = createAdfXml({ quote: { store: 'howell' } });
  assert.match(missing, /<vendorname>Bob Maxey Ford of Howell<\/vendorname>/);
  assert.doesNotMatch(missing, /<odometer /);
  assert.match(createAdfXml({ quote: { mileage: 0 } }), /<odometer status="current" units="mi">0<\/odometer>/);
});
