import React from 'react';
import { useParams } from 'react-router-dom';
import PayPhoneDemo from '@/components/pay/PayPhoneDemo';
import SquarePayPage from '@/components/pay/SquarePayPage';

// The page behind the short payment link Smashie texts (/pay/<order>).
// The customer sees their order, picks a tip, and pays with Square's card form
// embedded right here — they never leave flavor-isle.com.
export default function PayPhoneOrder() {
  const { orderNumber } = useParams();

  if (orderNumber === 'demo') return <PayPhoneDemo />;

  return <SquarePayPage orderNumber={orderNumber} tipEnabled />;
}