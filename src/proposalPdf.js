import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { assetUrl } from './paths';
import { buildProposalModel } from './quoteOutput';

const LETTER = [612, 792];
const PAGE = {
  width: 612,
  height: 792,
  margin: 44,
  contentWidth: 524,
  headerBottom: 724,
  footerTop: 42,
};

const C = {
  navy: rgb(0 / 255, 31 / 255, 73 / 255),
  deep: rgb(0 / 255, 18 / 255, 42 / 255),
  blue: rgb(0 / 255, 104 / 255, 217 / 255),
  sky: rgb(79 / 255, 174 / 255, 1),
  pale: rgb(233 / 255, 243 / 255, 1),
  paleGreen: rgb(232 / 255, 249 / 255, 243 / 255),
  surface: rgb(246 / 255, 248 / 255, 252 / 255),
  surfaceBlue: rgb(240 / 255, 246 / 255, 253 / 255),
  ink: rgb(5 / 255, 29 / 255, 65 / 255),
  muted: rgb(72 / 255, 91 / 255, 116 / 255),
  line: rgb(213 / 255, 224 / 255, 237 / 255),
  white: rgb(1, 1, 1),
  green: rgb(0 / 255, 126 / 255, 88 / 255),
  amber: rgb(174 / 255, 92 / 255, 0),
  amberPale: rgb(1, 245 / 255, 226 / 255),
};

const PAYMENT_MESSAGE = 'Eligible plans: a small down payment, then the remaining balance financed at 0% interest. The current offer confirms the exact down payment, payment count, schedule, and first due date.';

const safeText = (value = '') => String(value)
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\u2026/g, '...')
  .replace(/[\u2022\u00B7]/g, '-')
  .replace(/\u00AE/g, '')
  .replace(/\u2122/g, '')
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

const asArray = (value) => Array.isArray(value) ? value : [];

const fetchAsset = async (path) => {
  if (!path) return null;
  try {
    const url = assetUrl(path);
    const response = await fetch(url);
    if (!response.ok) return null;
    return {
      bytes: await response.arrayBuffer(),
      type: response.headers.get('content-type') || (path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'image/png'),
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

const wrap = (text, font, size, maxWidth) => {
  const paragraphs = safeText(text).split(/\n/);
  const lines = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let current = '';
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    if (paragraphIndex < paragraphs.length - 1) lines.push('');
  });
  return lines.length ? lines : [''];
};

const drawWrapped = (page, text, {
  x,
  y,
  width,
  size = 9.5,
  lineHeight = 12.5,
  font,
  color = C.ink,
  maxLines = Number.POSITIVE_INFINITY,
}) => {
  const lines = wrap(text, font, size, width).slice(0, maxLines);
  lines.forEach((line, index) => page.drawText(line, {
    x,
    y: y - index * lineHeight,
    size,
    font,
    color,
  }));
  return y - lines.length * lineHeight;
};

const blockHeight = (text, font, size, width, lineHeight) => wrap(text, font, size, width).length * lineHeight;

const drawRule = (page, y, x = PAGE.margin, width = PAGE.contentWidth, color = C.line) => page.drawLine({
  start: { x, y },
  end: { x: x + width, y },
  thickness: 0.8,
  color,
});

const truncateToWidth = (text, font, size, width) => {
  const clean = safeText(text);
  if (font.widthOfTextAtSize(clean, size) <= width) return clean;
  let shortened = clean;
  while (shortened.length > 1 && font.widthOfTextAtSize(`${shortened}...`, size) > width) shortened = shortened.slice(0, -1);
  return `${shortened.trim()}...`;
};

const normalizedLabel = (value) => safeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const uniqueLabels = (values) => asArray(values).reduce((result, value) => {
  const key = normalizedLabel(value);
  if (!key || result.some((entry) => entry.key === key)) return result;
  result.push({ key, value });
  return result;
}, []).map((entry) => entry.value);

const displayDate = (value, fallback = 'To be confirmed') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value) || fallback;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
};

const drawImageContain = (page, image, { x, y, width, height, background = C.surface }) => {
  page.drawRectangle({ x, y, width, height, color: background });
  if (!image) return;
  const scale = Math.min(width / image.width, height / image.height);
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
  page.drawRectangle({ x: 0, y: PAGE.headerBottom, width: PAGE.width, height: PAGE.height - PAGE.headerBottom, color: C.white });
  if (assets.dealer) {
    const scale = Math.min(112 / assets.dealer.width, 34 / assets.dealer.height);
    page.drawImage(assets.dealer, {
      x: PAGE.margin,
      y: 744,
      width: assets.dealer.width * scale,
      height: assets.dealer.height * scale,
    });
  } else {
    page.drawText('BOB MAXEY', { x: PAGE.margin, y: 757, size: 13, font: fonts.bold, color: C.navy });
  }
  page.drawLine({ start: { x: 171, y: 743 }, end: { x: 171, y: 778 }, thickness: 0.8, color: C.line });
  if (assets.protect) {
    const scale = Math.min(100 / assets.protect.width, 29 / assets.protect.height);
    page.drawImage(assets.protect, {
      x: 185,
      y: 747,
      width: assets.protect.width * scale,
      height: assets.protect.height * scale,
    });
  } else {
    page.drawText('FORD PROTECT', { x: 185, y: 757, size: 12, font: fonts.bold, color: C.navy });
  }
  page.drawText(safeText(label).toUpperCase(), {
    x: 385,
    y: 757,
    size: 9,
    font: fonts.bold,
    color: C.blue,
  });
  page.drawRectangle({ x: 0, y: PAGE.headerBottom, width: PAGE.width, height: 4, color: C.blue });
};

const addContentPage = (pdf, assets, fonts, label) => {
  const page = pdf.addPage(LETTER);
  drawBrandHeader(page, assets, fonts, label);
  return page;
};

const drawFooter = (page, pageNumber, totalPages, quoteId, fonts) => {
  drawRule(page, PAGE.footerTop);
  page.drawText('Bob Maxey Ford Protect - Personalized customer proposal', {
    x: PAGE.margin,
    y: 20,
    size: 8.5,
    font: fonts.regular,
    color: C.muted,
  });
  const reference = `Quote ${safeText(quoteId)}  |  ${pageNumber} / ${totalPages}`;
  const width = fonts.regular.widthOfTextAtSize(reference, 8.5);
  page.drawText(reference, {
    x: PAGE.width - PAGE.margin - width,
    y: 20,
    size: 8.5,
    font: fonts.regular,
    color: C.muted,
  });
};

