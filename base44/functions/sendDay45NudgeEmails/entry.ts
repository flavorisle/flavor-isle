import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { runLoyaltyFollowUp } from '../../shared/loyaltyFollowUp.ts';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';

// Day 45 loyalty nudge for customers who never placed a second order
// (issue #37, step 6). Gated on the day45NudgeEmailEnabled toggle, which ships
// OFF — the copy is approved, and switching the toggle on is the owner's go-live
// step.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Issue #93 (A10): blocked customers are filtered out of the run. A failed
    // block read is logged and the run continues.
    const blockFilter = await loadBlockFilter(base44).catch((e) => {
      console.error('Block-list lookup failed, sending unfiltered:', e.message);
      return null;
    });
    const result = await runLoyaltyFollowUp(base44, 'day45', blockFilter);
    return Response.json(result);
  } catch (error) {
    console.error('sendDay45NudgeEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}