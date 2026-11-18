import { AD_ARTWORK } from '@/lib/adPageGeometry';

export default async function renderAdCanvas(sheet) {
  const { default: html2canvas } = await import('html2canvas');
  // html2canvas measures fonts in the HOST document, not the clean ad frame.
  // Its 1px baseline probe must be inline. Tailwind's img { display: block }
  // otherwise puts that probe on a new line and shifts every PDF text baseline.
  // Limit the reset to the library's hidden measuring container and remove it
  // after capture. Real photos and the visible app keep their existing styles.
  const metricsStyle = document.createElement('style');
  metricsStyle.textContent = `
    body > div[style*="visibility: hidden"][style*="white-space: nowrap"] > img {
      display: inline-block !important;
    }
  `;
  document.head.appendChild(metricsStyle);
  try {
    return await html2canvas(sheet, {
      scale: 2, width: AD_ARTWORK.width, height: AD_ARTWORK.height,
      windowWidth: AD_ARTWORK.width, windowHeight: AD_ARTWORK.height,
      scrollX: 0, scrollY: 0, backgroundColor: '#ffffff', logging: false,
    });
  } finally {
    metricsStyle.remove();
  }
}