const sectionTitleMetrics = (title, description, fonts, y = 696) => {
  const titleSize = 24;
  const titleLineHeight = 28;
  const descriptionLineHeight = 14;
  const titleLines = wrap(title, fonts.bold, titleSize, PAGE.contentWidth).slice(0, 3);
  const titleY = y - 34;
  const lastTitleY = titleY - (titleLines.length - 1) * titleLineHeight;
  const descriptionY = lastTitleY - 25;
  const descriptionLines = wrap(description, fonts.regular, 10, PAGE.contentWidth).slice(0, 3);
  return {
    titleLines,
    titleY,
    titleSize,
    titleLineHeight,
    descriptionLines,
    descriptionY,
    descriptionLineHeight,
    bottom: descriptionY - descriptionLines.length * descriptionLineHeight - 12,
  };
};

const drawSectionTitle = (page, eyebrow, title, description, fonts, y = 696) => {
  const metrics = sectionTitleMetrics(title, description, fonts, y);
  page.drawText(safeText(eyebrow).toUpperCase(), { x: PAGE.margin, y, size: 9, font: fonts.bold, color: C.blue });
  metrics.titleLines.forEach((line, index) => page.drawText(line, {
    x: PAGE.margin,
    y: metrics.titleY - index * metrics.titleLineHeight,
    size: metrics.titleSize,
    font: fonts.bold,
    color: C.ink,
  }));
  metrics.descriptionLines.forEach((line, index) => page.drawText(line, {
    x: PAGE.margin,
    y: metrics.descriptionY - index * metrics.descriptionLineHeight,
    size: 10,
    font: fonts.regular,
    color: C.muted,
  }));
  return metrics.bottom;
};

const drawLabelValue = (page, label, value, { x, y, width }, fonts, options = {}) => {
  page.drawText(safeText(label).toUpperCase(), { x, y, size: 8.5, font: fonts.bold, color: options.labelColor || C.blue });
  return drawWrapped(page, value || 'Not provided', {
    x,
    y: y - 17,
    width,
    size: options.size || 10,
    lineHeight: options.lineHeight || 13,
    font: options.font || fonts.bold,
    color: options.color || C.ink,
    maxLines: options.maxLines || 3,
  });
};

const drawCheck = (page, x, y, color = C.blue) => {
  page.drawCircle({ x, y, size: 7, color });
  page.drawLine({ start: { x: x - 3.2, y }, end: { x: x - 0.5, y: y - 2.8 }, thickness: 1.4, color: C.white });
  page.drawLine({ start: { x: x - 0.5, y: y - 2.8 }, end: { x: x + 3.8, y: y + 2.5 }, thickness: 1.4, color: C.white });
};

const drawBulletList = (page, items, {
  x,
  y,
  width,
  font,
  size = 9.2,
  lineHeight = 12,
  color = C.ink,
  bulletColor = C.blue,
  gap = 5,
}) => {
  let cursor = y;
  asArray(items).forEach((item) => {
    const lines = wrap(item, font, size, width - 18);
    page.drawCircle({ x: x + 4, y: cursor + 3, size: 2, color: bulletColor });
    lines.forEach((line, index) => page.drawText(line, {
      x: x + 14,
      y: cursor - index * lineHeight,
      size,
      font,
      color,
    }));
    cursor -= lines.length * lineHeight + gap;
  });
  return cursor;
};

const bulletListHeight = (items, font, size, width, lineHeight, gap = 5) => asArray(items).reduce(
  (total, item) => total + wrap(item, font, size, width - 18).length * lineHeight + gap,
  0,
);

const drawStatusCallout = (page, { title, message, caveat, tone = 'blue' }, { x, y, width }, fonts) => {
  const palette = tone === 'warning'
    ? { background: C.amberPale, accent: C.amber }
    : tone === 'positive'
      ? { background: C.paleGreen, accent: C.green }
      : { background: C.pale, accent: C.blue };
  const messageText = [message, caveat].filter(Boolean).join(' ');
  const messageHeight = blockHeight(messageText, fonts.regular, 9.2, width - 50, 12);
  const height = Math.max(64, 38 + messageHeight);
  page.drawRectangle({ x, y: y - height, width, height, color: palette.background });
  page.drawRectangle({ x, y: y - height, width: 4, height, color: palette.accent });
  drawCheck(page, x + 20, y - 23, palette.accent);
  page.drawText(safeText(title), { x: x + 38, y: y - 19, size: 10, font: fonts.bold, color: C.ink });
  drawWrapped(page, messageText, {
    x: x + 38,
    y: y - 37,
    width: width - 52,
    size: 9.2,
    lineHeight: 12,
    font: fonts.regular,
    color: C.muted,
  });
  return y - height;
};

const productPages = (model) => {
  const products = [...asArray(model.products.additionalProducts)];
  const maintenance = model.products.maintenance;
  const maintenanceKey = normalizedLabel(maintenance?.name);
  if (maintenance?.selected && !products.some((product) => product.id === maintenance.id || normalizedLabel(product.name || product.shortName) === maintenanceKey)) {
    products.unshift({
      id: maintenance.id,
      name: maintenance.name,
      shortName: maintenance.name,
      eyebrow: 'Scheduled maintenance request',
      value: maintenance.description || 'Plan ahead for scheduled service and eligible maintenance benefits.',
      description: maintenance.intervalLabel || 'The current Ford offer confirms the available maintenance schedule and benefits.',
      image: '/assets/ford-official/ford-maintenance-wide.png',
      imageAlt: 'Ford maintenance service',
      badge: 'Specialist confirmation',
      highlights: [
        maintenance.intervalLabel || 'Requested maintenance interval will be reviewed',
        'Available services and wear-item benefits are confirmed in the current offer',
        'The issued agreement controls service locations, transfer, and cancellation terms',
      ],
      eligibility: {
        headline: 'Bob Maxey will match the vehicle to a current eligible Ford Protect maintenance option.',
        requirements: ['Vehicle and powertrain eligibility', 'Current Ford maintenance schedule', 'Available program and service interval'],
        dealerConfirmation: 'Exact coverage and availability require a returned dealer offer.',
      },
      cautions: [],
      selectedOptions: [],
    });
  }
  return products.reduce((result, product) => {
    const key = normalizedLabel(product.name || product.shortName || product.id);
    if (result.some((entry) => entry.id === product.id || normalizedLabel(entry.name || entry.shortName || entry.id) === key)) return result;
    result.push(product);
    return result;
  }, []);
};

