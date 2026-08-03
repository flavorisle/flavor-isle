// VAPID keys for web push. The private key is server-side only — never import
// this module from frontend code. Public key is duplicated in src/lib/pushConfig.js
// for the browser subscription step.
export const VAPID_PUBLIC_KEY =
  'BJgwUBrlDSazh25COeIRpUhHywnzSMpRlM3yYfwgYBsFVE6k6xvxsweizMLToPgnb1w1QUUydYzQ0UFbakX8mv8';
export const VAPID_PRIVATE_KEY =
  'sBct-OqoiNJFGOmizhQWwwZAS4MtsbEPWH5PtuDJ9vA';
export const VAPID_SUBJECT = 'mailto:hello@flavor-isle.com';