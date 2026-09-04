import test from 'node:test';
import assert from 'node:assert/strict';
import { isCalendarDate, vehicleFormErrors } from './quoteFormValidation.js';

const quote = { vehicleSituation: 'owned-after-sale', purchaseContext: 'owner', vin: '', year: '2024', make: 'Ford', model: 'F-150', mileage: '0', state: 'Michigan', zip: '48081', inServiceUnknown: true, usage: 'Personal', powertrain: 'Gas', snowPlow: 'No' };
const errors = (patch = {}) => vehicleFormErrors({ ...quote, ...patch }, '2026-09-04');
test('zero-mileage vehicles and unknown warranty dates are valid planning inputs', () => {
  assert.ok(Object.values(errors()).every((value) => !value));
});
test('VIN validation rejects invalid letters and lengths, not merely a length mismatch', () => {
  for (const vin of ['1111111111111111I', '1FTEW1EG0FFB403590']) assert.ok(errors({ vin }).vin);
  assert.equal(errors({ vin: '1FTEW1EG0FFB40359' }).vin, '');
});
test('real calendar dates are required, even when the date is marked unknown', () => {
  assert.ok(isCalendarDate('2024-02-29'));
  for (const inService of ['2025-02-29', '2024-13-01', 'not-a-date', '2027-01-01']) assert.ok(errors({ inService }).inService);
});
test('stored data cannot bypass vehicle enums or use a mismatched journey', () => {
  for (const [field, value] of [['state', 'Atlantis'], ['year', '9999'], ['usage', 'Fleet'], ['powertrain', 'Unknown'], ['snowPlow', 'Maybe'], ['mileage', '-1'], ['mileage', '1.5'], ['make', 'Other'], ['model', ' ']]) {
    assert.ok(errors({ [field]: value })[field], `${field}: ${value}`);
  }
  assert.ok(errors({ vehicleSituation: 'new-purchase' }).purchaseContext);
});
