import { useEffect, useRef, useState } from 'react';
import { createAdFrame, initializeAdDocument, mountAdSheet, snapshotAdSheet } from '@/lib/adOutputDocument';
import { embedAdPhotos, offerAdPdf } from '@/lib/adOutputAssets';

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
      await withinOutputLimit(mountAdSheet(tab.document, snapshotAdSheet()));
      const controls = tab.document.createElement('div');
      controls.setAttribute('data-ad-controls', '');
      const button = tab.document.createElement('button');
      button.type = 'button';
      button.textContent = 'Print ad';
      button.onclick = () => { tab.focus(); tab.print(); };
      controls.appendChild(button);
      tab.document.body.prepend(controls);
      tab.focus();
      tab.print();
      onNote('The ad is ready in its own tab. You can also use Print ad there.');
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
      const sheet = snapshotAdSheet();
      if (iosTab) initializeAdDocument(iosTab.document, 'Preparing ad PDF');
      frame = createAdFrame();
      initializeAdDocument(frame.contentDocument, selectedAd.name || 'Flavor Isle ad');
      const [{ default: html2canvas }, { jsPDF }] = await withinOutputLimit(Promise.all([
        import('html2canvas'),
        import('jspdf'),
        embedAdPhotos(sheet).then(() => mountAdSheet(frame.contentDocument, sheet)),
      ]));
      const canvas = await withinOutputLimit(html2canvas(sheet, {
        scale: 2, width: 816, height: 1056, windowWidth: 816, windowHeight: 1056,
        scrollX: 0, scrollY: 0, backgroundColor: '#ffffff', logging: false,
      }));
      const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 8.5, 11);
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