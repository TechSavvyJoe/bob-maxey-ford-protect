import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { assetUrl } from './paths';
import { buildProposalModel } from './quoteOutput';
import { getProductTimingPresentation } from './quoteProducts';
import { getProposalCoverageChunks, getProposalProductChunks } from './proposalLayout';

const LETTER = [612, 792];
const PAGE = { width: 612, height: 792, margin: 36, contentWidth: 540, contentTop: 708, footerRule: 43 };

const C = {
  navy: rgb(0 / 255, 33 / 255, 71 / 255),
  navySoft: rgb(8 / 255, 54 / 255, 100 / 255),
  blue: rgb(0 / 255, 103 / 255, 209 / 255),
  blueDark: rgb(0 / 255, 73 / 255, 153 / 255),
  ink: rgb(17 / 255, 38 / 255, 63 / 255),
  muted: rgb(74 / 255, 92 / 255, 116 / 255),
  line: rgb(199 / 255, 212 / 255, 226 / 255),
  surface: rgb(246 / 255, 248 / 255, 251 / 255),
  surfaceBlue: rgb(235 / 255, 244 / 255, 253 / 255),
  white: rgb(1, 1, 1),
  green: rgb(0 / 255, 119 / 255, 82 / 255),
  greenPale: rgb(235 / 255, 248 / 255, 243 / 255),
  amber: rgb(145 / 255, 76 / 255, 0),
  amberPale: rgb(254 / 255, 245 / 255, 231 / 255),
};

const PAYMENT_MESSAGE = 'Eligible Ford Protect Extended Service Plans may qualify for interest-free financing for up to 30 months. A down payment may apply; the current offer controls its amount, installments, due dates, method, and eligibility.';
const PAYMENT_CARD_MESSAGE = 'Eligible ESPs may qualify for interest-free financing up to 30 months. Down payment and all payment terms come from the current offer.';
const CSP_PAYMENT_CARD_MESSAGE = 'The current CSP offer controls the monthly amount, due date, payment details, eligibility, and agreement terms.';

const WIN_ANSI_EXTRAS = new Set([
  '\u0152', '\u0153', '\u0160', '\u0161', '\u0178', '\u017D', '\u017E', '\u0192',
  '\u02C6', '\u02DC', '\u2020', '\u2021', '\u2030', '\u2039', '\u203A', '\u20AC',
]);

const LATIN_FALLBACKS = new Map([
  ['\u0110', 'D'], ['\u0111', 'd'], ['\u0126', 'H'], ['\u0127', 'h'],
  ['\u0131', 'i'], ['\u0138', 'k'], ['\u0141', 'L'], ['\u0142', 'l'],
  ['\u014A', 'N'], ['\u014B', 'n'], ['\u0166', 'T'], ['\u0167', 't'],
]);

const isWinAnsiCharacter = (character) => {
  const codePoint = character.codePointAt(0);
  return codePoint === 0x09
    || codePoint === 0x0A
    || codePoint === 0x0D
    || (codePoint >= 0x20 && codePoint <= 0x7E)
    || (codePoint >= 0xA0 && codePoint <= 0xFF)
    || WIN_ANSI_EXTRAS.has(character);
};

const safeText = (value = '') => {
  const normalized = String(value)
    .normalize('NFC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u00B7]/g, '-')
    .replace(/[\u00AE\u2122]/g, '');

  return Array.from(normalized, (character) => {
    if (isWinAnsiCharacter(character)) return character;
    const decomposed = LATIN_FALLBACKS.get(character)
      || character.normalize('NFKD').replace(/\p{M}/gu, '');
    const fallback = Array.from(decomposed).filter(isWinAnsiCharacter).join('');
    return fallback || (/\s/u.test(character) ? ' ' : '?');
  }).join('');
};

const itemText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'object' || Array.isArray(value)) return safeText(value).trim() || fallback;
  const title = safeText(value.title || value.name || value.label || value.heading || '').trim();
  const detail = safeText(value.text || value.summary || value.description || value.detail || '').trim();
  if (title && detail && normalize(title) !== normalize(detail)) return `${title}: ${detail}`;
  return title || detail || fallback;
};

const asArray = (value) => Array.isArray(value) ? value : [];
const compact = (values) => asArray(values).filter(Boolean);
const normalize = (value) => safeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const unique = (values) => compact(values).map((value) => itemText(value)).filter(Boolean).reduce((result, value) => {
  const key = normalize(value);
  if (key && !result.some((entry) => entry.key === key)) result.push({ key, value: safeText(value) });
  return result;
}, []).map((entry) => entry.value);

const fetchAsset = async (path) => {
  if (!path) return null;
  try {
    const response = await fetch(assetUrl(path));
    if (!response.ok) return null;
    return {
      bytes: await response.arrayBuffer(),
      type: response.headers.get('content-type') || (/\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png'),
    };
  } catch {
    return null;
  }
};

const embedAsset = async (pdf, path) => {
  const asset = await fetchAsset(path);
  if (!asset) return null;
  try {
    return asset.type.includes('jpeg') || asset.type.includes('jpg')
      ? await pdf.embedJpg(asset.bytes)
      : await pdf.embedPng(asset.bytes);
  } catch {
    return null;
  }
};

const embedDocumentFonts = async (pdf) => {
  const [regular, bold] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
  ]);
  return { regular, bold };
};

const wrap = (text, font, size, width) => {
  const lines = [];
  safeText(text).split(/\n/).forEach((paragraph, paragraphIndex, paragraphs) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push('');
  });
  return lines.length ? lines : [''];
};

const truncate = (text, font, size, width) => {
  const clean = safeText(text);
  if (font.widthOfTextAtSize(clean, size) <= width) return clean;
  let result = clean;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > width) result = result.slice(0, -1);
  return `${result.trim()}...`;
};

const drawWrapped = (page, text, {
  x, y, width, font, size = 9.2, lineHeight = 11.4, color = C.ink, maxLines = Number.POSITIVE_INFINITY,
}) => {
  const allLines = wrap(text, font, size, width);
  const lines = allLines.slice(0, maxLines);
  if (Number.isFinite(maxLines) && allLines.length > maxLines && lines.length) {
    lines[lines.length - 1] = truncate(`${lines[lines.length - 1]}...`, font, size, width);
  }
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
};

const textHeight = (text, font, size, width, lineHeight, maxLines = Number.POSITIVE_INFINITY) => (
  Math.min(wrap(text, font, size, width).length, maxLines) * lineHeight
);

const drawRule = (page, y, x = PAGE.margin, width = PAGE.contentWidth, color = C.line, thickness = 0.7) => {
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness, color });
};