const addCoverPage = (pdf, model, assets, fonts) => {
  const page = addContentPage(pdf, assets, fonts, 'Personal coverage proposal');
  const heroY = 454;
  const heroHeight = 250;
  drawImageContain(page, assets.hero, { x: 0, y: heroY, width: PAGE.width, height: heroHeight, background: C.deep });
  page.drawRectangle({ x: 0, y: heroY, width: PAGE.width, height: 88, color: C.deep, opacity: 0.92 });
  page.drawText(safeText(model.cover.eyebrow), { x: PAGE.margin, y: heroY + 62, size: 9, font: fonts.bold, color: C.sky });
  page.drawText(safeText(model.cover.headline), { x: PAGE.margin, y: heroY + 34, size: 27, font: fonts.bold, color: C.white });
  page.drawText(safeText(model.cover.subhead), { x: PAGE.margin, y: heroY + 14, size: 10, font: fonts.regular, color: C.white });

  page.drawText('PREPARED FOR', { x: PAGE.margin, y: 424, size: 8.5, font: fonts.bold, color: C.blue });
  page.drawText(safeText(model.cover.preparedFor), { x: PAGE.margin, y: 397, size: 21, font: fonts.bold, color: C.ink });
  page.drawText(`${safeText(model.cover.vehicle)}${model.snapshot.vehicle.currentMileageLabel ? `  |  ${safeText(model.snapshot.vehicle.currentMileageLabel)}` : ''}`, {
    x: PAGE.margin,
    y: 377,
    size: 10,
    font: fonts.regular,
    color: C.muted,
  });
  page.drawText(truncateToWidth(model.cover.purchaseContextLabel, fonts.bold, 8.5, PAGE.contentWidth), { x: PAGE.margin, y: 359, size: 8.5, font: fonts.bold, color: C.blue });

  page.drawRectangle({ x: PAGE.margin, y: 255, width: PAGE.contentWidth, height: 96, color: C.surfaceBlue });
  page.drawRectangle({ x: PAGE.margin, y: 255, width: 5, height: 96, color: C.blue });
  drawLabelValue(page, model.snapshot.coverage.programLabel, model.cover.planName, { x: 64, y: 329, width: 250 }, fonts, { size: 15, lineHeight: 17 });
  drawLabelValue(page, 'Term', model.cover.termLabel, { x: 331, y: 329, width: 205 }, fonts);
  const mileageDetail = model.snapshot.program === 'enginecare'
    ? `${model.cover.mileageLabel}  |  ${model.cover.engineHoursLabel}`
    : model.cover.mileageLabel;
  drawLabelValue(page, model.snapshot.program === 'enginecare' ? 'Mileage / engine hours' : 'Mileage', mileageDetail, { x: 331, y: 287, width: 205 }, fonts, { size: model.snapshot.program === 'enginecare' ? 9.2 : 10, lineHeight: 11.5, maxLines: 2 });

  const selectedNames = uniqueLabels(model.cover.selectedProductNames);
  page.drawText('REQUESTED PROTECTION', { x: PAGE.margin, y: 224, size: 8.5, font: fonts.bold, color: C.blue });
  let selectedY = 202;
  selectedNames.slice(0, 3).forEach((name) => {
    drawCheck(page, PAGE.margin + 7, selectedY + 4, C.green);
    page.drawText(truncateToWidth(name, fonts.bold, 10, 472), { x: PAGE.margin + 23, y: selectedY, size: 10, font: fonts.bold, color: C.ink });
    selectedY -= 22;
  });
  if (selectedNames.length > 3) page.drawText(`+ ${selectedNames.length - 3} more requested product${selectedNames.length - 3 === 1 ? '' : 's'}`, { x: PAGE.margin + 23, y: selectedY, size: 9.5, font: fonts.bold, color: C.blue });

  page.drawRectangle({ x: PAGE.margin, y: 63, width: PAGE.contentWidth, height: 54, color: C.navy });
  page.drawText('SPECIALIST-CONFIRMED OFFER', { x: 62, y: 95, size: 8.5, font: fonts.bold, color: C.sky });
  page.drawText('Bob Maxey confirms eligibility, exact coverage, and current price.', { x: 62, y: 76, size: 11, font: fonts.bold, color: C.white });
};

const addOverviewPage = (pdf, model, assets, fonts) => {
  const page = addContentPage(pdf, assets, fonts, 'Your protection overview');
  let y = drawSectionTitle(page, model.snapshot.coverage.programLabel, model.overview.headline, model.overview.bestFor || model.overview.coverageModel, fonts);

  page.drawRectangle({ x: PAGE.margin, y: y - 108, width: PAGE.contentWidth, height: 108, color: C.navy });
  page.drawText('SELECTED COVERAGE', { x: 62, y: y - 25, size: 8.5, font: fonts.bold, color: C.sky });
  page.drawText(safeText(model.snapshot.coverage.planName), { x: 62, y: y - 51, size: 19, font: fonts.bold, color: C.white });
  const planLine = model.snapshot.program === 'csp'
    ? `${model.snapshot.coverage.term.label}  |  ${model.snapshot.coverage.deductible.label}`
    : model.snapshot.program === 'enginecare'
      ? `${model.snapshot.coverage.term.label}  |  ${model.snapshot.coverage.term.mileageLabel}  |  ${model.snapshot.coverage.term.engineHoursLabel}  |  ${model.snapshot.coverage.deductible.label}`
      : `${model.snapshot.coverage.term.label}  |  ${model.snapshot.coverage.term.mileageLabel}  |  ${model.snapshot.coverage.deductible.label}`;
  drawWrapped(page, planLine, { x: 62, y: y - 74, width: 470, size: 10, lineHeight: 13, font: fonts.regular, color: C.white, maxLines: 2 });
  y -= 128;

  const cardWidth = 253;
  const cards = [
    ['Vehicle', model.snapshot.vehicle.displayName, model.snapshot.vehicle.currentMileageLabel],
    ['Coverage path', model.snapshot.coverage.planPathLabel, model.snapshot.coverage.programLabel],
    ['Ownership goal', model.overview.ownershipSummary, 'Used to organize the request'],
    ['Additional products', `${productPages(model).length} requested`, productPages(model).map((product) => product.shortName || product.name).join(', ') || 'None requested'],
  ];
  cards.forEach(([label, value, note], index) => {
    const x = index % 2 === 0 ? PAGE.margin : 315;
    const top = y - Math.floor(index / 2) * 90;
    page.drawRectangle({ x, y: top - 76, width: cardWidth, height: 76, color: C.surface, borderColor: C.line, borderWidth: 0.7 });
    page.drawText(label.toUpperCase(), { x: x + 14, y: top - 19, size: 8.5, font: fonts.bold, color: C.blue });
    drawWrapped(page, value, { x: x + 14, y: top - 39, width: cardWidth - 28, size: 10.5, lineHeight: 13, font: fonts.bold, color: C.ink, maxLines: 2 });
    page.drawText(truncateToWidth(note, fonts.regular, 9, cardWidth - 28), { x: x + 14, y: top - 65, size: 9, font: fonts.regular, color: C.muted });
  });
  y -= 188;

  const inspection = model.overview.inspection;
  y = drawStatusCallout(page, {
    title: inspection.label,
    message: inspection.message,
    caveat: inspection.caveat,
    tone: inspection.required ? 'warning' : inspection.required === false ? 'positive' : 'blue',
  }, { x: PAGE.margin, y, width: PAGE.contentWidth }, fonts) - 16;

  page.drawText('PAYMENT CHOICE', { x: PAGE.margin, y, size: 8.5, font: fonts.bold, color: C.blue });
  drawWrapped(page, PAYMENT_MESSAGE, {
    x: PAGE.margin,
    y: y - 18,
    width: PAGE.contentWidth,
    size: 9.5,
    lineHeight: 13,
    font: fonts.regular,
    color: C.ink,
    maxLines: 3,
  });
};

