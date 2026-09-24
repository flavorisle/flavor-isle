import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BagTicket from './BagTicket';
import { printBagTicket, cleanupBagTicketPrint } from '@/lib/bagTicketPrint';

const STORAGE_KEY = 'bagTicketAutoPrintedIds';

function getPrintedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function addPrintedId(id) {
  const ids = getPrintedIds();
  ids.add(id);
  // Keep only the last 200 to prevent unbounded growth
  const arr = Array.from(ids).slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// Auto-print toggle for the admin dashboard. When enabled, watches for new
// paid online orders via the realtime subscription and automatically prints
// a bag ticket. Uses localStorage to track which orders have already been
// auto-printed so a page refresh or duplicate realtime event never reprints
// the same order. This complements (but is independent of) the backend
// duplicate-push fix — since the order itself is only created once, the
// auto-print only fires once per order.
export default function AutoPrintToggle() {
  const [enabled, setEnabled] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const knownIds = useRef(new Set());

  // Establish a baseline of existing orders so we don't auto-print orders
  // that were already on the board when the toggle was turned on.
  useEffect(() => {
    if (!enabled) return;
    base44.entities.Order.list('-created_date', 30).then(orders => {
      orders.forEach(o => knownIds.current.add(o.id));
    }).catch(() => {});
  }, [enabled]);

  // Watch for new orders when enabled
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type !== 'create') return;
      const order = event.data;
      if (!order) return;

      // Only auto-print online orders that are paid and not cancelled
      if (order.order_source === 'in_store') return;
      if (order.payment_status !== 'paid') return;
      if (order.status === 'cancelled') return;

      // Skip if already seen or already auto-printed
      if (knownIds.current.has(order.id)) return;
      if (getPrintedIds().has(order.id)) return;

      knownIds.current.add(order.id);
      addPrintedId(order.id);
      setPrintOrder(order);
    });

    return unsubscribe;
  }, [enabled]);

  // Cleanup after print
  useEffect(() => {
    const afterPrint = () => {
      cleanupBagTicketPrint();
      setPrintOrder(null);
    };
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  // When a new order is staged, render the portal and trigger print
  useEffect(() => {
    if (!printOrder) return;
    printBagTicket();
  }, [printOrder]);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="card-diner p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-patina-mint/10 flex items-center justify-center shrink-0">
              <Printer size={20} className="text-patina-mint" />
            </div>
            <div>
              <p className="font-heading text-sm text-obsidian-roast">Auto-Print Bag Tickets</p>
              <p className="text-xs text-muted-foreground">Print a bag ticket automatically when a new paid online order arrives</p>
            </div>
          </div>
          <button
            onClick={() => setEnabled(e => !e)}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${enabled ? 'bg-midnight-cherry' : 'bg-gray-300'}`}
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle auto-print bag tickets"
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        {enabled && (
          <p className="text-xs text-patina-mint mt-2 flex items-center gap-1.5">
            <Bell size={12} className="animate-pulse" /> Watching for new online orders — keep this tab open.
          </p>
        )}
      </div>

      {/* Print-only portal — hidden on screen, shown only during print */}
      {printOrder && createPortal(
        <div id="bag-ticket-print-root">
          <BagTicket order={printOrder} />
        </div>,
        document.body
      )}
    </>
  );
}