const drawImageContain = (page, image, { x, y, width, height, background = C.surface, allowUpscale = true }) => {
  page.drawRectangle({ x, y, width, height, color: background });
  if (!image) return;
  const scale = Math.min(width / image.width, height / image.height, allowUpscale ? Number.POSITIVE_INFINITY : 1);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  page.drawImage(image, {
    x: x + (width - drawWidth) / 2,
    y: y + (height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });
};

const drawBrandHeader = (page, assets, fonts, label) => {
  page.drawRectangle({ x: 0, y: 730, width: PAGE.width, height: 62, color: C.white });
  if (assets.dealer) {
    const scale = Math.min(100 / assets.dealer.width, 32 / assets.dealer.height, 1);
    page.drawImage(assets.dealer, { x: PAGE.margin, y: 747, width: assets.dealer.width * scale, height: assets.dealer.height * scale });
  } else page.drawText('BOB MAXEY', { x: PAGE.margin, y: 756, size: 11, font: fonts.bold, color: C.navy });
  page.drawLine({ start: { x: 151, y: 746 }, end: { x: 151, y: 778 }, thickness: 0.75, color: C.line });
  if (assets.protect) {
    const scale = Math.min(101 / assets.protect.width, 28 / assets.protect.height, 1);
    page.drawImage(assets.protect, { x: 166, y: 749, width: assets.protect.width * scale, height: assets.protect.height * scale });
  } else page.drawText('FORD PROTECT', { x: 166, y: 756, size: 10.5, font: fonts.bold, color: C.navy });
  const heading = safeText(label).toUpperCase();
  page.drawText(heading, {
    x: PAGE.width - PAGE.margin - fonts.bold.widthOfTextAtSize(heading, 8.5),
    y: 756,
    size: 8.5,
    font: fonts.bold,
    color: C.blueDark,
  });
  drawRule(page, 730, 0, PAGE.width, C.navy, 1.25);
};

const addPage = (pdf, assets, fonts, label) => {
  const page = pdf.addPage(LETTER);
  drawBrandHeader(page, assets, fonts, label);
  return page;
};

const drawFooter = (page, pageNumber, totalPages, quoteId, fonts, label = 'Personalized customer proposal') => {
  drawRule(page, PAGE.footerRule);
  page.drawText(`Bob Maxey Ford Protect  |  ${safeText(label)}`, { x: PAGE.margin, y: 20, size: 8.3, font: fonts.regular, color: C.muted });
  const reference = `Reference ${safeText(quoteId || 'Pending')}  |  ${pageNumber} of ${totalPages}`;
  page.drawText(reference, {
    x: PAGE.width - PAGE.margin - fonts.regular.widthOfTextAtSize(reference, 8.3),
    y: 20,
    size: 8.3,
    font: fonts.regular,
    color: C.muted,
  });
};

const drawSectionTitle = (page, eyebrow, title, description, fonts, y = PAGE.contentTop) => {
  page.drawText(safeText(eyebrow).toUpperCase(), { x: PAGE.margin, y, size: 8.8, font: fonts.bold, color: C.blueDark });
  const titleLines = wrap(title, fonts.bold, 21, PAGE.contentWidth).slice(0, 2);
  titleLines.forEach((line, index) => page.drawText(line, { x: PAGE.margin, y: y - 28 - index * 24, size: 21, font: fonts.bold, color: C.navy }));
  const descriptionY = y - 32 - titleLines.length * 24;
  const descriptionLines = wrap(description, fonts.regular, 9.4, PAGE.contentWidth).slice(0, 2);
  descriptionLines.forEach((line, index) => page.drawText(line, { x: PAGE.margin, y: descriptionY - index * 11.8, size: 9.4, font: fonts.regular, color: C.muted }));
  const bottom = descriptionY - descriptionLines.length * 11.8 - 10;
  drawRule(page, bottom);
  return bottom - 12;
};

const drawLabelValue = (page, label, value, { x, y, width }, fonts, options = {}) => {
  page.drawText(safeText(label).toUpperCase(), { x, y, size: options.labelSize || 8.4, font: fonts.bold, color: options.labelColor || C.blueDark });
  return drawWrapped(page, value || 'To be confirmed', {
    x,
    y: y - 17,
    width,
    font: options.font || fonts.bold,
    size: options.size || 9.4,
    lineHeight: options.lineHeight || 11.4,
    color: options.color || C.ink,
    maxLines: options.maxLines || 2,
  });
};

const drawBullets = (page, items, { x, y, width, fonts, size = 9, lineHeight = 10.9, maxItems = 6, maxLines = 2, color = C.ink }) => {
  let cursor = y;
  compact(items).map((item) => itemText(item)).filter(Boolean).slice(0, maxItems).forEach((item) => {
    const lines = wrap(item, fonts.regular, size, width - 13).slice(0, maxLines);
    page.drawRectangle({ x, y: cursor + 2.1, width: 3, height: 3, color: C.blue });
    lines.forEach((line, index) => page.drawText(line, { x: x + 11, y: cursor - index * lineHeight, size, font: fonts.regular, color }));
    cursor -= lines.length * lineHeight + 3;
  });
  return cursor;
};

const inspectionPalette = (inspection) => inspection?.required
  ? { background: C.amberPale, accent: C.amber }
  : inspection?.required === false
    ? { background: C.greenPale, accent: C.green }
    : { background: C.surfaceBlue, accent: C.blueDark };

const inspectionSummary = (inspection, program) => {
  if (program === 'csp') return 'Continued Service Plan requests follow separate eligibility rules and do not require the used-vehicle enrollment inspection.';
  if (program === 'products-only') return 'Each selected product follows its own eligibility, purchase-timing, configuration, and enrollment rules. Bob Maxey confirms the VIN, eligible transaction, and any product-specific requirement before enrollment.';
  const verifiedSummary = [inspection?.message, inspection?.caveat].map((value) => safeText(value)).filter(Boolean).join(' ');
  if (verifiedSummary) return verifiedSummary;
  if (inspection?.required === false) return 'No used-vehicle inspection is shown as required for this quote. Ford records and current program rules confirm final eligibility.';
  if (inspection?.required === true) return 'Ford records confirm the vehicle is outside New Vehicle Limited Warranty limits. A participating Ford or Lincoln dealership must complete the required inspection before an eligible used ESP can be finalized.';
  return 'Bob Maxey will verify the Ford warranty record and confirm whether an inspection is required before enrollment.';
};

const inspectionCardSummary = (inspection, program) => {
  if (program === 'csp') return 'The current CSP guide shows no enrollment inspection. Ford records and the returned offer still control eligibility.';
  if (program === 'products-only') return 'Bob Maxey reviews each selected product against the VIN, purchase timing, requested configuration, and current product-specific enrollment rules.';
  if (inspection?.required === false) return 'No used-plan inspection is shown for this path. Ford records still confirm VIN, in-service date, warranty status, and final eligibility.';
  if (inspection?.required === true) return 'A participating dealership inspection is required before eligible used-plan enrollment. Ford records and the current offer control.';
  return 'Bob Maxey will confirm the Ford warranty record and whether an inspection is required before enrollment.';
};

const drawStatusPanel = (page, { x, y, width, height, label, headline, body, background = C.surfaceBlue, accent = C.blueDark }, fonts) => {
  page.drawRectangle({ x, y: y - height, width, height, color: background });
  page.drawRectangle({ x, y: y - height, width: 4, height, color: accent });
  page.drawText(safeText(label).toUpperCase(), { x: x + 14, y: y - 19, size: 8.4, font: fonts.bold, color: accent });
  drawWrapped(page, headline, { x: x + 14, y: y - 38, width: width - 28, font: fonts.bold, size: 10, lineHeight: 11.6, color: C.ink, maxLines: 2 });
  drawWrapped(page, body, { x: x + 14, y: y - 62, width: width - 28, font: fonts.regular, size: 9, lineHeight: 10.6, color: C.muted, maxLines: 3 });
};

const selectedProducts = (model) => {
  const products = [...asArray(model.products?.additionalProducts)];
  const maintenance = model.products?.maintenance;
  if (maintenance?.selected) {
    const key = normalize(maintenance.name);
    const included = products.some((product) => product.id === maintenance.id || normalize(product.name || product.shortName) === key);
    if (!included) products.unshift({
      id: maintenance.id,
      name: maintenance.name,
      shortName: maintenance.name,
      familyLabel: 'Scheduled maintenance',
      value: maintenance.description || 'Plan ahead for scheduled service and eligible maintenance benefits.',
      description: 'Bob Maxey will match the vehicle and current mileage to an eligible plan and service schedule.',
      image: '/assets/ford-official/ford-maintenance-wide.png',
      purchaseTiming: 'vehicle-purchase-or-after-sale-within-nvlw',
      purchaseTimingLabel: 'At purchase or while in factory warranty',
      purchaseTimingDetail: 'May be available during the applicable New Vehicle Limited Warranty purchase window, including after the sale when eligible.',
      highlights: [
        'Scheduled maintenance at the requested service interval',
        'Eligible inspections, services, and selected wear items vary by offer',
        'Ford records and the issued agreement confirm the final schedule',
      ],
      eligibility: {
        headline: 'Vehicle, powertrain, mileage, and program eligibility require Ford record review.',
        requirements: ['Current Ford maintenance schedule', 'Eligible vehicle and powertrain', 'Available term and mileage combination'],
        dealerConfirmation: 'Bob Maxey confirms the exact services, interval, term, and price.',
        inspectionPolicy: 'The current offer controls any inspection or enrollment requirement.',
      },
      cautions: ['The issued agreement controls covered services, service locations, cancellation, and transfer terms.'],
      selectedOptions: [],
      configuration: { labels: compact([maintenance.intervalLabel]), serviceIntervalMiles: maintenance.intervalMiles, serviceIntervalLabel: maintenance.intervalLabel, status: maintenance.status },
    });
  }
  return products.reduce((result, product) => {
    const key = normalize(product.name || product.shortName || product.id);
    if (key && !result.some((entry) => entry.id === product.id || normalize(entry.name || entry.shortName || entry.id) === key)) result.push(product);
    return result;
  }, []);
};

const productConfiguration = (product) => {
  const identity = normalize(product.name || product.shortName).replace(/\b(?:ford protect|plan|program)\b/g, '').trim();
  return unique([
    ...asArray(product.selectedOptions).map((option) => option.name || option.label),
    ...asArray(product.configuration?.labels),
    product.configuration?.termLabel,
    product.configuration?.mileageLabel,
    product.configuration?.serviceIntervalLabel,
    product.configuration?.engineHoursLabel,
    product.configuration?.benefitAmountLabel,
  ]).filter((label) => {
    const labelIdentity = normalize(label).replace(/\b(?:ford protect|plan|program)\b/g, '').trim();
    return /(?:month|year|mile|hour|every|benefit|deductible|\$)/i.test(label) || labelIdentity !== identity;
  });
};

const primaryTermLine = (snapshot) => compact([
  snapshot.coverage.term.label,
  snapshot.coverage.term.mileageLabel,
  (snapshot.program || snapshot.coverage.program) === 'enginecare' ? snapshot.coverage.term.engineHoursLabel : null,
]).join('  |  ');

const formatDate = (value, fallback = 'To be confirmed') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value) || fallback;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
};

const humanizeTiming = (value) => {
  if (!value) return '';
  if (typeof value === 'object') {
    return safeText(value.purchaseTimingDetail || value.purchaseTimingLabel || getProductTimingPresentation(value).detail);
  }
  return safeText(getProductTimingPresentation(value).label);
};

const coverageGroups = (snapshot) => asArray(snapshot.coverage.coverageGroups).map((group) => ({
  title: safeText(group.title || group.name || 'Coverage group'),
  summary: safeText(group.summary || group.description || 'Covered components are subject to the issued agreement.'),
  items: asArray(group.items).map((item) => itemText(item)).filter(Boolean),
}));

