import { getMenuSetting } from '@/lib/menuSettings';

// Issue #324 (v9) — the approved, baked-in photo map: 142 name keys pointing at
// 58 distinct images. Every entry is a 512x512 or 2880x2880 square on pure
// white: real Square photos on items-images-production.s3.us-west-2.amazonaws.com
// and generated shots on media.base44.com.
//
// Keys are exactly as Wesley approved them (names as the menu spells them,
// including the odd plurals and the " SAUCE" / " SYRUP" variants), so nothing is
// renamed here. Lookup forgives the differences Square introduces: case,
// surrounding and repeated whitespace, a trailing " SAUCE" / " SYRUP", and an
// optional trailing "S".
//
// Admin overrides (MenuSetting.modifier_photos) are merged ON TOP of this map at
// render time, so a photo added in Admin → Modifier photos wins with no build
// and survives every Square catalog sync. An entry with an empty url is a
// tombstone: that photo was cleared, including a baked-in one.
//
// No milkshake, flavor-drink, pepper jack or Zesty Bacon Ranch image lives in
// this map. The fries item's own choices come from Square as Bacon Bits and
// Seasoned, and Bacon Bits uses the bits photo.
export const MODIFIER_PHOTOS = {
  "1/4 CUP OF BUTTERFINGER": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c83d8594b_generated_image.png",
  "A1 PACKET": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/1d1738db5_generated_image.png",
  "A1 SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/1d1738db5_generated_image.png",
  "A1 STEAK SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/1d1738db5_generated_image.png",
  "ADD BACON": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/789c51ce1_generated_image.png",
  "ADD BACON BITS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4aa35a978_generated_image.png",
  "ADD BACON STRIPS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/789c51ce1_generated_image.png",
  "ADD CHERRY": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/dcff3d73c_generated_image.png",
  "ADD KEPTCHUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/5979c8cb3_generated_image.png",
  "ADD KETCHUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/5979c8cb3_generated_image.png",
  "ADD MUSHROOMS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/5aca080a7_generated_image.png",
  "ADD MUSTARD": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ec4cd3ee1_generated_image.png",
  "ADD PICKLES": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/8d8e1afd1_generated_image.png",
  "ADD RELISH": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/615584022_generated_image.png",
  "ADD SLICED ONIONS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4da6ffa25_generated_image.png",
  "ADD STRAWBERRY": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4af17afd9_generated_image.png",
  "ADD VANILLA": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/36eaf4cf2_generated_image.png",
  "ADD WHIPCREAM": "https://items-images-production.s3.us-west-2.amazonaws.com/files/219b8f328f8b44d61ef3f4cbbd1ba3c19ee785e8/original.jpeg",
  "AMERICAN": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f1cc08734_generated_image.png",
  "AMERICAN CHEESE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f1cc08734_generated_image.png",
  "BACON": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/789c51ce1_generated_image.png",
  "BACON BITS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4aa35a978_generated_image.png",
  "BANANA SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/dd2e6822e_generated_image.png",
  "BAR B QUE SAUCE": "https://items-images-production.s3.us-west-2.amazonaws.com/files/f9d66f1818746e10a4ff494dae6d016ac71f6ea5/original.jpeg",
  "BBQ": "https://items-images-production.s3.us-west-2.amazonaws.com/files/f9d66f1818746e10a4ff494dae6d016ac71f6ea5/original.jpeg",
  "BBQ SAUCE": "https://items-images-production.s3.us-west-2.amazonaws.com/files/f9d66f1818746e10a4ff494dae6d016ac71f6ea5/original.jpeg",
  "BLUEBERRY": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/baa246d8e_generated_image.png",
  "BLUEBERRY SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/975613e72_generated_image.png",
  "BLUEBERRY SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/975613e72_generated_image.png",
  "BLUEBERRY TOPPING": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/975613e72_generated_image.png",
  "BOOM BOOM": "https://items-images-production.s3.us-west-2.amazonaws.com/files/4e0a2e604c1af6aa29cfd8909db63ff0a7e74e8a/original.jpeg",
  "BOOM BOOM SAUCE": "https://items-images-production.s3.us-west-2.amazonaws.com/files/4e0a2e604c1af6aa29cfd8909db63ff0a7e74e8a/original.jpeg",
  "BUTTERFINGER": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c83d8594b_generated_image.png",
  "BUTTERSCOTCH": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e374a7d41_generated_image.png",
  "CARAMEL": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/6ad6a1a0c_generated_image.png",
  "CARAMEL SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/6ad6a1a0c_generated_image.png",
  "CARAMEL SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/6ad6a1a0c_generated_image.png",
  "CHERRIES": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/dcff3d73c_generated_image.png",
  "CHERRY": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/dcff3d73c_generated_image.png",
  "CHERRY SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f59b2fea3_generated_image.png",
  "CHERRY SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f59b2fea3_generated_image.png",
  "CHERRY TOPPING": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f59b2fea3_generated_image.png",
  "CHIPOTLE RANCH": "https://items-images-production.s3.us-west-2.amazonaws.com/files/ef25d26f1800ecbddb6f1b25ab674f506ffa88d5/original.jpeg",
  "CHOCOLATE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f1c6a70a6_generated_image.png",
  "CHOCOLATE CHIPS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c4c233919_generated_image.png",
  "CHOCOLATE SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f1c6a70a6_generated_image.png",
  "CHOPPED OREO": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c8448491a_generated_image.png",
  "COCONUT": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c2dc77de8_generated_image.png",
  "COOKIE PIECES": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c8448491a_generated_image.png",
  "CRUSHED BANANA": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e66a53d84_generated_image.png",
  "CRUSHED CANDY CANE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/3522203e9_generated_image.png",
  "CRUSHED PEPPERMINT": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/3522203e9_generated_image.png",
  "CRUSHED PEPPERMINTS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/3522203e9_generated_image.png",
  "CRUSHED PINEAPPLE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c38b33420_generated_image.png",
  "DRIZZLE OF CARAMEL": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/6ad6a1a0c_generated_image.png",
  "DRIZZLE OF CHOCOLATE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f1c6a70a6_generated_image.png",
  "GRAHAM CRACKER": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/176c50c6d_generated_image.png",
  "GRAHAM CRACKER CRUMBLE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/176c50c6d_generated_image.png",
  "GRAHAM CRACKER CRUMBLES": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/176c50c6d_generated_image.png",
  "GRAHAM CRACKERS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/176c50c6d_generated_image.png",
  "GRAHAM CRUMBLE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/176c50c6d_generated_image.png",
  "GRILLED JALAPEÑOS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ef967dbb7_generated_image.png",
  "GRILLED MUSHROOMS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/5aca080a7_generated_image.png",
  "GRILLED ONION": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/d7274a17f_generated_image.png",
  "GRILLED ONIONS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/d7274a17f_generated_image.png",
  "HONEY MUSTARD": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4b5aa4835_generated_image.png",
  "HOT FUDGE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/7b3d758bc_generated_image.png",
  "HOT FUDGE SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/7b3d758bc_generated_image.png",
  "JALAPEANO": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ef967dbb7_generated_image.png",
  "JALAPEANO RANCH": "https://items-images-production.s3.us-west-2.amazonaws.com/files/3be13b2e0052c9c7582f49e2fcaa5b8843b0aa38/original.jpeg",
  "JALAPENO RANCH": "https://items-images-production.s3.us-west-2.amazonaws.com/files/3be13b2e0052c9c7582f49e2fcaa5b8843b0aa38/original.jpeg",
  "JALAPENOS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ef967dbb7_generated_image.png",
  "JALAPEÑO RANCH": "https://items-images-production.s3.us-west-2.amazonaws.com/files/3be13b2e0052c9c7582f49e2fcaa5b8843b0aa38/original.jpeg",
  "JALAPEÑOS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ef967dbb7_generated_image.png",
  "KETCHUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/5979c8cb3_generated_image.png",
  "KETCHUP PACKET": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/5979c8cb3_generated_image.png",
  "LETTUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/dcacc49f6_generated_image.png",
  "MARINARA": "https://items-images-production.s3.us-west-2.amazonaws.com/files/d227971fe5a2d91bfc9fbe3d6d5cf41f46d010a7/original.jpeg",
  "MARINARA SAUCE": "https://items-images-production.s3.us-west-2.amazonaws.com/files/d227971fe5a2d91bfc9fbe3d6d5cf41f46d010a7/original.jpeg",
  "MARSHMALLOW FLUFF": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/602ddd525_generated_image.png",
  "MARSHMELLO FLUFF": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/602ddd525_generated_image.png",
  "MAYO": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e27a15ce0_generated_image.png",
  "MAYO PACKET": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e27a15ce0_generated_image.png",
  "MAYO SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e27a15ce0_generated_image.png",
  "MUSHROOMS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/5aca080a7_generated_image.png",
  "MUSTARD": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ec4cd3ee1_generated_image.png",
  "MUSTARD PACKET": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ec4cd3ee1_generated_image.png",
  "NACHO": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ed175c722_generated_image.png",
  "NACHO CHEESE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ed175c722_generated_image.png",
  "NUTS": "https://items-images-production.s3.us-west-2.amazonaws.com/files/367001aa7075189291284923c5c621b35ece7980/original.jpeg",
  "ONION": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/7d076c0e3_generated_image.png",
  "ORANGE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/cdd827542_generated_image.png",
  "ORANGE CREAMSICLE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/cdd827542_generated_image.png",
  "ORANGE SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/cdd827542_generated_image.png",
  "OREO": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c8448491a_generated_image.png",
  "OREO COOKIES": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c8448491a_generated_image.png",
  "OREO COOKIES AND CREAM": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c8448491a_generated_image.png",
  "PEACH": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/8301df29e_generated_image.png",
  "PEACH SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4fb395736_generated_image.png",
  "PEACH SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4fb395736_generated_image.png",
  "PEACH TOPPING": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4fb395736_generated_image.png",
  "PEACHES": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/8301df29e_generated_image.png",
  "PEANUT BUTTER": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/13e2e3b3f_generated_image.png",
  "PEANUT BUTTER CHIPS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/360eefc2f_generated_image.png",
  "PEPPERMINT": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/3522203e9_generated_image.png",
  "PICKLES": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/8d8e1afd1_generated_image.png",
  "PINEAPPLE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c38b33420_generated_image.png",
  "PINEAPPLE SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f432b4c4d_generated_image.png",
  "PINEAPPLE SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f432b4c4d_generated_image.png",
  "PINEAPPLE TOPPING": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f432b4c4d_generated_image.png",
  "RANCH": "https://items-images-production.s3.us-west-2.amazonaws.com/files/4c392321bc1cb7e756d01ba77efde430590ac10c/original.jpeg",
  "RASPBERRY": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/726996759_generated_image.png",
  "RASPBERRY SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/02832f58b_generated_image.png",
  "RASPBERRY SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/02832f58b_generated_image.png",
  "RASPBERRY TOPPING": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/02832f58b_generated_image.png",
  "REAL BANANA": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e66a53d84_generated_image.png",
  "REAL BANANAS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e66a53d84_generated_image.png",
  "REAL FRUIT BANANA": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e66a53d84_generated_image.png",
  "REAL FRUIT BLUEBERRY": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/baa246d8e_generated_image.png",
  "REAL FRUIT CRUSHED PINEAPPLE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c38b33420_generated_image.png",
  "REAL FRUIT PEACH": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/8301df29e_generated_image.png",
  "REAL FRUIT RASPBERRY": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/726996759_generated_image.png",
  "REAL FRUIT STRAWBERRY": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4af17afd9_generated_image.png",
  "RELISH": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/615584022_generated_image.png",
  "SLICED ONION": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4da6ffa25_generated_image.png",
  "SLICED ONIONS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4da6ffa25_generated_image.png",
  "SPRINKLES": "https://items-images-production.s3.us-west-2.amazonaws.com/files/2ed0a1a8782567bc2905d379d91cd03666ef65c3/original.jpeg",
  "STRAWBERRIES": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4af17afd9_generated_image.png",
  "STRAWBERRY": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4af17afd9_generated_image.png",
  "STRAWBERRY SAUCE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/7ae0d575d_generated_image.png",
  "STRAWBERRY SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/7ae0d575d_generated_image.png",
  "STRAWBERRY TOPPING": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/7ae0d575d_generated_image.png",
  "SWISS": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/14c37795e_generated_image.png",
  "SWISS CHEESE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/14c37795e_generated_image.png",
  "TOASTED COCONUT": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c2dc77de8_generated_image.png",
  "TOFFEE PIECES": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c83d8594b_generated_image.png",
  "TOMATO": "https://items-images-production.s3.us-west-2.amazonaws.com/files/46aee2953bcbb5fb619ee9e0ea73e59555155951/original.jpeg",
  "VANILLA": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/36eaf4cf2_generated_image.png",
  "VANILLA SYRUP": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/36eaf4cf2_generated_image.png",
  "WHIP CREAM": "https://items-images-production.s3.us-west-2.amazonaws.com/files/219b8f328f8b44d61ef3f4cbbd1ba3c19ee785e8/original.jpeg",
  "WHIPCREAM": "https://items-images-production.s3.us-west-2.amazonaws.com/files/219b8f328f8b44d61ef3f4cbbd1ba3c19ee785e8/original.jpeg",
  "WHITE CHOCOLATE": "https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/0eb479f39_generated_image.png",
  // Shake and drink cup sizes — a plain white Dart 14 oz and 20 oz styrofoam
  // cup, so the size tiles show the actual cup rather than a letter.
  "14OZ": "https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/6da475a80_generated_image.png",
  "14 OZ": "https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/6da475a80_generated_image.png",
  "S 14 OZ": "https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/6da475a80_generated_image.png",
  "SMALL": "https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/6da475a80_generated_image.png",
  "20OZ": "https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/df0979d40_generated_image.png",
  "20 OZ": "https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/df0979d40_generated_image.png",
  "L 20 OZ": "https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/df0979d40_generated_image.png",
  "LARGE": "https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/df0979d40_generated_image.png",
};

