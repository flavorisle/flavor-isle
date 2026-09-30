import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { isBlocked, blockedCallerInstruction } from '../../shared/blockedContacts.ts';

// Website chat runs in the visitor's browser, so it has no caller ID to check.
// It asks whether the signed-in visitor's OWN email is blocked — only their own
// account is ever looked up, so the block list can't be probed from the page.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      user = null;
    }
    if (!user?.email) return Response.json({ blocked: false, instruction: '' });

    const block = await isBlocked(base44, { email: user.email });
    return Response.json({
      blocked: !!block,
      instruction: block ? blockedCallerInstruction({ channel: 'chat', reason: block.reason }) : '',
    });
  } catch (error) {
    console.error('checkBlockedContact error:', error.message);
    return Response.json({ blocked: false, instruction: '' });
  }
}