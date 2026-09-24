// Shared print utilities for the bag ticket. Handles injecting the @page
// override (80mm receipt size) at print time so it doesn't conflict with
// the print menu's A3 landscape page size, and toggling the body class that
// hides the app and shows only the print portal.

const STYLE_ID = 'bag-ticket-page-style';

export function printBagTicket() {
  // Inject @page override for receipt-sized printing. Appended to <head> so
  // it comes after the main stylesheet and wins the @page cascade.
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '@media print { @page { size: 80mm auto; margin: 2mm; } }';
    document.head.appendChild(style);
  }

  document.body.classList.add('printing-bag-ticket');

  // Small delay so the portal render + CSS class are committed before print.
  setTimeout(() => window.print(), 100);
}

export function cleanupBagTicketPrint() {
  document.body.classList.remove('printing-bag-ticket');
  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();
}