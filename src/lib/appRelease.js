// Issue #297 Part D — the dated app promo reads this one config.
//
// Every surface that mentions the app (footer band, order-status banner, the
// /download page) reads APP_RELEASE, so the date can never disagree with
// itself again. No App Store or Google Play URL exists yet, so both stay empty
// and appIsLive() stays false: until status is 'live' AND both URLs are filled
// in, the site only ever shows the date and never a made-up store link.
export const APP_RELEASE = {
  status: 'coming_soon', // 'coming_soon' | 'live'
  dateLabel: 'December 16, 2026',
  iosUrl: '',
  androidUrl: '',
};

export function appIsLive() {
  return APP_RELEASE.status === 'live' && !!APP_RELEASE.iosUrl && !!APP_RELEASE.androidUrl;
}