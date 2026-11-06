// The newsletter issues that exist in code, newest first.
//
// There is no stored newsletter HTML anywhere: NewsletterSend only holds
// per-recipient send rows, so this list IS the archive. Each entry points at
// the rendered issue by its `component` slug (src/components/newsletter/) and
// carries the day it went out. Nothing here sends, edits or re-broadcasts an
// issue — it only lists what already exists.
export const NEWSLETTER_ISSUES = [
  {
    slug: 'november-2026',
    title: 'Winter Bliss is here at Flavor Isle',
    summary:
      'Three things changed at the Isle this week: new Bliss shakes, online ordering is back, and we close at 7:00 PM now.',
    // The issue's own dateline — "Isle News · November 2, 2026" — and the day
    // it was sent to subscribers.
    date: '2026-11-02',
    component: 'november-2026',
  },
];

// "November 2, 2026", built in UTC from the stored Y-M-D so a card never shifts
// a day for a visitor in another timezone.
export function formatIssueDate(date) {
  const [year, month, day] = String(date || '')
    .split('-')
    .map(Number);
  if (!year || !month || !day) return '';
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}