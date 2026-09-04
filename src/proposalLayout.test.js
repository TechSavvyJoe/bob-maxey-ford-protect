import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProposalCoverageChunks,
  getProposalProductChunks,
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
