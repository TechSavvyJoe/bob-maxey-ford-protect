import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { assetUrl } from './paths';
import { buildProposalModel } from './quoteOutput';

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

const PAYMENT_MESSAGE = 'Eligible plans may use a small down payment with the remaining balance financed at 0% interest. Exact terms are confirmed with the current offer.';

const safeText = (value = '') => String(value)
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\u2026/g, '...')
  .replace(/[\u2022\u00B7]/g, '-')
  .replace(/[\u00AE\u2122]/g, '')
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

const asArray = (value) => Array.isArray(value) ? value : [];
const compact = (values) => asArray(values).filter(Boolean);
const normalize = (value) => safeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const unique = (values) => compact(values).reduce((result, value) => {
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
  compact(items).slice(0, maxItems).forEach((item) => {
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
  if (inspection?.required === false) return 'The vehicle appears to remain within New Vehicle Limited Warranty limits. No used-vehicle inspection is expected; Ford records confirm the final status.';
  if (inspection?.required === true) return 'The vehicle appears outside New Vehicle Limited Warranty limits. A dealership inspection is required before an eligible used ESP can be finalized.';
  return 'Bob Maxey will verify the Ford warranty record and confirm whether an inspection is required before enrollment.';
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
      purchaseTiming: 'May be available during the applicable New Vehicle Limited Warranty purchase window, including after the sale when eligible.',
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
  const key = safeText(value).toLowerCase();
  if (!key) return '';
  if (key === 'original-vehicle-transaction-only') return 'Available only with the eligible original vehicle transaction.';
  if (key === 'vehicle-purchase-or-after-sale-within-nvlw') return 'May be available at purchase or after sale while within the New Vehicle Limited Warranty.';
  if (key === 'after-sale') return 'May be requested after the vehicle sale, subject to current eligibility.';
  return safeText(value).replace(/-/g, ' ');
};

const coverageGroups = (snapshot) => asArray(snapshot.coverage.coverageGroups).map((group) => ({
  title: safeText(group.title || group.name || 'Coverage group'),
  summary: safeText(group.summary || group.description || 'Covered components are subject to the issued agreement.'),
  items: asArray(group.items).map((item) => safeText(item)).filter(Boolean),
}));

const drawOverviewPage = (pdf, model, assets, fonts) => {
  const page = addPage(pdf, assets, fonts, 'Personalized protection proposal');
  const snapshot = model.snapshot;
  const summary = model.requestSummary;
  const products = selectedProducts(model);

  drawImageContain(page, assets.hero, { x: PAGE.margin, y: 542, width: 226, height: 162, background: C.surface });
  page.drawRectangle({ x: 262, y: 542, width: 314, height: 162, color: C.navy });
  page.drawText(safeText(model.cover.eyebrow), { x: 284, y: 676, size: 8.6, font: fonts.bold, color: C.white });
  drawWrapped(page, model.cover.headline, { x: 284, y: 648, width: 268, font: fonts.bold, size: 23, lineHeight: 25.5, color: C.white, maxLines: 2 });
  drawWrapped(page, model.cover.subhead, { x: 284, y: 592, width: 268, font: fonts.regular, size: 9.5, lineHeight: 12, color: C.white, maxLines: 2 });
  page.drawText(`REFERENCE ${safeText(snapshot.quoteId)}`, { x: 284, y: 561, size: 8.5, font: fonts.bold, color: C.white });

  const half = (PAGE.contentWidth - 12) / 2;
  page.drawRectangle({ x: PAGE.margin, y: 459, width: half, height: 64, color: C.surfaceBlue });
  drawLabelValue(page, 'Prepared for', model.cover.preparedFor, { x: 50, y: 505, width: half - 28 }, fonts, { size: 12, maxLines: 1 });
  drawWrapped(page, compact([model.cover.purchaseContextLabel, summary.customer.email, summary.customer.phone]).join('  |  '), { x: 50, y: 473, width: half - 28, font: fonts.regular, size: 9, lineHeight: 10.6, color: C.muted, maxLines: 2 });
  page.drawRectangle({ x: PAGE.margin + half + 12, y: 459, width: half, height: 64, color: C.surface });
  drawLabelValue(page, 'Vehicle', snapshot.vehicle.displayName, { x: PAGE.margin + half + 26, y: 505, width: half - 28 }, fonts, { size: 11.2, maxLines: 1 });
  drawWrapped(page, compact([snapshot.vehicle.currentMileageLabel, snapshot.vehicle.powertrain, snapshot.vehicle.vin ? `VIN ${snapshot.vehicle.vin}` : 'VIN to be confirmed']).join('  |  '), { x: PAGE.margin + half + 26, y: 473, width: half - 28, font: fonts.regular, size: 9, lineHeight: 10.6, color: C.muted, maxLines: 2 });

  page.drawRectangle({ x: PAGE.margin, y: 365, width: PAGE.contentWidth, height: 78, color: C.navy });
  page.drawText(safeText(snapshot.coverage.programLabel).toUpperCase(), { x: 54, y: 421, size: 8.6, font: fonts.bold, color: C.white });
  const overviewPlanSize = fonts.bold.widthOfTextAtSize(safeText(snapshot.coverage.planName), 19) <= 285 ? 19 : 15;
  page.drawText(truncate(snapshot.coverage.planName, fonts.bold, overviewPlanSize, 285), { x: 54, y: 395, size: overviewPlanSize, font: fonts.bold, color: C.white });
  drawWrapped(page, snapshot.coverage.description || snapshot.coverage.coverageModel, { x: 54, y: 376, width: 300, font: fonts.regular, size: 9, lineHeight: 10.6, color: C.white, maxLines: 1 });
  drawLabelValue(page, 'Plan basis', snapshot.coverage.planPathLabel, { x: 384, y: 421, width: 172 }, fonts, { size: 9.4, color: C.white, labelColor: C.white, maxLines: 1 });
  drawLabelValue(page, 'Deductible', snapshot.coverage.deductible.label, { x: 384, y: 389, width: 172 }, fonts, { size: 9.4, color: C.white, labelColor: C.white, maxLines: 1 });

  const metricValues = snapshot.program === 'enginecare'
    ? [['Term', snapshot.coverage.term.label], ['Mileage', snapshot.coverage.term.mileageLabel], ['Engine hours', snapshot.coverage.term.engineHoursLabel], ['Current mileage', snapshot.vehicle.currentMileageLabel]]
    : [['Term', snapshot.coverage.term.label], ['Mileage', snapshot.coverage.term.mileageLabel], ['Coverage', snapshot.coverage.componentCount ? `${snapshot.coverage.componentCount} components` : snapshot.coverage.coverageModel], ['Current mileage', snapshot.vehicle.currentMileageLabel]];
  const metricWidth = (PAGE.contentWidth - 3) / 4;
  metricValues.forEach(([label, value], index) => {
    const x = PAGE.margin + index * (metricWidth + 1);
    page.drawRectangle({ x, y: 293, width: metricWidth, height: 56, color: index % 2 ? C.surface : C.surfaceBlue });
    drawLabelValue(page, label, value, { x: x + 12, y: 333, width: metricWidth - 24 }, fonts, { size: 9.1, lineHeight: 10.6, maxLines: 2 });
  });

  const inspection = snapshot.coverage.inspection;
  const inspectionColors = inspectionPalette(inspection);
  drawStatusPanel(page, {
    x: PAGE.margin, y: 277, width: half, height: 86, label: 'Inspection status',
    headline: inspection?.label || 'Vehicle record review required',
    body: inspectionSummary(inspection, snapshot.program),
    background: inspectionColors.background, accent: inspectionColors.accent,
  }, fonts);
  drawStatusPanel(page, {
    x: PAGE.margin + half + 12, y: 277, width: half, height: 86, label: 'Payment choice',
    headline: summary.payment.preference || 'Review payment choices', body: PAYMENT_MESSAGE,
    background: C.surfaceBlue, accent: C.blueDark,
  }, fonts);

  const productNames = products.map((product) => product.shortName || product.name);
  page.drawText('ADDITIONAL PRODUCTS REQUESTED', { x: PAGE.margin, y: 172, size: 8.6, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, productNames.length ? productNames.join('  |  ') : 'No additional products selected in this request.', { x: PAGE.margin, y: 153, width: PAGE.contentWidth, font: fonts.bold, size: 9.2, lineHeight: 11.2, color: C.ink, maxLines: 2 });

  page.drawRectangle({ x: PAGE.margin, y: 61, width: PAGE.contentWidth, height: 60, color: C.navySoft });
  page.drawText('BOB MAXEY SPECIALIST REVIEW', { x: 54, y: 98, size: 8.6, font: fonts.bold, color: C.white });
  const priceMessage = Number.isFinite(summary.pricing.total)
    ? `$${summary.pricing.total.toLocaleString('en-US')} current quoted total. ${summary.pricing.message}`
    : 'Bob Maxey confirms the Ford record, eligible combinations, exact coverage, current price, and agreement before enrollment.';
  drawWrapped(page, priceMessage, { x: 54, y: 79, width: 504, font: fonts.regular, size: 9.2, lineHeight: 11, color: C.white, maxLines: 2 });
};

const drawCoverageCard = (page, group, { x, top, width, height }, fonts) => {
  page.drawRectangle({ x, y: top - height, width, height, color: C.surface });
  page.drawRectangle({ x, y: top - height, width: 3, height, color: C.blue });
  page.drawText(truncate(group.title, fonts.bold, 9.5, width - 22), { x: x + 12, y: top - 18, size: 9.5, font: fonts.bold, color: C.navy });
  const detail = group.items.length ? group.items.join('; ') : group.summary;
  const lines = height >= 90 ? 6 : height >= 72 ? 4 : height >= 60 ? 3 : 2;
  drawWrapped(page, detail || group.summary, { x: x + 12, y: top - 37, width: width - 22, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.muted, maxLines: lines });
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

const drawCoveragePage = (pdf, model, assets, fonts) => {
  const page = addPage(pdf, assets, fonts, 'Plan coverage and next steps');
  const snapshot = model.snapshot;
  const groups = coverageGroups(snapshot).slice(0, 12);
  let y = drawSectionTitle(page, snapshot.coverage.programLabel, `${snapshot.coverage.planName}: coverage at a glance`, snapshot.coverage.coverageModel || model.coverage.note, fonts);

  page.drawRectangle({ x: PAGE.margin, y: y - 58, width: PAGE.contentWidth, height: 58, color: C.navy });
  drawLabelValue(page, 'Selected plan', snapshot.coverage.planName, { x: 54, y: y - 18, width: 198 }, fonts, { size: 11.5, color: C.white, labelColor: C.white, maxLines: 1 });
  drawLabelValue(page, 'Term / mileage / use limit', primaryTermLine(snapshot), { x: 278, y: y - 18, width: 278 }, fonts, { size: 9.1, lineHeight: 10.7, color: C.white, labelColor: C.white, maxLines: 2 });
  y -= 73;

  page.drawText('COVERAGE GROUPS AND COMPONENT EXAMPLES', { x: PAGE.margin, y, size: 8.6, font: fonts.bold, color: C.blueDark });
  y -= 15;
  const columns = 3;
  const gap = 7;
  const cardWidth = (PAGE.contentWidth - gap * (columns - 1)) / columns;
  const rowCount = Math.max(1, Math.ceil(groups.length / columns));
  const targetGridHeight = groups.length <= 3 ? 126 : groups.length <= 6 ? 188 : groups.length <= 9 ? 224 : 230;
  const cardHeight = Math.max(54, Math.min(116, (targetGridHeight - gap * (rowCount - 1)) / rowCount));
  groups.forEach((group, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawCoverageCard(page, group, { x: PAGE.margin + column * (cardWidth + gap), top: y - row * (cardHeight + gap), width: cardWidth, height: cardHeight }, fonts);
  });
  y -= rowCount * cardHeight + Math.max(0, rowCount - 1) * gap + 12;

  const half = (PAGE.contentWidth - 10) / 2;
  const panelHeight = Math.max(70, Math.min(96, y - 214));
  const benefits = asArray(snapshot.coverage.selectedPlanBenefits).map((benefit) => benefit.title || benefit.name).filter(Boolean);
  const selectedOptions = asArray(snapshot.coverage.selectedPlanOptions).map((option) => `${option.name}${option.description ? ` - ${option.description}` : ''}`);
  page.drawRectangle({ x: PAGE.margin, y: y - panelHeight, width: half, height: panelHeight, color: C.surfaceBlue });
  page.drawText('PLAN VALUE AND REQUESTED BENEFITS', { x: 50, y: y - 20, size: 8.5, font: fonts.bold, color: C.blueDark });
  const valueItems = unique([...benefits, ...selectedOptions]);
  drawBullets(page, valueItems.length ? valueItems : ['Ford-backed repair coverage subject to the issued agreement', 'Plan benefits are confirmed for the exact vehicle and term'], { x: 50, y: y - 41, width: half - 28, fonts, size: 9, lineHeight: 10.4, maxItems: 3, maxLines: 1 });

  const vehicleX = PAGE.margin + half + 10;
  page.drawRectangle({ x: vehicleX, y: y - panelHeight, width: half, height: panelHeight, color: C.surface });
  page.drawText('VEHICLE AND OFFER CONFIRMATION', { x: vehicleX + 14, y: y - 20, size: 8.5, font: fonts.bold, color: C.blueDark });
  drawBullets(page, [
    `VIN: ${snapshot.vehicle.vin || 'To be confirmed'}`,
    `In-service date: ${formatDate(snapshot.vehicle.inServiceDate, snapshot.vehicle.inServiceDateDisplay || 'To be confirmed')}`,
    `Current mileage: ${snapshot.vehicle.currentMileageLabel}`,
    'Exact coverage, exclusions, price, and state terms are confirmed before purchase',
  ], { x: vehicleX + 14, y: y - 41, width: half - 28, fonts, size: 9, lineHeight: 10.4, maxItems: 3, maxLines: 1 });
  y -= panelHeight + 13;

  const stepsBottom = drawNextSteps(page, model, { y, height: 54 }, fonts);
  const disclaimerTop = Math.min(stepsBottom - 8, 94);
  page.drawRectangle({ x: PAGE.margin, y: 53, width: PAGE.contentWidth, height: Math.max(34, disclaimerTop - 53), color: C.navySoft });
  page.drawText('IMPORTANT INFORMATION', { x: 50, y: Math.max(69, disclaimerTop - 17), size: 8.3, font: fonts.bold, color: C.white });
  drawWrapped(page, 'This is a coverage request, not a contract. Final eligibility, components, terms, price, exclusions, cancellation terms, and state availability are controlled by the Ford Protect agreement issued for the vehicle. This request does not purchase coverage.', { x: 185, y: Math.max(69, disclaimerTop - 16), width: 374, font: fonts.regular, size: 9, lineHeight: 10.3, color: C.white, maxLines: 3 });
};

const productEligibilityText = (product) => compact([
  humanizeTiming(product.purchaseTiming || product.purchaseTimingLabel),
  product.eligibility?.inspectionPolicy,
  product.eligibility?.dealerConfirmation,
  product.eligibility?.headline,
]).join(' ');

const compactEligibilityText = (product) => {
  const timing = safeText(product.purchaseTiming || product.purchaseTimingLabel).toLowerCase();
  if (timing === 'original-vehicle-transaction-only') return 'Original-transaction product; Bob Maxey confirms eligibility.';
  if (timing === 'vehicle-purchase-or-after-sale-within-nvlw') return 'May be available after sale while in warranty; Bob Maxey confirms eligibility.';
  if (timing === 'after-sale') return 'After-sale request; Bob Maxey confirms eligibility and current terms.';
  return 'Bob Maxey confirms vehicle eligibility and purchase timing.';
};

const drawProductCard = (page, product, image, { x, top, width, height }, fonts) => {
  page.drawRectangle({ x, y: top - height, width, height, color: C.white, borderColor: C.line, borderWidth: 0.8 });
  page.drawRectangle({ x, y: top - height, width: 4, height, color: C.blue });
  const compactCard = height < 170;
  const mediumCard = height < 205;
  const imageWidth = compactCard ? 55 : mediumCard ? 72 : 96;
  const imageHeight = compactCard ? 38 : mediumCard ? 50 : 62;
  drawImageContain(page, image, { x: x + 12, y: top - imageHeight - 13, width: imageWidth, height: imageHeight, background: C.surface });
  const bodyX = x + imageWidth + 23;
  const bodyWidth = width - imageWidth - 35;
  page.drawText(truncate(product.familyLabel || product.eyebrow || 'Ford Protect product', fonts.bold, 8.4, bodyWidth), { x: bodyX, y: top - 18, size: 8.4, font: fonts.bold, color: C.blueDark });
  page.drawText(truncate(product.name || product.shortName, fonts.bold, compactCard ? 11.2 : 13, bodyWidth), { x: bodyX, y: top - 38, size: compactCard ? 11.2 : 13, font: fonts.bold, color: C.navy });
  drawWrapped(page, product.value || product.description, { x: bodyX, y: top - 56, width: bodyWidth, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.muted, maxLines: compactCard ? 1 : mediumCard ? 2 : 3 });
  const ruleY = top - imageHeight - 24;
  drawRule(page, ruleY, x + 12, width - 24);

  const config = productConfiguration(product);
  if (compactCard) {
    page.drawText('REQUESTED', { x: x + 12, y: ruleY - 16, size: 8.1, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(config.join(' | ') || 'Exact option to confirm', fonts.regular, 9, width - 92), { x: x + 79, y: ruleY - 16, size: 9, font: fonts.regular, color: C.ink });
    page.drawText('VALUE', { x: x + 12, y: ruleY - 33, size: 8.1, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(asArray(product.highlights)[0] || product.description || 'Ford-backed product value', fonts.regular, 9, width - 72), { x: x + 59, y: ruleY - 33, size: 9, font: fonts.regular, color: C.ink });
    page.drawText('ELIGIBILITY', { x: x + 12, y: ruleY - 50, size: 8.1, font: fonts.bold, color: C.blueDark });
    page.drawText(truncate(compactEligibilityText(product), fonts.regular, 9, width - 93), { x: x + 81, y: ruleY - 50, size: 9, font: fonts.regular, color: C.ink });
    return;
  }
  if (mediumCard) {
    page.drawText('REQUESTED CONFIGURATION', { x: x + 12, y: ruleY - 17, size: 8.2, font: fonts.bold, color: C.blueDark });
    drawWrapped(page, config.join('  |  ') || 'Exact option and term to be confirmed', { x: x + 12, y: ruleY - 34, width: width - 24, font: fonts.regular, size: 9, lineHeight: 10.2, color: C.ink, maxLines: 2 });
    page.drawText('VALUE AND ELIGIBILITY', { x: x + 12, y: ruleY - 61, size: 8.2, font: fonts.bold, color: C.blueDark });
    drawWrapped(page, compact([asArray(product.highlights)[0], productEligibilityText(product)]).join(' '), { x: x + 12, y: ruleY - 78, width: width - 24, font: fonts.regular, size: 9, lineHeight: 10.2, color: C.ink, maxLines: 3 });
    return;
  }
  const gap = 10;
  const columnWidth = (width - 34 - gap * 2) / 3;
  const columnX = [x + 14, x + 14 + columnWidth + gap, x + 14 + (columnWidth + gap) * 2];
  ['REQUESTED CONFIGURATION', 'PRODUCT VALUE', 'ELIGIBILITY & TIMING'].forEach((label, index) => {
    page.drawText(label, { x: columnX[index], y: ruleY - 18, size: 8.2, font: fonts.bold, color: C.blueDark });
  });
  drawWrapped(page, config.join('  |  ') || 'Exact option and term to be confirmed', { x: columnX[0], y: ruleY - 36, width: columnWidth, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.ink, maxLines: 6 });
  drawWrapped(page, asArray(product.highlights).slice(0, 4).join('; '), { x: columnX[1], y: ruleY - 36, width: columnWidth, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.ink, maxLines: 6 });
  drawWrapped(page, productEligibilityText(product), { x: columnX[2], y: ruleY - 36, width: columnWidth, font: fonts.regular, size: 9, lineHeight: 10.4, color: C.ink, maxLines: 6 });
};

const drawProductsPage = async (pdf, model, assets, fonts) => {
  const products = selectedProducts(model);
  if (!products.length) return;
  const imageEntries = await Promise.all(products.map(async (product) => [product.id || product.name, await embedAsset(pdf, product.image)]));
  const images = new Map(imageEntries);
  const page = addPage(pdf, assets, fonts, 'Selected additional products');
  const y = drawSectionTitle(page, 'Your selected Ford Protect products', 'Additional protection, clearly organized.', 'Each selection keeps its requested option, value highlights, purchase timing, and eligibility notes together for specialist review.', fonts);

  const columns = products.length <= 2 ? 1 : 2;
  const gap = 8;
  const rows = Math.ceil(products.length / columns);
  const gridBottom = 174;
  const availableHeight = y - gridBottom;
  const cardHeight = Math.max(102, (availableHeight - Math.max(0, rows - 1) * gap) / rows);
  const cardWidth = (PAGE.contentWidth - gap * (columns - 1)) / columns;
  products.forEach((product, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawProductCard(page, product, images.get(product.id || product.name), { x: PAGE.margin + column * (cardWidth + gap), top: y - row * (cardHeight + gap), width: cardWidth, height: cardHeight }, fonts);
  });

  page.drawRectangle({ x: PAGE.margin, y: 85, width: PAGE.contentWidth, height: 71, color: C.surfaceBlue });
  page.drawText('BOB MAXEY SUPPORT', { x: 50, y: 136, size: 8.5, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, 'Your Ford Protect specialist will verify each requested product against the vehicle record, purchase timing, current program rules, and the final agreement before purchase.', { x: 50, y: 117, width: 330, font: fonts.regular, size: 9, lineHeight: 10.7, color: C.ink, maxLines: 3 });
  drawLabelValue(page, 'Preferred store', model.requestSummary.store.descriptor, { x: 401, y: 136, width: 155 }, fonts, { size: 9.2, maxLines: 2 });
  page.drawText('Final availability, pricing, and coverage are confirmed for the VIN before purchase.', { x: PAGE.margin, y: 61, size: 8.5, font: fonts.regular, color: C.muted });
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
};

const drawGuideContinuationHeader = (page, product, fonts) => {
  page.drawText('FORD PROTECT PRODUCT GUIDE', { x: PAGE.margin, y: PAGE.contentTop, size: 8.8, font: fonts.bold, color: C.blueDark });
  page.drawText(truncate(product.name || product.shortName, fonts.bold, 21, PAGE.contentWidth), { x: PAGE.margin, y: PAGE.contentTop - 29, size: 21, font: fonts.bold, color: C.navy });
  page.drawText('Coverage details, eligibility, timing, and next steps', { x: PAGE.margin, y: PAGE.contentTop - 49, size: 9.3, font: fonts.regular, color: C.muted });
  drawRule(page, PAGE.contentTop - 61);
  return PAGE.contentTop - 78;
};

export async function createProductGuidePdf({ product = {}, selection = {}, quote = {} } = {}) {
  const pdf = await PDFDocument.create();
  const [regular, bold, dealer, protect, productImage] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    embedAsset(pdf, '/assets/bob-maxey-logo.png'),
    embedAsset(pdf, '/assets/ford-official/ford-protect-logo.png'),
    embedAsset(pdf, product.image),
  ]);
  const fonts = { regular, bold };
  const assets = { dealer, protect };
  const productName = safeText(product.name || product.shortName || 'Ford Protect product');
  pdf.setTitle(`${productName} - Bob Maxey Ford Protect product guide`);
  pdf.setAuthor('Bob Maxey Ford Protect');
  pdf.setSubject('Ford Protect product education guide');
  pdf.setCreator('Bob Maxey Ford Protect Quote Studio');

  let page = addPage(pdf, assets, fonts, 'Product education guide');
  page.drawText(safeText(product.eyebrow || product.familyLabel || 'Ford Protect product').toUpperCase(), { x: PAGE.margin, y: PAGE.contentTop, size: 8.8, font: fonts.bold, color: C.blueDark });
  const guideTitleSize = fonts.bold.widthOfTextAtSize(productName, 24) <= 324 ? 24 : 20;
  const afterGuideTitle = drawWrapped(page, productName, { x: PAGE.margin, y: PAGE.contentTop - 32, width: 324, font: fonts.bold, size: guideTitleSize, lineHeight: guideTitleSize + 2, color: C.navy, maxLines: 2 });
  drawWrapped(page, product.value || product.description || 'Ford-backed protection tailored to the way you own your vehicle.', { x: PAGE.margin, y: afterGuideTitle - 2, width: 324, font: fonts.regular, size: 9.5, lineHeight: 11.8, color: C.muted, maxLines: 4 });
  drawImageContain(page, productImage, { x: 380, y: 570, width: 196, height: 138, background: C.surface });

  page.drawRectangle({ x: PAGE.margin, y: 483, width: PAGE.contentWidth, height: 73, color: C.navy });
  page.drawText('REQUESTED CONFIGURATION', { x: 54, y: 533, size: 8.5, font: fonts.bold, color: C.white });
  const configuration = guideConfiguration(product, selection);
  drawWrapped(page, configuration.length ? configuration.join('  |  ') : 'Bob Maxey will match this product to the current eligible option, term, and price.', { x: 54, y: 512, width: 504, font: fonts.bold, size: 9.4, lineHeight: 11.2, color: C.white, maxLines: 3 });

  const blocks = [...guideBlocks(product)];
  const columnWidth = 263;
  const firstPageTop = 458;
  const firstPageBottom = 175;
  const guidePages = splitGuidePages(blocks, fonts, columnWidth);
  const pageOneEstimatedHeight = guidePages.pageOne.reduce((sum, block) => sum + guideBlockHeight(block, fonts, columnWidth) + 8, 0);
  let pageOneOverflow = drawGuideBlocksInColumns(page, guidePages.pageOne, fonts, {
    top: firstPageTop,
    bottom: Math.max(firstPageBottom, firstPageTop - Math.ceil(pageOneEstimatedHeight / 2) - 16),
  });
  const pageTwoBlocks = [...pageOneOverflow, ...guidePages.pageTwo];

  if (pageTwoBlocks.length) {
    drawGuideContinuationBand(page, product, fonts);
    page = addPage(pdf, assets, fonts, 'Product guide continued');
    const secondPageTop = drawGuideContinuationHeader(page, product, fonts);
    const pageTwoEstimatedHeight = pageTwoBlocks.reduce((sum, block) => sum + guideBlockHeight(block, fonts, columnWidth) + 8, 0);
    const pageTwoOverflow = drawGuideBlocksInColumns(page, pageTwoBlocks, fonts, {
      top: secondPageTop,
      bottom: Math.max(348, Math.min(430, secondPageTop - Math.ceil(pageTwoEstimatedHeight / 2) - 16)),
    });
    if (pageTwoOverflow.length) {
      const remainingText = pageTwoOverflow.flatMap((entry) => entry.items).join('; ');
      drawGuideBlock(page, { title: 'Additional agreement details', items: [remainingText] }, { x: 313, y: 392, width: 263 }, fonts);
    }
    if (pageTwoEstimatedHeight <= 400) drawGuideReviewChecklist(page, fonts);
    drawGuideDecisionPanels(page, quote, fonts);
  }

  drawGuideClosing(page, product, quote, fonts, 160);
  const pages = pdf.getPages();
  pages.forEach((guidePage, index) => drawFooter(guidePage, index + 1, pages.length, quote?.id || 'Product guide', fonts, 'Product education guide'));
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

  const [regular, bold, dealer, protect, hero] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    embedAsset(pdf, model.document.brand.dealerLogo),
    embedAsset(pdf, model.document.brand.fordProtectLogo),
    embedAsset(pdf, model.cover.vehicleImage),
  ]);
  const fonts = { regular, bold };
  const assets = { dealer, protect, hero };

  drawOverviewPage(pdf, model, assets, fonts);
  drawCoveragePage(pdf, model, assets, fonts);
  await drawProductsPage(pdf, model, assets, fonts);

  const pages = pdf.getPages();
  pages.forEach((proposalPage, index) => drawFooter(proposalPage, index + 1, pages.length, model.document.quoteId, fonts));
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
