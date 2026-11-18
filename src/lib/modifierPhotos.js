import { getMenuSetting } from '@/lib/menuSettings';

// Issue #324 — the built-in photo map for modifier tiles.
//
// Only real food photos live here: sauces and the toppings we actually shoot.
// A finished milkshake is not a flavor, so no flavor, syrup or dessert entry is
// in this map — an option without a photo is a letter tile, which is the
// expected look until Wesley adds the real shot in Admin → Modifier photos.
//
// Lookups are forgiving because Square's option names vary by list: case is
// ignored, surrounding and repeated whitespace is collapsed, a trailing
// " SAUCE" / " SYRUP" is dropped (RANCH SAUCE = RANCH) and a trailing "S" is
// optional (TOMATO = TOMATOES).
//
// An admin can add photos without a build: MenuSetting.modifier_photos holds
// the same { "OPTION NAME": { url, alt } } map and is merged OVER the built-in
// map, so an entry saved in Admin → Modifier photos always wins. An entry with
// an empty url is a tombstone: the admin cleared that photo, including a
// built-in one.
const S3 = 'https://items-images-production.s3.us-west-2.amazonaws.com/files/';

const photo = (path, alt) => ({ url: `${S3}${path}`, alt });

export const MODIFIER_PHOTOS = {
  RANCH: photo('4c392321bc1cb7e756d01ba77efde430590ac10c/original.jpeg', 'Ranch sauce'),
  'RANCH SAUCE': photo('4c392321bc1cb7e756d01ba77efde430590ac10c/original.jpeg', 'Ranch sauce'),
  'JALAPENO RANCH': photo('3be13b2e0052c9c7582f49e2fcaa5b8843b0aa38/original.jpeg', 'Jalapeno ranch sauce'),
  'JALAPEÑO RANCH': photo('3be13b2e0052c9c7582f49e2fcaa5b8843b0aa38/original.jpeg', 'Jalapeno ranch sauce'),
  'JALAPEANO RANCH': photo('3be13b2e0052c9c7582f49e2fcaa5b8843b0aa38/original.jpeg', 'Jalapeno ranch sauce'),
  'CHIPOTLE RANCH': photo('ef25d26f1800ecbddb6f1b25ab674f506ffa88d5/original.jpeg', 'Chipotle ranch sauce'),
  BBQ: photo('f9d66f1818746e10a4ff494dae6d016ac71f6ea5/original.jpeg', 'BBQ sauce'),
  'BBQ SAUCE': photo('f9d66f1818746e10a4ff494dae6d016ac71f6ea5/original.jpeg', 'BBQ sauce'),
  'BAR B QUE SAUCE': photo('f9d66f1818746e10a4ff494dae6d016ac71f6ea5/original.jpeg', 'BBQ sauce'),
  'BOOM BOOM': photo('4e0a2e604c1af6aa29cfd8909db63ff0a7e74e8a/original.jpeg', 'Boom boom sauce'),
  'BOOM BOOM SAUCE': photo('4e0a2e604c1af6aa29cfd8909db63ff0a7e74e8a/original.jpeg', 'Boom boom sauce'),
  MARINARA: photo('d227971fe5a2d91bfc9fbe3d6d5cf41f46d010a7/original.jpeg', 'Marinara sauce'),
  'MARINARA SAUCE': photo('d227971fe5a2d91bfc9fbe3d6d5cf41f46d010a7/original.jpeg', 'Marinara sauce'),
  BACON: photo('3bb1ff66a5ebfd734b94ad1126543e54df4f3701/original.png', 'Bacon'),
  'ADD BACON': photo('3bb1ff66a5ebfd734b94ad1126543e54df4f3701/original.png', 'Bacon'),
  TOMATO: photo('46aee2953bcbb5fb619ee9e0ea73e59555155951/original.jpeg', 'Tomato slices'),
  TOMATOES: photo('46aee2953bcbb5fb619ee9e0ea73e59555155951/original.jpeg', 'Tomato slices'),
  'ADD TOMATO': photo('46aee2953bcbb5fb619ee9e0ea73e59555155951/original.jpeg', 'Tomato slices'),
  NUTS: photo('367001aa7075189291284923c5c621b35ece7980/original.jpeg', 'Chopped nuts'),
  'ADD NUTS': photo('367001aa7075189291284923c5c621b35ece7980/original.jpeg', 'Chopped nuts'),
  'CHOPPED NUTS': photo('367001aa7075189291284923c5c621b35ece7980/original.jpeg', 'Chopped nuts'),
  SPRINKLES: photo('2ed0a1a8782567bc2905d379d91cd03666ef65c3/original.jpeg', 'Rainbow sprinkles'),
  'ADD SPRINKLES': photo('2ed0a1a8782567bc2905d379d91cd03666ef65c3/original.jpeg', 'Rainbow sprinkles'),
  'RAINBOW SPRINKLES': photo('2ed0a1a8782567bc2905d379d91cd03666ef65c3/original.jpeg', 'Rainbow sprinkles'),
  'WHIP CREAM': photo('219b8f328f8b44d61ef3f4cbbd1ba3c19ee785e8/original.jpeg', 'Whipped cream'),
  WHIPCREAM: photo('219b8f328f8b44d61ef3f4cbbd1ba3c19ee785e8/original.jpeg', 'Whipped cream'),
  'ADD WHIPCREAM': photo('219b8f328f8b44d61ef3f4cbbd1ba3c19ee785e8/original.jpeg', 'Whipped cream'),
};

// The one normalization every lookup and every saved key goes through.
export function canonicalModifierName(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/ (SAUCE|SYRUP)$/, '');
}

function indexPhotos(map) {
  const out = {};
  for (const [key, value] of Object.entries(map || {})) {
    const name = canonicalModifierName(key);
    if (!name || !value || typeof value !== 'object') continue;
    out[name] = {
      url: String(value.url || '').trim(),
      alt: String(value.alt || key).trim() || key,
    };
  }
  return out;
}

const BUILT_IN = indexPhotos(MODIFIER_PHOTOS);

// The admin map, merged over the built-in one. Empty until a menu setting load
// lands, so the built-in photos always render immediately.
let adminPhotos = {};

export function setModifierPhotoOverrides(photos) {
  adminPhotos = indexPhotos(photos);
}

// Callers that already hold the settings record (the modifier modal, the build
// summary) push it here so an admin photo shows without waiting on a refetch.
export function refreshModifierPhotos(menuSetting) {
  setModifierPhotoOverrides(menuSetting?.modifier_photos);
}

// One load at module import keeps admin photos live on every surface that only
// has a name to look up. getMenuSetting is cached and already fetched by the
// menu pages, so this costs no extra call.
getMenuSetting()
  .then((setting) => setModifierPhotoOverrides(setting?.modifier_photos))
  .catch(() => {});

function candidates(name) {
  const list = [name];
  if (name.endsWith('S')) list.push(name.slice(0, -1));
  else list.push(`${name}S`);
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
    if (BUILT_IN[candidate]) return BUILT_IN[candidate];
  }
  return null;
}