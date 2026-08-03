// VAPID keys for web push. The private key is server-side only — never import
// this module from frontend code. Public key is duplicated in src/lib/pushConfig.js
// for the browser subscription step.
export const VAPID_PUBLIC_KEY =
  'BJzBPJd86bKb_5i-CnEvEugtL8NHi1yKMhVL_a8YUqDgu7JSOHOTLCGV9KkyedunWjEjPC9hmmn9xMZ38YHQSvY';
export const VAPID_PRIVATE_KEY =
  't5dLiaenXN88HIQsqjAtMjUXUaLOMZ1KOvb-1FhAjco';
export const VAPID_SUBJECT = 'mailto:hello@flavor-isle.com';