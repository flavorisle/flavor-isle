import test from 'node:test';
import assert from 'node:assert/strict';
import { processSettingsChange } from './settingsChangeFlow.ts';

// Fake client: one settings record plus an in-memory SettingsChangeLog, so the
// whole flow runs without the runtime or the network. `emails` is what the owner
// would have received.
function fakeBase44({ record = {}, logs = [], failEmail = false } = {}) {
  const created = [];
  const emails = [];
  return {
    created,
    emails,
    client: {
      asServiceRole: {
        entities: {
          MenuSetting: { get: async () => record },
          SmashieSettings: { get: async () => record },
          SettingsChangeLog: {
            filter: async () => logs,
            create: async (row) => { created.push(row); return row; },
          },
        },
        integrations: {
          Core: {
            SendEmail: async (msg) => {
              if (failEmail) throw new Error('recipient refused');
              emails.push(msg);
            },
          },
        },
      },
    },
  };
}

const BASELINE = { id: 'm1', ordering_enabled: true, delivery_fee: 0, updated_date: '2026-10-01T00:00:00Z' };

test('the first run stores a baseline and emails nothing', async () => {
  const f = fakeBase44({ record: BASELINE });
  const result = await processSettingsChange(f.client, { entityName: 'MenuSetting', entityId: 'm1' });

  assert.deepEqual(result, { baselined: true, entity: 'MenuSetting' });
  assert.equal(f.emails.length, 0);
  assert.equal(f.created.length, 1);
  assert.equal(f.created[0].affected, 'baseline');
  assert.equal(f.created[0].emailed, false);
  assert.deepEqual(f.created[0].field_changes, []);
  assert.equal(f.created[0].snapshot.id, 'm1');
});

test('a changed switch emails the owner once and is logged with its diff', async () => {
  const changed = { ...BASELINE, ordering_enabled: false, updated_date: '2026-10-09T00:00:00Z' };
  const f = fakeBase44({
    record: changed,
    logs: [{ entity: 'MenuSetting', snapshot: BASELINE, changed_at: '2026-10-01T00:00:00Z' }],
  });
  const result = await processSettingsChange(f.client, { entityName: 'MenuSetting', entityId: 'm1' });

  assert.equal(result.changes, 1);
  assert.equal(result.affected, 'both');
  assert.equal(result.emailed, 'sent');

  assert.equal(f.emails.length, 1);
  assert.equal(f.emails[0].to, 'wesleyrbooker1@gmail.com');
  assert.match(f.emails[0].subject, /1 switch in Store Settings/);
  assert.match(f.emails[0].body, /ordering enabled/);
  assert.match(f.emails[0].body, /Both the website and the phone line/);

  assert.equal(f.created.length, 1);
  assert.equal(f.created[0].emailed, true);
  assert.equal(f.created[0].field_changes[0].old, 'ON');
  assert.equal(f.created[0].field_changes[0].new, 'OFF');
  // The snapshot advances, so the same change is never reported twice.
  assert.equal(f.created[0].snapshot.ordering_enabled, false);
});

test('a save that changes nothing is silent', async () => {
  const f = fakeBase44({
    record: { ...BASELINE, updated_date: '2026-10-09T00:00:00Z' },
    logs: [{ entity: 'MenuSetting', snapshot: BASELINE, changed_at: '2026-10-01T00:00:00Z' }],
  });
  const result = await processSettingsChange(f.client, { entityName: 'MenuSetting', entityId: 'm1' });

  assert.equal(result.skipped, true);
  assert.equal(f.emails.length, 0);
  assert.equal(f.created.length, 0);
});

test('the Meta token never leaves the settings record', async () => {
  const f = fakeBase44({
    record: { id: 's1', facebook_access_token: 'NEW-TOKEN', greeting: 'Hi' },
    logs: [{ entity: 'SmashieSettings', snapshot: { id: 's1', facebook_access_token: 'OLD-TOKEN', greeting: 'Hi' } }],
  });
  const result = await processSettingsChange(f.client, { entityName: 'SmashieSettings', entityId: 's1' });

  assert.equal(result.skipped, true);
  assert.equal(f.emails.length, 0);
});

test('a refused send is recorded as not emailed, never as sent', async () => {
  const f = fakeBase44({
    record: { id: 's1', phone_cash_enabled: true },
    logs: [{ entity: 'SmashieSettings', snapshot: { id: 's1' } }],
    failEmail: true,
  });
  const result = await processSettingsChange(f.client, { entityName: 'SmashieSettings', entityId: 's1' });

  assert.match(String(result.emailed), /^failed/);
  assert.equal(result.affected, 'phone');
  assert.equal(f.created.length, 1);
  assert.equal(f.created[0].emailed, false);
  assert.match(f.created[0].description, /failed/);
});

test('an unrelated entity is ignored', async () => {
  const f = fakeBase44({ record: { id: 'o1' } });
  const result = await processSettingsChange(f.client, { entityName: 'Order', entityId: 'o1' });

  assert.equal(result.skipped, true);
  assert.equal(f.emails.length, 0);
  assert.equal(f.created.length, 0);
});