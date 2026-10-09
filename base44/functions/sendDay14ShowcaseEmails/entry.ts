import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { runLoyaltyFollowUp } from '../../shared/loyaltyFollowUp.ts';

// Day 14 "here's what you didn't try yet" loyalty email (issue #37, step 6).
// Gated on the day14ShowcaseEmailEnabled toggle, which ships OFF — nothing sends
// until the owner approves the final copy and switches it on himself.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const result = await runLoyaltyFollowUp(base44, 'day14');
    return Response.json(result);
  } catch (error) {
    console.error('sendDay14ShowcaseEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}