const normalizeCoverageChunks = (groups) => {
  const chunks = [];
  asArray(groups).forEach((group) => {
    const items = asArray(group.items);
    if (!items.length) {
      chunks.push({ ...group, items: [] });
      return;
    }
    for (let index = 0; index < items.length; index += 10) {
      chunks.push({
        ...group,
        title: index === 0 ? group.title : `${group.title} (continued)`,
        summary: index === 0 ? group.summary : '',
        items: items.slice(index, index + 10),
      });
    }
  });
  return chunks;
};

const coverageCardHeight = (group, fonts) => {
  const summaryHeight = group.summary ? blockHeight(group.summary, fonts.regular, 9.2, 482, 12) + 10 : 0;
  const left = asArray(group.items).filter((_, index) => index % 2 === 0);
  const right = asArray(group.items).filter((_, index) => index % 2 === 1);
  const listHeight = Math.max(
    bulletListHeight(left, fonts.regular, 9.1, 226, 12, 4),
    bulletListHeight(right, fonts.regular, 9.1, 226, 12, 4),
  );
  return Math.max(76, 42 + summaryHeight + listHeight);
};

const drawCoverageCard = (page, group, x, y, width, height, fonts) => {
  page.drawRectangle({ x, y: y - height, width, height, color: C.surface, borderColor: C.line, borderWidth: 0.7 });
  page.drawRectangle({ x, y: y - height, width: 5, height, color: C.blue });
  page.drawText(safeText(group.title), { x: x + 17, y: y - 23, size: 11, font: fonts.bold, color: C.ink });
  let cursor = y - 42;
  if (group.summary) {
    cursor = drawWrapped(page, group.summary, { x: x + 17, y: cursor, width: width - 34, size: 9.2, lineHeight: 12, font: fonts.regular, color: C.muted }) - 8;
  }
  const items = asArray(group.items);
  const left = items.filter((_, index) => index % 2 === 0);
  const right = items.filter((_, index) => index % 2 === 1);
  drawBulletList(page, left, { x: x + 17, y: cursor, width: 226, font: fonts.regular, size: 9.1, lineHeight: 12, gap: 4 });
  drawBulletList(page, right, { x: x + 270, y: cursor, width: 226, font: fonts.regular, size: 9.1, lineHeight: 12, gap: 4 });
};

const paginateCoverageChunks = (chunks, model, fonts) => {
  const firstStart = sectionTitleMetrics(
    model.coverage.headline,
    model.snapshot.coverage.coverageModel || model.coverage.note,
    fonts,
  ).bottom;
  const continuedStart = sectionTitleMetrics(
    model.snapshot.coverage.planName,
    'Additional covered-system examples from your selected plan.',
    fonts,
  ).bottom;
  const pages = [];
  let current = [];
  let cursor = firstStart;

  chunks.forEach((group) => {
    const height = coverageCardHeight(group, fonts);
    if (current.length && cursor - height < 70) {
      pages.push(current);
      current = [];
      cursor = continuedStart;
    }
    current.push({ group, height });
    cursor -= height + 12;
  });
  if (current.length) pages.push(current);

  // Avoid an orphaned final system on an otherwise empty page. Moving the
  // prior page's last card creates a deliberate two-card continuation page.
  if (pages.length > 1 && pages.at(-1).length === 1 && pages.at(-2).length > 1) {
    const previous = pages.at(-2);
    const candidate = previous.at(-1);
    const finalPage = pages.at(-1);
    const combinedHeight = candidate.height + 12 + finalPage.reduce((sum, item) => sum + item.height + 12, 0);
    if (continuedStart - combinedHeight >= 70) {
      previous.pop();
      finalPage.unshift(candidate);
    }
  }
  return pages;
};

const addCoveragePages = (pdf, model, assets, fonts) => {
  const chunks = normalizeCoverageChunks(model.coverage.groups);
  if (!chunks.length) chunks.push({ title: model.snapshot.coverage.planName, summary: model.snapshot.coverage.coverageModel || model.snapshot.coverage.description, items: [] });
  const paginated = paginateCoverageChunks(chunks, model, fonts);
  paginated.forEach((entries, pageIndex) => {
    const page = addContentPage(pdf, assets, fonts, pageIndex === 0 ? 'Coverage detail' : 'Coverage detail - continued');
    let y = drawSectionTitle(
      page,
      pageIndex === 0 ? 'YOUR SELECTED COVERAGE' : 'COVERAGE CONTINUED',
      pageIndex === 0 ? model.coverage.headline : model.snapshot.coverage.planName,
      pageIndex === 0 ? (model.snapshot.coverage.coverageModel || model.coverage.note) : 'Additional covered-system examples from your selected plan.',
      fonts,
    );
    entries.forEach(({ group, height }) => {
      drawCoverageCard(page, group, PAGE.margin, y, PAGE.contentWidth, height, fonts);
      y -= height + 12;
    });
    if (pageIndex === paginated.length - 1 && y > 230) {
      const closingHeight = 104;
      page.drawRectangle({ x: PAGE.margin, y: y - closingHeight, width: PAGE.contentWidth, height: closingHeight, color: C.navy });
      page.drawText('PLAN SUPPORT AT A GLANCE', { x: 61, y: y - 22, size: 8.5, font: fonts.bold, color: C.sky });
      drawLabelValue(page, 'Published component position', model.snapshot.coverage.componentCount || 'Plan-specific coverage', { x: 61, y: y - 45, width: 202 }, fonts, { size: 12, color: C.white, labelColor: C.sky });
      const benefitNames = asArray(model.overview.benefits).map((benefit) => benefit.title || benefit.name).filter(Boolean);
      drawLabelValue(page, 'Plan benefits highlighted', benefitNames.join('  |  ') || 'Ford-backed plan support', { x: 310, y: y - 45, width: 238 }, fonts, { size: 9.2, lineHeight: 11.5, maxLines: 3, color: C.white, labelColor: C.sky });
      y -= closingHeight + 12;
    }
    if (pageIndex === paginated.length - 1 && y > 102) {
      page.drawRectangle({ x: PAGE.margin, y: 54, width: PAGE.contentWidth, height: 38, color: C.pale });
      drawWrapped(page, model.coverage.note, { x: 58, y: 78, width: 496, size: 9, lineHeight: 11.5, font: fonts.regular, color: C.muted, maxLines: 2 });
    }
  });
};

