// VAPID keys for web push. The private key is server-side only — never import
// this module from frontend code. Public key is duplicated in src/lib/pushConfig.js
// for the browser subscription step.
export const VAPID_PUBLIC_KEY =
  'BLdY9j6AzntTNW1t9fl3hYJF2PFjlftmpOnTLAR1d3YIODutic-3pqOUehpu6GD85z6QdXSZdfaR0jEkWHxWYdY';
export const VAPID_PRIVATE_KEY =
  'DAxFL62EQBn02C_1gfnpfhso5XK3P4ZCJctpoJ_ee-y';
export const VAPID_SUBJECT = 'mailto:hello@flavor-isle.com';