const drawOverviewPage = (pdf, model, assets, fonts) => {
  const page = addPage(pdf, assets, fonts, model.document.statusLabel);
  const snapshot = model.snapshot;
  const summary = model.requestSummary;
  const products = selectedProducts(model);

  /* Magazine-style hero: the photo carries the emotion, while the navy panel
     gives the personalized message a crisp, repeatable place to live. */
  page.drawRectangle({ x: PAGE.margin, y: 493, width: PAGE.contentWidth, height: 215, color: C.surface });
  if (assets.hero) {
    const imageWidth = 335;
    const scale = imageWidth / assets.hero.width;
    const imageHeight = assets.hero.height * scale;
    page.drawImage(assets.hero, { x: PAGE.margin, y: 493 + (215 - imageHeight) / 2, width: imageWidth, height: imageHeight });
  }
  page.drawRectangle({ x: 327, y: 493, width: 249, height: 215, color: C.navy, opacity: 0.97 });
  page.drawRectangle({ x: 327, y: 493, width: 5, height: 215, color: C.blue });
  drawWrapped(page, safeText(model.cover.eyebrow).toUpperCase(), { x: 352, y: 678, width: 198, font: fonts.bold, size: 8.2, lineHeight: 9.4, color: rgb(126 / 255, 197 / 255, 1), maxLines: 2 });
  drawWrapped(page, model.cover.headline, { x: 352, y: 638, width: 198, font: fonts.bold, size: 22.5, lineHeight: 25.5, color: C.white, maxLines: 3 });
  drawWrapped(page, model.cover.subhead, { x: 352, y: 565, width: 198, font: fonts.regular, size: 9.5, lineHeight: 12.2, color: C.white, maxLines: 3 });
  page.drawText(`REFERENCE ${safeText(snapshot.quoteId)}`, { x: 352, y: 518, size: 8.3, font: fonts.bold, color: C.white });

  const half = (PAGE.contentWidth - 10) / 2;
  page.drawRectangle({ x: PAGE.margin, y: 417, width: half, height: 62, color: C.surfaceBlue });
  drawLabelValue(page, 'Prepared for', model.cover.preparedFor, { x: 50, y: 461, width: half - 28 }, fonts, { size: 12.2, maxLines: 1 });
  drawWrapped(page, model.cover.purchaseContextLabel, { x: 50, y: 433, width: half - 28, font: fonts.regular, size: 8.9, lineHeight: 10.5, color: C.muted, maxLines: 2 });
  page.drawRectangle({ x: PAGE.margin + half + 10, y: 417, width: half, height: 62, color: C.surface });
  drawLabelValue(page, 'Vehicle', snapshot.vehicle.displayName, { x: PAGE.margin + half + 24, y: 461, width: half - 28 }, fonts, { size: 11.4, maxLines: 1 });
  drawWrapped(page, compact([snapshot.vehicle.currentMileageLabel, snapshot.vehicle.powertrain, snapshot.vehicle.vinComplete ? `VIN ${snapshot.vehicle.vin}` : 'VIN pending']).join('  |  '), { x: PAGE.margin + half + 24, y: 433, width: half - 28, font: fonts.regular, size: 8.8, lineHeight: 10.5, color: snapshot.vehicle.vinComplete ? C.muted : C.amber, maxLines: 2 });

  page.drawText(snapshot.program === 'products-only' ? 'YOUR SELECTED PRODUCTS' : 'YOUR SELECTED PROTECTION', { x: PAGE.margin, y: 395, size: 8.5, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, snapshot.coverage.planName, {
    x: PAGE.margin,
    y: 369,
    width: 208,
    font: fonts.bold,
    size: 17,
    lineHeight: 18.5,
    color: C.navy,
    maxLines: 2,
  });
  const metrics = snapshot.program === 'products-only'
    ? [['Request type', 'Ford Protect products only'], ['Products selected', String(products.length)], ['Expected transaction', snapshot.transactionMethodLabel], ['Configuration', 'Product-specific']]
    : snapshot.program === 'csp'
      ? [['Term', snapshot.coverage.term.label], ['Mileage', snapshot.coverage.term.mileageLabel], ['Prior coverage', snapshot.coverage.qualification.cspPriorCoverageLabel], ['Plan basis', snapshot.coverage.planPathLabel]]
    : snapshot.program === 'enginecare'
      ? [['Term', snapshot.coverage.term.label], ['Mileage', snapshot.coverage.term.mileageLabel], ['Engine hours', snapshot.coverage.term.engineHoursLabel], ['Deductible', snapshot.coverage.deductible.label]]
      : [['Term', snapshot.coverage.term.label], ['Mileage', snapshot.coverage.term.mileageLabel], ['Deductible', snapshot.coverage.deductible.label], ['Plan basis', snapshot.coverage.planPathLabel]];
  const metricsX = 260;
  const metricWidth = (576 - metricsX) / 2;
  metrics.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = metricsX + column * metricWidth;
    const top = 397 - row * 40;
    if (column) page.drawLine({ start: { x, y: top - 31 }, end: { x, y: top }, thickness: 0.6, color: C.line });
    page.drawText(label.toUpperCase(), { x: x + 12, y: top - 10, size: 7.7, font: fonts.bold, color: C.blueDark });
    drawWrapped(page, value, { x: x + 12, y: top - 27, width: metricWidth - 24, font: fonts.bold, size: 8.8, lineHeight: 10, color: C.ink, maxLines: 2 });
  });

  const productValueItems = products.flatMap((product) => productValueBullets(product).slice(0, 1));
  const valueItems = unique(snapshot.program === 'products-only' ? [
    ...productValueItems,
    'Options matched to how you plan to own and use the vehicle',
    'Each product is reviewed for vehicle and purchase-timing eligibility',
    'The issued agreement confirms exact benefits, limits, and exclusions',
  ] : [
    ...asArray(snapshot.coverage.selectedPlanBenefits).map((benefit) => benefit.title || benefit.name),
    'Genuine Ford parts and factory-trained service',
    'Nationwide Ford and Lincoln dealer support',
    'Transferable where the issued agreement allows',
  ]).slice(0, 4);
  page.drawRectangle({ x: PAGE.margin, y: 211, width: PAGE.contentWidth, height: 102, color: C.navySoft });
  const valueWidth = PAGE.contentWidth / 4;
  valueItems.forEach((item, index) => {
    const x = PAGE.margin + index * valueWidth;
    if (index) page.drawLine({ start: { x, y: 229 }, end: { x, y: 295 }, thickness: 0.55, color: rgb(41 / 255, 101 / 255, 157 / 255) });
    page.drawText(String(index + 1).padStart(2, '0'), { x: x + 14, y: 281, size: 8.1, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
    drawWrapped(page, item, { x: x + 14, y: 260, width: valueWidth - 28, font: fonts.bold, size: 8.9, lineHeight: 10.5, color: C.white, maxLines: 4 });
  });

  const inspection = snapshot.coverage.inspection;
  const inspectionColors = inspectionPalette(inspection);
  drawStatusPanel(page, {
    x: PAGE.margin, y: 195, width: half, height: 88, label: 'Inspection path',
    headline: inspection?.label || 'Ford record review required',
    body: inspectionCardSummary(inspection, snapshot.program),
    background: inspectionColors.background, accent: inspectionColors.accent,
  }, fonts);
  drawStatusPanel(page, {
    x: PAGE.margin + half + 10, y: 195, width: half, height: 88, label: 'Payment preference',
    headline: summary.payment.preference || 'Review payment choices', body: snapshot.program === 'products-only'
      ? 'Bob Maxey confirms the current price and any payment choices that apply to the selected products.'
      : snapshot.program === 'csp' ? CSP_PAYMENT_CARD_MESSAGE : PAYMENT_CARD_MESSAGE,
    background: C.surfaceBlue, accent: C.blueDark,
  }, fonts);

  const productNames = products.map((product) => product.shortName || product.name);
  page.drawText(snapshot.program === 'products-only' ? 'SELECTED PRODUCTS' : 'ADDITIONAL PRODUCTS', { x: PAGE.margin, y: 94, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, productNames.length ? productNames.join('  |  ') : 'No additional products requested.', { x: PAGE.margin, y: 76, width: 300, font: fonts.bold, size: 8.9, lineHeight: 10.5, color: C.ink, maxLines: 2 });
  page.drawText(safeText(model.document.statusLabel).toUpperCase(), { x: 367, y: 94, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, 'Bob Maxey confirms the Ford record, eligible combinations, exact coverage, price, and agreement before enrollment.', { x: 367, y: 76, width: 209, font: fonts.regular, size: 8.4, lineHeight: 10, color: C.muted, maxLines: 3 });
};

const drawCoverageCard = (page, group, { x, top, width, height }, fonts) => {
  page.drawRectangle({ x, y: top - height, width, height, color: C.surface });
  page.drawRectangle({ x, y: top - height, width: 3, height, color: C.blue });
  page.drawText(truncate(group.title, fonts.bold, 9.5, width - 22), { x: x + 12, y: top - 18, size: 9.5, font: fonts.bold, color: C.navy });
  if (height < 110) {
    const compactDetails = compact([
      group.summary,
      ...group.items.slice(0, 4),
    ]).map((item) => safeText(item).replace(/[.;:\s]+$/u, '')).join('; ');
    drawWrapped(page, `${compactDetails}.`, {
      x: x + 12,
      y: top - 35,
      width: width - 22,
      font: fonts.regular,
      size: 9,
      lineHeight: 10.2,
      color: C.muted,
    });
    return;
  }
  const summaryBottom = drawWrapped(page, group.summary || 'Covered components are confirmed in the issued agreement.', {
    x: x + 12,
    y: top - 37,
    width: width - 22,
    font: fonts.regular,
    size: 8.5,
    lineHeight: 10,
    color: C.muted,
    maxLines: 2,
  });
  drawBullets(page, group.items.length ? group.items : ['Exact covered components are listed in the issued agreement.'], {
    x: x + 12,
    y: summaryBottom - 5,
    width: width - 22,
    fonts,
    size: 8.6,
    lineHeight: 9.8,
    maxItems: 6,
    maxLines: 2,
  });
};

const drawNextSteps = (page, model, { y, height }, fonts) => {
  page.drawText('WHAT HAPPENS NEXT', { x: PAGE.margin, y, size: 8.6, font: fonts.bold, color: C.blueDark });
  const gap = 7;
  const width = (PAGE.contentWidth - gap * 3) / 4;
  asArray(model.nextSteps).slice(0, 4).forEach((step, index) => {
    const x = PAGE.margin + index * (width + gap);
    const top = y - 13;
    page.drawRectangle({ x, y: top - height, width, height, color: index === 1 ? C.surfaceBlue : C.surface });
    page.drawText(`${safeText(step.number)}. ${truncate(step.title, fonts.bold, 9.1, width - 20)}`, { x: x + 10, y: top - 18, size: 9.1, font: fonts.bold, color: C.navy });
    drawWrapped(page, step.text, { x: x + 10, y: top - 36, width: width - 20, font: fonts.regular, size: 9, lineHeight: 10.2, color: C.muted, maxLines: 2 });
  });
  return y - 13 - height;
};

const drawCoveragePage = (pdf, model, assets, fonts, pageGroups = [], pageIndex = 0, pageCount = 1) => {
  const page = addPage(pdf, assets, fonts, `${model.document.shortStatusLabel || model.document.statusLabel} | Plan coverage`);
  const snapshot = model.snapshot;
  const benefits = asArray(snapshot.coverage.selectedPlanBenefits).map((benefit) => benefit.title || benefit.name).filter(Boolean);
  const selectedOptions = asArray(snapshot.coverage.selectedPlanOptions).map((option) => `${option.name}${option.description ? ` - ${option.description}` : ''}`);
  const visibleGroups = pageGroups.length ? pageGroups : [{
    title: 'Vehicle-specific coverage',
    summary: snapshot.coverage.coverageModel || 'The current Ford offer and issued agreement identify the covered components.',
    items: ['Bob Maxey confirms the exact covered systems before enrollment.'],
  }];
  const firstPage = pageIndex === 0;
  const lastPage = pageIndex === pageCount - 1;

  page.drawRectangle({ x: PAGE.margin, y: 580, width: PAGE.contentWidth, height: 128, color: C.navy });
  page.drawRectangle({ x: PAGE.margin, y: 580, width: 6, height: 128, color: C.blue });
  page.drawText(safeText(firstPage ? snapshot.coverage.programLabel : `Coverage continued | ${pageIndex + 1} of ${pageCount}`).toUpperCase(), { x: 58, y: 681, size: 8.3, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
  drawWrapped(page, firstPage ? `${snapshot.coverage.planName}: protection built around your Ford.` : `More ${snapshot.coverage.planName} covered systems.`, { x: 58, y: 651, width: 352, font: fonts.bold, size: 21, lineHeight: 23.5, color: C.white, maxLines: 2 });
  drawWrapped(page, firstPage ? snapshot.coverage.bestFor || snapshot.coverage.coverageModel || model.coverage.note : 'Component examples are grouped by vehicle system so the selected plan is easy to understand.', { x: 58, y: 600, width: 352, font: fonts.regular, size: 9.2, lineHeight: 11.2, color: C.white, maxLines: 3 });
  page.drawLine({ start: { x: 426, y: 598 }, end: { x: 426, y: 690 }, thickness: 0.7, color: rgb(45 / 255, 102 / 255, 157 / 255) });
  drawWrapped(page, snapshot.coverage.componentCountLabel || snapshot.coverage.componentCount || 'Vehicle-specific coverage', { x: 445, y: 664, width: 111, font: fonts.bold, size: 12.2, lineHeight: 14.1, color: C.white, maxLines: 3 });
  drawWrapped(page, primaryTermLine(snapshot), { x: 445, y: 612, width: 111, font: fonts.regular, size: 8.4, lineHeight: 10.2, color: C.white, maxLines: 3 });

  page.drawText(firstPage ? 'COVERAGE GROUPS AND INCLUDED COMPONENT EXAMPLES' : 'ADDITIONAL COVERAGE GROUPS AND COMPONENT EXAMPLES', { x: PAGE.margin, y: 558, size: 8.6, font: fonts.bold, color: C.blueDark });
  const columns = 2;
  const gap = 8;
  const cardWidth = (PAGE.contentWidth - gap) / columns;
  const rowCount = Math.max(1, Math.ceil(visibleGroups.length / columns));
  const gridHeight = Math.min(300, Math.max(146, rowCount * 146 + Math.max(0, rowCount - 1) * gap));
  const cardHeight = (gridHeight - Math.max(0, rowCount - 1) * gap) / rowCount;
  const gridTop = 545;
  visibleGroups.forEach((group, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawCoverageCard(page, group, { x: PAGE.margin + column * (cardWidth + gap), top: gridTop - row * (cardHeight + gap), width: cardWidth, height: cardHeight }, fonts);
  });
  const cursor = gridTop - gridHeight - 12;

  const cspGuidanceHeight = snapshot.program === 'csp' ? 66 : 0;
  if (cspGuidanceHeight) {
    const guidanceItems = [
      ['Keep coverage active', 'Pay each monthly amount by its due date and keep the agreement current.'],
      ['Before a repair', 'Contact an authorized Ford or Lincoln dealer and obtain authorization before covered work.'],
      ['Review ownership changes', 'Check cancellation and transfer provisions in the returned agreement before enrollment.'],
    ];
    page.drawRectangle({ x: PAGE.margin, y: cursor - cspGuidanceHeight, width: PAGE.contentWidth, height: cspGuidanceHeight, color: C.navySoft });
    page.drawText('USING CONTINUED COVERAGE', { x: 50, y: cursor - 14, size: 8.1, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
    const guidanceWidth = PAGE.contentWidth / guidanceItems.length;
    guidanceItems.forEach(([headline, body], index) => {
      const x = PAGE.margin + index * guidanceWidth;
      if (index) page.drawLine({ start: { x, y: cursor - 57 }, end: { x, y: cursor - 19 }, thickness: 0.55, color: rgb(41 / 255, 101 / 255, 157 / 255) });
      page.drawText(headline.toUpperCase(), { x: x + 14, y: cursor - 30, size: 7.7, font: fonts.bold, color: C.white });
      drawWrapped(page, body, { x: x + 14, y: cursor - 43, width: guidanceWidth - 28, font: fonts.regular, size: 7.8, lineHeight: 8.7, color: C.white, maxLines: 3 });
    });
  }

  const half = (PAGE.contentWidth - 10) / 2;
  const panelTop = snapshot.program === 'csp'
    ? cursor - cspGuidanceHeight - 12
    : Math.min(cursor, 300);
  const panelHeight = 79;
  const decoded = snapshot.vehicle.decoded || {};
  const decodedIdentity = unique([
    decoded.trim || decoded.series,
    decoded.bodyClass || decoded.bodyCabType,
  ]).filter((value) => value && !normalize(snapshot.vehicle.displayName).includes(normalize(value)));
  const decodedPowertrain = unique([
    decoded.engineDescription,
    decoded.driveType,
    decoded.transmission,
  ]).filter(Boolean);
  page.drawRectangle({ x: PAGE.margin, y: panelTop - panelHeight, width: half, height: panelHeight, color: C.surfaceBlue });
  page.drawText('VEHICLE AND COVERAGE RECORD', { x: 50, y: panelTop - 19, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawBullets(page, [
    compact([snapshot.vehicle.displayName, ...decodedIdentity]).join(' | '),
    compact([snapshot.vehicle.currentMileageLabel, `VIN: ${snapshot.vehicle.vin || 'To be confirmed'}`]).join(' | '),
    compact([
      decodedPowertrain.join(' | '),
      `In service: ${formatDate(snapshot.vehicle.inServiceDate, snapshot.vehicle.inServiceDateDisplay || 'To be confirmed')}`,
    ]).join(' | '),
  ], { x: 50, y: panelTop - 38, width: half - 28, fonts, size: 8.1, lineHeight: 9.4, maxItems: 3, maxLines: 1 });
  const guidanceX = PAGE.margin + half + 10;
  page.drawRectangle({ x: guidanceX, y: panelTop - panelHeight, width: half, height: panelHeight, color: C.surface });
  page.drawText(lastPage ? 'BENEFITS AND REQUESTED OPTIONS' : 'HOW TO GET THE MOST FROM COVERAGE', { x: guidanceX + 14, y: panelTop - 19, size: 8.2, font: fonts.bold, color: C.blueDark });
  const guidanceItems = lastPage ? [
    ...(benefits.length ? benefits : ['Ford-backed repair support']),
    ...(selectedOptions.length ? selectedOptions : ['No optional primary-plan benefits requested']),
  ].slice(0, 4) : [
    'Follow the maintenance schedule and retain service records',
    'Contact an authorized servicing dealer before a covered repair',
    'Review authorization, deductible, rental, and roadside provisions',
  ];
  if (lastPage) {
    drawBullets(page, guidanceItems, { x: guidanceX + 14, y: panelTop - 38, width: half - 28, fonts, size: 9, lineHeight: 9.6, maxItems: 4, maxLines: 1 });
  } else {
    drawWrapped(page, guidanceItems.join('; '), { x: guidanceX + 14, y: panelTop - 38, width: half - 28, font: fonts.regular, size: 9, lineHeight: 9.6, color: C.ink, maxLines: 4 });
  }

  const inspection = snapshot.coverage.inspection;
  const palette = inspectionPalette(inspection);
  const statusTop = panelTop - panelHeight - 10;
  page.drawRectangle({ x: PAGE.margin, y: 53, width: PAGE.contentWidth, height: Math.max(40, statusTop - 53), color: palette.background });
  page.drawRectangle({ x: PAGE.margin, y: 53, width: 4, height: Math.max(40, statusTop - 53), color: palette.accent });
  page.drawText('INSPECTION, ELIGIBILITY, AND AGREEMENT', { x: 50, y: statusTop - 19, size: 8.2, font: fonts.bold, color: palette.accent });
  const qualificationDetail = snapshot.program === 'csp' ? `${snapshot.coverage.qualification.cspPriorCoverageDetail} ` : '';
  drawWrapped(page, `${inspection?.label || 'Ford record review required'}. ${qualificationDetail}${inspectionSummary(inspection, snapshot.program)} The issued agreement controls the exact covered components, exclusions, limits, service requirements, and claims decisions.`, { x: 50, y: statusTop - 38, width: 506, font: fonts.regular, size: 8.6, lineHeight: 10.2, color: C.ink, maxLines: snapshot.program === 'csp' ? 10 : 4 });
  if (snapshot.program === 'csp') {
    const offerChecks = [
      ['Coverage level', 'Ultimate or Standard Plus and the listed covered components.'],
      ['Monthly details', 'Amount, effective date, payment method, and first due date.'],
      ['Agreement terms', 'Cancellation, transfer, expiration, and state-specific provisions.'],
    ];
    page.drawLine({ start: { x: 50, y: statusTop - 78 }, end: { x: 556, y: statusTop - 78 }, thickness: 0.55, color: C.line });
    page.drawText("FORD'S RETURNED OFFER SHOULD CONFIRM", { x: 50, y: statusTop - 94, size: 7.8, font: fonts.bold, color: palette.accent });
    const checkWidth = 506 / offerChecks.length;
    offerChecks.forEach(([headline, body], index) => {
      const x = 50 + index * checkWidth;
      if (index) page.drawLine({ start: { x, y: statusTop - 151 }, end: { x, y: statusTop - 101 }, thickness: 0.55, color: C.line });
      page.drawText(headline.toUpperCase(), { x: x + (index ? 10 : 0), y: statusTop - 111, size: 7.7, font: fonts.bold, color: C.ink });
      drawWrapped(page, body, { x: x + (index ? 10 : 0), y: statusTop - 125, width: checkWidth - (index ? 20 : 10), font: fonts.regular, size: 7.8, lineHeight: 8.7, color: C.ink, maxLines: 3 });
    });
  }
};

const productTimingText = (product) => safeText(
  product.purchaseTimingDetail
  || product.purchaseTimingLabel
  || humanizeTiming(product),
);

const productEligibilityText = (product) => compact([
  productTimingText(product),
  product.eligibility?.inspectionPolicy,
  product.eligibility?.dealerConfirmation,
  product.eligibility?.headline,
]).join(' ');

const productEligibilityDetails = (product) => unique([
  productTimingText(product),
  product.eligibility?.inspectionPolicy,
  product.eligibility?.dealerConfirmation,
  product.eligibility?.headline,
]);

const sharedProductEligibility = (products) => {
  const entries = products.flatMap((product) => productEligibilityDetails(product));
  if (products.length === 1) {
    return { details: entries, keys: new Set(entries.map((value) => normalize(value))) };
  }
  const counts = entries.reduce((result, value) => {
    const key = normalize(value);
    result.set(key, (result.get(key) || 0) + 1);
    return result;
  }, new Map());
  const details = unique(entries.filter((value) => (counts.get(normalize(value)) || 0) > 1));
  const keys = new Set(details.map((value) => normalize(value)));
  const timingDetails = unique(products.map((product) => productTimingText(product)));
  const timingLabels = unique(products.map((product) => product.purchaseTimingShortLabel
    || getProductTimingPresentation(product.purchaseTiming || product).shortLabel));
  if (timingLabels.length === 1 && timingDetails.length) {
    timingDetails.forEach((value) => keys.add(normalize(value)));
    const timingKeys = new Set(timingDetails.map((value) => normalize(value)));
    const withoutTiming = details.filter((value) => !timingKeys.has(normalize(value)));
    const preferredTiming = [...timingDetails].sort((left, right) => right.length - left.length)[0];
    return { details: unique([preferredTiming, ...withoutTiming]), keys };
  }
  return { details, keys };
};

const productSpecificEligibilityItems = (product, sharedEligibilityKeys = new Set()) => {
  const timing = product.purchaseTimingShortLabel
    || getProductTimingPresentation(product.purchaseTiming || product).shortLabel;
  return unique([
    timing ? `Purchase timing: ${timing}` : '',
    ...asArray(product.eligibility?.requirements),
    ...productEligibilityDetails(product).filter((value) => !sharedEligibilityKeys.has(normalize(value))),
  ]);
};

const productDetailItems = (product, pattern) => asArray(product.detailSections)
  .filter((section) => pattern.test(itemText(section?.title)))
  .flatMap((section) => asArray(section?.items));

const productReasonsToConsider = (product) => unique([
  ...productDetailItems(product, /when|why|choose|consider|fit|use/i),
]);

const productImportantLimits = (product) => unique([
  product.description,
  ...asArray(product.cautions),
  ...productDetailItems(product, /limit|important|exclude|restriction/i),
]);

const compactEligibilityText = (product) => {
  const timing = product.purchaseTimingShortLabel
    || getProductTimingPresentation(product.purchaseTiming || product).shortLabel;
  return `${safeText(timing)}; Bob Maxey confirms VIN-specific eligibility and current terms.`;
};

const productValueBullets = (product) => unique([
  ...asArray(product.highlights),
  ...asArray(product.selectedOptions).map((option) => itemText(option)),
  ...asArray(product.detailSections)
    .filter((section) => /cover|benefit|include|protect|service|repair|value/i.test(itemText(section?.title)))
    .flatMap((section) => asArray(section?.items)),
]).filter(Boolean);

const drawProductCard = (page, product, image, { x, top, width, height }, fonts, { sharedEligibilityKeys = new Set() } = {}) => {
  page.drawRectangle({ x, y: top - height, width, height, color: C.white, borderColor: C.line, borderWidth: 0.8 });
  page.drawRectangle({ x, y: top - height, width: 4, height, color: C.blue });
  if (height < 120 && width > 400) {
    const imageWidth = 62;
    const imageHeight = 42;
    drawImageContain(page, image, { x: x + 12, y: top - imageHeight - 12, width: imageWidth, height: imageHeight, background: C.surface });
    const titleX = x + imageWidth + 24;
    const titleWidth = 196;
    page.drawText(truncate(product.familyLabel || product.eyebrow || 'Ford Protect product', fonts.bold, 7.4, titleWidth), { x: titleX, y: top - 14, size: 7.4, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(product.name || product.shortName || 'Product selection', fonts.bold, 11.4, titleWidth), { x: titleX, y: top - 30, size: 11.4, font: fonts.bold, color: C.navy });
    drawWrapped(page, product.value || product.description || 'Ford-backed ownership protection.', { x: titleX, y: top - 44, width: titleWidth, font: fonts.regular, size: 8.1, lineHeight: 9.2, color: C.muted, maxLines: 2 });

    const detailX = x + 304;
    const detailWidth = width - 318;
    const valueBullets = productValueBullets(product);
    const config = productConfiguration(product);
    page.drawText('REQUESTED', { x: detailX, y: top - 14, size: 7.2, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(config.join(' | ') || 'Current eligible option', fonts.bold, 8.2, detailWidth), { x: detailX, y: top - 27, size: 8.2, font: fonts.bold, color: C.ink });
    page.drawText('VALUE', { x: detailX, y: top - 42, size: 7.2, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(valueBullets[0] || product.description || 'Coverage value confirmed with agreement', fonts.regular, 8.1, detailWidth), { x: detailX, y: top - 55, size: 8.1, font: fonts.regular, color: C.ink });
    page.drawText(truncate(compactEligibilityText(product), fonts.regular, 7.7, detailWidth), { x: detailX, y: top - 69, size: 7.7, font: fonts.regular, color: C.muted });
    return;
  }
  if (height >= 220 && height < 300 && width > 400) {
    const imageWidth = 70;
    const imageHeight = 48;
    drawImageContain(page, image, { x: x + 12, y: top - imageHeight - 12, width: imageWidth, height: imageHeight, background: C.surface });
    const bodyX = x + imageWidth + 24;
    const bodyWidth = width - imageWidth - 36;
    const valueBullets = productValueBullets(product);
    const config = productConfiguration(product);
    page.drawText(truncate(product.familyLabel || product.eyebrow || 'Ford Protect product', fonts.bold, 8.4, bodyWidth), { x: bodyX, y: top - 17, size: 8.4, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(product.name || product.shortName || 'Product selection', fonts.bold, 12, bodyWidth), { x: bodyX, y: top - 34, size: 12, font: fonts.bold, color: C.navy });
    drawWrapped(page, product.value || product.description || 'Ford-backed ownership protection.', { x: bodyX, y: top - 50, width: bodyWidth, font: fonts.regular, size: 9, lineHeight: 9.8, color: C.muted, maxLines: 2 });

    const ruleY = top - 72;
    drawRule(page, ruleY, x + 12, width - 24);
    page.drawText('REQUESTED', { x: x + 12, y: ruleY - 17, size: 8.2, font: fonts.bold, color: C.blueDark });
    drawWrapped(page, config.join(' | ') || 'Exact option to confirm', { x: x + 82, y: ruleY - 17, width: width - 96, font: fonts.regular, size: 9, lineHeight: 9.6, color: C.ink, maxLines: 1 });

    const gap = 16;
    const columnWidth = (width - 28 - gap) / 2;
    const valueX = x + 14;
    const eligibilityX = valueX + columnWidth + gap;
    page.drawText('PRODUCT VALUE', { x: valueX, y: ruleY - 39, size: 8.2, font: fonts.bold, color: C.blueDark });
    page.drawText('ELIGIBILITY & TIMING', { x: eligibilityX, y: ruleY - 39, size: 8.2, font: fonts.bold, color: C.blueDark });
    drawBullets(page, valueBullets, { x: valueX, y: ruleY - 57, width: columnWidth, fonts, size: 9, lineHeight: 9.4, maxItems: 8, maxLines: 3 });
    drawBullets(page, productSpecificEligibilityItems(product, sharedEligibilityKeys), { x: eligibilityX, y: ruleY - 57, width: columnWidth, fonts, size: 9, lineHeight: 9.4, maxItems: 8, maxLines: 3 });
    return;
  }
  if (height >= 300 && width > 400) {
    const imageWidth = 155;
    const imageHeight = 105;
    drawImageContain(page, image, { x: x + 12, y: top - imageHeight - 13, width: imageWidth, height: imageHeight, background: C.surface });
    const bodyX = x + imageWidth + 24;
    const bodyWidth = width - imageWidth - 36;
    const valueBullets = productValueBullets(product);
    const config = productConfiguration(product);
    page.drawText(truncate(product.familyLabel || product.eyebrow || 'Ford Protect product', fonts.bold, 9, bodyWidth), { x: bodyX, y: top - 20, size: 9, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(product.name || product.shortName || 'Product selection', fonts.bold, 16, bodyWidth), { x: bodyX, y: top - 45, size: 16, font: fonts.bold, color: C.navy });
    drawWrapped(page, product.value || 'Ford-backed ownership protection.', { x: bodyX, y: top - 68, width: bodyWidth, font: fonts.regular, size: 10, lineHeight: 11.5, color: C.muted, maxLines: 3 });

    const configurationY = top - 171;
    page.drawRectangle({ x: x + 12, y: configurationY, width: width - 24, height: 42, color: C.surfaceBlue });
    page.drawText('REQUESTED CONFIGURATION', { x: x + 26, y: configurationY + 25, size: 8.6, font: fonts.bold, color: C.blueDark });
    drawWrapped(page, config.join(' | ') || 'Exact option and term to be confirmed', { x: x + 188, y: configurationY + 24, width: width - 214, font: fonts.bold, size: 10, lineHeight: 11.2, color: C.ink, maxLines: 2 });

    const gap = 8;
    const panelGap = 10;
    const panelWidth = (width - 28 - panelGap) / 2;
    const panelTop = top - 185;
    const panelBottom = top - height + 14;
    const panelHeight = (panelTop - panelBottom - gap) / 2;
    const panelX = [x + 14, x + 14 + panelWidth + panelGap];
    const drawDetailPanel = (title, items, column, row, background, { maxLines = 3 } = {}) => {
      const itemTop = panelTop - row * (panelHeight + gap);
      page.drawRectangle({ x: panelX[column], y: itemTop - panelHeight, width: panelWidth, height: panelHeight, color: background });
      page.drawRectangle({ x: panelX[column], y: itemTop - panelHeight, width: 3, height: panelHeight, color: C.blue });
      page.drawText(title, { x: panelX[column] + 13, y: itemTop - 21, size: 8.7, font: fonts.bold, color: C.blueDark });
      drawBullets(page, items, { x: panelX[column] + 13, y: itemTop - 43, width: panelWidth - 26, fonts, size: 9.2, lineHeight: 9.8, maxItems: 8, maxLines });
    };
    drawDetailPanel('COVERAGE & VALUE', valueBullets, 0, 0, C.surfaceBlue);
    drawDetailPanel('ELIGIBILITY & TIMING', productSpecificEligibilityItems(product, sharedEligibilityKeys), 1, 0, C.surface);
    drawDetailPanel('REASONS TO CONSIDER', productReasonsToConsider(product), 0, 1, C.surface);
    drawDetailPanel('IMPORTANT LIMITS', productImportantLimits(product), 1, 1, C.surfaceBlue, { maxLines: 4 });
    return;
  }
  const compactCard = height < 140;
  const mediumCard = height < 205;
  const imageWidth = compactCard ? 55 : mediumCard ? 72 : 96;
  const imageHeight = compactCard ? 38 : mediumCard ? 50 : 62;
  drawImageContain(page, image, { x: x + 12, y: top - imageHeight - 13, width: imageWidth, height: imageHeight, background: C.surface });
  const bodyX = x + imageWidth + 23;
  const bodyWidth = width - imageWidth - 35;
  const valueBullets = productValueBullets(product);
  page.drawText(truncate(product.familyLabel || product.eyebrow || 'Ford Protect product', fonts.bold, 8.4, bodyWidth), { x: bodyX, y: top - 18, size: 8.4, font: fonts.bold, color: C.blueDark });
  page.drawText(truncate(product.name || product.shortName || 'Product selection pending review', fonts.bold, compactCard ? 11.2 : 13, bodyWidth), { x: bodyX, y: top - 38, size: compactCard ? 11.2 : 13, font: fonts.bold, color: C.navy });
  drawWrapped(page, product.value || product.description || valueBullets[0] || 'Product details require specialist confirmation.', { x: bodyX, y: top - 56, width: bodyWidth, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.muted, maxLines: compactCard ? 1 : mediumCard ? 2 : 3 });
  const ruleY = top - imageHeight - 24;
  drawRule(page, ruleY, x + 12, width - 24);

  const config = productConfiguration(product);
  if (compactCard) {
    page.drawText('REQUESTED', { x: x + 12, y: ruleY - 16, size: 8.1, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(config.join(' | ') || 'Exact option to confirm', fonts.regular, 9, width - 92), { x: x + 79, y: ruleY - 16, size: 9, font: fonts.regular, color: C.ink });
    page.drawText('VALUE', { x: x + 12, y: ruleY - 33, size: 8.1, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(valueBullets[0] || product.description || 'Benefits require specialist confirmation', fonts.regular, 9, width - 72), { x: x + 59, y: ruleY - 33, size: 9, font: fonts.regular, color: C.ink });
    page.drawText('ELIGIBILITY', { x: x + 12, y: ruleY - 50, size: 8.1, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(compactEligibilityText(product), fonts.regular, 9, width - 93), { x: x + 81, y: ruleY - 50, size: 9, font: fonts.regular, color: C.ink });
    return;
  }
  if (mediumCard) {
    page.drawText('REQUESTED CONFIGURATION', { x: x + 12, y: ruleY - 17, size: 8.2, font: fonts.bold, color: C.blueDark });
    drawWrapped(page, config.join('  |  ') || 'Exact option and term to be confirmed', { x: x + 12, y: ruleY - 34, width: width - 24, font: fonts.regular, size: 9, lineHeight: 10.2, color: C.ink, maxLines: 2 });
    page.drawText('VALUE AND ELIGIBILITY', { x: x + 12, y: ruleY - 61, size: 8.2, font: fonts.bold, color: C.blueDark });
    drawWrapped(page, compact([valueBullets[0], productEligibilityText(product)]).join(' '), { x: x + 12, y: ruleY - 78, width: width - 24, font: fonts.regular, size: 9, lineHeight: 10.2, color: C.ink, maxLines: 3 });
    return;
  }
  const gap = 10;
  const columnWidth = (width - 34 - gap * 2) / 3;
  const columnX = [x + 14, x + 14 + columnWidth + gap, x + 14 + (columnWidth + gap) * 2];
  ['REQUESTED CONFIGURATION', 'PRODUCT VALUE', 'ELIGIBILITY & TIMING'].forEach((label, index) => {
    page.drawText(label, { x: columnX[index], y: ruleY - 18, size: 8.2, font: fonts.bold, color: C.blueDark });
  });
  drawWrapped(page, config.join('  |  ') || 'Exact option and term to be confirmed', { x: columnX[0], y: ruleY - 36, width: columnWidth, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.ink, maxLines: 6 });
  const detailLines = Math.max(6, Math.floor((height - 135) / 10.4));
  drawWrapped(page, valueBullets.slice(0, 8).join('; ') || 'Product benefits require specialist confirmation.', { x: columnX[1], y: ruleY - 36, width: columnWidth, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.ink, maxLines: detailLines });
  drawWrapped(page, productEligibilityText(product) || 'Bob Maxey confirms VIN-specific eligibility, timing, and current terms.', { x: columnX[2], y: ruleY - 36, width: columnWidth, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.ink, maxLines: detailLines });
};

const drawProductsPage = async (pdf, model, assets, fonts) => {
  const products = selectedProducts(model);
  if (!products.length) return;
  const imageEntries = await Promise.all(products.map(async (product) => [product.id || product.name, await embedAsset(pdf, product.image)]));
  const images = new Map(imageEntries);
  // Two profiles per page keep the proposal compact while the medium-card
  // layout preserves each product's full value and eligibility record.
  const chunks = getProposalProductChunks(products);
  const sharedEligibility = sharedProductEligibility(products);
  const sharedEligibilityKeys = sharedEligibility.keys;
  chunks.forEach((pageProducts, pageIndex) => {
    const page = addPage(pdf, assets, fonts, `${model.document.shortStatusLabel || model.document.statusLabel} | Selected products`);
    const isLastPage = pageIndex === chunks.length - 1;
    const showSharedEligibility = pageIndex === 0 && sharedEligibility.details.length > 0;
    page.drawRectangle({ x: PAGE.margin, y: 615, width: PAGE.contentWidth, height: 93, color: C.navy });
    page.drawRectangle({ x: PAGE.margin, y: 615, width: 6, height: 93, color: C.blue });
    page.drawText('YOUR SELECTED FORD PROTECT PRODUCTS', { x: 58, y: 682, size: 8.1, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
    const productPageHeadline = chunks.length > 1 ? `Ownership protection, page ${pageIndex + 1} of ${chunks.length}.` : 'Everything selected for your ownership plan.';
    page.drawText(truncate(productPageHeadline, fonts.bold, 15.5, 376), { x: 58, y: 651, size: 15.5, font: fonts.bold, color: C.white });
    drawWrapped(page, 'Requested configuration, product value, purchase timing, and VIN-specific review stay together.', { x: 58, y: 627, width: 376, font: fonts.regular, size: 8.5, lineHeight: 10.1, color: C.white, maxLines: 2 });
    page.drawLine({ start: { x: 455, y: 630 }, end: { x: 455, y: 694 }, thickness: 0.7, color: rgb(45 / 255, 102 / 255, 157 / 255) });
    page.drawText(String(products.length), { x: 478, y: 657, size: 24, font: fonts.bold, color: C.white });
    page.drawText(`PRODUCT${products.length === 1 ? '' : 'S'} REQUESTED`, { x: 478, y: 637, size: 7.5, font: fonts.bold, color: C.white });

    const columns = 1;
    const gap = 7;
    const rows = pageProducts.length;
    const gridTop = 603;
    const cardHeight = pageProducts.length === 1
      ? showSharedEligibility ? 450 : 475
      : pageProducts.length === 2 ? showSharedEligibility ? 220 : 240 : 168;
    const cardWidth = PAGE.contentWidth;
    pageProducts.forEach((product, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      drawProductCard(page, product, images.get(product.id || product.name), { x: PAGE.margin + column * (cardWidth + gap), top: gridTop - row * (cardHeight + gap), width: cardWidth, height: cardHeight }, fonts, { sharedEligibilityKeys });
    });
    const gridBottom = gridTop - rows * cardHeight - Math.max(0, rows - 1) * gap;

    if (showSharedEligibility) {
      const panelY = 49;
      const panelHeight = gridBottom - panelY;
      page.drawRectangle({ x: PAGE.margin, y: panelY, width: PAGE.contentWidth, height: panelHeight, color: C.surfaceBlue });
      page.drawRectangle({ x: PAGE.margin, y: panelY, width: 4, height: panelHeight, color: C.blue });
      page.drawText('SHARED PURCHASE & VIN REVIEW', { x: 52, y: panelY + panelHeight - 22, size: 8.4, font: fonts.bold, color: C.blueDark });
      const reference = `REFERENCE ${safeText(model.snapshot.quoteId)}`;
      page.drawText(reference, { x: 556 - fonts.bold.widthOfTextAtSize(reference, 8.1), y: panelY + panelHeight - 22, size: 8.1, font: fonts.bold, color: C.blueDark });
      drawWrapped(page, sharedEligibility.details.join(' '), { x: 52, y: panelY + panelHeight - 42, width: 504, font: fonts.regular, size: 9, lineHeight: 9.7, color: C.ink });
      return;
    }

    const panelHeight = Math.max(62, gridBottom - 53);
    page.drawRectangle({ x: PAGE.margin, y: 53, width: PAGE.contentWidth, height: panelHeight, color: isLastPage ? C.navy : C.surfaceBlue });
    page.drawText(isLastPage ? 'NEXT: BOB MAXEY SPECIALIST REVIEW' : 'MORE SELECTED PRODUCTS FOLLOW', { x: 52, y: 53 + panelHeight - 23, size: 8.4, font: fonts.bold, color: isLastPage ? C.white : C.blueDark });
    drawWrapped(page, isLastPage
      ? 'The final page keeps contact information, the complete request summary, and the review process together.'
      : 'The next page continues the selected-product details without separating them from this customer request.', {
      x: 52,
      y: 53 + panelHeight - 43,
      width: 370,
      font: fonts.regular,
      size: 8.8,
      lineHeight: 10.4,
      color: isLastPage ? C.white : C.ink,
      maxLines: 3,
    });
    drawLabelValue(page, 'Request reference', model.snapshot.quoteId, { x: 438, y: 53 + panelHeight - 23, width: 118 }, fonts, { size: 9.1, maxLines: 2, color: isLastPage ? C.white : C.ink, labelColor: isLastPage ? rgb(126 / 255, 197 / 255, 1) : C.blueDark });
  });
};

const drawHandoffPage = (pdf, model, assets, fonts) => {
  const page = addPage(pdf, assets, fonts, `${model.document.shortStatusLabel || model.document.statusLabel} | Specialist handoff`);
  const { customer, vehicle, coverage, payment, contact, store } = model.requestSummary;
  const products = selectedProducts(model);

  page.drawRectangle({ x: PAGE.margin, y: 587, width: PAGE.contentWidth, height: 121, color: C.navy });
  page.drawRectangle({ x: PAGE.margin, y: 587, width: 6, height: 121, color: C.blue });
  page.drawText('BOB MAXEY SUPPORT', { x: 58, y: 681, size: 8.4, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
  drawWrapped(page, 'Your request is ready for a vehicle-specific review.', { x: 58, y: 650, width: 360, font: fonts.bold, size: 20.5, lineHeight: 23, color: C.white, maxLines: 2 });
  drawWrapped(page, 'A Ford Protect specialist confirms eligibility, compatible options, current pricing, and the issued agreement before you decide.', { x: 58, y: 603, width: 360, font: fonts.regular, size: 9.2, lineHeight: 11.2, color: C.white, maxLines: 3 });
  drawLabelValue(page, 'Reference', model.snapshot.quoteId, { x: 444, y: 666, width: 112 }, fonts, { size: 10, maxLines: 2, color: C.white, labelColor: rgb(126 / 255, 197 / 255, 1) });

  const half = (PAGE.contentWidth - 10) / 2;
  page.drawRectangle({ x: PAGE.margin, y: 445, width: half, height: 128, color: C.surfaceBlue });
  page.drawText('REQUEST CONTACT', { x: 50, y: 552, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, customer.fullName || 'Customer name to be confirmed', { x: 50, y: 532, width: half - 28, font: fonts.bold, size: 12, lineHeight: 14, color: C.navy, maxLines: 2 });
  drawBullets(page, [
    `Email: ${customer.email || 'To be confirmed'}`,
    `Phone: ${customer.phone || 'To be confirmed'}`,
    `Preferred contact: ${contact.preferredMethod || 'To be confirmed'}`,
    `Location: ${store.descriptor || store.name || 'Bob Maxey Ford'}`,
  ], { x: 50, y: 500, width: half - 28, fonts, size: 8.5, lineHeight: 9.8, maxItems: 4, maxLines: 1 });

  const summaryX = PAGE.margin + half + 10;
  page.drawRectangle({ x: summaryX, y: 445, width: half, height: 128, color: C.surface });
  page.drawText('COMPLETE REQUEST SUMMARY', { x: summaryX + 14, y: 552, size: 8.2, font: fonts.bold, color: C.blueDark });
  const requestSummaryBullets = model.snapshot.program === 'products-only' ? [
    vehicle.displayName,
    `${vehicle.currentMileageLabel} | ${vehicle.vin ? `VIN ${vehicle.vin}` : 'VIN pending'}`,
    `${products.length} selected product${products.length === 1 ? '' : 's'} | Product-specific terms`,
    `Expected transaction: ${model.snapshot.transactionMethodLabel}`,
    `Inspection: ${model.overview.inspection.title}`,
  ] : model.snapshot.program === 'csp' ? [
    vehicle.displayName,
    `${vehicle.currentMileageLabel} | ${vehicle.vin ? `VIN ${vehicle.vin}` : 'VIN pending'}`,
    `${coverage.planName} | ${primaryTermLine(model.snapshot)}`,
    `Prior coverage: ${coverage.qualification.cspPriorCoverageLabel}`,
    `Inspection: ${model.overview.inspection.title}`,
  ] : [
    vehicle.displayName,
    `${vehicle.currentMileageLabel} | ${vehicle.vin ? `VIN ${vehicle.vin}` : 'VIN pending'}`,
    `${coverage.planName} | ${primaryTermLine(model.snapshot)}`,
    `Deductible: ${coverage.deductible.label}`,
    `Inspection: ${model.overview.inspection.title}`,
  ];
  drawBullets(page, requestSummaryBullets, { x: summaryX + 14, y: 531, width: half - 28, fonts, size: 9, lineHeight: 9.8, maxItems: 5, maxLines: 2 });

  page.drawText('WHAT HAPPENS NEXT', { x: PAGE.margin, y: 432, size: 8.6, font: fonts.bold, color: C.blueDark });
  const stepGap = 9;
  const stepWidth = (PAGE.contentWidth - stepGap) / 2;
  asArray(model.nextSteps).slice(0, 4).forEach((step, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = PAGE.margin + column * (stepWidth + stepGap);
    const top = 418 - row * 91;
    page.drawRectangle({ x, y: top - 80, width: stepWidth, height: 80, color: row === 0 ? C.surfaceBlue : C.surface });
    page.drawRectangle({ x: x + 12, y: top - 34, width: 24, height: 24, color: C.blue });
    page.drawText(safeText(step.number), { x: x + 20, y: top - 27, size: 9.2, font: fonts.bold, color: C.white });
    page.drawText(truncate(step.title, fonts.bold, 10, stepWidth - 62), { x: x + 46, y: top - 19, size: 10, font: fonts.bold, color: C.navy });
    drawWrapped(page, step.text, { x: x + 46, y: top - 37, width: stepWidth - 60, font: fonts.regular, size: 8.4, lineHeight: 9.8, color: C.muted, maxLines: 4 });
  });

  page.drawRectangle({ x: PAGE.margin, y: 151, width: PAGE.contentWidth, height: 84, color: C.surfaceBlue });
  page.drawText('YOUR OWNERSHIP PLAN', { x: 50, y: 214, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, products.length ? products.map((product) => product.name).join(' | ') : 'No additional products requested.', { x: 50, y: 194, width: 334, font: fonts.bold, size: 9.2, lineHeight: 10.8, color: C.ink, maxLines: 4 });
  page.drawText('PAYMENT REVIEW', { x: 410, y: 214, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, payment.preference || 'Review payment choices', { x: 410, y: 194, width: 146, font: fonts.bold, size: 8.8, lineHeight: 10.4, color: C.ink, maxLines: 4 });

  page.drawRectangle({ x: PAGE.margin, y: 49, width: PAGE.contentWidth, height: 90, color: C.navySoft });
  page.drawText('IMPORTANT', { x: 50, y: 119, size: 8.2, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
  drawWrapped(page, model.overview.pricing.message || PAYMENT_MESSAGE, { x: 50, y: 101, width: 506, font: fonts.bold, size: 8.7, lineHeight: 10.2, color: C.white, maxLines: 3 });
  drawWrapped(page, model.disclaimer, { x: 50, y: 68, width: 506, font: fonts.regular, size: 7.6, lineHeight: 8.1, color: C.white, maxLines: 3 });
};

const guideConfiguration = (product, selection = {}) => unique([
  selection.optionName,
  selection.termLabel || (selection.termMonths ? `${selection.termMonths} months` : ''),
  selection.mileageLabel || (selection.mileage ? `${Number(selection.mileage).toLocaleString('en-US')} miles` : ''),
  selection.serviceIntervalLabel || (selection.serviceIntervalMiles ? `Every ${Number(selection.serviceIntervalMiles).toLocaleString('en-US')} miles` : ''),
  selection.engineHoursLabel || (selection.engineHours ? `${Number(selection.engineHours).toLocaleString('en-US')} engine hours` : ''),
  selection.benefitAmountLabel || (selection.benefitAmount ? `$${Number(selection.benefitAmount).toLocaleString('en-US')} benefit request` : ''),
  selection.startBasisLabel,
  selection.purchaseWindowLabel,
  ...asArray(selection.labels),
  ...asArray(product.selectedOptions).map((option) => option.name || option.label),
  ...asArray(product.configuration?.labels),
]);

const condenseGuideItems = (items) => {
  const clean = unique(items);
  if (clean.length <= 6) return clean;
  return [...clean.slice(0, 5), `Additional details: ${clean.slice(5).join('; ')}`];
};

const guideBlocks = (product) => [
  { title: 'Product value', items: condenseGuideItems(asArray(product.highlights)) },
  ...asArray(product.detailSections).map((section) => ({ title: section.title || 'Product detail', items: condenseGuideItems(asArray(section.items)) })),
  {
    title: 'Eligibility and specialist review',
    items: condenseGuideItems([product.eligibility?.headline, ...asArray(product.eligibility?.requirements), product.eligibility?.dealerConfirmation, product.eligibility?.inspectionPolicy].filter(Boolean)),
  },
  {
    title: 'Purchase timing and important limits',
    items: condenseGuideItems([humanizeTiming(product.purchaseTiming || product.purchaseTimingLabel), ...asArray(product.cautions)].filter(Boolean)),
  },
].filter((block) => block.items.length);

const GUIDE_BODY_SIZE = 9;
const GUIDE_LINE_HEIGHT = 10.6;

const guideBlockHeight = (block, fonts, width) => 23 + block.items.reduce((height, item) => height + textHeight(item, fonts.regular, GUIDE_BODY_SIZE, width - 15, GUIDE_LINE_HEIGHT, 3) + 3, 0);

const drawGuideBlock = (page, block, { x, y, width }, fonts) => {
  page.drawText(safeText(block.title).toUpperCase(), { x, y, size: 8.5, font: fonts.bold, color: C.blueDark });
  drawRule(page, y - 8, x, width, C.line, 0.7);
  return drawBullets(page, block.items, { x, y: y - 23, width, fonts, size: GUIDE_BODY_SIZE, lineHeight: GUIDE_LINE_HEIGHT, maxItems: 12, maxLines: 3 }) - 3;
};

const splitGuideBlock = (block, fonts, width, availableHeight) => {
  const selected = [];
  let used = 23;
  for (const item of block.items) {
    const itemHeight = textHeight(item, fonts.regular, GUIDE_BODY_SIZE, width - 15, GUIDE_LINE_HEIGHT, 3) + 3;
    if (selected.length && used + itemHeight > availableHeight) break;
    selected.push(item);
    used += itemHeight;
  }
  return [
    { title: block.title, items: selected },
    block.items.length > selected.length ? { title: `${block.title} - continued`, items: block.items.slice(selected.length) } : null,
  ];
};

const drawGuideBlocksInColumns = (page, sourceBlocks, fonts, {
  top,
  bottom,
  columns = [PAGE.margin, 313],
  columnWidth = 263,
} = {}) => {
  const queue = [...sourceBlocks];
  let columnIndex = 0;
  let cursor = top;

  while (queue.length && columnIndex < columns.length) {
    const block = queue.shift();
    const available = cursor - bottom;
    const needed = guideBlockHeight(block, fonts, columnWidth);

    if (needed <= available) {
      cursor = drawGuideBlock(page, block, { x: columns[columnIndex], y: cursor, width: columnWidth }, fonts) - 8;
      continue;
    }

    if (available >= 76) {
      const [first, rest] = splitGuideBlock(block, fonts, columnWidth, available);
      if (first.items.length) drawGuideBlock(page, first, { x: columns[columnIndex], y: cursor, width: columnWidth }, fonts);
      if (rest) queue.unshift(rest);
    } else {
      queue.unshift(block);
    }

    columnIndex += 1;
    cursor = top;
  }

  return queue;
};

const splitGuidePages = (blocks, fonts, width) => {
  const blockHeights = blocks.map((block) => guideBlockHeight(block, fonts, width) + 8);
  const totalHeight = blockHeights.reduce((sum, height) => sum + height, 0);
  const firstPageCapacity = 520;
  if (totalHeight <= firstPageCapacity) return { pageOne: blocks, pageTwo: [] };

  const targetTail = Math.max(190, totalHeight - firstPageCapacity);
  let tailHeight = 0;
  let splitIndex = blocks.length - 1;
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    tailHeight += blockHeights[index];
    splitIndex = index;
    if (tailHeight >= targetTail) break;
  }

  return {
    pageOne: blocks.slice(0, splitIndex),
    pageTwo: blocks.slice(splitIndex),
  };
};

const drawGuideContinuationBand = (page, product, fonts) => {
  page.drawRectangle({ x: PAGE.margin, y: 58, width: PAGE.contentWidth, height: 102, color: C.navySoft });
  page.drawText('PRODUCT GUIDE CONTINUES', { x: 50, y: 132, size: 8.5, font: fonts.bold, color: C.white });
  drawWrapped(page, `Continue to the next page for ${safeText(product.name || product.shortName || 'this product')} eligibility, purchase timing, inspection guidance, and the Bob Maxey review process.`, { x: 50, y: 112, width: 506, font: fonts.regular, size: 9, lineHeight: 10.8, color: C.white, maxLines: 3 });
};

const drawGuideDecisionPanels = (page, quote, fonts) => {
  const gap = 14;
  const width = (PAGE.contentWidth - gap) / 2;
  const y = 176;
  const height = 150;
  const inspection = quote?.inspection || {};

  page.drawRectangle({ x: PAGE.margin, y, width, height, color: C.surfaceBlue });
  page.drawRectangle({ x: PAGE.margin, y, width: 3, height, color: inspection?.required ? C.amber : C.blue });
  page.drawText('VEHICLE REVIEW AND INSPECTION', { x: 50, y: y + height - 24, size: 8.5, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, inspectionSummary(inspection, quote?.program), { x: 50, y: y + height - 47, width: width - 28, font: fonts.regular, size: 9, lineHeight: 10.7, color: C.ink, maxLines: 7 });

  const paymentX = PAGE.margin + width + gap;
  page.drawRectangle({ x: paymentX, y, width, height, color: C.surface });
  page.drawRectangle({ x: paymentX, y, width: 3, height, color: C.green });
  page.drawText('PAYMENT AND AGREEMENT', { x: paymentX + 14, y: y + height - 24, size: 8.5, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, PAYMENT_MESSAGE, { x: paymentX + 14, y: y + height - 47, width: width - 28, font: fonts.regular, size: 9, lineHeight: 10.7, color: C.ink, maxLines: 6 });
  drawWrapped(page, 'The issued agreement controls coverage, exclusions, cancellation terms, and availability.', { x: paymentX + 14, y: y + 49, width: width - 28, font: fonts.bold, size: 9, lineHeight: 10.7, color: C.ink, maxLines: 3 });
};

const drawGuideReviewChecklist = (page, fonts) => {
  const y = 340;
  const height = 96;
  const items = [
    ['01', 'Vehicle record', 'VIN and current odometer'],
    ['02', 'Warranty status', 'Inspection path, if applicable'],
    ['03', 'Current offer', 'Eligible option, term, and price'],
    ['04', 'Agreement', 'Coverage and exclusions to review'],
  ];
  const columnWidth = PAGE.contentWidth / items.length;
  page.drawRectangle({ x: PAGE.margin, y, width: PAGE.contentWidth, height, color: C.navy });
  items.forEach(([number, title, body], index) => {
    const x = PAGE.margin + index * columnWidth;
    if (index) page.drawLine({ start: { x, y: y + 16 }, end: { x, y: y + height - 16 }, thickness: 0.55, color: C.blue });
    page.drawText(number, { x: x + 12, y: y + 68, size: 8.5, font: fonts.bold, color: C.white });
    page.drawText(title, { x: x + 12, y: y + 47, size: 9.3, font: fonts.bold, color: C.white });
    drawWrapped(page, body, { x: x + 12, y: y + 29, width: columnWidth - 24, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.white, maxLines: 2 });
  });
};

const drawGuideClosing = (page, product, quote, fonts, y = 160) => {
  page.drawRectangle({ x: PAGE.margin, y: 58, width: PAGE.contentWidth, height: y - 58, color: C.navySoft });
  page.drawText('NEXT STEP', { x: 50, y: y - 21, size: 8.5, font: fonts.bold, color: C.white });
  drawWrapped(page, `Ask Bob Maxey to confirm ${safeText(product.name || product.shortName || 'this product')} for the vehicle, selected option, current price, and issued agreement.`, { x: 50, y: y - 40, width: 345, font: fonts.regular, size: 9, lineHeight: 10.6, color: C.white, maxLines: 3 });
  const context = quote?.purchaseContext === 'shopping'
    ? 'Planned with a Bob Maxey vehicle purchase'
    : quote?.purchaseContext === 'owner'
      ? 'After-sale request for a vehicle already owned'
      : 'Current purchase timing requires specialist confirmation';
  drawWrapped(page, context, { x: 414, y: y - 29, width: 142, font: fonts.bold, size: 8.6, lineHeight: 10.2, color: C.white, maxLines: 3 });
  const enrollmentGuidance = product.eligibility?.inspectionPolicy
    || product.eligibility?.dealerConfirmation
    || 'Bob Maxey confirms product-specific enrollment requirements before coverage is issued.';
  drawWrapped(page, enrollmentGuidance, { x: 50, y: y - 81, width: 506, font: fonts.regular, size: 8.8, lineHeight: 10.4, color: C.white, maxLines: 3 });
};

const drawGuideContinuationHeader = (page, product, fonts) => {
  page.drawText('FORD PROTECT PRODUCT GUIDE', { x: PAGE.margin, y: PAGE.contentTop, size: 8.8, font: fonts.bold, color: C.blueDark });
  page.drawText(truncate(product.name || product.shortName, fonts.bold, 21, PAGE.contentWidth), { x: PAGE.margin, y: PAGE.contentTop - 29, size: 21, font: fonts.bold, color: C.navy });
  page.drawText('Coverage details, eligibility, timing, and next steps', { x: PAGE.margin, y: PAGE.contentTop - 49, size: 9.3, font: fonts.regular, color: C.muted });
  drawRule(page, PAGE.contentTop - 61);
  return PAGE.contentTop - 78;
};

const planningRange = (values, formatter) => {
  const numbers = unique(asArray(values).flat().map((value) => Number(value)).filter(Number.isFinite)).map(Number).sort((a, b) => a - b);
  if (!numbers.length) return '';
  if (numbers.length === 1) return formatter(numbers[0]);
  return `${formatter(numbers[0])} to ${formatter(numbers[numbers.length - 1])}`;
};

const guideOptionSummary = (product, selection = {}) => {
  const configuration = product.configuration || {};
  const variants = asArray(configuration.variants);
  const selectedVariant = variants.find((variant) => variant.id === selection.variantId) || variants[0] || configuration;
  const matrices = asArray(selectedVariant.termMileageMatrix || configuration.termMileageMatrix);
  const months = asArray(selectedVariant.termMonths || configuration.termMonths).length
    ? asArray(selectedVariant.termMonths || configuration.termMonths)
    : matrices.map((row) => row.months);
  const miles = matrices.flatMap((row) => asArray(row.miles || row.mileage || []).length ? asArray(row.miles || row.mileage) : [row.miles]).filter(Number.isFinite);
  const intervals = asArray(selectedVariant.serviceIntervals || configuration.serviceIntervals);
  const benefits = asArray(selectedVariant.benefitAmounts || configuration.benefitAmounts);
  return unique([
    guideConfiguration(product, selection).length ? `Selected request: ${guideConfiguration(product, selection).join(' | ')}` : '',
    months.length ? `Historical guide term range: ${planningRange(months, (value) => `${value} months`)}` : '',
    miles.length ? `Historical guide mileage range: ${planningRange(miles, (value) => `${Number(value).toLocaleString('en-US')} miles`)}` : '',
    intervals.length ? `Service interval choices: ${intervals.map((value) => `every ${Number(value).toLocaleString('en-US')} miles`).join(', ')}` : '',
    benefits.length ? `Benefit choices: ${benefits.map((value) => `$${Number(value).toLocaleString('en-US')}`).join(', ')}` : '',
    selectedVariant.startBasisLabel || configuration.startBasisLabel,
    'Bob Maxey confirms the current VIN-specific options and compatible combinations before enrollment.',
  ]).slice(0, 5);
};

const guideMarketingSections = (product, selection = {}) => {
  const details = asArray(product.detailSections);
  const sectionItems = (pattern) => details
    .filter((section) => pattern.test(itemText(section.title)))
    .flatMap((section) => asArray(section.items));
  const coverageDetails = details
    .filter((section) => !/(value|why|when|eligib|timing|after|limit|exclu|guidance)/i.test(itemText(section.title)))
    .flatMap((section) => asArray(section.items));
  const coverageItems = unique([...asArray(product.highlights), ...coverageDetails]);
  const valueItems = unique([
    product.value,
    product.description,
    ...sectionItems(/value|why|ownership|when to choose|best for/i),
  ]);
  const eligibilityItems = unique([
    humanizeTiming(product.purchaseTiming || product.purchaseTimingLabel),
    product.eligibility?.headline,
    ...asArray(product.eligibility?.requirements),
    product.eligibility?.inspectionPolicy,
    ...asArray(product.cautions),
  ]);
  const trimItems = (items, fallback) => {
    const values = items.filter(Boolean);
    if (!values.length) return [fallback];
    if (values.length <= 5) return values;
    return [...values.slice(0, 4), 'Additional covered items, limits, and exclusions are confirmed in the issued agreement.'];
  };
  return [
    {
      title: 'Coverage and included items',
      items: trimItems(coverageItems, 'The current Ford offer and issued agreement confirm the covered items for this vehicle.'),
    },
    {
      title: 'Why owners choose it',
      items: trimItems(valueItems, 'Adds practical protection and ownership confidence for eligible needs.'),
    },
    {
      title: 'Options and term structure',
      items: trimItems(guideOptionSummary(product, selection), 'Bob Maxey confirms the current eligible option and term.'),
    },
    {
      title: 'Eligibility and practical guidance',
      items: trimItems(eligibilityItems, 'VIN-specific eligibility and current terms require Bob Maxey review.'),
    },
  ];
};

const drawGuideMarketingCard = (page, section, { x, top, width, height, tone }, fonts) => {
  page.drawRectangle({ x, y: top - height, width, height, color: tone === 'blue' ? C.surfaceBlue : C.surface });
  page.drawRectangle({ x, y: top - height, width: 3, height, color: tone === 'green' ? C.green : C.blue });
  page.drawText(safeText(section.title).toUpperCase(), { x: x + 14, y: top - 19, size: 8.1, font: fonts.bold, color: tone === 'green' ? C.green : C.blueDark });
  drawBullets(page, section.items, { x: x + 14, y: top - 39, width: width - 28, fonts, size: 8.25, lineHeight: 9.5, maxItems: 5, maxLines: 2 });
};

export async function createProductGuidePdf({ product = {}, selection = {}, quote = {} } = {}) {
  const pdf = await PDFDocument.create();
  // PDFDocument resource registration is intentionally sequential. Concurrent
  // font/image embedding can produce nondeterministic missing resources in a
  // subset of browser engines even when every asset request succeeds.
  const fonts = await embedDocumentFonts(pdf);
  const dealer = await embedAsset(pdf, '/assets/bob-maxey-logo.png');
  const protect = await embedAsset(pdf, '/assets/ford-official/ford-protect-logo.png');
  const productImage = await embedAsset(pdf, product.image);
  const assets = { dealer, protect };
  const productName = safeText(product.name || product.shortName || 'Ford Protect product');
  pdf.setTitle(`${productName} - Bob Maxey Ford Protect product guide`);
  pdf.setAuthor('Bob Maxey Ford Protect');
  pdf.setSubject('Ford Protect product education guide');
  pdf.setCreator('Bob Maxey Ford Protect Quote Studio');

  const page = addPage(pdf, assets, fonts, 'Product education guide');

  page.drawRectangle({ x: PAGE.margin, y: 548, width: 342, height: 160, color: C.navy });
  page.drawRectangle({ x: PAGE.margin, y: 548, width: 5, height: 160, color: C.blue });
  page.drawText(safeText(product.eyebrow || product.familyLabel || 'Ford Protect product').toUpperCase(), { x: 58, y: 681, size: 8.2, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
  const guideTitleSize = fonts.bold.widthOfTextAtSize(productName, 22) <= 292 ? 22 : 18;
  const afterGuideTitle = drawWrapped(page, productName, { x: 58, y: 651, width: 292, font: fonts.bold, size: guideTitleSize, lineHeight: guideTitleSize + 2, color: C.white, maxLines: 2 });
  drawWrapped(page, product.value || product.description || 'Ford-backed protection tailored to the way you own your vehicle.', { x: 58, y: afterGuideTitle - 4, width: 292, font: fonts.regular, size: 9.1, lineHeight: 11.1, color: C.white, maxLines: 4 });
  const timing = getProductTimingPresentation(product.purchaseTiming || product).shortLabel;
  page.drawText(truncate(timing, fonts.bold, 8.1, 292), { x: 58, y: 566, size: 8.1, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
  drawImageContain(page, productImage, { x: 378, y: 548, width: 198, height: 160, background: C.surface });

  page.drawRectangle({ x: PAGE.margin, y: 493, width: PAGE.contentWidth, height: 43, color: C.navySoft });
  page.drawText('YOUR REQUEST', { x: 52, y: 519, size: 7.8, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
  const configuration = guideConfiguration(product, selection);
  drawWrapped(page, configuration.length ? configuration.join('  |  ') : 'Current eligible option, term, and price to be confirmed by Bob Maxey.', { x: 145, y: 517, width: 411, font: fonts.bold, size: 8.9, lineHeight: 10.2, color: C.white, maxLines: 2 });

  const sections = guideMarketingSections(product, selection);
  const cardGap = 10;
  const cardWidth = (PAGE.contentWidth - cardGap) / 2;
  const cardHeight = 134;
  sections.forEach((section, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawGuideMarketingCard(page, section, {
      x: PAGE.margin + column * (cardWidth + cardGap),
      top: 478 - row * (cardHeight + cardGap),
      width: cardWidth,
      height: cardHeight,
      tone: index === 3 ? 'green' : index % 2 ? 'plain' : 'blue',
    }, fonts);
  });

  const timingCode = safeText(product.purchaseTiming).toLowerCase();
  const isTransactionOnly = /(original-vehicle-transaction-only|original-finance-transaction-only|original-lease-signing-only)/.test(timingCode);
  const context = quote?.purchaseContext === 'shopping'
    ? 'Planned for an eligible vehicle purchase'
    : quote?.purchaseContext === 'owner' && isTransactionOnly
      ? 'Not available after sale; plan it with an eligible vehicle transaction'
      : quote?.purchaseContext === 'owner' && timingCode === 'off-road-limited-post-sale'
        ? 'Limited after-sale request; dealer verification required'
        : quote?.purchaseContext === 'owner'
          ? 'After-sale request; timing must be verified'
          : 'Purchase timing requires specialist confirmation';
  page.drawRectangle({ x: PAGE.margin, y: 58, width: PAGE.contentWidth, height: 119, color: C.navy });
  page.drawText('A CONFIDENT NEXT STEP', { x: 52, y: 151, size: 8.1, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
  drawWrapped(page, `Ask Bob Maxey to confirm ${productName} for the VIN, selected configuration, current price, and issued agreement.`, { x: 52, y: 132, width: 300, font: fonts.bold, size: 9.3, lineHeight: 11, color: C.white, maxLines: 3 });
  page.drawText('PURCHASE CONTEXT', { x: 382, y: 151, size: 7.8, font: fonts.bold, color: rgb(126 / 255, 197 / 255, 1) });
  drawWrapped(page, context, { x: 382, y: 133, width: 174, font: fonts.bold, size: 8.8, lineHeight: 10.3, color: C.white, maxLines: 3 });
  const enrollmentGuidance = product.eligibility?.inspectionPolicy
    || product.eligibility?.dealerConfirmation
    || 'Bob Maxey confirms product-specific enrollment requirements before coverage is issued.';
  drawWrapped(page, enrollmentGuidance, { x: 52, y: 89, width: 504, font: fonts.regular, size: 8.1, lineHeight: 9.3, color: C.white, maxLines: 2 });

  drawFooter(page, 1, 1, quote?.id || 'Product guide', fonts, 'Product education guide');
  return pdf.save();
}

export async function createProposalPdf({ quote, plan, detail }) {
  const model = buildProposalModel({ quote, plan, detail });
  const pdf = await PDFDocument.create();
  pdf.setTitle(model.document.title);
  pdf.setAuthor('Bob Maxey Ford Protect');
  pdf.setSubject(model.document.subject);
  pdf.setCreator('Bob Maxey Ford Protect Quote Studio');
  pdf.setProducer('Bob Maxey Ford Protect Quote Studio');

  const fonts = await embedDocumentFonts(pdf);
  const dealer = await embedAsset(pdf, model.document.brand.dealerLogo);
  const protect = await embedAsset(pdf, model.document.brand.fordProtectLogo);
  const hero = await embedAsset(pdf, model.cover.vehicleImage);
  const assets = { dealer, protect, hero };

  drawOverviewPage(pdf, model, assets, fonts);
  if (model.snapshot.coverage.selected) {
    const groups = coverageGroups(model.snapshot);
    const chunks = getProposalCoverageChunks(groups);
    const pageChunks = chunks.length ? chunks : [[]];
    pageChunks.forEach((pageGroups, index) => drawCoveragePage(pdf, model, assets, fonts, pageGroups, index, pageChunks.length));
  }
  await drawProductsPage(pdf, model, assets, fonts);
  drawHandoffPage(pdf, model, assets, fonts);

  const pages = pdf.getPages();
  pages.forEach((proposalPage, index) => drawFooter(proposalPage, index + 1, pages.length, model.document.quoteId, fonts, model.document.statusLabel));
  return pdf.save();
}

const downloadPdfBytes = (bytes, filename) => {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export async function downloadProposalPdf(input) {
  const bytes = await createProposalPdf(input);
  downloadPdfBytes(bytes, `${input.quote.id || 'bob-maxey-ford-protect'}-proposal.pdf`);
  return bytes;
}

export async function downloadProductGuidePdf(input) {
  const bytes = await createProductGuidePdf(input);
  downloadPdfBytes(bytes, `${input.product?.id || 'ford-protect-product'}-guide.pdf`);
  return bytes;
}
