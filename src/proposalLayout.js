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

/** Return field labels only: errors must not copy customer PII into logs. */
export function unsupportedProposalFields(fields, supportsCodePoint) {
  return Object.entries(fields).filter(([, value]) => Array.from(String(value ?? '').normalize('NFC'))
    .some((character) => !/\s/u.test(character) && !supportsCodePoint(character.codePointAt(0))))
    .map(([label]) => label);
}

/** Wrap by measured width, including VINs, email addresses and long names. */
export function wrapProposalText(text, measure, width) {
  const lines = [];
  const limit = Math.max(1, width);
  const paragraphs = String(text ?? '').split(/\n/);
  paragraphs.forEach((paragraph, paragraphIndex) => {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= limit) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const character of Array.from(word)) {
        if (line && measure(line + character) > limit) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push('');
  });
  return lines.length ? lines : [''];
}
