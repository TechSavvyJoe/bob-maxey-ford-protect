import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { assetUrl } from './paths';
import { buildProposalModel } from './quoteOutput';

const LETTER = [612, 792];
const PAGE = { width: 612, height: 792, margin: 38, contentWidth: 536, contentTop: 710, footerTop: 42 };

const C = {
  navy: rgb(0 / 255, 35 / 255, 75 / 255),
  blue: rgb(0 / 255, 94 / 255, 184 / 255),
  blueDark: rgb(0 / 255, 71 / 255, 143 / 255),
  ink: rgb(16 / 255, 35 / 255, 59 / 255),
  muted: rgb(76 / 255, 93 / 255, 115 / 255),
  line: rgb(202 / 255, 213 / 255, 225 / 255),
  surface: rgb(246 / 255, 248 / 255, 250 / 255),
  surfaceBlue: rgb(238 / 255, 245 / 255, 252 / 255),
  white: rgb(1, 1, 1),
  green: rgb(0 / 255, 116 / 255, 84 / 255),
  greenPale: rgb(236 / 255, 248 / 255, 244 / 255),
  amber: rgb(152 / 255, 82 / 255, 0),
  amberPale: rgb(253 / 255, 245 / 255, 232 / 255),
};

const PAYMENT_MESSAGE = 'For eligible plans, choose a small down payment and finance the remaining balance at 0% interest. The returned offer confirms the exact down payment, payment count, schedule, and first due date.';

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
  const paragraphs = safeText(text).split(/\n/);
  paragraphs.forEach((paragraph, paragraphIndex) => {
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

const drawWrapped = (page, text, {
  x, y, width, font, size = 9.2, lineHeight = 11.8, color = C.ink, maxLines = Number.POSITIVE_INFINITY,
}) => {
  const allLines = wrap(text, font, size, width);
  const lines = allLines.slice(0, maxLines);
  if (Number.isFinite(maxLines) && allLines.length > maxLines && lines.length) {
    lines[lines.length - 1] = truncate(`${lines[lines.length - 1]}...`, font, size, width);
  }
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
};

const textHeight = (text, font, size, width, lineHeight) => wrap(text, font, size, width).length * lineHeight;
const truncate = (text, font, size, width) => {
  const clean = safeText(text);
  if (font.widthOfTextAtSize(clean, size) <= width) return clean;
  let result = clean;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > width) result = result.slice(0, -1);
  return `${result.trim()}...`;
};

const formatDate = (value, fallback = 'To be confirmed') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value) || fallback;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
};

const drawRule = (page, y, x = PAGE.margin, width = PAGE.contentWidth, color = C.line, thickness = 0.75) => page.drawLine({
  start: { x, y }, end: { x: x + width, y }, thickness, color,
});

const drawImageContain = (page, image, { x, y, width, height, background = C.surface, allowUpscale = false }) => {
  page.drawRectangle({ x, y, width, height, color: background });
  if (!image) return;
  const scale = Math.min(width / image.width, height / image.height, allowUpscale ? Number.POSITIVE_INFINITY : 1);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  page.drawImage(image, { x: x + (width - drawWidth) / 2, y: y + (height - drawHeight) / 2, width: drawWidth, height: drawHeight });
};

