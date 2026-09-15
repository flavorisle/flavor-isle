import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import BagTicket from './BagTicket';
import { printBagTicket, cleanupBagTicketPrint } from '@/lib/bagTicketPrint';

// Modal that previews the bag ticket on screen and prints it when staff
// clicks Print. The print-only ticket is rendered to a body-level portal
// (#bag-ticket-print-root) which the print stylesheet shows in place of the app.
export default function BagTicketPrintModal({ order, onClose }) {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const afterPrint = () => {
      cleanupBagTicketPrint();
      setPrinting(false);
    };
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  // When printing state flips on, the portal is committed — trigger the print.
  useEffect(() => {
    if (!printing) return;
    printBagTicket();
  }, [printing]);

  if (!order) return null;

  return (
    <>
      {/* On-screen modal preview */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className="bg-white rounded-3xl shadow-float-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-white rounded-t-3xl z-10">
            <div>
              <h3 className="font-heading text-lg text-obsidian-roast">Bag Ticket</h3>
              <p className="text-xs text-muted-foreground">Customer-facing ticket to staple on the bag</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 flex justify-center" style={{ backgroundColor: '#f5f5f5' }}>
            <BagTicket order={order} />
          </div>

          <div className="p-4 border-t border-border sticky bottom-0 bg-white rounded-b-3xl">
            <button
              onClick={() => setPrinting(true)}
              disabled={printing}
              className="btn-cherry w-full py-3 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Printer size={18} /> {printing ? 'Preparing…' : 'Print Bag Ticket'}
            </button>
          </div>
        </div>
      </div>

      {/* Print-only portal — hidden on screen, shown only during print */}
      {printing && createPortal(
        <div id="bag-ticket-print-root">
          <BagTicket order={order} />
        </div>,
        document.body
      )}
    </>
  );
}