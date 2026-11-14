// Issue #301 Part A (Wesley approved Nov 14 2026): real Flavor Isle photos only —
// gallery shots and Square product shots. No AI, no stock, no invented URLs.
export const CATEGORY_PHOTOS = {
  'Old-Fashioned Burgers': { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/ff12a1c2b_IMG_0375.png', alt: 'Double cheeseburger with lettuce, tomato and onion' },
  'Handheld Classics': { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/f80871a3f_IMG_5521_Original.jpg', alt: 'Hand-patted burger in a to-go box' },
  'Crisp & Cluck': { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/34f1bfc0b_IMG_5541_Original.jpg', alt: 'Chicken sandwich with lettuce' },
  'Crunch & Munch': { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/c5a5ce796_IMG_0407.png', alt: 'Plate of crinkle-cut fries' },
  'Snack & Munch': { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/9fc6558ed_IMG_0370.png', alt: 'Plate of onion rings' },
  'Whirl & Twirl': { url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/c59e1956e7aafd8972d0793828ed15ade1d4f3fa/original.jpeg', alt: 'Chocolate milkshake' },
  'Blend & Bliss': { url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/f87fbe0fe3fedd2c7aad8a9f1049ad7d14ba5497/original.jpeg', alt: 'Strawberry milkshake' },
  'Sweet & Stacked': { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/bb9b490bf_IMG_0371.png', alt: 'Brownie dessert with fudge and peanuts' },
};

// Returns {url, alt} for a category key, or null when we have no real photo.
export function categoryPhoto(key, renames = {}) {
  const k = String(key || '');
  return CATEGORY_PHOTOS[k] || CATEGORY_PHOTOS[renames[k]] || null;
}