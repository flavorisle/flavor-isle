// Issue #277 Part A — the Square POS sync run lock.
//
// Two overlapping runs used to be able to see the same Square order as new and
// each write an Order row. A run now takes a SyncLease before it touches
// anything; a run that finds a live lease leaves the data alone and reports
// skipped: 'locked'.
//
// The lease is 15 minutes so a crashed run can never jam the schedule: once
// expires_at has passed the lease is dead, the next run clears the row and
// carries on. The lease is always released in a finally block, so a clean run
// never waits for the clock.
export const SYNC_LEASE_MINUTES = 15;

const LEASE_MS = SYNC_LEASE_MINUTES * 60 * 1000;

function expiryMs(lease: any): number {
  const t = new Date(lease?.expires_at || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

// Oldest acquisition wins when two runs create a lease in the same instant; the
// id breaks an exact tie so both runs agree on the same winner.
function olderFirst(a: any, b: any): number {
  const diff = new Date(a?.acquired_at || 0).getTime() - new Date(b?.acquired_at || 0).getTime();
  if (diff !== 0) return diff;
  return String(a?.id || '').localeCompare(String(b?.id || ''));
}

export async function releaseSyncLock(base44: any, leaseId: string): Promise<void> {
  if (!base44 || !leaseId) return;
  try {
    await base44.asServiceRole.entities.SyncLease.delete(leaseId);
  } catch (error) {
    // A lease that cannot be deleted simply expires; it must never fail a run.
    console.error('Square sync lease release failed:', (error as Error)?.message || error);
  }
}

export async function acquireSyncLock(
  base44: any,
  holder: string,
): Promise<{ acquired: boolean; reason?: string; leaseId?: string; expiresAt?: string }> {
  const entity = base44.asServiceRole.entities.SyncLease;
  const now = Date.now();

  const registered = (await entity.list()) || [];

  // Clear dead leases first so a crashed run's row can never hold the schedule.
  for (const lease of registered) {
    if (expiryMs(lease) <= now) {
      try {
        await entity.delete(lease.id);
      } catch (error) {
        console.error('Square sync stale lease cleanup failed:', (error as Error)?.message || error);
      }
    }
  }

  const live = registered.filter((lease: any) => expiryMs(lease) > now);
  if (live.length > 0) {
    return { acquired: false, reason: 'locked' };
  }

  const acquiredAt = new Date(now).toISOString();
  const expiresAt = new Date(now + LEASE_MS).toISOString();
  const mine = await entity.create({
    holder,
    acquired_at: acquiredAt,
    expires_at: expiresAt,
    status: 'active',
  });

  // Re-read: when two runs create a lease at the same moment, exactly one keeps
  // it and the other backs off without touching data.
  const after = ((await entity.list()) || []).filter((lease: any) => expiryMs(lease) > Date.now());
  const winner = after.slice().sort(olderFirst)[0];
  if (winner && winner.id !== mine?.id) {
    await releaseSyncLock(base44, mine?.id);
    return { acquired: false, reason: 'locked' };
  }

  return { acquired: true, leaseId: mine?.id, expiresAt };
}