const addProductPage = (pdf, product, productImage, model, assets, fonts, index, total) => {
  const page = addContentPage(pdf, assets, fonts, `Requested product ${index} of ${total}`);
  const title = product.name || product.shortName;
  const afterValue = drawSectionTitle(
    page,
    product.eyebrow || product.familyLabel || 'Additional Ford Protect request',
    title,
    product.value || product.description || 'Requested for specialist review.',
    fonts,
  );

  const imageTop = afterValue - 6;
  const imageHeight = 150;
  drawImageContain(page, productImage, { x: PAGE.margin, y: imageTop - imageHeight, width: 246, height: imageHeight, background: C.surfaceBlue });
  page.drawRectangle({ x: 306, y: imageTop - imageHeight, width: 262, height: imageHeight, color: C.navy });
  page.drawText('WHY IT MAY ADD VALUE', { x: 324, y: imageTop - 24, size: 8.5, font: fonts.bold, color: C.sky });
  drawWrapped(page, product.description || product.value, {
    x: 324,
    y: imageTop - 47,
    width: 226,
    size: 10,
    lineHeight: 13.5,
    font: fonts.regular,
    color: C.white,
    maxLines: 6,
  });
  if (product.badge) {
    page.drawRectangle({ x: 324, y: imageTop - imageHeight + 17, width: 208, height: 27, color: C.blue });
    page.drawText(truncateToWidth(product.badge, fonts.bold, 9, 188), { x: 336, y: imageTop - imageHeight + 26, size: 9, font: fonts.bold, color: C.white });
  }

  let y = imageTop - imageHeight - 24;
  const highlights = asArray(product.highlights).slice(0, 4);
  page.drawText('COVERAGE AND VALUE HIGHLIGHTS', { x: PAGE.margin, y, size: 8.5, font: fonts.bold, color: C.blue });
  y -= 20;
  const leftHighlights = highlights.filter((_, itemIndex) => itemIndex % 2 === 0);
  const rightHighlights = highlights.filter((_, itemIndex) => itemIndex % 2 === 1);
  const leftBottom = drawBulletList(page, leftHighlights, { x: PAGE.margin, y, width: 248, font: fonts.regular, size: 9.2, lineHeight: 12, gap: 5 });
  const rightBottom = drawBulletList(page, rightHighlights, { x: 315, y, width: 248, font: fonts.regular, size: 9.2, lineHeight: 12, gap: 5 });
  y = Math.min(leftBottom, rightBottom) - 8;

  const eligibility = product.eligibility || {};
  const requirements = asArray(eligibility.requirements).slice(0, 3);
  const selectedOptions = asArray(product.selectedOptions);
  const maintenanceMatch = model.products.maintenance?.selected
    && (product.id === model.products.maintenance.id || normalizedLabel(product.name || product.shortName) === normalizedLabel(model.products.maintenance.name));
  const normalizedLabels = asArray(product.configuration?.labels);
  const requestedConfiguration = normalizedLabels.length
    ? [...normalizedLabels]
    : selectedOptions.map((option) => `${option.name}${option.summary ? ` - ${option.summary}` : ''}`);
  if (product.configuration?.startBasisLabel) requestedConfiguration.push(`Coverage basis: ${product.configuration.startBasisLabel}`);
  if (maintenanceMatch && model.products.maintenance.intervalLabel && !normalizedLabels.some((label) => /every|service/i.test(label))) requestedConfiguration.push(model.products.maintenance.intervalLabel);
  if (product.requestedTerm) requestedConfiguration.push(`Requested product term: ${product.requestedTerm}`);
  const configurationIdentity = normalizedLabel(title).replace(/\b(?:ford protect|plan|program)\b/g, '').replace(/\s+/g, ' ').trim();
  const uniqueConfiguration = requestedConfiguration.filter(Boolean).reduce((items, label) => {
    const normalized = normalizedLabel(label);
    const identity = normalized.replace(/\b(?:ford protect|plan|program)\b/g, '').replace(/\s+/g, ' ').trim();
    const isConfiguration = /(?:month|year|mile|hour|every|benefit|coverage basis|deductible|\$)/i.test(label);
    if ((!isConfiguration && identity === configurationIdentity) || items.some((item) => normalizedLabel(item) === normalized)) return items;
    items.push(label);
    return items;
  }, []);
  if (!uniqueConfiguration.length) uniqueConfiguration.push('No specific option selected; Bob Maxey will match the request to the current eligible product choice.');
  const cautions = asArray(product.cautions).slice(0, 2);
  const cardGap = 10;
  const cardWidth = (PAGE.contentWidth - cardGap) / 2;
  const cardHeight = 146;
  const cardsTop = y;

  page.drawRectangle({ x: PAGE.margin, y: cardsTop - cardHeight, width: cardWidth, height: cardHeight, color: C.surface, borderColor: C.line, borderWidth: 0.7 });
  page.drawRectangle({ x: PAGE.margin, y: cardsTop - cardHeight, width: 5, height: cardHeight, color: C.green });
  page.drawText('ELIGIBILITY REVIEW', { x: 61, y: cardsTop - 20, size: 8.5, font: fonts.bold, color: C.green });
  let eligibilityY = drawWrapped(page, eligibility.headline || 'Bob Maxey will confirm current eligibility for this vehicle.', {
    x: 61,
    y: cardsTop - 40,
    width: cardWidth - 34,
    size: 9.2,
    lineHeight: 12,
    font: fonts.bold,
    color: C.ink,
    maxLines: 3,
  }) - 4;
  drawBulletList(page, requirements, { x: 61, y: eligibilityY, width: cardWidth - 34, font: fonts.regular, size: 9, lineHeight: 11, gap: 2 });

  const rightX = PAGE.margin + cardWidth + cardGap;
  page.drawRectangle({ x: rightX, y: cardsTop - cardHeight, width: cardWidth, height: cardHeight, color: C.surfaceBlue, borderColor: C.line, borderWidth: 0.7 });
  page.drawText('YOUR REQUESTED CONFIGURATION', { x: rightX + 16, y: cardsTop - 20, size: 8.5, font: fonts.bold, color: C.blue });
  let optionY = drawBulletList(page, uniqueConfiguration.slice(0, 5), { x: rightX + 15, y: cardsTop - 42, width: cardWidth - 30, font: fonts.regular, size: 8.7, lineHeight: 10.5, gap: 2 });
  page.drawText('DEALER CONFIRMATION', { x: rightX + 16, y: optionY - 3, size: 8.5, font: fonts.bold, color: C.blue });
  drawWrapped(page, eligibility.dealerConfirmation || 'The current offer confirms exact product availability, included benefits, term, and price.', {
    x: rightX + 16,
    y: optionY - 20,
    width: cardWidth - 32,
    size: 9,
    lineHeight: 11,
    font: fonts.regular,
    color: C.muted,
    maxLines: 2,
  });

  const limitsTop = cardsTop - cardHeight - cardGap;
  const limitsHeight = Math.max(76, Math.min(104, limitsTop - 70));
  page.drawRectangle({ x: PAGE.margin, y: limitsTop - limitsHeight, width: PAGE.contentWidth, height: limitsHeight, color: C.navy });
  page.drawText('IMPORTANT ELIGIBILITY NOTES', { x: 61, y: limitsTop - 20, size: 8.5, font: fonts.bold, color: C.sky });
  const inspectionText = eligibility.inspectionPolicy || model.overview.inspection?.message || 'Bob Maxey will confirm any inspection requirement before enrollment.';
  drawWrapped(page, inspectionText, {
    x: 61,
    y: limitsTop - 39,
    width: 238,
    size: 9,
    lineHeight: 11.5,
    font: fonts.regular,
    color: C.white,
    maxLines: 5,
  });
  const limitItems = cautions.length ? cautions : ['The issued agreement controls availability, benefits, limits, exclusions, cancellation, transfer, and state-specific terms.'];
  drawBulletList(page, limitItems, { x: 320, y: limitsTop - 39, width: 230, font: fonts.regular, size: 9, lineHeight: 11.5, color: C.white, bulletColor: C.sky, gap: 3 });
};

