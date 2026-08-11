// Milkshake flavor display configuration.
// The 16 shake "types" come from the single Square "Milkshake" item's FLAVOR
// CHOICE modifier list. Square ships them in ALL-CAPS with generic names, so
// we keep a curated default name + emoji per flavor id here. Admins can
// override either via the AdminShakeManager; overrides persist to localStorage.
//
// (Like the Deluxe preset, this is client-side config — on a branch we can't
// add a server field. Merge to main to move it into MenuSetting.)

const STORAGE_KEY = 'fi_shake_config_v1';

// Square modifier id -> curated display name
export const DEFAULT_FLAVOR_NAMES = {
  ZJJHXT37NGMZMXV65NWJGMP3: 'Vanilla',
  KFPJL7EMR442VHINDRIBT5OV: 'Real Banana',
  SV4XWA4MEVGZYKT6ZAPLUDW6: 'Caramel Sauce',
  XCQGUBCXAPOAC7UO4AM3WB4Q: 'Cherry Syrup',
  TZNOA7OY6B5Q5X6CY5DSSMGQ: 'Cherry Topping',
  RGILJDQRFPX6UEG437SMMJYC: 'Chocolate Syrup',
  UUH2PYJTVF4KTAIW53BIVZMU: 'Hot Fudge',
  X5XL2ARTVDM7QOJKADZPSTED: 'Peanut Butter',
  OJ6R43VUMQYOA5BMA2LVLGST: 'Pineapple Topping',
  TLH35JYXNHG3EB7S3E2O4NK2: 'Strawberry Syrup',
  UZ5GF5VHBA6DQVLPMAJ2KLY5: 'Strawberry Topping',
  ZOR4URHMSHCHZCKTBEMKGR7O: 'Oreo Cookies',
  BZC7L7P6ZLAEJHX765YGHSGF: 'Blueberry Topping',
  TPOYBHIL6TOJNEUGM624724X: 'Raspberry Topping',
  T3FATIPMKEJGSR23ZCB6LGPU: 'Peach Topping',
  '3DBXRG2QXNVMFGP7ULG7HJ4M': 'Orange Syrup',
};

// Square modifier id -> emoji
export const DEFAULT_FLAVOR_EMOJIS = {
  ZJJHXT37NGMZMXV65NWJGMP3: '🍦',
  KFPJL7EMR442VHINDRIBT5OV: '🍌',
  SV4XWA4MEVGZYKT6ZAPLUDW6: '🍯',
  XCQGUBCXAPOAC7UO4AM3WB4Q: '🍒',
  TZNOA7OY6B5Q5X6CY5DSSMGQ: '🍒',
  RGILJDQRFPX6UEG437SMMJYC: '🍫',
  UUH2PYJTVF4KTAIW53BIVZMU: '🍫',
  X5XL2ARTVDM7QOJKADZPSTED: '🥜',
  OJ6R43VUMQYOA5BMA2LVLGST: '🍍',
  TLH35JYXNHG3EB7S3E2O4NK2: '🍓',
  UZ5GF5VHBA6DQVLPMAJ2KLY5: '🍓',
  ZOR4URHMSHCHZCKTBEMKGR7O: '🍪',
  BZC7L7P6ZLAEJHX765YGHSGF: '🫐',
  TPOYBHIL6TOJNEUGM624724X: '🍇',
  T3FATIPMKEJGSR23ZCB6LGPU: '🍑',
  '3DBXRG2QXNVMFGP7ULG7HJ4M': '🍊',
};

export function getShakeConfig() {
  if (typeof localStorage === 'undefined') return { flavorNames: {}, flavorEmojis: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { flavorNames: {}, flavorEmojis: {} };
    const parsed = JSON.parse(raw);
    return {
      flavorNames: parsed.flavorNames || {},
      flavorEmojis: parsed.flavorEmojis || {},
    };
  } catch {
    return { flavorNames: {}, flavorEmojis: {} };
  }
}

export function saveShakeConfig(config) {
  const clean = {
    flavorNames: config.flavorNames || {},
    flavorEmojis: config.flavorEmojis || {},
  };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  }
  return clean;
}

// Resolve a flavor's display name: admin override → Square name (title-cased
// if ALL-CAPS) → curated default. Square is the source of truth, so the user's
// latest name changes always win; ALL-CAPS names are prettified for display.
export function resolveFlavorName(flavorId, originalName, config) {
  const cfg = config || getShakeConfig();
  if (cfg.flavorNames[flavorId]) return cfg.flavorNames[flavorId];
  if (originalName) {
    if (originalName === originalName.toUpperCase() && /[A-Z]/.test(originalName)) {
      return originalName
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return originalName;
  }
  return DEFAULT_FLAVOR_NAMES[flavorId] || originalName;
}

// Resolve a flavor's emoji: admin override → curated default → shake glass.
export function resolveFlavorEmoji(flavorId, config) {
  const cfg = config || getShakeConfig();
  return cfg.flavorEmojis[flavorId] || DEFAULT_FLAVOR_EMOJIS[flavorId] || '🥤';
}