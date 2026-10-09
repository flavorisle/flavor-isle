import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { optimizeItemImage } from '../../shared/optimizeItemImage.ts';

// One-time (and safe to re-run) backfill from issue #33, phase 2.
//
// For every MenuItem that has a Square image_url but no image_url_opt yet:
// download the Square original, resize to at most 800px on the longest edge
// (never upscaled), convert to WebP q80, upload the copy to the app's public
// media library and store that URL in image_url_opt.
//
// image_url is NEVER modified — Square sync owns it and the originals stay in
// place. A failure on one item is logged and skipped; the run continues.
//
// The same run also refreshes the snapshot fields that copied a menu photo URL
// (DailySpecial.menu_item_image, Favorite.menu_item_image) to the optimized
// copy, so historic rows stop pointing at the heavy Square originals.
//
// A run processes a batch (default 20) and reports how many items are still
// pending, so a large catalog is swept by calling it again — each batch stays
// inside the function time limit and re-running is always safe.
// ?limit=N (or { "limit": N }) overrides the batch size.

export default async function (req) {
  const base44 = createClientFromRequest(req);

  // Soft admin gate: scheduled/service invocations have no user session.
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }
  } catch (_e) {}

  const DEFAULT_BATCH = 20;
  let requested = Number(new URL(req.url).searchParams.get('limit') || 0);
  if (!requested) {
    try {
      const body = await req.clone().json();
      requested = Number(body?.limit || 0);
    } catch (_e) {}
  }
  const batchSize = requested > 0 ? requested : DEFAULT_BATCH;

  const items = await base44.asServiceRole.entities.MenuItem.list();
  const pending = items.filter((i) => i.image_url && !i.image_url_opt);
  const batch = pending.slice(0, batchSize);

  const optimizedByOriginal = new Map();
  const failures = [];
  let optimized = 0;

  for (const item of items) {
    if (item.image_url && item.image_url_opt) optimizedByOriginal.set(item.image_url, item.image_url_opt);
  }

  for (const item of batch) {
    try {
      const optimizedUrl = await optimizeItemImage(
        base44,
        item.image_url,
        `menu-item-${item.square_item_id || item.name || item.id}`,
      );
      if (!optimizedUrl) throw new Error('no optimized url returned');
      await base44.asServiceRole.entities.MenuItem.update(item.id, { image_url_opt: optimizedUrl });
      optimizedByOriginal.set(item.image_url, optimizedUrl);
      optimized += 1;
    } catch (e) {
      // Leave image_url_opt empty so the item keeps rendering the Square
      // original, and record it for a later retry.
      failures.push({ id: item.id, name: item.name, error: e.message });
      console.error(`optimizeMenuImages: item ${item.id} (${item.name}) failed — ${e.message}`);
    }
  }

  // Snapshot fields that copied a menu photo URL get the optimized copy.
  let specialsUpdated = 0;
  let favoritesUpdated = 0;
  try {
    const specials = await base44.asServiceRole.entities.DailySpecial.list();
    for (const special of specials) {
      const optimizedUrl = optimizedByOriginal.get(special.menu_item_image);
      if (optimizedUrl && optimizedUrl !== special.menu_item_image) {
        await base44.asServiceRole.entities.DailySpecial.update(special.id, { menu_item_image: optimizedUrl });
        specialsUpdated += 1;
      }
    }
  } catch (e) {
    console.error('optimizeMenuImages: DailySpecial snapshot refresh failed:', e.message);
  }
  try {
    const favorites = await base44.asServiceRole.entities.Favorite.list();
    for (const favorite of favorites) {
      const optimizedUrl = optimizedByOriginal.get(favorite.menu_item_image);
      if (optimizedUrl && optimizedUrl !== favorite.menu_item_image) {
        await base44.asServiceRole.entities.Favorite.update(favorite.id, { menu_item_image: optimizedUrl });
        favoritesUpdated += 1;
      }
    }
  } catch (e) {
    console.error('optimizeMenuImages: Favorite snapshot refresh failed:', e.message);
  }

  const remaining = pending.length - optimized;

  console.log(
    `optimizeMenuImages: ${optimized} optimized, ${failures.length} failed, ${remaining} still pending; snapshots: ${specialsUpdated} specials, ${favoritesUpdated} favorites`,
  );

  return Response.json({
    total_items: items.length,
    pending_before: pending.length,
    optimized,
    failed: failures.length,
    remaining_pending: remaining,
    daily_specials_updated: specialsUpdated,
    favorites_updated: favoritesUpdated,
    failures: failures.slice(0, 25),
  });
}