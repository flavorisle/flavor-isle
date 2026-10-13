import React from 'react';
import SquarePayPage from '@/components/pay/SquarePayPage';

// Our own checkout page's payment step (/pay-square), used by online food orders
// and Tasty Threads merch. The order number rides in the query string; checkout
// tells us the tip is already inside the saved total so no second picker shows.
export default function PaySquare() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderNumber = urlParams.get('order_number') || '';
  const fromCheckout = urlParams.get('from') === 'checkout';
  const tipIncluded = urlParams.get('tip') === 'included';

  return (
    <SquarePayPage
      orderNumber={orderNumber}
      tipEnabled={!tipIncluded}
      fromCheckout={fromCheckout}
      readyFor={urlParams.get('ready_for') || ''}
    />
  );
}