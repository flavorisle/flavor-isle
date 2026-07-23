// Maps a Square order state to our internal Order status.
export function mapSquareStatus(squareState) {
  const map = {
    'OPEN': 'pending',
    'DRAFT': 'pending',
    'COMPLETED': 'completed',
    'CANCELED': 'cancelled',
  };
  return map[squareState] || 'pending';
}

// Maps a Square order state to a payment_status value.
export function mapSquarePaymentStatus(squareState) {
  return squareState === 'COMPLETED' ? 'paid'
    : squareState === 'CANCELED' ? 'failed'
    : 'pending';
}