const addProductsPages = async (pdf, model, assets, fonts) => {
  const products = productPages(model);
  if (!products.length) return;
  const imageEntries = await Promise.all(products.map(async (product) => [product.id, await embedAsset(pdf, product.image)]));
  const images = new Map(imageEntries);
  products.forEach((product, index) => addProductPage(pdf, product, images.get(product.id) || assets.hero, model, assets, fonts, index + 1, products.length));
};

const drawSummaryRow = (page, label, value, x, y, width, fonts, rowHeight = 47) => {
  drawRule(page, y - rowHeight, x, width);
  page.drawText(safeText(label).toUpperCase(), { x, y: y - 18, size: 8.5, font: fonts.bold, color: C.blue });
  drawWrapped(page, value || 'Not provided', { x: x + 122, y: y - 18, width: width - 122, size: 9.5, lineHeight: 12.5, font: fonts.bold, color: C.ink, maxLines: 2 });
  return y - rowHeight;
};

const drawCompactCell = (page, { label, value, x, y, width, height = 51 }, fonts, tone = 'plain') => {
  const background = tone === 'blue' ? C.surfaceBlue : tone === 'green' ? C.paleGreen : C.surface;
  page.drawRectangle({ x, y: y - height, width, height, color: background, borderColor: C.line, borderWidth: 0.6 });
  page.drawText(safeText(label).toUpperCase(), { x: x + 13, y: y - 17, size: 8.5, font: fonts.bold, color: tone === 'green' ? C.green : C.blue });
  drawWrapped(page, value || 'To be confirmed', {
    x: x + 13,
    y: y - 35,
    width: width - 26,
    size: 9.4,
    lineHeight: 11.5,
    font: fonts.bold,
    color: C.ink,
    maxLines: 2,
  });
};

const drawListModule = (page, { label, items, empty, x, y, width, height, accent = C.blue }, fonts) => {
  page.drawRectangle({ x, y: y - height, width, height, color: C.surface, borderColor: C.line, borderWidth: 0.7 });
  page.drawRectangle({ x, y: y - height, width: 4, height, color: accent });
  page.drawText(safeText(label).toUpperCase(), { x: x + 16, y: y - 19, size: 8.5, font: fonts.bold, color: accent });
  const values = asArray(items).filter(Boolean);
  if (values.length) {
    drawBulletList(page, values, { x: x + 15, y: y - 41, width: width - 30, font: fonts.regular, size: 9, lineHeight: 11.5, gap: 3, bulletColor: accent });
  } else {
    drawWrapped(page, empty || 'None requested', { x: x + 17, y: y - 41, width: width - 34, size: 9.2, lineHeight: 12, font: fonts.regular, color: C.muted, maxLines: 3 });
  }
};

