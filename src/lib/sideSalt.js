// Sides are cooked unsalted (issue #300). The answer has to reach the kitchen,
// so it is asked in the customization modal instead of living in page copy.
const SALTED_SIDE = /fries|tots|potato|wedge/i;

export function isSaltQuestionItem(item) {
  if (!item) return false;
  const cat = String(item.display_category || item.square_category || item.category || '');
  if (!/crunch\s*&\s*munch/i.test(cat)) return false;
  return SALTED_SIDE.test(String(item.name || ''));
}

export function saltNoteText(choice) {
  if (choice === 'yes') return 'Salt: yes, packets';
  if (choice === 'no') return 'Salt: no salt';
  return '';
}