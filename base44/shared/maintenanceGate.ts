// Shared authorization + throttle for the app's maintenance and sync endpoints
// (nightly sweeps, Square syncs, menu-image re-encoding, the Live-call watchdog).
//
// Why this is not a plain "admin only" check: these functions are driven by
// platform workflows, and a workflow step can only pass literal args — it cannot
// present a secret. A caller from the scheduler therefore arrives with no user
// identity and no way to prove itself, so a hard credential gate would silently
// break every schedule. What every caller IS held to instead:
//
//   1. A signed-in caller must be an admin. A caller presenting the app relay key
//      (our own server code, or the crew running one by hand with the key) is
//      trusted. Anyone else is treated as an unauthenticated scheduled run — and
//      is then throttled, never trusted with the work itself.
//   2. One run slot per clock-aligned cadence window (persisted in
//      MaintenanceRun). A call inside a window that already ran does no work, so
//      an anonymous caller cannot loop a heavy sweep to burn Square quota,
//      re-encode the whole menu, or churn records. Because windows are aligned to
//      the clock, the next scheduled window is never starved by earlier abuse.
//
// Endpoints with no schedule behind them (manual backfills, owner-only actions)
// do not need the throttle at all: `maintenanceCaller` alone refuses anonymous
// callers there.
import { isInternalCaller } from './internalRelay.ts';

export async function maintenanceCaller(base44: any, req: Request, body: any) {
  if (isInternalCaller(req, body)) {
    return { ok: true, kind: 'internal' as const, error: null };
  }
  const user = await base44.auth.me().catch(() => null);
  if (user && user.role !== 'admin') {
    return {
      ok: false,
      kind: 'denied' as const,
      error: Response.json({ error: 'Admin access required' }, { status: 403 }),
    };
  }
  return { ok: true, kind: user ? ('admin' as const) : ('scheduled' as const), error: null };
}

// Claim this function's slot in the current cadence window. Returns false when a
// run has already happened in this window.
async function claimWindow(base44: any, functionName: string, windowMs: number, caller: string): Promise<boolean> {
  const windowKey = String(Math.floor(Date.now() / windowMs));
  const rows = await base44.asServiceRole.entities.MaintenanceRun.filter({ function_name: functionName });
  const row = rows?.[0];
  if (row?.window_key === windowKey) return false;
  const now = new Date().toISOString();
  if (row) {
    await base44.asServiceRole.entities.MaintenanceRun.update(row.id, {
      window_key: windowKey,
      last_run_at: now,
      run_count: (row.run_count || 0) + 1,
      last_caller: caller,
    });
  } else {
    await base44.asServiceRole.entities.MaintenanceRun.create({
      function_name: functionName,
      window_key: windowKey,
      last_run_at: now,
      run_count: 1,
      last_caller: caller,
    });
  }
  return true;
}

// Full gate for a scheduled maintenance endpoint: authorize the caller, then hold
// the unauthenticated (scheduled) path to one run per window.
export async function maintenanceGate(
  base44: any,
  req: Request,
  body: any,
  opts: { functionName: string; windowMs: number },
) {
  const caller = await maintenanceCaller(base44, req, body);
  if (!caller.ok) return { ok: false as const, error: caller.error, caller: caller.kind };

  // Trusted callers (admin or relay-key holders) run on demand: a manual re-run
  // is exactly what the crew needs after an interrupted sweep.
  if (caller.kind !== 'scheduled') return { ok: true as const, error: null, caller: caller.kind };

  const claimed = await claimWindow(base44, opts.functionName, opts.windowMs, caller.kind);
  if (!claimed) {
    return {
      ok: false as const,
      caller: caller.kind,
      error: Response.json(
        { error: 'This maintenance run already completed for the current window. It runs again on its normal schedule.' },
        { status: 429 },
      ),
    };
  }
  return { ok: true as const, error: null, caller: caller.kind };
}