import { galleryImage } from '@/lib/galleryPhotos';

// Three color ways. The layout never changes, only these five colors.
export const THEMES = {
  cherry: { label: 'Cherry on cream', paper: '#FDF6E3', ink: '#003366', accent: '#CC3300', gold: '#F5A623', onAccent: '#FFFFFF' },
  navy: { label: 'Navy on cream', paper: '#F1F4F8', ink: '#0C1A2B', accent: '#1B4A7A', gold: '#C9922E', onAccent: '#FFFFFF' },
  gold: { label: 'Gold on cream', paper: '#FFF8E7', ink: '#2A2118', accent: '#B8791A', gold: '#8A5A12', onAccent: '#FFFFFF' },
};

export const themeOf = (key) => THEMES[key] || THEMES.cherry;

// QR for the sheet. Generated at print time from the ad's own target, so changing
// the target changes the code. No library, no stored asset.
export const qrUrl = (target) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&data=${encodeURIComponent(target || 'https://flavor-isle.com')}`;

export const blankPoster = () => ({
  name: 'Untitled ad',
  layout: 'poster',
  theme: 'cherry',
  kicker: 'FOR WARREN EAST MIDDLE & HIGH',
  title: 'SNOW DAY',
  title_accent: 'BLISS',
  subhead: 'Tastes exactly like a snow day out of school.',
  subhead_highlight: 'out of school.',
  body: '',
  chips: [],
  price_line: '',
  price_note: '',
  items: [],
  one_liners: [],
  badge_top: 'NO SCHOOL',
  badge_bottom: 'SNOW DAY',
  strip_kicker: 'EVERY DAY AFTER THE BELL',
  strip_headline: '',
  strip_note: '103 N Main St, Smiths Grove, KY 42171\n(270) 563-4618',
  strip_photo_wide: '',
  strip_photo_tall: '',
  plus_line: '',
  cta_headline: 'FLAVOR-ISLE.COM',
  cta_url: 'flavor-isle.com',
  qr_target: 'https://flavor-isle.com',
  show_qr: true,
  footer_headline: 'SCAN - ORDER - SKIP THE LINE',
  footer_note: '0.7 MI OFF I-65, EXIT 38 - (270) 563-4618',
  is_active: true,
  sort_order: 99,
});

// Saved ad 1. Every word below is the public /flyer sheet exactly as it prints today.
export const CLASSIC_FLYER = {
  name: 'Classic Flyer',
  layout: 'classic',
  theme: 'cherry',
  title: 'FRESH HAND-PATTED BURGERS',
  title_accent: '& THICK SHAKES',
  subhead: "Smiths Grove's favorite roadside stop \u2014 hand-patted, never frozen, made to order.",
  items: [
    {
      name: 'Double Cheeseburger',
      price: '$9.50',
      note: 'Twice the patties, twice the cheese. Built fresh by hand, stacked high with big burger energy.',
      photo: galleryImage('The Double, stacked right') || '',
    },
    {
      name: 'French Fries',
      price: '$3.25',
      note: '(Crinkle-Cut) \u2014 Crisp crinkle edges with a fluffy center \u2014 the classic fry bite. (Original 1964)',
      photo: galleryImage('Golden crinkle fries') || '',
    },
    {
      name: 'Fried Pickle Chips',
      price: '$6.60',
      note: 'Golden breaded pickle chips, fried to order. The basket that disappears first.',
      photo: galleryImage('Fried pickles, hot out of the basket') || '',
    },
  ],
  plus_line:
    'PLUS: Mini Cheeseburger \u00b7 Tenderloin \u00b7 Chuck Wagon \u00b7 Curly Fries \u00b7 Sweet Potato Fries \u00b7 Bacon Cheeseburger \u00b7 Cheeseburger \u00b7 Loaded Cajun Chili Fries \u00b7 Shakes & more!',
  cta_headline: 'ORDER ONLINE',
  cta_url: 'flavor-isle.com',
  footer_headline: 'SEE YOU AT THE ISLE!',
  footer_note: 'flavor-isle.com \u00b7 @flavor_isle',
  show_qr: false,
  is_active: true,
  sort_order: 1,
};

// Saved ad 2. The Warren East snow day poster, approved Nov 18, 2026.
const SQ = 'https://items-images-production.s3.us-west-2.amazonaws.com/files';
export const WARREN_EAST = {
  name: 'Warren East Snow Day',
  layout: 'poster',
  theme: 'cherry',
  kicker: 'FOR WARREN EAST MIDDLE & HIGH',
  title: 'SNOW DAY',
  title_accent: 'BLISS',
  subhead: 'Tastes exactly like a snow day out of school.',
  subhead_highlight: 'out of school.',
  body:
    'Blended thick with marshmallow fluff and topped with whipped cream. Just like snow cream. You just don\u2019t have to wait for the county to call it.',
  chips: ['VANILLA', 'WHITE CHOCOLATE'],
  price_line: '$5.99',
  price_note: '14 OZ \u00b7 $6.49 20 OZ',
  items: [
    { name: 'CHEESEBURGER', price: '$5.25', photo: `${SQ}/b764a01145ba3e556049e4a6cd5e39b5333c599a/original.jpeg`, note: '' },
    { name: 'FRENCH FRIES', price: '$3.25', photo: `${SQ}/4e92f3bb902bfa24b9bc258513d0b8b7396edfa0/original.jpeg`, note: '' },
    { name: 'DOUBLE CHEESEBURGER', price: '$9.50', photo: `${SQ}/1b6e0909b1fdbe33d4e2df41b1e87aee97b3f99a/original.jpeg`, note: '' },
  ],
  one_liners: [
    { label: 'BECAUSE', text: 'Tastes like the 6 AM phone call that says school\u2019s cancelled.' },
    { label: 'BECAUSE', text: 'Sled optional. Straw included.' },
    { label: 'BECAUSE', text: 'Snow cream, but make it after 3rd period.' },
  ],
  badge_top: 'NO SCHOOL',
  badge_bottom: 'SNOW DAY',
  strip_kicker: 'EVERY DAY AFTER THE BELL',
  strip_headline: 'SMITHS GROVE\u2019S OWN SCHOOL. THIS ONE\u2019S FOR YOU.',
  strip_note: '103 N Main St, Smiths Grove, KY 42171\n(270) 563-4618',
  strip_photo_wide: `${SQ}/4e92f3bb902bfa24b9bc258513d0b8b7396edfa0/original.jpeg`,
  strip_photo_tall: `${SQ}/0b834f33dace90b18f9c27fc16b4b05e56f57ba0/original.jpeg`,
  plus_line: '',
  cta_headline: 'FLAVOR-ISLE.COM',
  cta_url: 'flavor-isle.com',
  qr_target: 'https://flavor-isle.com/milkshakes',
  show_qr: true,
  footer_headline: 'SCAN \u00b7 ORDER \u00b7 SKIP THE LINE',
  footer_note: '0.7 MI OFF I-65, EXIT 38 \u00b7 (270) 563-4618',
  is_active: true,
  sort_order: 2,
};

export const SEED_ADS = [CLASSIC_FLYER, WARREN_EAST];

// Print rules. Everything on the page is hidden, then the sheet alone is revealed,
// the same way the old /flyer page printed.
// The sheet is exactly one letter page (816 x 1056 CSS px = 8.5 x 11in at
// 96dpi), so print sets the paper to letter with no margins and puts the sheet
// at 0,0. Everything else on the admin page is removed with display:none rather
// than visibility:hidden, so the document is exactly one page tall and the
// printer has nothing to scale or spill onto a second sheet.
// @page descriptors reject !important, so none here: this rule is written after
// the app's A3 print-menu rule and therefore wins.
export const PRINT_CSS = `
@media print {
  @page { size: 8.5in 11in; margin: 0; }
  html, body {
    margin: 0 !important; padding: 0 !important;
    background: #ffffff !important; height: auto !important; overflow: visible !important;
  }
  .ad-no-print { display: none !important; }
  #ad-wrap {
    position: static !important; left: auto !important; top: auto !important;
    width: auto !important; height: auto !important; min-height: 0 !important;
    padding: 0 !important; margin: 0 !important; background: #ffffff !important;
  }
  #ad-sheet, #ad-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #ad-sheet {
    position: relative !important; left: auto !important; top: auto !important;
    width: 8.5in !important; max-width: 8.5in !important; height: 11in !important; max-height: 11in !important;
    min-height: 0 !important; margin: 0 !important; overflow: hidden !important;
    box-shadow: none !important; border: none !important; border-radius: 0 !important;
    transform: none !important;
    page-break-after: avoid; break-after: avoid;
    page-break-inside: avoid; break-inside: avoid;
  }
}
`;