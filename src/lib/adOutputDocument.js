import { AD_ARTWORK, AD_PAPER, AD_PRINT_AREA, AD_ART_SCALE, AD_PLACEMENT } from '@/lib/adPageGeometry';

// Copy only the rendered ad, never the app's print rules, hidden tabs or
// transformed route containers. Computed styles preserve both flyer layouts.
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;500;600;700;800&display=swap';
const OUTPUT_CSS = `
  @page { size: letter portrait; margin: ${AD_PAPER.margin}in; }
  html, body { margin: 0; padding: 0; background: white; color-scheme: light; }
  body { width: ${AD_ARTWORK.width}px; }
  #ad-sheet { position: relative !important; left: 0 !important; top: 0 !important;
    width: ${AD_ARTWORK.width}px !important; height: ${AD_ARTWORK.height}px !important;
    margin: 0 !important; transform: none !important; overflow: hidden !important; }
  #ad-output-page { position: relative; width: ${AD_PRINT_AREA.width}in;
    height: ${AD_PRINT_AREA.height}in; overflow: hidden; margin: 0; padding: 0;
    break-inside: avoid; page-break-inside: avoid; }
  #ad-output-page > #ad-sheet { position: absolute !important;
    left: ${(AD_PLACEMENT.x - AD_PAPER.margin) * 96}px !important;
    top: ${(AD_PLACEMENT.y - AD_PAPER.margin) * 96}px !important;
    transform: scale(${AD_ART_SCALE}) !important; transform-origin: top left !important; }
  #ad-sheet, #ad-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  [data-ad-controls] { padding: 12px; font: 16px system-ui, sans-serif; }
  [data-ad-controls] button { min-height: 44px; padding: 8px 20px; cursor: pointer; }
  [data-ad-controls] p { margin: 8px 0 0; line-height: 1.5; }
  @media print { [data-ad-controls] { display: none !important; }
    html, body { width: ${AD_PRINT_AREA.width}in; height: ${AD_PRINT_AREA.height}in;
      overflow: hidden; } }
`;

export function snapshotAdSheet() {
  const source = document.getElementById('ad-sheet');
  if (!source) throw new Error('Select an ad before printing or downloading.');
  const sheet = source.cloneNode(true);
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [sheet, ...sheet.querySelectorAll('*')];
  originals.forEach((node, index) => {
    const copy = copies[index];
    const styles = window.getComputedStyle(node);
    copy.removeAttribute('class');
    copy.style.cssText = Array.from(styles)
      .filter((key) => !key.startsWith('--'))
      .map((key) => `${key}:${styles.getPropertyValue(key)};`).join('');
    if (copy.tagName === 'IMG') {
      copy.removeAttribute('srcset');
      copy.loading = 'eager';
      copy.src = node.currentSrc || node.src;
    }
  });
  return sheet;
}

export function initializeAdDocument(doc, title) {
  // Fixed markup only. Ad copy is inserted as DOM nodes, never interpolated HTML.
  doc.open();
  doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>');
  doc.close();
  doc.title = title;
  const style = doc.createElement('style');
  style.textContent = OUTPUT_CSS;
  doc.head.appendChild(style);
  const status = doc.createElement('p');
  status.textContent = 'Preparing ad…';
  status.setAttribute('role', 'status');
  doc.body.appendChild(status);
}

export async function mountAdSheet(doc, sheet, { printPage = true } = {}) {
  const fonts = doc.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = FONT_URL;
  const fontStylesReady = new Promise((resolve, reject) => {
    fonts.onload = resolve;
    fonts.onerror = () => reject(new Error('The ad fonts could not load. Please try again.'));
  });
  doc.head.appendChild(fonts);
  // Keep the full artwork separate from the physical printable area. A full
  // 8.5-inch sheet plus printer margins was wider than Letter at 100% scale.
  const content = doc.adoptNode(sheet);
  if (printPage) {
    const page = doc.createElement('main');
    page.id = 'ad-output-page';
    page.appendChild(content);
    doc.body.replaceChildren(page);
  } else {
    // PDF capture needs the original, unscaled artwork; margins are added in inches.
    doc.body.replaceChildren(content);
  }
  await fontStylesReady;
  await Promise.all([
    doc.fonts.load('150px "Bebas Neue"'),
    doc.fonts.load('800 17px Nunito'),
    ...Array.from(sheet.querySelectorAll('img'), (img) => new Promise((resolve, reject) => {
      const fail = () => reject(new Error(`The photo for ${img.alt || 'the ad'} could not load. Check its photo selection and try again.`));
      if (img.complete) return img.naturalWidth ? resolve() : fail();
      img.onload = resolve;
      img.onerror = fail;
    })),
  ]);
  await doc.fonts.ready;
  // Read layout before capture/print; this works even in a background tab.
  sheet.getBoundingClientRect();
}

export function createAdFrame() {
  const frame = document.createElement('iframe');
  frame.title = 'Preparing ad PDF';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // The document inside remains at 0,0 with a full Letter viewport.
  frame.style.cssText = 'position:fixed;left:0;top:0;width:816px;height:1056px;border:0;z-index:-1;pointer-events:none;';
  document.body.appendChild(frame);
  return frame;
}