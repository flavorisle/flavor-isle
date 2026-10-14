import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import PayPhoneDemo from '@/components/pay/PayPhoneDemo';

// The page behind the short payment link Smashie texts (/pay/<order>). It opens
// the site's own Helcim payment page — the same one the website checkout uses —
// carrying this order's number. The customer sees their order, picks a tip when
// the order does not carry one yet, and pays in the Helcim card fields, all on
// flavor-isle.com. The retired Square form is no longer reached from any link.
export default function PayPhoneOrder() {
  const { orderNumber } = useParams();

  if (orderNumber === 'demo') return <PayPhoneDemo />;

  return <Navigate to={`/pay?order_number=${encodeURIComponent(orderNumber)}`} replace />;
}