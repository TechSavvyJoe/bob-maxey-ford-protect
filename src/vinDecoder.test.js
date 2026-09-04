import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeVinWithVpic, mapVpicVehicle, normalizeVin, powertrainFromVpic } from './vinDecoder.js';

test('normalizes VIN input and rejects invalid characters', () => {
  assert.equal(normalizeVin(' 1fm5k8gc-lga123456 '), '1FM5K8GCLGA123456');
});

test('maps NHTSA facts without inventing warranty or in-service data', () => {
  const vehicle = mapVpicVehicle({
    VIN: '1FM5K8GCLGA123456', ModelYear: '2020', Make: 'FORD', Model: 'Explorer', Trim: 'ST',
    BodyClass: 'Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)', DriveType: '4WD/4-Wheel Drive/4x4',
    FuelTypePrimary: 'Gasoline', EngineCylinders: '6', DisplacementL: '3', EngineConfiguration: 'V-Shaped',
    TransmissionStyle: 'Automatic', TransmissionSpeeds: '10', GVWR: 'Class 2E', Doors: '4', ModelID: '1801',
  });
  assert.equal(vehicle.make, 'Ford');
  assert.equal(vehicle.powertrain, 'Gas');
  assert.match(vehicle.engineDescription, /3L/);
  assert.equal(vehicle.transmission, 'Automatic · 10 speeds');
  assert.equal('inServiceDate' in vehicle, false);
  assert.equal('warranty' in vehicle, false);
});

test('identifies hybrid and electric powertrains', () => {
  assert.equal(powertrainFromVpic({ ElectrificationLevel: 'Plug-in Hybrid Electric Vehicle (PHEV)' }), 'Hybrid');
  assert.equal(powertrainFromVpic({ FuelTypePrimary: 'Electric' }), 'Electric');
});

test('decodes a valid response through an injectable fetch implementation', async () => {
  const result = await decodeVinWithVpic('1FM5K8GCLGA123456', {
    fetchImpl: async () => ({ ok: true, json: async () => ({ Results: [{ ErrorCode: '0', VIN: '1FM5K8GCLGA123456', ModelYear: '2020', Make: 'FORD', Model: 'Explorer' }] }) }),
  });
  assert.equal(result.status, 'success');
  assert.equal(result.vehicle.model, 'Explorer');
});

test('does not accept an unvalidated NHTSA result', async () => {
  await assert.rejects(
    decodeVinWithVpic('1FM5K8GCLGA123456', {
      fetchImpl: async () => ({ ok: true, json: async () => ({ Results: [{ ErrorCode: '1', ErrorText: '1 - Check Digit does not calculate properly' }] }) }),
    }),
    /could not validate/i,
  );
});
