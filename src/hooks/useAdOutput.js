import { useEffect, useRef, useState } from 'react';
import { createAdFrame, initializeAdDocument, mountAdSheet, snapshotAdSheet } from '@/lib/adOutputDocument';
import { embedAdPhotos, offerAdPdf } from '@/lib/adOutputAssets';
import { AD_PAPER, AD_PLACEMENT } from '@/lib/adPageGeometry';
import renderAdCanvas from '@/lib/renderAdCanvas';

function withinOutputLimit(operation) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Preparing the ad took too long. Please try again.')), 45000);
  });
  return Promise.race([operation, timeout]).finally(() => window.clearTimeout(timer));
}

export default function useAdOutput(draft, onNote) {
  const [outputBusy, setOutputBusy] = useState('');
  const [pdfDownload, setPdfDownload] = useState(null);
  const downloadUrl = useRef(null);
  const currentDraft = useRef(draft);
  currentDraft.current = draft;
  useEffect(() => { setPdfDownload(null); }, [draft]);
  useEffect(() => () => {
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
  }, []);

  const printAd = async () => {
    if (!draft || outputBusy) return;
    // Open on the click, not after fonts/photos finish, to retain popup permission.
    const tab = window.open('', '_blank');
    if (!tab) {
      onNote('Allow pop-ups for this site, then click Print again.');
      return;
    }
    setOutputBusy('print');
    onNote('Preparing the ad for printing…');
    try {
      initializeAdDocument(tab.document, draft.name || 'Flavor Isle ad');
      await withinOutputLimit(snapshotAdSheet().then((sheet) => mountAdSheet(tab.document, sheet)));
      const controls = tab.document.createElement('div');
      controls.setAttribute('data-ad-controls', '');
      const button = tab.document.createElement('button');
      button.type = 'button';
      button.textContent = 'Print ad';
      button.onclick = () => { tab.focus(); tab.print(); };
      const settings = tab.document.createElement('p');
      settings.textContent = 'Letter paper, portrait, 100% scale. Narrow 0.25-inch side margins are built into this layout. Turn off headers and footers; do not use Fit to page or add extra margins.';
      controls.append(button, settings);
      tab.document.body.prepend(controls);
      tab.focus();
      tab.print();
      onNote('Ready on one Letter page with narrow 0.25-inch side margins. Choose 100% scale and turn off headers and footers in the print dialog.');
    } catch (error) {
      console.error('Ad print failed:', error);
      onNote(error.message || 'The ad could not be prepared for printing.');
      if (!tab.closed) {
        const message = tab.document.createElement('p');
        message.textContent = error.message || 'The ad could not be prepared. Close this tab and try again.';
        tab.document.body.replaceChildren(message);
      }
    } finally {
      setOutputBusy('');
    }
  };

  const downloadPdf = async () => {
    if (!draft || outputBusy) return;
    const selectedAd = draft;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const iosTab = isIOS ? window.open('', '_blank') : null;
    let frame;
    setOutputBusy('pdf');
    setPdfDownload(null);
    onNote('Preparing the PDF…');
    try {
      const sheet = await withinOutputLimit(snapshotAdSheet());
      if (iosTab) initializeAdDocument(iosTab.document, 'Preparing ad PDF');
      frame = createAdFrame();
      initializeAdDocument(frame.contentDocument, selectedAd.name || 'Flavor Isle ad');
      const [{ jsPDF }] = await withinOutputLimit(Promise.all([
        import('jspdf'),
        embedAdPhotos(sheet).then(() => mountAdSheet(frame.contentDocument, sheet, { printPage: false })),
      ]));
      const canvas = await withinOutputLimit(renderAdCanvas(sheet));
      const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
      pdf.viewerPreferences({ PrintScaling: 'None', PickTrayByPDFSize: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG',
        AD_PLACEMENT.x, AD_PLACEMENT.y, AD_PLACEMENT.width, AD_PLACEMENT.height);
      pdf.setProperties({ title: selectedAd.name || 'Flavor Isle ad',
        subject: `${AD_PAPER.width} x ${AD_PAPER.height} inch Letter ad, 0.25-inch side margins, print at 100%` });
      const fileName = `${(selectedAd.name || 'flavor-isle-ad').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
      const result = offerAdPdf(pdf.output('blob'), fileName, iosTab);
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current = result.url;
      if (currentDraft.current === selectedAd) setPdfDownload(result);
      onNote(isIOS ? 'Tap Share, then Save to Files to keep the PDF.' : 'PDF ready. If the download did not start, click Save PDF below.');
    } catch (error) {
      console.error('Ad PDF failed:', error);
      if (iosTab && !iosTab.closed) iosTab.close();
      onNote(`Could not create the PDF. ${error.message || 'Try Print and choose Save as PDF.'}`);
    } finally {
      frame?.remove();
      setOutputBusy('');
    }
  };

  return { outputBusy, pdfDownload, printAd, downloadPdf };
}