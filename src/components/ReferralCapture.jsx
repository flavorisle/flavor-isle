import { useEffect } from 'react';
import { captureReferralFromUrl } from '@/lib/referral';

// Remembers a `?ref=` referral code the moment the app loads, on any page, so
// the credit still applies if the friend checks out later.
export default function ReferralCapture() {
  useEffect(() => {
    captureReferralFromUrl();
  }, []);
  return null;
}