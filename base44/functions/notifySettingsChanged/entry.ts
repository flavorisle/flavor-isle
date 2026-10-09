import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { processSettingsChange } from '../../shared/settingsChangeFlow.ts';

// Called by the two "Settings Change Notice" workflows when a store or Smashie
// settings record is updated. The diff, the owner email and the audit row all
// live in settingsChangeFlow so they can be tested without the runtime.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const result = await processSettingsChange(base44, {
      entityName: body.entity_name,
      entityId: body.entity_id,
    });
    return Response.json(result);
  } catch (error) {
    console.error('notifySettingsChanged error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}