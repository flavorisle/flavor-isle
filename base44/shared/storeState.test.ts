import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatClock,
  effectiveCloseTime,
  getUnifiedStoreState,
  getPhoneStoreStatus,
  getMenuSettingRecord,
  MENU_SETTING_ID,
} from './storeState.ts';

// 2026-10-12 is a Monday (weekday 1, matching JS getDay()). `now` is injected so
// these checks never depend on when the suite runs.
const MONDAY_NOON = { dateKey: '2026-10-12', weekday: 1, hour: 12, minute: 0 };
const HOURS = { monday: { open: '10:00', close: '21:00' } };

// Stub client: proves which record id the store state asks for, and fails loudly
// if a reader ever falls back to scanning the whole entity.
function fakeBase44(record) {
  const asked = [];
  return {
    asked,
    client: {
      asServiceRole: {
        entities: {
          MenuSetting: {
            get: async (id) => { asked.push(id); return { id, ...record }; },
            list: async () => { throw new Error('list() must not run while the record is pinned'); },
          },
        },
      },
    },
  };
}

// Today in the store's own timezone, for the checks that go through a function
// which reads the real clock.
function chicagoTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
}

test('clock times are spoken the same way everywhere', () => {
  assert.equal(formatClock('17:00'), '5:00 PM');
  assert.equal(formatClock('20:00'), '8:00 PM');
  assert.equal(formatClock('09:05'), '9:05 AM');
  assert.equal(formatClock('00:00'), '12:00 AM');
  assert.equal(formatClock('12:00'), '12:00 PM');
  assert.equal(formatClock(''), '');
});

test('today closes at the weekly hours, or the early close when one is set for today', () => {
  assert.equal(effectiveCloseTime({ business_hours: HOURS }, MONDAY_NOON), '21:00');
  assert.equal(
    effectiveCloseTime({ business_hours: HOURS, early_close: { date: '2026-10-12', close_time: '17:00' } }, MONDAY_NOON),
    '17:00'
  );
  // An early close dated another day is ignored, and the weekly hours are intact.
  assert.equal(
    effectiveCloseTime({ business_hours: HOURS, early_close: { date: '2026-10-19', close_time: '17:00' } }, MONDAY_NOON),
    '21:00'
  );
  // A closed day, and the closing_time fallback when the day has no hours.
  assert.equal(effectiveCloseTime({ business_hours: { monday: { closed: true } } }, MONDAY_NOON), null);
  assert.equal(effectiveCloseTime({ closing_time: '22:30' }, MONDAY_NOON), '22:30');
  assert.equal(effectiveCloseTime({}, MONDAY_NOON), '20:00');
});

test('the store state reads the one pinned record, not a scan', async () => {
  const f = fakeBase44({});
  await getMenuSettingRecord(f.client);
  assert.deepEqual(f.asked, [MENU_SETTING_ID]);
});

test('the unified state carries delivery, notice and ordering in one shape', async () => {
  const f = fakeBase44({
    ordering_enabled: false,
    ordering_closed_message: 'Kitchen is swamped tonight',
    delivery_enabled: false,
    delivery_fee: 4.5,
    delivery_tiers: [{ max_miles: 5, fee: 1.99 }, { max_miles: 3, fee: 0.99 }],
    site_notice: { active: true, message: 'Delivery paused today', level: 'urgent' },
  });
  const state = await getUnifiedStoreState(f.client);

  assert.equal(state.orderingEnabled, false);
  assert.equal(state.orderingClosedMessage, 'Kitchen is swamped tonight');
  assert.equal(state.open, false);
  assert.equal(state.statusMessage, 'Kitchen is swamped tonight');
  assert.equal(state.deliveryEnabled, false);
  assert.equal(state.flatDeliveryFee, 4.5);
  assert.deepEqual(state.deliveryTiers, [{ max_miles: 3, fee: 0.99 }, { max_miles: 5, fee: 1.99 }]);
  assert.equal(state.maxMiles, 5);
  assert.deepEqual(state.activeNotice, { active: true, message: 'Delivery paused today', level: 'urgent' });
});

test('an empty or switched-off notice reads as inactive', async () => {
  const off = await getUnifiedStoreState(fakeBase44({ site_notice: { active: true, message: '   ' } }).client);
  assert.equal(off.activeNotice.active, false);
  const none = await getUnifiedStoreState(fakeBase44({}).client);
  assert.equal(none.activeNotice.active, false);
  assert.equal(none.orderingEnabled, true);
});

test('ordering off closes the phone with the owner\'s own words', async () => {
  const f = fakeBase44({ ordering_enabled: false, ordering_closed_message: 'Closed for a private event' });
  assert.deepEqual(await getPhoneStoreStatus(f.client), { open: false, message: 'Closed for a private event' });
  // With no message typed, the standard sentence is used.
  const bare = fakeBase44({ ordering_enabled: false });
  assert.equal((await getPhoneStoreStatus(bare.client)).message, 'Ordering is temporarily closed');
});

test('a full-day closure beats everything and speaks the closure reason', async () => {
  const f = fakeBase44({
    ordering_enabled: true,
    closure: { active: true, start_date: '2020-01-01', end_date: '2030-01-01', message: 'closed for maintenance' },
  });
  assert.deepEqual(await getPhoneStoreStatus(f.client), { open: false, message: 'closed for maintenance' });
});

test('the 24/7 override opens the phone line', async () => {
  const f = fakeBase44({ open_all_day_date: chicagoTodayKey() });
  const status = await getPhoneStoreStatus(f.client);
  assert.equal(status.open, true);
});