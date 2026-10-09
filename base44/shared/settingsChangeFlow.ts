import { SETTINGS_ENTITIES, diffSettings, changeReach } from './settingsChanges.ts';
import { sendSettingsChangeEmail } from './settingsChangeEmail.ts';

// The whole owner-switch audit trail in one testable place: diff the changed
// record against the newest snapshot, email the owner what moved, and log both.
// The very first run for an entity stores a baseline and sends nothing.
export async function processSettingsChange(base44, { entityName, entityId }) {
  if (!SETTINGS_ENTITIES.includes(entityName)) {
    return { skipped: true, reason: `${entityName} is not an owner-switch record` };
  }
  if (!entityId) return { skipped: true, reason: 'no entity id supplied' };

  const store = entityName === 'MenuSetting'
    ? base44.asServiceRole.entities.MenuSetting
    : base44.asServiceRole.entities.SmashieSettings;
  const current = await store.get(entityId);
  if (!current) return { skipped: true, reason: 'record not found' };

  const logs = base44.asServiceRole.entities.SettingsChangeLog;
  const [latest] = await logs.filter({ entity: entityName }, '-changed_at', 1);

  // First run: keep the current state as the baseline so the NEXT change has
  // something to compare against. Nothing is emailed for this.
  if (!latest) {
    await logs.create({
      entity: entityName,
      field_changes: [],
      changed_at: new Date().toISOString(),
      affected: 'baseline',
      snapshot: current,
      emailed: false,
      description: `Baseline stored for ${entityName}. The next change is compared against this.`,
    });
    return { baselined: true, entity: entityName };
  }

  const changes = diffSettings(latest.snapshot || {}, current);
  // The admin forms re-save every field on every save, so an unchanged save must
  // stay silent. Only fields whose value really moved are reported.
  if (!changes.length) {
    return { skipped: true, reason: 'no switch changed', entity: entityName };
  }

  const affected = changeReach(changes);
  const emailed = await sendSettingsChangeEmail(base44, { entityName, changes, affected });

  await logs.create({
    entity: entityName,
    field_changes: changes,
    changed_at: new Date().toISOString(),
    affected,
    snapshot: current,
    emailed: emailed === 'sent',
    description: `${changes.length} setting${changes.length === 1 ? '' : 's'} changed on ${entityName}. Owner notice: ${emailed}.`,
  });

  return { entity: entityName, changes: changes.length, affected, emailed };
}