const drawBrandHeader = (page, assets, fonts, label) => {
  page.drawRectangle({ x: 0, y: 730, width: PAGE.width, height: 62, color: C.white });
  if (assets.dealer) {
    const scale = Math.min(102 / assets.dealer.width, 31 / assets.dealer.height, 1);
    page.drawImage(assets.dealer, { x: PAGE.margin, y: 748, width: assets.dealer.width * scale, height: assets.dealer.height * scale });
  } else page.drawText('BOB MAXEY', { x: PAGE.margin, y: 756, size: 11, font: fonts.bold, color: C.navy });
  page.drawLine({ start: { x: 154, y: 746 }, end: { x: 154, y: 778 }, thickness: 0.75, color: C.line });
  if (assets.protect) {
    const scale = Math.min(96 / assets.protect.width, 27 / assets.protect.height, 1);
    page.drawImage(assets.protect, { x: 168, y: 750, width: assets.protect.width * scale, height: assets.protect.height * scale });
  } else page.drawText('FORD PROTECT', { x: 168, y: 756, size: 10.5, font: fonts.bold, color: C.navy });
  const heading = safeText(label).toUpperCase();
  page.drawText(heading, { x: PAGE.width - PAGE.margin - fonts.bold.widthOfTextAtSize(heading, 8.2), y: 756, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawRule(page, 730, 0, PAGE.width, C.navy, 1.25);
};

const addPage = (pdf, assets, fonts, label) => {
  const page = pdf.addPage(LETTER);
  drawBrandHeader(page, assets, fonts, label);
  return page;
};

const drawFooter = (page, pageNumber, totalPages, quoteId, fonts, label = 'Personalized customer proposal') => {
  drawRule(page, PAGE.footerTop);
  page.drawText(`Bob Maxey Ford Protect  |  ${safeText(label)}`, { x: PAGE.margin, y: 20, size: 8.2, font: fonts.regular, color: C.muted });
  const reference = `Quote ${safeText(quoteId || 'Pending')}  |  ${pageNumber} of ${totalPages}`;
  page.drawText(reference, { x: PAGE.width - PAGE.margin - fonts.regular.widthOfTextAtSize(reference, 8.2), y: 20, size: 8.2, font: fonts.regular, color: C.muted });
};

const drawPageTitle = (page, eyebrow, title, description, fonts, y = PAGE.contentTop) => {
  page.drawText(safeText(eyebrow).toUpperCase(), { x: PAGE.margin, y, size: 8.5, font: fonts.bold, color: C.blueDark });
  const titleLines = wrap(title, fonts.bold, 22, PAGE.contentWidth).slice(0, 2);
  titleLines.forEach((line, index) => page.drawText(line, { x: PAGE.margin, y: y - 28 - index * 25, size: 22, font: fonts.bold, color: C.navy }));
  const descriptionY = y - 30 - titleLines.length * 25;
  const descriptionLines = wrap(description, fonts.regular, 9.4, PAGE.contentWidth).slice(0, 2);
  descriptionLines.forEach((line, index) => page.drawText(line, { x: PAGE.margin, y: descriptionY - index * 12, size: 9.4, font: fonts.regular, color: C.muted }));
  const bottom = descriptionY - descriptionLines.length * 12 - 10;
  drawRule(page, bottom);
  return bottom - 12;
};

const drawLabelValue = (page, label, value, { x, y, width }, fonts, options = {}) => {
  page.drawText(safeText(label).toUpperCase(), { x, y, size: options.labelSize || 8.2, font: fonts.bold, color: options.labelColor || C.blueDark });
  return drawWrapped(page, value || 'To be confirmed', {
    x, y: y - 17, width, font: options.font || fonts.bold, size: options.size || 9.6,
    lineHeight: options.lineHeight || 11.8, color: options.color || C.ink, maxLines: options.maxLines || 2,
  });
};

const drawBullets = (page, items, { x, y, width, fonts, size = 8.8, lineHeight = 10.8, maxItems = 6, color = C.ink }) => {
  let cursor = y;
  compact(items).slice(0, maxItems).forEach((item) => {
    const lines = wrap(item, fonts.regular, size, width - 13).slice(0, 3);
    page.drawRectangle({ x, y: cursor + 2.2, width: 3, height: 3, color: C.blue });
    lines.forEach((line, index) => page.drawText(line, { x: x + 12, y: cursor - index * lineHeight, size, font: fonts.regular, color }));
    cursor -= lines.length * lineHeight + 3;
  });
  return cursor;
};

const inspectionPalette = (inspection) => inspection?.required
  ? { background: C.amberPale, accent: C.amber }
  : inspection?.required === false
    ? { background: C.greenPale, accent: C.green }
    : { background: C.surfaceBlue, accent: C.blueDark };

const drawInspection = (page, inspection, { x, y, width, height = 68 }, fonts) => {
  const palette = inspectionPalette(inspection);
  page.drawRectangle({ x, y: y - height, width, height, color: palette.background });
  page.drawRectangle({ x, y: y - height, width: 4, height, color: palette.accent });
  page.drawText(safeText(inspection?.label || 'Vehicle eligibility review'), { x: x + 14, y: y - 19, size: 9.2, font: fonts.bold, color: palette.accent });
  drawWrapped(page, [inspection?.message, inspection?.caveat].filter(Boolean).join(' '), { x: x + 14, y: y - 37, width: width - 28, font: fonts.regular, size: 8.8, lineHeight: 10.8, color: C.ink, maxLines: 3 });
  return y - height;
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
      eyebrow: 'Ford Protect maintenance request',
      value: maintenance.description || 'Plan ahead for scheduled service and eligible maintenance benefits.',
      description: 'Bob Maxey will match the vehicle and current mileage to an eligible plan and service schedule.',
      image: '/assets/ford-official/ford-maintenance-wide.png',
      purchaseTiming: 'Available during the applicable New Vehicle Limited Warranty purchase window, including after the vehicle sale when eligible; specialist confirmation required.',
      highlights: [
        'Scheduled maintenance at the requested service interval',
        'Eligible inspections, services, and selected wear items vary by returned offer',
        'Ford records and the issued agreement confirm the final schedule',
      ],
      eligibility: {
        headline: 'Vehicle, powertrain, mileage, and program eligibility require Ford record review.',
        requirements: ['Current Ford maintenance schedule', 'Eligible vehicle and powertrain', 'Available term and mileage combination'],
        dealerConfirmation: 'Bob Maxey confirms the exact services, interval, term, and price.',
        inspectionPolicy: 'The returned offer controls any inspection or enrollment requirement.',
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

const humanizeTiming = (value) => {
  const key = safeText(value).toLowerCase();
  if (!key) return '';
  if (key === 'original-vehicle-transaction-only') return 'Available only with the eligible original vehicle transaction.';
  if (key === 'vehicle-purchase-or-after-sale-within-nvlw') return 'May be available at purchase or after sale while within the New Vehicle Limited Warranty.';
  if (key === 'after-sale') return 'May be requested after the vehicle sale, subject to current eligibility.';
  return safeText(value).replace(/-/g, ' ');
};

const drawCoverPage = (pdf, model, assets, fonts) => {
  const page = addPage(pdf, assets, fonts, 'Personalized protection proposal');
  const snapshot = model.snapshot;
  const products = selectedProducts(model);

  drawImageContain(page, assets.hero, { x: PAGE.margin, y: 529, width: 248, height: 170, background: C.surface, allowUpscale: false });
  page.drawRectangle({ x: 286, y: 529, width: 288, height: 170, color: C.navy });
  page.drawText(safeText(model.cover.eyebrow), { x: 306, y: 669, size: 8.2, font: fonts.bold, color: C.white });
  drawWrapped(page, model.cover.headline, { x: 306, y: 641, width: 246, font: fonts.bold, size: 24, lineHeight: 27, color: C.white, maxLines: 2 });
  drawWrapped(page, model.cover.subhead, { x: 306, y: 579, width: 246, font: fonts.regular, size: 9.4, lineHeight: 12, color: C.white, maxLines: 2 });
  page.drawText(`REFERENCE ${safeText(snapshot.quoteId)}`, { x: 306, y: 548, size: 8.2, font: fonts.bold, color: C.white });

  page.drawText('PREPARED FOR', { x: PAGE.margin, y: 505, size: 8.2, font: fonts.bold, color: C.blueDark });
  page.drawText(truncate(model.cover.preparedFor, fonts.bold, 18, 270), { x: PAGE.margin, y: 482, size: 18, font: fonts.bold, color: C.navy });
  page.drawText(truncate(model.cover.purchaseContextLabel, fonts.regular, 9.2, 270), { x: PAGE.margin, y: 464, size: 9.2, font: fonts.regular, color: C.muted });
  drawLabelValue(page, 'Vehicle', snapshot.vehicle.displayName, { x: 328, y: 505, width: 246 }, fonts, { size: 11, maxLines: 1 });
  page.drawText(`${safeText(snapshot.vehicle.currentMileageLabel)}  |  ${safeText(snapshot.vehicle.powertrain || 'Powertrain to confirm')}`, { x: 328, y: 469, size: 9, font: fonts.regular, color: C.muted });
  drawRule(page, 448);

  page.drawText('PRIMARY FORD PROTECT REQUEST', { x: PAGE.margin, y: 427, size: 8.2, font: fonts.bold, color: C.blueDark });
  page.drawText(truncate(snapshot.coverage.planName, fonts.bold, 18, 340), { x: PAGE.margin, y: 403, size: 18, font: fonts.bold, color: C.navy });
  drawWrapped(page, snapshot.coverage.description || snapshot.coverage.coverageModel, { x: PAGE.margin, y: 384, width: 340, font: fonts.regular, size: 9, lineHeight: 11.5, color: C.muted, maxLines: 2 });
  page.drawRectangle({ x: 397, y: 359, width: 177, height: 69, color: C.surfaceBlue });
  drawLabelValue(page, snapshot.coverage.programLabel, snapshot.coverage.planPathLabel, { x: 411, y: 409, width: 149 }, fonts, { size: 9.2, maxLines: 2 });
  drawLabelValue(page, 'Deductible', snapshot.coverage.deductible.label, { x: 411, y: 376, width: 149 }, fonts, { size: 9.2, maxLines: 1 });

  const summaryY = 338;
  const details = [
    ['Term', snapshot.coverage.term.label],
    ['Mileage', snapshot.coverage.term.mileageLabel],
    ...(snapshot.program === 'enginecare' ? [['Engine hours', snapshot.coverage.term.engineHoursLabel]] : []),
    ['Current mileage', snapshot.vehicle.currentMileageLabel],
  ];
  const cellWidth = (PAGE.contentWidth - details.length + 1) / details.length;
  details.forEach(([label, value], index) => {
    const x = PAGE.margin + index * (cellWidth + 1);
    page.drawRectangle({ x, y: summaryY - 59, width: cellWidth, height: 59, color: index % 2 ? C.surface : C.surfaceBlue });
    drawLabelValue(page, label, value, { x: x + 12, y: summaryY - 18, width: cellWidth - 24 }, fonts, { size: 9, lineHeight: 10.8, maxLines: 2 });
  });

  const inspectionBottom = drawInspection(page, snapshot.coverage.inspection, { x: PAGE.margin, y: 263, width: PAGE.contentWidth, height: 63 }, fonts);
  page.drawText('ADDITIONAL PRODUCTS REQUESTED', { x: PAGE.margin, y: inspectionBottom - 22, size: 8.2, font: fonts.bold, color: C.blueDark });
  const productNames = products.map((product) => product.shortName || product.name);
  drawWrapped(page, productNames.length ? productNames.join('  |  ') : 'No additional products selected in this request.', { x: PAGE.margin, y: inspectionBottom - 41, width: PAGE.contentWidth, font: fonts.bold, size: 9.2, lineHeight: 11.5, color: C.ink, maxLines: 2 });

  page.drawRectangle({ x: PAGE.margin, y: 61, width: PAGE.contentWidth, height: 62, color: C.navy });
  page.drawText('SPECIALIST-CONFIRMED OFFER', { x: 54, y: 99, size: 8.2, font: fonts.bold, color: C.white });
  drawWrapped(page, 'Bob Maxey confirms the Ford record, eligible combinations, exact coverage, and current price before enrollment.', { x: 54, y: 81, width: 504, font: fonts.regular, size: 9.2, lineHeight: 11, color: C.white, maxLines: 2 });
};

const coverageGroups = (snapshot) => asArray(snapshot.coverage.coverageGroups).map((group) => ({
  title: safeText(group.title || group.name || 'Coverage group'),
  summary: safeText(group.summary || group.description || 'Covered components are subject to the issued agreement.'),
  items: asArray(group.items).map((item) => safeText(item)).filter(Boolean),
}));

const drawCoveragePage = (pdf, model, assets, fonts) => {
  const page = addPage(pdf, assets, fonts, 'Primary plan detail');
  const snapshot = model.snapshot;
  let y = drawPageTitle(page, snapshot.coverage.programLabel, `What ${snapshot.coverage.planName} is designed to cover`, snapshot.coverage.coverageModel || model.coverage.note, fonts);

  page.drawRectangle({ x: PAGE.margin, y: y - 66, width: PAGE.contentWidth, height: 66, color: C.navy });
  drawLabelValue(page, 'Selected coverage', snapshot.coverage.planName, { x: 54, y: y - 19, width: 206 }, fonts, { size: 12, color: C.white, labelColor: C.white, maxLines: 1 });
  drawLabelValue(page, 'Term and use limit', primaryTermLine(snapshot), { x: 278, y: y - 19, width: 280 }, fonts, { size: 9.2, lineHeight: 11, color: C.white, labelColor: C.white, maxLines: 2 });
  y -= 82;

  const groups = coverageGroups(snapshot);
  const visible = groups.slice(0, 10);
  const columnGap = 12;
  const cardWidth = (PAGE.contentWidth - columnGap) / 2;
  const rowCount = Math.max(1, Math.ceil(visible.length / 2));
  const denseGrid = visible.length > 4;
  const cardGap = denseGrid ? 5 : 7;
  const cardHeight = denseGrid ? Math.min(55, (300 - (rowCount - 1) * cardGap) / rowCount) : 104;
  visible.forEach((group, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = PAGE.margin + column * (cardWidth + columnGap);
    const top = y - row * (cardHeight + cardGap);
    page.drawRectangle({ x, y: top - cardHeight, width: cardWidth, height: cardHeight, color: C.surface });
    page.drawRectangle({ x, y: top - cardHeight, width: 3, height: cardHeight, color: C.blue });
    page.drawText(truncate(group.title, fonts.bold, 9.5, cardWidth - 23), { x: x + 12, y: top - 18, size: 9.5, font: fonts.bold, color: C.navy });
    if (cardHeight > 80) {
      drawWrapped(page, group.summary, { x: x + 12, y: top - 35, width: cardWidth - 23, font: fonts.regular, size: 8.3, lineHeight: 10, color: C.muted, maxLines: 2 });
      drawWrapped(page, group.items.slice(0, 6).join('; '), { x: x + 12, y: top - 60, width: cardWidth - 23, font: fonts.regular, size: 8.2, lineHeight: 9.8, color: C.ink, maxLines: 4 });
    } else {
      drawWrapped(page, group.items.slice(0, 3).join('; ') || group.summary, { x: x + 12, y: top - 35, width: cardWidth - 23, font: fonts.regular, size: 8.3, lineHeight: 10, color: C.muted, maxLines: 2 });
    }
  });
  y -= rowCount * (cardHeight + cardGap) + 4;
  if (groups.length > visible.length) {
    page.drawText(truncate(`Also summarized in the issued agreement: ${groups.slice(visible.length).map((group) => group.title).join(', ')}`, fonts.regular, 8.3, PAGE.contentWidth), { x: PAGE.margin, y, size: 8.3, font: fonts.regular, color: C.muted });
    y -= 18;
  }

  const benefits = asArray(snapshot.coverage.selectedPlanBenefits).map((benefit) => benefit.title || benefit.name).filter(Boolean);
  const options = asArray(snapshot.coverage.selectedPlanOptions).map((option) => `${option.name}${option.description ? ` - ${option.description}` : ''}`).filter(Boolean);
  const columnWidth = (PAGE.contentWidth - 12) / 2;
  page.drawText('PLAN VALUE HIGHLIGHTS', { x: PAGE.margin, y, size: 8.2, font: fonts.bold, color: C.blueDark });
  page.drawText(snapshot.program === 'enginecare' ? 'DIESEL REQUEST SETTINGS' : 'REQUESTED BENEFIT OPTIONS', { x: PAGE.margin + columnWidth + 12, y, size: 8.2, font: fonts.bold, color: C.blueDark });
  const engineSettings = snapshot.program === 'enginecare'
    ? [snapshot.coverage.planName, snapshot.coverage.term.mileageLabel, snapshot.coverage.term.engineHoursLabel, snapshot.coverage.deductible.label]
    : options;
  drawBullets(page, benefits.length ? benefits : ['Ford-backed repair coverage subject to the issued agreement', 'Plan benefits are confirmed for the exact vehicle and term'], { x: PAGE.margin, y: y - 19, width: columnWidth, fonts, maxItems: 4 });
  drawBullets(page, engineSettings.length ? engineSettings : ['No optional primary-plan benefits were requested'], { x: PAGE.margin + columnWidth + 12, y: y - 19, width: columnWidth, fonts, maxItems: 4 });

  if (visible.length <= 4) {
    const profileY = 314;
    page.drawRectangle({ x: PAGE.margin, y: profileY - 122, width: columnWidth, height: 122, color: C.surface });
    page.drawText('VEHICLE ELIGIBILITY PROFILE', { x: PAGE.margin + 14, y: profileY - 20, size: 8.2, font: fonts.bold, color: C.blueDark });
    drawBullets(page, [
      `VIN: ${snapshot.vehicle.vin || 'To be confirmed'}`,
      `Original in-service date: ${formatDate(snapshot.vehicle.inServiceDate, snapshot.vehicle.inServiceDateDisplay || 'To be confirmed')}`,
      `Current mileage: ${snapshot.vehicle.currentMileageLabel}`,
      `Registration: ${[snapshot.vehicle.state, snapshot.vehicle.zip].filter(Boolean).join(' ') || 'To be confirmed'}`,
      `Use: ${[snapshot.vehicle.powertrain, snapshot.vehicle.usage].filter(Boolean).join(' / ') || 'To be confirmed'}`,
    ], { x: PAGE.margin + 14, y: profileY - 41, width: columnWidth - 28, fonts, size: 8.4, lineHeight: 10, maxItems: 5 });
    const agreementX = PAGE.margin + columnWidth + 12;
    page.drawRectangle({ x: agreementX, y: profileY - 122, width: columnWidth, height: 122, color: C.surfaceBlue });
    page.drawText('WHAT THE RETURNED AGREEMENT CONFIRMS', { x: agreementX + 14, y: profileY - 20, size: 8.2, font: fonts.bold, color: C.blueDark });
    drawBullets(page, [
      'Exact covered components and exclusions',
      'Eligible term, mileage, deductible, and benefits',
      'Repair authorization and participating service requirements',
      'Cancellation, transfer, and state-specific provisions',
      'Current Bob Maxey price and available payment schedule',
    ], { x: agreementX + 14, y: profileY - 41, width: columnWidth - 28, fonts, size: 8.4, lineHeight: 10, maxItems: 5 });
  }

  drawInspection(page, snapshot.coverage.inspection, { x: PAGE.margin, y: 129, width: PAGE.contentWidth, height: 62 }, fonts);
  page.drawText(truncate(model.coverage.note, fonts.regular, 8.2, PAGE.contentWidth), { x: PAGE.margin, y: 56, size: 8.2, font: fonts.regular, color: C.muted });
};

const productCardHeight = (productCount) => productCount === 1 ? 254 : productCount === 2 ? 232 : 182;

const drawProductCard = (page, product, image, { x, y, width, height }, fonts) => {
  page.drawRectangle({ x, y: y - height, width, height, color: C.white, borderColor: C.line, borderWidth: 0.75 });
  page.drawRectangle({ x, y: y - height, width: 4, height, color: C.blue });
  drawImageContain(page, image, { x: x + 13, y: y - 82, width: 116, height: 66, background: C.surface, allowUpscale: false });
  const bodyX = x + 143;
  const bodyWidth = width - 158;
  page.drawText(truncate(product.familyLabel || product.eyebrow || 'Ford Protect product', fonts.bold, 8.1, bodyWidth), { x: bodyX, y: y - 19, size: 8.1, font: fonts.bold, color: C.blueDark });
  page.drawText(truncate(product.name || product.shortName, fonts.bold, 14, bodyWidth), { x: bodyX, y: y - 42, size: 14, font: fonts.bold, color: C.navy });
  drawWrapped(page, product.value || product.description, { x: bodyX, y: y - 61, width: bodyWidth, font: fonts.regular, size: 8.8, lineHeight: 10.5, color: C.muted, maxLines: 2 });
  drawRule(page, y - 94, x + 13, width - 26);

  const gap = 12;
  const colWidth = (width - 32 - gap * 2) / 3;
  const colX = [x + 16, x + 16 + colWidth + gap, x + 16 + (colWidth + gap) * 2];
  ['REQUESTED CONFIGURATION', 'PRODUCT VALUE', 'ELIGIBILITY & TIMING'].forEach((label, index) => {
    page.drawText(label, { x: colX[index], y: y - 112, size: 8, font: fonts.bold, color: C.blueDark });
  });
  const config = productConfiguration(product);
  drawWrapped(page, (config.length ? config : ['Exact option and term to be confirmed']).join('  |  '), { x: colX[0], y: y - 131, width: colWidth, font: fonts.regular, size: 8.2, lineHeight: 9.7, color: C.ink, maxLines: 5 });
  drawWrapped(page, asArray(product.highlights).slice(0, 4).join('; '), { x: colX[1], y: y - 131, width: colWidth, font: fonts.regular, size: 8.2, lineHeight: 9.7, color: C.ink, maxLines: 5 });
  const eligibility = [
    humanizeTiming(product.purchaseTiming || product.purchaseTimingLabel),
    product.eligibility?.inspectionPolicy,
    product.eligibility?.dealerConfirmation,
    product.eligibility?.headline,
  ].filter(Boolean);
  drawWrapped(page, eligibility.join(' '), { x: colX[2], y: y - 131, width: colWidth, font: fonts.regular, size: 8.2, lineHeight: 9.7, color: C.ink, maxLines: 5 });
};

const drawProductsPages = async (pdf, model, assets, fonts) => {
  const products = selectedProducts(model);
  if (!products.length) return;
  const imageEntries = await Promise.all(products.map(async (product) => [product.id || product.name, await embedAsset(pdf, product.image)]));
  const images = new Map(imageEntries);
  const chunks = [];
  for (let index = 0; index < products.length; index += 3) chunks.push(products.slice(index, index + 3));
  chunks.forEach((chunk, pageIndex) => {
    const page = addPage(pdf, assets, fonts, chunks.length > 1 ? `Additional products ${pageIndex + 1} of ${chunks.length}` : 'Additional product detail');
    let y = drawPageTitle(
      page,
      'Your selected Ford Protect products',
      pageIndex === 0 ? 'More protection, organized in one place.' : 'Additional selections continued.',
      'Each request preserves its configured term and benefit. A separate detailed product guide is available for every selection.',
      fonts,
    );
    const height = productCardHeight(chunk.length);
    chunk.forEach((product) => {
      drawProductCard(page, product, images.get(product.id || product.name), { x: PAGE.margin, y, width: PAGE.contentWidth, height }, fonts);
      y -= height + 9;
    });
  });
};

const drawFinalPage = (pdf, model, assets, fonts) => {
  const page = addPage(pdf, assets, fonts, 'Customer request and next steps');
  const summary = model.requestSummary;
  const products = selectedProducts(model);
  let y = drawPageTitle(page, 'Prepared for Bob Maxey follow-up', 'Your request is ready for specialist review.', 'Customer, vehicle, coverage, product, payment, and contact details remain together in this request.', fonts);

  const half = (PAGE.contentWidth - 12) / 2;
  page.drawRectangle({ x: PAGE.margin, y: y - 68, width: half, height: 68, color: C.surfaceBlue });
  drawLabelValue(page, 'Customer', summary.customer.fullName, { x: PAGE.margin + 14, y: y - 18, width: half - 28 }, fonts, { size: 11, maxLines: 1 });
  drawWrapped(page, [summary.customer.email || 'Email to confirm', summary.customer.phone || 'Phone to confirm', summary.customer.city].filter(Boolean).join('  |  '), { x: PAGE.margin + 14, y: y - 54, width: half - 28, font: fonts.regular, size: 8.8, lineHeight: 10.5, color: C.muted, maxLines: 2 });
  page.drawRectangle({ x: PAGE.margin + half + 12, y: y - 68, width: half, height: 68, color: C.surface });
  drawLabelValue(page, 'Preferred follow-up', summary.contact.preferredMethod, { x: PAGE.margin + half + 26, y: y - 18, width: half - 28 }, fonts, { size: 10, maxLines: 1 });
  drawLabelValue(page, 'Preferred store', summary.store.descriptor, { x: PAGE.margin + half + 26, y: y - 46, width: half - 28 }, fonts, { size: 8.8, lineHeight: 10.3, maxLines: 1 });
  y -= 80;

  page.drawText('REQUEST SUMMARY', { x: PAGE.margin, y, size: 8.2, font: fonts.bold, color: C.blueDark });
  y -= 14;
  const summaryRows = [
    ['Vehicle', `${summary.vehicle.displayName}  |  ${summary.vehicle.currentMileageLabel}`],
    ['Primary plan', `${summary.coverage.planName}  |  ${primaryTermLine(summary)}`],
    ['Deductible', summary.coverage.deductible.label],
    ['Additional products', products.length ? products.map((product) => `${product.shortName || product.name}${productConfiguration(product).length ? ` (${productConfiguration(product).join(', ')})` : ''}`).join('  |  ') : 'None requested'],
  ];
  const rowHeights = [30, 36, 30, 45];
  summaryRows.forEach(([label, value], index) => {
    const height = rowHeights[index];
    page.drawRectangle({ x: PAGE.margin, y: y - height, width: PAGE.contentWidth, height, color: index % 2 ? C.surface : C.white });
    page.drawText(label.toUpperCase(), { x: PAGE.margin + 12, y: y - 18, size: 8.1, font: fonts.bold, color: C.blueDark });
    drawWrapped(page, value, { x: 160, y: y - 17, width: 398, font: index === 3 ? fonts.regular : fonts.bold, size: 8.8, lineHeight: 10, color: C.ink, maxLines: index === 3 ? 3 : 2 });
    y -= height;
  });
  y -= 13;

  page.drawRectangle({ x: PAGE.margin, y: y - 82, width: half, height: 82, color: C.navy });
  page.drawText('PRICING STATUS', { x: PAGE.margin + 14, y: y - 20, size: 8.2, font: fonts.bold, color: C.white });
  const pricingHeadline = Number.isFinite(summary.pricing.total) ? `$${summary.pricing.total.toLocaleString('en-US')} current quoted total` : 'Prepared after eligibility review';
  drawWrapped(page, pricingHeadline, { x: PAGE.margin + 14, y: y - 42, width: half - 28, font: fonts.bold, size: 11, lineHeight: 13, color: C.white, maxLines: 2 });
  drawWrapped(page, summary.pricing.message, { x: PAGE.margin + 14, y: y - 66, width: half - 28, font: fonts.regular, size: 8.3, lineHeight: 9.8, color: C.white, maxLines: 2 });
  const paymentX = PAGE.margin + half + 12;
  page.drawRectangle({ x: paymentX, y: y - 82, width: half, height: 82, color: C.surfaceBlue });
  page.drawText('PAYMENT PREFERENCE', { x: paymentX + 14, y: y - 20, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, summary.payment.preference, { x: paymentX + 14, y: y - 40, width: half - 28, font: fonts.bold, size: 8.8, lineHeight: 10.5, color: C.ink, maxLines: 2 });
  drawWrapped(page, PAYMENT_MESSAGE, { x: paymentX + 14, y: y - 60, width: half - 28, font: fonts.regular, size: 8, lineHeight: 9.2, color: C.muted, maxLines: 3 });
  y -= 96;

  page.drawText('WHAT HAPPENS NEXT', { x: PAGE.margin, y, size: 8.2, font: fonts.bold, color: C.blueDark });
  y -= 14;
  const stepWidth = (PAGE.contentWidth - 8) / 2;
  asArray(model.nextSteps).slice(0, 4).forEach((step, index) => {
    const row = Math.floor(index / 2);
    const column = index % 2;
    const x = PAGE.margin + column * (stepWidth + 8);
    const top = y - row * 58;
    page.drawRectangle({ x, y: top - 50, width: stepWidth, height: 50, color: C.surface });
    page.drawText(`${safeText(step.number)}. ${safeText(step.title)}`, { x: x + 12, y: top - 20, size: 9.2, font: fonts.bold, color: C.navy });
    drawWrapped(page, step.text, { x: x + 12, y: top - 36, width: stepWidth - 24, font: fonts.regular, size: 8, lineHeight: 9.2, color: C.muted, maxLines: 2 });
  });
  y -= 116;

  const permission = summary.consent.granted ? 'Contact permission recorded for this request.' : 'Contact permission has not yet been recorded.';
  const notes = summary.contact.notes ? ` Customer note: ${summary.contact.notes}` : '';
  page.drawRectangle({ x: PAGE.margin, y: y - 43, width: PAGE.contentWidth, height: 43, color: summary.consent.granted ? C.greenPale : C.amberPale });
  page.drawText('REQUEST STATUS', { x: PAGE.margin + 12, y: y - 18, size: 8.2, font: fonts.bold, color: summary.consent.granted ? C.green : C.amber });
  drawWrapped(page, `${permission}${notes}`, { x: PAGE.margin + 12, y: y - 34, width: PAGE.contentWidth - 24, font: fonts.regular, size: 8.2, lineHeight: 9.6, color: C.ink, maxLines: 1 });
  y -= 53;
  page.drawText('IMPORTANT INFORMATION', { x: PAGE.margin, y, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawWrapped(page, `${model.disclaimer} This request does not purchase coverage.`, { x: PAGE.margin, y: y - 17, width: PAGE.contentWidth, font: fonts.regular, size: 8.1, lineHeight: 9.6, color: C.muted, maxLines: 4 });
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

const guideBlocks = (product) => [
  { title: 'Product value', items: asArray(product.highlights) },
  ...asArray(product.detailSections).map((section) => ({ title: section.title || 'Product detail', items: asArray(section.items) })),
  {
    title: 'Eligibility and specialist review',
    items: [product.eligibility?.headline, ...asArray(product.eligibility?.requirements), product.eligibility?.dealerConfirmation, product.eligibility?.inspectionPolicy].filter(Boolean),
  },
  {
    title: 'Purchase timing and important limits',
    items: [product.purchaseTiming || product.purchaseTimingLabel, ...asArray(product.cautions)].filter(Boolean),
  },
].filter((block) => block.items.length);

const guideBlockHeight = (block, fonts, width) => 24 + block.items.reduce(
  (height, item) => height + textHeight(item, fonts.regular, 8.6, width - 16, 10.4) + 4,
  0,
);

const drawGuideBlock = (page, block, { x, y, width }, fonts) => {
  page.drawText(safeText(block.title).toUpperCase(), { x, y, size: 8.2, font: fonts.bold, color: C.blueDark });
  drawRule(page, y - 8, x, width, C.line, 0.7);
  return drawBullets(page, block.items, { x, y: y - 24, width, fonts, size: 8.6, lineHeight: 10.4, maxItems: 20 }) - 2;
};

const splitGuideBlock = (block, fonts, width, availableHeight) => {
  const selected = [];
  let used = 24;
  for (const item of block.items) {
    const itemHeight = textHeight(item, fonts.regular, 8.6, width - 16, 10.4) + 4;
    if (selected.length && used + itemHeight > availableHeight) break;
    selected.push(item);
    used += itemHeight;
  }
  return [
    { title: block.title, items: selected },
    block.items.length > selected.length ? { title: `${block.title} - continued`, items: block.items.slice(selected.length) } : null,
  ];
};

const drawGuideContinuationHeader = (page, product, fonts) => {
  page.drawText('FORD PROTECT PRODUCT GUIDE', { x: PAGE.margin, y: PAGE.contentTop, size: 8.5, font: fonts.bold, color: C.blueDark });
  page.drawText(truncate(product.name || product.shortName, fonts.bold, 22, PAGE.contentWidth), { x: PAGE.margin, y: PAGE.contentTop - 28, size: 22, font: fonts.bold, color: C.navy });
  drawRule(page, PAGE.contentTop - 43);
  return PAGE.contentTop - 61;
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
  page.drawText(safeText(product.eyebrow || product.familyLabel || 'Ford Protect product').toUpperCase(), { x: PAGE.margin, y: PAGE.contentTop, size: 8.5, font: fonts.bold, color: C.blueDark });
  page.drawText(truncate(productName, fonts.bold, 24, 334), { x: PAGE.margin, y: PAGE.contentTop - 31, size: 24, font: fonts.bold, color: C.navy });
  drawWrapped(page, product.value || product.description || 'Ford-backed protection tailored to the way you own your vehicle.', { x: PAGE.margin, y: PAGE.contentTop - 55, width: 334, font: fonts.regular, size: 9.4, lineHeight: 11.8, color: C.muted, maxLines: 3 });
  drawImageContain(page, productImage, { x: 392, y: 578, width: 182, height: 132, background: C.surface, allowUpscale: false });

  page.drawRectangle({ x: PAGE.margin, y: 487, width: PAGE.contentWidth, height: 76, color: C.navy });
  page.drawText('REQUESTED CONFIGURATION', { x: 54, y: 540, size: 8.2, font: fonts.bold, color: C.white });
  const configuration = guideConfiguration(product, selection);
  drawWrapped(page, configuration.length ? configuration.join('  |  ') : 'Your Bob Maxey specialist will match this product to the current eligible option, term, and price.', { x: 54, y: 519, width: 504, font: fonts.bold, size: 9.2, lineHeight: 11.2, color: C.white, maxLines: 3 });
  const contextLine = quote?.purchaseContext === 'shopping'
    ? 'Planning with a Bob Maxey vehicle purchase'
    : quote?.purchaseContext === 'owner'
      ? 'After-sale product request for a vehicle already owned'
      : 'Current availability and purchase timing require specialist confirmation';
  page.drawText(truncate(contextLine, fonts.regular, 8.3, PAGE.contentWidth), { x: PAGE.margin, y: 470, size: 8.3, font: fonts.regular, color: C.muted });
  drawRule(page, 458);

  const columns = [PAGE.margin, 314];
  const columnWidth = 260;
  const columnBottom = 67;
  let columnIndex = 0;
  let cursor = 438;
  const queue = [...guideBlocks(product)];
  while (queue.length) {
    const block = queue.shift();
    const available = cursor - columnBottom;
    const needed = guideBlockHeight(block, fonts, columnWidth);
    if (needed <= available) {
      cursor = drawGuideBlock(page, block, { x: columns[columnIndex], y: cursor, width: columnWidth }, fonts) - 10;
      continue;
    }
    if (available >= 78) {
      const [first, rest] = splitGuideBlock(block, fonts, columnWidth, available);
      if (first.items.length) drawGuideBlock(page, first, { x: columns[columnIndex], y: cursor, width: columnWidth }, fonts);
      if (rest) queue.unshift(rest);
    } else queue.unshift(block);

    if (columnIndex === 0) {
      columnIndex = 1;
      cursor = 438;
    } else {
      page = addPage(pdf, assets, fonts, 'Product guide continued');
      columnIndex = 0;
      cursor = drawGuideContinuationHeader(page, product, fonts);
    }
  }

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

  drawCoverPage(pdf, model, assets, fonts);
  drawCoveragePage(pdf, model, assets, fonts);
  await drawProductsPages(pdf, model, assets, fonts);
  drawFinalPage(pdf, model, assets, fonts);

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