// Uppercase, trimmed, whitespace collapsed. The suffix is NOT dropped here so
// the approved keys ("BBQ SAUCE", "A1 STEAK SAUCE") stay addressable; the
// suffix-stripped form is tried as a fallback during lookup.
export function canonicalModifierName(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

const SUFFIX = / (SAUCE|SYRUP)$/;

function photoEntry(url, alt) {
  const clean = String(url || '').trim();
  return { url: clean, alt: String(alt || '').trim() };
}

// One flat lookup table: every approved key, plus its suffix-stripped alias.
function indexUrls(map) {
  const out = {};
  for (const [key, value] of Object.entries(map || {})) {
    const name = canonicalModifierName(key);
    if (!name || !value) continue;
    const url = typeof value === 'string' ? value : value.url;
    const alt = typeof value === 'string' ? key : value.alt;
    const entry = photoEntry(url, alt || key);
    out[name] = entry;
    const stripped = name.replace(SUFFIX, '');
    if (stripped !== name && !out[stripped]) out[stripped] = entry;
  }
  return out;
}

const BUILT_IN = indexUrls(MODIFIER_PHOTOS);

// Admin map merged over the baked-in one. Empty until a menu setting load lands,
// so the approved photos always render immediately.
let adminPhotos = {};

export function setModifierPhotoOverrides(photos) {
  adminPhotos = indexUrls(photos);
}

// Callers holding the settings record (the modifier modal, product page) push it
// here so an admin photo shows without waiting on a refetch.
export function refreshModifierPhotos(menuSetting) {
  setModifierPhotoOverrides(menuSetting?.modifier_photos);
}

// One load at module import keeps admin photos live on every surface that only
// has a name to look up.
getMenuSetting()
  .then((setting) => setModifierPhotoOverrides(setting?.modifier_photos))
  .catch(() => {});

// "TOMATO" / "TOMATOES" / "PICKLE" / "PICKLES" all reach the same photo.
function candidates(name) {
  const list = [name];
  const stripped = name.replace(SUFFIX, '');
  if (stripped !== name) list.push(stripped);
  for (const base of [...list]) {
    if (base.endsWith('S')) list.push(base.slice(0, -1));
    else list.push(`${base}S`);
  }
  return list;
}

// The photo for a modifier option name, or null when it has none.
export function getModifierPhoto(name) {
  const key = canonicalModifierName(name);
  if (!key) return null;
  for (const candidate of candidates(key)) {
    if (Object.prototype.hasOwnProperty.call(adminPhotos, candidate)) {
      const saved = adminPhotos[candidate];
      // An empty url is an admin tombstone — cleared, so no photo at all.
      return saved.url ? saved : null;
    }
    if (BUILT_IN[candidate]?.url) return BUILT_IN[candidate];
  }
  return null;
}