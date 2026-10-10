import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { runLoyaltyFollowUp } from '../../shared/loyaltyFollowUp.ts';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';

// Day 14 "here's what you didn't try yet" loyalty email (issue #37, step 6).
// Gated on the day14ShowcaseEmailEnabled toggle, which ships OFF — nothing sends
// until the owner approves the final copy and switches it on himself.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Issue #93 (A9): blocked customers are filtered out of the run. A failed
    // block read is logged and the run continues.
    const blockFilter = await loadBlockFilter(base44).catch((e) => {
      console.error('Block-list lookup failed, sending unfiltered:', e.message);
      return null;
    });
    const result = await runLoyaltyFollowUp(base44, 'day14', blockFilter);
    return Response.json(result);
  } catch (error) {
    console.error('sendDay14ShowcaseEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}