// Real Flavor Isle photos grouped for the /gallery page.
import { issue23Photos } from '@/lib/issue23Photos';
export const GALLERY_CATEGORIES = ['All', 'Food', 'Our Restaurant', 'Community & Events', 'Our People'];

const LEGACY_PHOTOS = [
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/ff12a1c2b_IMG_0375.png', alt: 'Double cheeseburger with lettuce, tomato and onion', category: 'Food', caption: 'The Double, stacked right' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/d03ee300c_IMG_9874.jpg', alt: 'Loaded cheese fries with bacon and ranch', category: 'Food', caption: 'Loaded bacon cheese fries' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/bb9b490bf_IMG_0371.png', alt: 'Brownie dessert with fudge and peanuts', category: 'Food', caption: 'Hot fudge cake' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/c5a5ce796_IMG_0407.png', alt: 'Plate of crinkle-cut fries', category: 'Food', caption: 'Golden crinkle fries' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/9fc6558ed_IMG_0370.png', alt: 'Plate of onion rings', category: 'Food', caption: 'Crispy onion rings' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/ff2952347_IMG_5382_Original.jpg', alt: 'Fresh basket of tater tots', category: 'Food', caption: 'Hot out of the fryer' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/34f1bfc0b_IMG_5541_Original.jpg', alt: 'Grilled chicken sandwich with lettuce', category: 'Food', caption: 'Grilled chicken sandwich' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/f80871a3f_IMG_5521_Original.jpg', alt: 'Hand-patted burger in a to-go box', category: 'Food', caption: 'Hand-patted, every time' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/9a7fa37aa_IMG_5372_Original.jpg', alt: 'Breaded onion rings in a to-go box', category: 'Food', caption: 'Rings to go' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/e0abb3484_IMG_8841.png', alt: 'The Chuck Wagon', category: 'The Place', caption: 'The Chuck Wagon' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/75533f8d0_IMG_8839.png', alt: 'Summer evenings on the patio', category: 'The Place', caption: 'Summer evenings on the patio' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/0c28555d1_IMG_8924.jpg', alt: 'Inside the Flavor Isle dining room', category: 'The Place', caption: 'Inside the dining room' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/590e97d65_IMG_8855.jpeg', alt: 'Main and First, Smiths Grove', category: 'The Place', caption: 'Main and First, Smiths Grove' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7c655b439_IMG_8923.jpg', alt: 'Guests gathered outside under the Flavor Isle sign', category: 'The People', caption: 'A good crowd on a fall afternoon' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/a0b6bcef9_NorthWarrenCommunityWalk.jpg', alt: 'Community walk group holding milkshakes under the sign', category: 'The People', caption: 'North Warren Community Walk' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/99f75bee4_CD56F694-082A-4650-9E1C-5F5F95B2F288.jpg', alt: 'Busy lunch crowd at the outdoor tables', category: 'The People', caption: 'Busy lunch rush' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/742efcb4d_IMG_0429.jpeg', alt: 'Hand-patted burgers and buns on the flat-top grill', category: 'Food', caption: 'Fresh patties on the grill' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/af3fdb22d_44faedbf2_IMG_1241.jpg', alt: 'Golden breaded fried pickles on a paper tray', category: 'Food', caption: 'Fried pickles, hot out of the basket' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/dbd2fb8df_15cbe6581_IMG_1240.jpg', alt: 'Double burger with melted cheese and grilled onions', category: 'Food', caption: 'Stacked and smothered' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/31cacd6b0_Screenshot_20250607-195606_Maps_Original.jpeg', alt: 'The Flavor Isle dining room', category: 'The Place', caption: 'The dining room' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/b563c5b72_IMG_0987_Original.jpeg', alt: 'Flavor Isle order counter', category: 'The Place', caption: 'The order counter' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1ade54fbc_IMG_0427.jpeg', alt: 'Flavor Isle sign glowing at night', category: 'The Place', caption: 'The sign at night' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/0a273b2c0_5094a0c6b_IMG_1044.jpg', alt: 'Flavor Isle dining room with light blue walls and community bulletin board', category: 'The Place', caption: 'Blue walls and the community board' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/5b33a8620_9e3fd68e9_IMG_1046.jpg', alt: 'Award plaques on the dining room wall including Best Restaurant in Smiths Grove 2025', category: 'The Place', caption: 'The award wall' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/f04c3396c_b663f50e0_IMG_1045.jpg', alt: 'Framed pencil sketch of the Flavor Isle building with newspaper clippings', category: 'The Place', caption: 'A sketch of the Isle' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/e291f1489_IMG_1724_Original.jpeg', alt: 'Classic cars parked on Main Street during the 50th anniversary', category: 'The People', caption: '50th anniversary, May 2014' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/18c69de7c_FlavorIsle50thAnniversary5-3-14A.jpeg', alt: 'Crowd with balloons celebrating the 50th anniversary', category: 'The People', caption: '50th anniversary, May 2014' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/c9e2452b8_c8fa8ebb3_IMG_1225.jpg', alt: 'Colonel Sanders lookalike posing outside under the Flavor Isle awning', category: 'The People', caption: 'The Colonel stops by the Isle' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/8d0ee9043_cde8962dd_IMG_5507_Original.jpg', alt: 'Fried chicken sandwich with waffle fries', category: 'Food', caption: 'Chicken sandwich, made fresh' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/da1c384f6_b9bf38b7d_IMG_0099_Original.jpg', alt: 'Cheeseburger with tater tots', category: 'Food', caption: 'Cheeseburger & tots' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/8537ab539_7b6ce8d79_IMG_5526_Original.png', alt: 'Hanging Flavor Isle sign with a palm tree and Coke logo', category: 'The Place', caption: 'The hanging Flavor Isle sign' },
  { url: 'https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/f5aaaf821_ee6a6bf73_IMG_5250_Original.jpg', alt: 'Close-up of a fried chicken sandwich', category: 'Food', caption: 'Chicken sandwich, up close' },
];