const addRequestSummaryPage = (pdf, model, assets, fonts) => {
  const page = addContentPage(pdf, assets, fonts, 'Vehicle and plan brief');
  let y = drawSectionTitle(page, 'YOUR PERSONAL PROTECTION BRIEF', 'The vehicle and plan details behind your request.', 'Bob Maxey uses this information to verify the Ford record and return the current eligible coverage and pricing.', fonts);
  const summary = model.requestSummary;
  const termLine = summary.coverage.program === 'csp'
    ? summary.coverage.term.label
    : summary.coverage.program === 'enginecare'
      ? `${summary.coverage.term.label}  |  ${summary.coverage.term.mileageLabel}  |  ${summary.coverage.term.engineHoursLabel}`
      : `${summary.coverage.term.label}  |  ${summary.coverage.term.mileageLabel}`;

  page.drawRectangle({ x: PAGE.margin, y: y - 88, width: PAGE.contentWidth, height: 88, color: C.navy });
  page.drawText(summary.coverage.programLabel.toUpperCase(), { x: 62, y: y - 23, size: 8.5, font: fonts.bold, color: C.sky });
  page.drawText(safeText(summary.coverage.planName), { x: 62, y: y - 49, size: 18, font: fonts.bold, color: C.white });
  drawWrapped(page, `${summary.coverage.planPathLabel}  |  ${termLine}`, { x: 62, y: y - 69, width: 310, size: 9.2, lineHeight: 11.5, font: fonts.regular, color: C.white, maxLines: 2 });
  page.drawText('DEDUCTIBLE', { x: 432, y: y - 25, size: 8.5, font: fonts.bold, color: C.sky });
  drawWrapped(page, summary.coverage.deductible.label, { x: 432, y: y - 47, width: 118, size: 11, lineHeight: 13, font: fonts.bold, color: C.white, maxLines: 2 });
  y -= 105;

  page.drawText('VEHICLE & ELIGIBILITY PROFILE', { x: PAGE.margin, y, size: 8.5, font: fonts.bold, color: C.blue });
  y -= 12;
  const gap = 8;
  const cellWidth = (PAGE.contentWidth - gap) / 2;
  const location = [summary.vehicle.state, summary.vehicle.zip].filter(Boolean).join(' ') || 'To be confirmed';
  const powertrainUse = [summary.vehicle.powertrain, summary.vehicle.usage ? `${summary.vehicle.usage} use` : ''].filter(Boolean).join('  |  ') || 'To be confirmed';
  const cells = [
    ['VIN', summary.vehicle.vin || 'To be confirmed'],
    ['Current mileage', summary.vehicle.currentMileageLabel],
    ['Original in-service date', displayDate(summary.vehicle.inServiceDate, summary.vehicle.inServiceDateDisplay || 'To be confirmed')],
    ['Registration state / ZIP', location],
    ['Powertrain / use', powertrainUse],
    summary.coverage.program === 'enginecare'
      ? ['Engine-hour limit', summary.coverage.term.engineHoursLabel]
      : ['Plan path', `${summary.coverage.programLabel} - ${summary.coverage.planPathLabel}`],
  ];
  cells.forEach(([label, value], index) => {
    const row = Math.floor(index / 2);
    const x = index % 2 === 0 ? PAGE.margin : PAGE.margin + cellWidth + gap;
    drawCompactCell(page, { label, value, x, y: y - row * 55, width: cellWidth }, fonts, row === 0 ? 'blue' : 'plain');
  });
  y -= 177;

  const isEngineCare = summary.coverage.program === 'enginecare';
  const benefits = isEngineCare
    ? asArray(summary.coverage.coverageGroups).map((group) => group.title).filter(Boolean).slice(0, 4)
    : asArray(summary.coverage.selectedPlanBenefits).map((benefit) => benefit.title || benefit.name).filter(Boolean).slice(0, 4);
  const options = isEngineCare
    ? [
      `Plan level - ${summary.coverage.planName}`,
      `Referenced term - ${summary.coverage.term.label}`,
      `Referenced limits - ${summary.coverage.term.mileageLabel}; ${summary.coverage.term.engineHoursLabel}`,
      `Deductible - ${summary.coverage.deductible.label}`,
    ]
    : asArray(summary.coverage.selectedPlanOptions).map((option) => `${option.name}${option.description ? ` - ${option.description}` : ''}`).filter(Boolean).slice(0, 4);
  const moduleWidth = (PAGE.contentWidth - 10) / 2;
  drawListModule(page, { label: isEngineCare ? 'Diesel coverage groups highlighted' : 'Included plan benefits highlighted', items: benefits, empty: 'Coverage is confirmed by the issued Ford Protect agreement.', x: PAGE.margin, y, width: moduleWidth, height: 102, accent: C.blue }, fonts);
  drawListModule(page, { label: isEngineCare ? 'Diesel EngineCARE request settings' : 'Requested ESP benefit options', items: options, empty: isEngineCare ? 'Diesel EngineCARE settings require specialist confirmation.' : 'No optional ESP benefit request was selected.', x: PAGE.margin + moduleWidth + 10, y, width: moduleWidth, height: 102, accent: C.green }, fonts);
  y -= 117;

  const inspection = summary.coverage.inspection;
  drawStatusCallout(page, {
    title: inspection.label,
    message: inspection.message,
    caveat: inspection.caveat,
    tone: inspection.required ? 'warning' : inspection.required === false ? 'positive' : 'blue',
  }, { x: PAGE.margin, y, width: PAGE.contentWidth }, fonts);
};

