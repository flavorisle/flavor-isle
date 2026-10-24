import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import PayPhoneDemo from '@/components/pay/PayPhoneDemo';

// The page behind the short payment link Smashie texts (/pay/<order>). It opens
// the site's own secure payment page — the same one the website checkout uses —
// carrying this order's number. The customer sees their order, picks a tip when
// the order does not carry one yet, and pays there: Base44 Payments on the primary
// path, Square on the alternative (issue #116).
export default function PayPhoneOrder() {
  const { orderNumber } = useParams();

  if (orderNumber === 'demo') return <PayPhoneDemo />;

  return <Navigate to={`/pay?order_number=${encodeURIComponent(orderNumber)}`} replace />;
}