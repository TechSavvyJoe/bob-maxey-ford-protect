import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { publicRouteEntries } from '../src/routes.js';
import { routeDocumentTitle } from '../src/routeAccessibility.js';

const root = new URL('../dist/', import.meta.url);
const template = readFileSync(new URL('index.html', root), 'utf8');
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
for (const entry of publicRouteEntries) {
  const directory = new URL(`.${entry.path.replace(/\/$/, '')}/`, root);
  mkdirSync(directory, { recursive: true });
  const page = template.replace(/<title>.*?<\/title>/, `<title>${escape(routeDocumentTitle(entry.page, entry.productName))}</title>`);
  writeFileSync(new URL('index.html', directory), page);
}
writeFileSync(new URL('404.html', root), template.replace(/<title>.*?<\/title>/, `<title>${escape(routeDocumentTitle('not-found'))}</title>`));
console.log(`Generated ${publicRouteEntries.length} public entry points in ${fileURLToPath(root)}.`);