const addCustomerRequestPage = (pdf, model, assets, fonts) => {
  const page = addContentPage(pdf, assets, fonts, 'Customer request and pricing review');
  let y = drawSectionTitle(page, 'PREPARED FOR BOB MAXEY FOLLOW-UP', 'Your selections, contact preferences, and pricing status.', 'Everything below travels with the request so the specialist can return a complete, vehicle-specific Ford Protect offer.', fonts);
  const summary = model.requestSummary;
  const customerLocation = summary.customer.city || 'City to be confirmed';
  const contactLine = [summary.customer.email || 'Email to be confirmed', summary.customer.phone || 'Phone to be confirmed'].join('  |  ');

  page.drawRectangle({ x: PAGE.margin, y: y - 90, width: PAGE.contentWidth, height: 90, color: C.surfaceBlue, borderColor: C.line, borderWidth: 0.7 });
  page.drawRectangle({ x: PAGE.margin, y: y - 90, width: 5, height: 90, color: C.blue });
  page.drawText('CUSTOMER & FOLLOW-UP', { x: 62, y: y - 19, size: 8.5, font: fonts.bold, color: C.blue });
  page.drawText(safeText(summary.customer.fullName), { x: 62, y: y - 43, size: 15, font: fonts.bold, color: C.ink });
  drawWrapped(page, `${contactLine}  |  ${customerLocation}`, { x: 62, y: y - 62, width: 300, size: 9.2, lineHeight: 11.5, font: fonts.regular, color: C.muted, maxLines: 2 });
  page.drawText(truncateToWidth(summary.purchaseContextLabel, fonts.bold, 8.5, 300), { x: 62, y: y - 82, size: 8.5, font: fonts.bold, color: C.blue });
  drawLabelValue(page, 'Preferred contact', summary.contact.preferredMethod, { x: 388, y: y - 22, width: 162 }, fonts, { size: 10 });
  drawLabelValue(page, 'Preferred store', summary.store.descriptor, { x: 388, y: y - 58, width: 162 }, fonts, { size: 9.2, lineHeight: 11.5, maxLines: 2 });
  y -= 106;

  page.drawText('ADDITIONAL FORD PROTECT REQUESTS', { x: PAGE.margin, y, size: 8.5, font: fonts.bold, color: C.blue });
  y -= 13;
  const products = productPages(model);
  const productRows = products.length ? products.slice(0, 4) : [{ name: 'No additional products requested', selectedOptions: [] }];
  const rowHeight = products.length > 2 ? 44 : 54;
  const rowGap = 5;
  productRows.forEach((product, index) => {
    const rowTop = y - index * (rowHeight + rowGap);
    page.drawRectangle({ x: PAGE.margin, y: rowTop - rowHeight, width: PAGE.contentWidth, height: rowHeight, color: index % 2 === 0 ? C.surface : C.white, borderColor: C.line, borderWidth: 0.6 });
    drawCheck(page, 64, rowTop - 23, products.length ? C.green : C.muted);
    page.drawText(truncateToWidth(product.name || product.shortName, fonts.bold, 9.8, 224), { x: 82, y: rowTop - 20, size: 9.8, font: fonts.bold, color: C.ink });
    const productIdentity = normalizedLabel(product.name || product.shortName).replace(/\b(?:ford protect|plan|program)\b/g, '').replace(/\s+/g, ' ').trim();
    const selected = [
      ...asArray(product.selectedOptions).map((option) => option.name),
      ...asArray(product.configuration?.labels),
    ].filter(Boolean).reduce((items, label) => {
      const normalized = normalizedLabel(label);
      const identity = normalized.replace(/\b(?:ford protect|plan|program)\b/g, '').replace(/\s+/g, ' ').trim();
      const isConfiguration = /(?:month|year|mile|hour|every|benefit|coverage basis|deductible|\$)/i.test(label);
      if ((!isConfiguration && identity === productIdentity) || items.some((item) => normalizedLabel(item) === normalized)) return items;
      items.push(label);
      return items;
    }, []);
    const detail = selected.length
      ? `Requested configuration: ${selected.join(' | ')}`
      : product.id === summary.maintenance.id && summary.maintenance.intervalLabel
        ? summary.maintenance.intervalLabel
        : 'Exact product option and term to be confirmed in the current offer.';
    drawWrapped(page, detail, { x: 314, y: rowTop - 20, width: 235, size: 9, lineHeight: 11.5, font: fonts.regular, color: C.muted, maxLines: 2 });
  });
  y -= productRows.length * (rowHeight + rowGap) + 5;

  const statusHeight = 110;
  const statusWidth = (PAGE.contentWidth - 10) / 2;
  page.drawRectangle({ x: PAGE.margin, y: y - statusHeight, width: statusWidth, height: statusHeight, color: C.navy });
  page.drawText('PRICING STATUS', { x: 61, y: y - 22, size: 8.5, font: fonts.bold, color: C.sky });
  const pricingHeadline = Number.isFinite(summary.pricing.total)
    ? `$${summary.pricing.total.toLocaleString('en-US')} current quoted total`
    : 'Prepared after eligibility review';
  drawWrapped(page, pricingHeadline, { x: 61, y: y - 45, width: statusWidth - 34, size: 12, lineHeight: 14, font: fonts.bold, color: C.white, maxLines: 2 });
  drawWrapped(page, summary.pricing.message, { x: 61, y: y - 76, width: statusWidth - 34, size: 9, lineHeight: 11.5, font: fonts.regular, color: C.white, maxLines: 3 });

  const paymentX = PAGE.margin + statusWidth + 10;
  page.drawRectangle({ x: paymentX, y: y - statusHeight, width: statusWidth, height: statusHeight, color: C.surfaceBlue, borderColor: C.line, borderWidth: 0.7 });
  page.drawText('PAYMENT PREFERENCE', { x: paymentX + 16, y: y - 22, size: 8.5, font: fonts.bold, color: C.blue });
  drawWrapped(page, summary.payment.preference, { x: paymentX + 16, y: y - 44, width: statusWidth - 32, size: 9.5, lineHeight: 12, font: fonts.bold, color: C.ink, maxLines: 2 });
  drawWrapped(page, PAYMENT_MESSAGE, { x: paymentX + 16, y: y - 73, width: statusWidth - 32, size: 9, lineHeight: 11.5, font: fonts.regular, color: C.muted, maxLines: 4 });
  y -= statusHeight + 12;

  const consentTone = summary.consent.granted ? { background: C.paleGreen, accent: C.green } : { background: C.amberPale, accent: C.amber };
  page.drawRectangle({ x: PAGE.margin, y: y - 68, width: PAGE.contentWidth, height: 68, color: consentTone.background });
  page.drawRectangle({ x: PAGE.margin, y: y - 68, width: 5, height: 68, color: consentTone.accent });
  page.drawText('CONTACT PERMISSION', { x: 61, y: y - 17, size: 8.5, font: fonts.bold, color: consentTone.accent });
  page.drawText(summary.consent.granted ? 'Granted for this Ford Protect request' : 'Not yet recorded', { x: 61, y: y - 37, size: 10.5, font: fonts.bold, color: C.ink });
  drawWrapped(page, summary.contact.notes ? `Customer note: ${summary.contact.notes}` : 'No additional customer notes were entered.', { x: 61, y: y - 55, width: 485, size: 9, lineHeight: 11, font: fonts.regular, color: C.muted, maxLines: 1 });
  y -= 80;

  drawStatusCallout(page, {
    title: summary.eligibility.title || 'Ford record review required',
    message: summary.eligibility.message || 'Bob Maxey will confirm the VIN, current eligibility, available combinations, and state availability.',
    caveat: 'Pricing is prepared after the eligibility review; this proposal does not invent or imply a price.',
    tone: 'blue',
  }, { x: PAGE.margin, y, width: PAGE.contentWidth }, fonts);
};

const addNextStepsPage = (pdf, model, assets, fonts) => {
  const page = addContentPage(pdf, assets, fonts, 'What happens next');
  let y = drawSectionTitle(page, 'BOB MAXEY SPECIALIST SUPPORT', model.confirmation.headline, model.confirmation.message, fonts);
  asArray(model.nextSteps).forEach((step) => {
    const height = 79;
    page.drawRectangle({ x: PAGE.margin, y: y - height, width: PAGE.contentWidth, height, color: C.surface, borderColor: C.line, borderWidth: 0.7 });
    page.drawCircle({ x: 70, y: y - 39, size: 18, color: C.navy });
    const number = safeText(step.number);
    const numberWidth = fonts.bold.widthOfTextAtSize(number, 12);
    page.drawText(number, { x: 70 - numberWidth / 2, y: y - 43, size: 12, font: fonts.bold, color: C.white });
    page.drawText(safeText(step.title), { x: 103, y: y - 28, size: 11, font: fonts.bold, color: C.ink });
    drawWrapped(page, step.text, { x: 103, y: y - 48, width: 438, size: 9.5, lineHeight: 12.5, font: fonts.regular, color: C.muted, maxLines: 2 });
    y -= height + 10;
  });

  page.drawRectangle({ x: PAGE.margin, y: 126, width: PAGE.contentWidth, height: 84, color: C.navy });
  page.drawText('PAYMENT CHOICE', { x: 62, y: 184, size: 8.5, font: fonts.bold, color: C.sky });
  drawWrapped(page, PAYMENT_MESSAGE, { x: 62, y: 164, width: 488, size: 9.5, lineHeight: 13, font: fonts.regular, color: C.white, maxLines: 4 });

  page.drawText('IMPORTANT INFORMATION', { x: PAGE.margin, y: 102, size: 8.5, font: fonts.bold, color: C.blue });
  drawWrapped(page, model.disclaimer, { x: PAGE.margin, y: 84, width: PAGE.contentWidth, size: 9, lineHeight: 11.5, font: fonts.regular, color: C.muted, maxLines: 4 });
};

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

  addCoverPage(pdf, model, assets, fonts);
  addOverviewPage(pdf, model, assets, fonts);
  addCoveragePages(pdf, model, assets, fonts);
  await addProductsPages(pdf, model, assets, fonts);
  addRequestSummaryPage(pdf, model, assets, fonts);
  addCustomerRequestPage(pdf, model, assets, fonts);
  addNextStepsPage(pdf, model, assets, fonts);

  const pages = pdf.getPages();
  pages.forEach((page, index) => drawFooter(page, index + 1, pages.length, model.document.quoteId, fonts));
  return pdf.save();
}

export async function downloadProposalPdf(input) {
  const bytes = await createProposalPdf(input);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${input.quote.id || 'bob-maxey-ford-protect'}-proposal.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return bytes;
}
