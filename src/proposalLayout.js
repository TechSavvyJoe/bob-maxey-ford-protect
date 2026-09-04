export const PROPOSAL_COVERAGE_GROUPS_PER_PAGE = 6;
export const PROPOSAL_PRODUCTS_PER_PAGE = 2;

export function chunkProposalItems(items = [], size = 1) {
  const source = Array.isArray(items) ? items : [];
  const pageSize = Math.max(1, Number(size) || 1);
  if (!source.length) return [];
  return Array.from(
    { length: Math.ceil(source.length / pageSize) },
    (_, index) => source.slice(index * pageSize, (index + 1) * pageSize),
  );
}

export const getProposalCoverageChunks = (groups = []) => (
  chunkProposalItems(groups, PROPOSAL_COVERAGE_GROUPS_PER_PAGE)
);

export const getProposalProductChunks = (products = []) => (
  chunkProposalItems(products, PROPOSAL_PRODUCTS_PER_PAGE)
);
