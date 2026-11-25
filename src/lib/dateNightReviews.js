// The three reviews shown on Date Night for Two (issue #358). None of them are
// in EXTERNAL_REVIEWS (the /reviews and home page set) or in the Review entity,
// so this page never repeats a review the rest of the site already renders.
//
// Only what the owner supplied is stored: the guest's name and the dish they
// wrote about. The exact wording and the date are left empty until they are
// supplied — no review text is invented here.
const GOOGLE_LISTING = 'https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171';

export const DATE_NIGHT_REVIEWS = [
  {
    name: 'KO',
    highlight: 'apple pie shake',
    quote: '',
    date: '',
    source: 'Google',
    url: GOOGLE_LISTING,
  },
  {
    name: 'Douglas',
    highlight: 'fresh ground beef',
    quote: '',
    date: '',
    source: 'Google',
    url: GOOGLE_LISTING,
  },
  {
    name: 'Kyle Bessette',
    highlight: '',
    quote: '',
    date: '',
    source: 'Google',
    url: GOOGLE_LISTING,
  },
];