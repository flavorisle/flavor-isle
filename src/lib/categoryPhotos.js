// Issue #301 Part A (Wesley, Nov 14 2026): the marks on menu categories and
// tiles are real Flavor Isle photos, never emoji doing visual work. Every photo
// here comes from the gallery or from a Square item photo already stored on
// MenuItem — nothing is invented and no new asset is created.
import { GALLERY_PHOTOS } from '@/lib/galleryPhotos';

const SQUARE_BASE = 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/';

// Gallery lookups read the real url AND alt straight off the published gallery.
const fromGallery = (caption) => {
  const photo = GALLERY_PHOTOS.find((p) => p.caption === caption);
  return photo ? { url: photo.url, alt: photo.alt } : null;
};

const fromSquare = (file, alt) => ({ url: `${SQUARE_BASE}${file}`, alt });

// All 15 menu categories, keyed by the same category key the menu groups under.
export const CATEGORY_PHOTOS = {
  'Old-Fashioned Burgers': fromGallery('The Double, stacked right'),
  'Handheld Classics': fromSquare('247c9b84b_menu-item-hdu3v52wo4pllancozxhjdym-800x800.webp', 'Pulled pork sandwich'),
  'Crisp & Cluck': fromSquare('e033dfce5_menu-item-t5t77n5v6havb2m4br7voeos-752x800.webp', 'Crispy chicken rings'),
  'Golden Crisp & Savory': fromSquare('c092af2e3_menu-item-sab3ljnxbv4zr7b2hezfnaqn-800x800.webp', 'Chuckwagon sandwich'),
  'Frankly Delicious': fromSquare('785ab1993_menu-item-kae6ts5oszhn7a3y4t5tansz-800x800.webp', 'Hot dog'),
  'Grilled & Gooey': fromSquare('ace7fe8f2_menu-item-4zvx7nqd7uzduefxrcjm44ad-800x729.webp', 'Ham, bacon and cheese melt'),
  'Crunch & Munch': fromGallery('Golden crinkle fries'),
  'Snack & Munch': fromGallery('Crispy onion rings'),
  'Sauces': fromSquare('ffa7db954_menu-item-q3btf77ui3ruv2nqynptapxx-800x800.webp', 'Boom Boom sauce cup'),
  'Seasonal & Supreme': fromGallery('Fried pickles, hot out of the basket'),
  'Flow & Fizz': fromSquare('4db730f02_menu-item-zk7f2awr5cnq4kkjnvsadsll-800x800.webp', 'Sweet tea'),
  'Whirl & Twirl': fromSquare('e9eaa68c9_menu-item-x7cdlqz6gnjh6cwdm2nnk767-800x800.webp', 'Strawberry milkshake'),
  'Blend & Bliss': fromSquare('fc244908a_menu-item-yz7nnasjejkqht5wscreb6dj-800x800.webp', 'Strawberry Crunch Bliss milkshake'),
  'Melt & Swirl': fromSquare('881a366c8_menu-item-emfbychxt7fynvxernm4ynld-533x800.webp', 'Soft serve cone'),
  'Sweet & Stacked': fromGallery('Hot fudge cake'),
};

// The one gallery food shot used when neither source has a photo at all.
export const GALLERY_FOOD_FALLBACK = fromGallery('Cheeseburger & tots');

// First live item photo in that category, straight off the MenuItem records.
export function firstItemPhoto(items = []) {
  const hit = (items || []).find((i) => i && (i.image_url_opt || i.image_url));
  return hit ? { url: hit.image_url_opt || hit.image_url, alt: hit.name || 'Flavor Isle food' } : null;
}

// Fallback order: category photo -> first live item photo in that category ->
// gallery food shot. Null only when every source is empty, so a caller can keep
// its existing mark instead of inventing a picture.
export function categoryPhoto(key, items = []) {
  return CATEGORY_PHOTOS[key] || firstItemPhoto(items) || GALLERY_FOOD_FALLBACK || null;
}