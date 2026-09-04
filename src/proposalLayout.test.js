import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProposalCoverageChunks,
  getProposalProductChunks,
  unsupportedProposalFields,
  wrapProposalText,
} from './proposalLayout.js';

test('proposal pages keep compact coverage and product budgets', () => {
  assert.deepEqual(
    getProposalCoverageChunks(Array.from({ length: 11 }, (_, index) => index + 1)).map((chunk) => chunk.length),
    [6, 5],
  );
  assert.deepEqual(
    getProposalProductChunks(['TireCARE Plus', 'DentCARE', 'SurfaceCARE']).map((chunk) => chunk.length),
    [2, 1],
  );
});

test('unsupported PDF characters return only affected field labels without corrupting names', () => {
  const allowed = new Set(Array.from('José Łukasz Жанна').map(c => c.codePointAt(0)));
  assert.deepEqual(unsupportedProposalFields({ name: 'Jose\u0301 Łukasz Жанна' }, code => allowed.has(code)), []);
  assert.deepEqual(unsupportedProposalFields({ name: '李', notes: 'José' }, code => allowed.has(code)), ['name']);
});

test('long customer identifiers wrap within columns without losing characters', () => {
  const email = 'alexandra'.repeat(10) + '@example.com';
  const lines = wrapProposalText(email, (text) => text.length * 5, 100);
  assert.ok(lines.every((line) => line.length <= 20));
  assert.equal(lines.join(''), email);
  assert.deepEqual(wrapProposalText('Personal vehicle\nTwo words', (text) => text.length, 20), ['Personal vehicle', '', 'Two words']);
});
