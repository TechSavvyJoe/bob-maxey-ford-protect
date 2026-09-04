import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdfXml, submitCrmLead } from './crmLead.js';
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
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ accepted: true, leadId: 'DM-123', receivedAt: '2026-09-03T12:01:00.000Z' }),
    }),
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
