import { itemCategoryKey } from '@/lib/menuCategory';

// Issue #300 (Wesley, Nov 14, 2026): fries and tots must carry a required salt
// answer from the customization modal through the cart to the kitchen ticket.
// Only Crunch & Munch potato sides ask the question — chili, cheese, sauces and
// onion rings in that same category are left alone.
export function isSaltQuestionItem(item) {
  if (!item) return false;
  if (itemCategoryKey(item).trim().toLowerCase() !== 'crunch & munch') return false;
  return /fries|tots|potato|waffle/i.test(item.name || '');
}