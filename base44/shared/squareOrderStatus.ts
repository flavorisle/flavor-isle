// Maps a Square order state to our internal Order status.
//
// inStore: a ticket rung up at the register is already in the crew's hands, so
// it is created Confirmed instead of Pending. Wesley, Nov 9 2026: walk-in orders
// must not sit on /admin/orders waiting for somebody to confirm them. Web and
// phone orders keep the default pending -> confirmed path, driven by payment.
export function mapSquareStatus(squareState, { inStore = false } = {}) {
  if (squareState === 'COMPLETED') return 'completed';
  if (squareState === 'CANCELED') return 'cancelled';
  return inStore ? 'confirmed' : 'pending';
}

// Maps a Square order state to a payment_status value.
export function mapSquarePaymentStatus(squareState) {
  return squareState === 'COMPLETED' ? 'paid'
    : squareState === 'CANCELED' ? 'failed'
    : 'pending';
}