// The gallery is a collection: photos featured elsewhere can also appear here.
// Preserve every previously published photo and group them under the current tabs.
export const GALLERY_PHOTOS = [
  ...LEGACY_PHOTOS.map((photo) => ({
    ...photo,
    category: photo.caption === 'North Warren Community Walk' ? 'Community & Events' : photo.category === 'The Place' ? 'Our Restaurant' : photo.category === 'The People' ? 'Our People' : photo.category,
  })),
  { url: issue23Photos.hero, alt: 'Flavor Isle storefront lit up at night', caption: 'Flavor Isle at night', category: 'Our Restaurant' },
  { url: issue23Photos.seasonal, alt: 'Seasonal Flavor Isle storefront', caption: 'Seasonal storefront', category: 'Our Restaurant' },
  { url: issue23Photos.ecto, alt: 'Ghostbusters Ecto-1 outside Flavor Isle', caption: 'Ecto-1 visits the Isle', category: 'Community & Events' },
  { url: issue23Photos.corvette, alt: 'Corvettes at a Flavor Isle car show', caption: 'Corvette show day', category: 'Community & Events' },
  { url: issue23Photos.anniversary, alt: 'Crowd celebrating Flavor Isle’s 50th anniversary', caption: '50th anniversary celebration', category: 'Community & Events' },
  { url: issue23Photos.parking, alt: 'Parking map for Flavor Isle at I-65 Exit 38', caption: 'Where to park when you visit', category: 'Community & Events' },
  { url: issue23Photos.flattop, alt: 'Food cooking on the Flavor Isle flattop', caption: 'Fresh off the flattop', category: 'Food' },
  { url: issue23Photos.food1045, alt: 'Food from the Flavor Isle kitchen, IMG_1045', caption: 'From the Flavor Isle kitchen', category: 'Food' },
  { url: issue23Photos.food1046, alt: 'Food from the Flavor Isle kitchen, IMG_1046', caption: 'Fresh from the kitchen', category: 'Food' },
  { url: issue23Photos.diner1240, alt: 'Double burger with melted cheese and grilled onions', caption: 'Stacked and smothered', category: 'Food' },
  { url: issue23Photos.diner1241, alt: 'Golden breaded fried pickles on a tray', caption: 'Fried pickles, hot out of the basket', category: 'Food' },
  { url: issue23Photos.diner1225, alt: 'Colonel Sanders lookalike outside the Flavor Isle awning', caption: 'The Colonel stops by the Isle', category: 'Our People' },
  { url: issue23Photos.diner5526, alt: 'Hanging Flavor Isle sign with palm tree and Coke logo', caption: 'The hanging Flavor Isle sign', category: 'Our Restaurant' },
  { url: issue23Photos.diner0099, alt: 'Cheeseburger with tater tots', caption: 'Cheeseburger & tots', category: 'Food' },
  { url: issue23Photos.diner5507, alt: 'Fried chicken sandwich with waffle fries', caption: 'Chicken sandwich, made fresh', category: 'Food' },
  { url: issue23Photos.diner5250, alt: 'Close-up of a fried chicken sandwich', caption: 'Chicken sandwich, up close', category: 'Food' },
];