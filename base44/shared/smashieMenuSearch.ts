// Menu search behind Smashie's lookup_menu phone tool.
//
// Callers speak naturally — "burgers", "a chocolate shake", "coke" — while the
// menu stores "Cheeseburger Melt", "Hot Fudge Milkshake", and a Classic Drinks
// item whose soda choice lists Coke. Matching therefore works word by word with
// plurals folded, and looks inside modifier options too, so a real item is not
// reported as "can't verify" just because the wording differs.
const MAX_RESULTS = 20;
const MAX_CLOSEST = 8;
const MAX_GROUPS_PER_ITEM = 3;
const MAX_OPTIONS_PER_GROUP = 8;
const MAX_MATCHING_OPTIONS = 6;

// Merch tees and the delivery-fee line live in the catalog but cannot be ordered
// by phone, so they never show up as food.
const NOT_FOOD = /^(tasty threads|items)$/i;
const FILLER = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'with', 'without', 'please', 'any', 'some', 'do', 'you', 'have', 'got', 'what', 'whats', 'is', 'are', 'your', 'for', 'on', 'to', 'me', 'i', 'can', 'get', 'want', 'like', 'would', 'order', 'menu', 'item', 'items']);

function stem(word) {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function wordsOf(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean).map(stem);
}

function tokensOf(text) {
  return wordsOf(text).filter((word) => !FILLER.has(word));
}

// "shake" is found in "milkshake" and "burger" in "cheeseburger"; a short token
// such as "ham" must match a whole word so it never lands inside "hamburger".
function wordMatches(word, token) {
  if (word === token) return true;
  if (token.length < 3) return false;
  return word.endsWith(token) || (token.length >= 5 && word.startsWith(token));
}

function hasWord(words, token) {
  return words.some((word) => wordMatches(word, token));
}

function optionNames(lists, out = []) {
  for (const group of lists || []) {
    for (const option of group.modifiers || []) {
      if (!option || option.sold_out || !option.name) continue;
      out.push(option.name);
      optionNames(option.child_modifier_lists, out);
    }
  }
  return out;
}

function summariseModifiers(modifiers) {
  return (modifiers || [])
    .slice(0, MAX_GROUPS_PER_ITEM)
    .map((group) => {
      const options = (group.modifiers || [])
        .filter((option) => option && !option.sold_out)
        .slice(0, MAX_OPTIONS_PER_GROUP)
        .map((option) => (Number(option.price) > 0 ? `${option.name} (+$${Number(option.price).toFixed(2)})` : option.name));
      return `${group.name}: ${options.join(', ')}`;
    })
    .filter((line) => !line.endsWith(': '));
}

function indexItem(item) {
  const group = item.display_category || item.square_category || item.category || '';
  const options = optionNames(item.modifiers);
  const nameWords = wordsOf(`${item.name} ${group}`);
  const allWords = [...nameWords, ...wordsOf(item.description), ...options.flatMap(wordsOf)];
  return { item, group, options, nameWords, allWords };
}

// Tier 3: every word is in the name/section. Tier 2: every word is somewhere on
// the item (description or an option). Tier 1: only some words match.
function rank(entry, tokens) {
  const inName = tokens.filter((token) => hasWord(entry.nameWords, token)).length;
  const anywhere = tokens.filter((token) => hasWord(entry.allWords, token)).length;
  const tier = inName === tokens.length ? 3 : anywhere === tokens.length ? 2 : anywhere > 0 ? 1 : 0;
  return { entry, tier, inName, anywhere };
}

function present({ item, group, options }, tokens) {
  const matching = options.filter((name) => wordsOf(name).some((word) => tokens.some((token) => wordMatches(word, token))));
  return {
    name: item.name,
    price: Number(item.price) || 0,
    category: group,
    description: item.description || '',
    options: summariseModifiers(item.modifiers),
    ...(tokens.length && matching.length ? { matching_options: matching.slice(0, MAX_MATCHING_OPTIONS) } : {}),
  };
}

export function searchMenu(items, { query, category } = {}) {
  const tokens = [...tokensOf(query), ...tokensOf(category)];
  const pool = (items || [])
    .filter((item) => item && item.name && !item.is_hidden && !NOT_FOOD.test(item.display_category || item.square_category || item.category || ''))
    .map(indexItem);

  if (!tokens.length) {
    return { match_quality: 'all', matches: pool.length, shown: Math.min(pool.length, MAX_RESULTS), note: 'This is only part of the menu — ask what the caller is in the mood for.', items: pool.slice(0, MAX_RESULTS).map((entry) => present(entry, tokens)) };
  }

  const ranked = pool
    .map((entry) => rank(entry, tokens))
    .filter((result) => result.tier > 0)
    .sort((a, b) => b.tier - a.tier || b.inName - a.inName || a.entry.item.name.localeCompare(b.entry.item.name));

  const full = ranked.filter((result) => result.tier >= 2);
  if (full.length) {
    const shown = full.slice(0, MAX_RESULTS);
    return {
      match_quality: 'exact',
      matches: full.length,
      shown: shown.length,
      note: shown.length < full.length ? 'More items match — narrow the question or ask again.' : undefined,
      items: shown.map((result) => present(result.entry, tokens)),
    };
  }

  if (ranked.length) {
    const shown = ranked.slice(0, MAX_CLOSEST);
    return {
      match_quality: 'closest',
      matches: 0,
      shown: shown.length,
      note: 'No live item matched every word the caller used. These are only the closest. Say that, and confirm with the caller before offering or substituting any of them.',
      items: shown.map((result) => present(result.entry, tokens)),
    };
  }

  return {
    match_quality: 'none',
    matches: 0,
    shown: 0,
    note: 'Nothing on the live menu matches that. Tell the caller you cannot find it on the menu right now — never guess or invent an item, size, flavor, or price.',
    items: [],
  };
}