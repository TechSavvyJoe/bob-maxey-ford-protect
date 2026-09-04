import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distRoot = fileURLToPath(new URL('../dist/', import.meta.url));

if (!existsSync(distRoot)) throw new Error('Production build is missing. Run the release audit after `npm run build`.');

const filesIn = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? filesIn(path) : [path];
});

const publicCode = filesIn(distRoot)
  .filter((path) => /\.(?:html|js)$/i.test(path))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

const forbiddenPublicCopy = [
  ['development CRM controls', /\bCRM testing tools\b|\bDownload CRM test\b|\bCRM test file downloaded\b/i],
  ['fixed 20 percent down-payment claim', /\b20\s*%\s*(?:down|deposit)\b/i],
  ['fixed zero-percent claim', /\b0\s*%\s*(?:interest|financ(?:e|ing))\b/i],
  ['old small-down-payment claim', /\bsmall[- ]down[- ]payment\b/i],
];

for (const [label, pattern] of forbiddenPublicCopy) {
  if (pattern.test(publicCode)) throw new Error(`Production bundle contains ${label}.`);
}

const verifiedFinancingCopy = 'Ford currently advertises interest-free financing for eligible Ford Protect Extended Service Plans for up to 30 months.';
if (!publicCode.includes(verifiedFinancingCopy)) throw new Error('Production bundle is missing the bounded financing disclosure.');

for (const hiddenRoute of ['fba-upgrade', 'lincoln-cpo']) {
  const routeDirectory = fileURLToPath(new URL(`../dist/products/${hiddenRoute}/`, import.meta.url));
  if (existsSync(routeDirectory) && statSync(routeDirectory).isDirectory()) {
    throw new Error(`Hidden certified-product route was emitted: ${hiddenRoute}`);
  }
}

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const catalogSource = readFileSync(new URL('../src/components/ProductLibrary.jsx', import.meta.url), 'utf8');
const deployWorkflow = readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
const generatedProductRoutes = deployWorkflow.match(/product_routes=\([\s\S]*?\n\s*\)/)?.[0] || '';
for (const hiddenRoute of ['fba-upgrade', 'lincoln-cpo']) {
  if (generatedProductRoutes.includes(hiddenRoute)) throw new Error(`Deployment workflow exposes hidden certified-product route: ${hiddenRoute}`);
}
if (!appSource.includes('normalizeHiddenProductPath()') || !appSource.includes('!hiddenCustomerProductIdSet.has(product.id)')) {
  throw new Error('Application routing is missing its hidden certified-product guard.');
}
if (!catalogSource.includes('!hiddenIds.has(product.id)')) {
  throw new Error('Customer product catalog is missing its hidden-product guard.');
}

const quoteSource = readFileSync(new URL('../src/components/QuoteStudio.jsx', import.meta.url), 'utf8');
const requiredFlowGuards = [
  ['disabled forward action until the current step is complete', 'disabled={submitting || !ready}'],
  ['full pre-submit step validation', 'stepReadiness.slice(0, 5).findIndex((ready) => !ready)'],
  ['explicit deductible validation', 'if (quote.program === \'esp\' && (!quote.deductible || !deductibleAllowed))'],
  ['explicit additional-product decision', 'if (!productsDecisionValid)'],
  ['strict dealership receipt requirement', 'if (!result.accepted)'],
];

for (const [label, sourceFragment] of requiredFlowGuards) {
  if (!quoteSource.includes(sourceFragment)) throw new Error(`Quote flow is missing ${label}.`);
}

console.log('Release audit passed: public copy, hidden routes, CRM controls, and required-step guards are clean.');
