// Store-open checks.
//
// The real logic now lives in base44/shared/storeState.ts so the website, the
// phone line, and the admin mirror all read one set of switches. These are the
// existing exported entry points, kept for their callers.

import { getUnifiedStoreState } from './storeState.ts';
export { getPhysicalStoreStatus } from './storeState.ts';

// Online-ordering status: closure, the 24/7 override, business hours, ordering
// on/off, and today's early close. Returns { open, message }.
export async function getStoreStatus(base44) {
  try {
    const state = await getUnifiedStoreState(base44);
    return { open: state.open, message: state.statusMessage || '' };
  } catch (e) {
    console.error('getStoreStatus failed:', e.message);
    return { open: true, message: '' };
  }
}

// The admin closure, evaluated against today. Returns { closed, message }.
export async function getStoreClosure(base44) {
  try {
    const state = await getUnifiedStoreState(base44);
    return {
      closed: state.closure.active,
      message: state.closure.active ? state.closure.message : '',
    };
  } catch (e) {
    console.error('getStoreClosure failed:', e.message);
    return { closed: false, message: '' };
  }
}