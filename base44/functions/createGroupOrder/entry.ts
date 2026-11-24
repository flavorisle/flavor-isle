import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolveAppUrl } from '../../shared/wixCheckout.ts';

// Start a group order (issue #356). Public on purpose: the host is a customer at
// the counter or on their phone, not a signed-in account. The code is the only
// credential and is random and unguessable.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function newCode(len = 10): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

function cleanName(value: any, max: number): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const title = cleanName(body?.title, 60);
    const hostName = cleanName(body?.host_name, 40);
    const closesRaw = String(body?.closes_at || '').trim();

    if (!hostName) return Response.json({ error: 'Add your first name so the group knows who started it.' }, { status: 400 });
    if (!title) return Response.json({ error: 'Give the group a name.' }, { status: 400 });

    const closesAt = new Date(closesRaw);
    if (!closesRaw || Number.isNaN(closesAt.getTime())) {
      return Response.json({ error: 'Choose a time for the group to close.' }, { status: 400 });
    }
    const now = Date.now();
    if (closesAt.getTime() <= now) {
      return Response.json({ error: 'The close time has to be in the future.' }, { status: 400 });
    }
    if (closesAt.getTime() > now + 14 * 24 * 60 * 60 * 1000) {
      return Response.json({ error: 'Choose a close time within the next two weeks.' }, { status: 400 });
    }

    // The code is the group's only key, so it is retried until it is free.
    let code = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = newCode(10);
      const taken = await base44.asServiceRole.entities.GroupOrder.filter({ code: candidate });
      if (!taken || taken.length === 0) { code = candidate; break; }
    }
    if (!code) return Response.json({ error: 'Could not start the group. Please try again.' }, { status: 500 });

    const group = await base44.asServiceRole.entities.GroupOrder.create({
      code,
      host_name: hostName,
      title,
      closes_at: closesAt.toISOString(),
      status: 'open',
    });

    const url = `${resolveAppUrl(req)}/group-order/${group.code}`;
    return Response.json({ ok: true, code: group.code, url, closes_at: group.closes_at });
  } catch (error) {
    console.error('createGroupOrder error:', (error as Error).message);
    return Response.json({ error: 'Could not start the group. Please try again.' }, { status: 500 });
  }
}