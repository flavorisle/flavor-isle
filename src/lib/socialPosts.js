// Ready-to-post social content for the Flavor Isle marketing toolkit.
// Every word here is a real, verifiable Flavor Isle detail (address, phone,
// hours from the store config, and the menu facts), and every photo is pulled
// from GALLERY_PHOTOS through galleryImage — nothing generated, nothing stock.
import { galleryImage } from '@/lib/galleryPhotos';
import { DEFAULT_BUSINESS_HOURS, hoursSummary } from '@/lib/businessHours';

export const ORDER_URL = 'https://flavor-isle.com';
export const ADDRESS = '103 N Main St, Smiths Grove, KY 42171';
export const PHONE = '(270) 563-4618';
export const HOURS = hoursSummary(DEFAULT_BUSINESS_HOURS);

export const SOCIAL_HANDLE = '@flavor_isle';

export const SOCIAL_POSTS = [
  {
    id: 'facebook',
    platform: 'Facebook',
    label: 'Facebook',
    handle: 'Flavor Isle',
    target: 'Post it on the Flavor Isle page, not a personal profile.',
    format: 'One photo + the order link. Square works best in the feed.',
    caption: `Hand-patted, never frozen. That's been the rule at the Isle since 1964. 🍔

A double cheeseburger, crinkle-cut fries and a shake spun thick — made the same way, on the same corner of Main Street in Smiths Grove.

Dine-in, pickup, curbside or delivery. Order online at flavor-isle.com.

📍 ${ADDRESS}
📞 ${PHONE}
🕒 ${HOURS}`,
    imageCaption: 'Cheeseburger & tots',
    tips: [
      'Tag the location Smiths Grove, KY so nearby people see it.',
      'Drop the order link in the first comment too.',
      'Pin the post to the top of the page for the week.',
    ],
  },
  {
    id: 'instagram',
    platform: 'Instagram',
    label: 'Instagram',
    handle: SOCIAL_HANDLE,
    target: 'Feed post on @flavor_isle.',
    format: 'Square crop, 1080 x 1080. Hashtags sit in the first comment.',
    caption: `Double cheeseburger, crinkle fries, shake spun thick. 🍔🥤

Hand-patted, never frozen, made to order in Smiths Grove, KY.

📍 103 N Main St · Order at flavor-isle.com`,
    hashtags: '#FlavorIsle #SmithsGroveKY #BowlingGreenKY #MammothCave #BurgersAndShakes',
    imageCaption: 'Stacked and smothered',
    tips: [
      'Put the hashtags in the first comment, not the caption.',
      'Add the location sticker Smiths Grove, KY.',
      'Share the same photo to Stories with an "Order online" link sticker.',
    ],
  },
  {
    id: 'tiktok',
    platform: 'TikTok',
    label: 'TikTok',
    handle: SOCIAL_HANDLE,
    target: 'Photo-mode post on @flavor_isle (no video needed).',
    format: 'Vertical 1080 x 1920 — the photo crops to full screen.',
    caption: `POV: you stopped at Exit 38 for the burger and stayed for the shake 🍔🥤

Hand-patted, never frozen. flavor-isle.com

#FlavorIsle #SmithsGroveKY #RoadTripFood #Burgers`,
    imageCaption: 'Fresh off the flattop',
    tips: [
      'Photo mode is enough — pick the photo, add the sound, post.',
      'Keep the caption on screen for less than 3 seconds of reading.',
      'Pin a comment with the order link: flavor-isle.com',
    ],
  },
].map((post) => ({
  ...post,
  image: galleryImage(post.imageCaption),
}));