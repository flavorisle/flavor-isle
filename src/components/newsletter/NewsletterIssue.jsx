import React from 'react';
import IssueNovember2026 from './IssueNovember2026';

// Renders a saved newsletter issue by its slug. The default is the November
// 2026 issue the /newsletter page has always shown, so that page's output is
// unchanged; the archive at /newsletters/:slug passes the issue it opened.
const ISSUES = {
  'november-2026': IssueNovember2026,
};

export default function NewsletterIssue({ issue = 'november-2026' }) {
  const Issue = ISSUES[issue];
  if (!Issue) return null;

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
      <Issue />
    </section>
  );
}