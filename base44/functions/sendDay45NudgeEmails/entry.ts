import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { runLoyaltyFollowUp } from '../../shared/loyaltyFollowUp.ts';

// Day 45 loyalty nudge for customers who never placed a second order
// (issue #37, step 6). Gated on the day45NudgeEmailEnabled toggle, which ships
// OFF — nothing sends until the owner approves the final copy and switches it on.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const result = await runLoyaltyFollowUp(base44, 'day45');
    return Response.json(result);
  } catch (error) {
    console.error('sendDay45NudgeEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}