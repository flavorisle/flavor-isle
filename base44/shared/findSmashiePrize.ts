// Find Smashie — the milkshake prize (issue #108), in one place.
//
// A player who finds Smashie and picks the free milkshake holds a win for that
// store-local day. Three callers need to ask the same question about it:
//   * getMySmashiePrize  — does the signed-in player hold today's unused shake?
//   * fulfillSmashiePrize — mark it used once an order carries it.
//   * createHelcimWebCheckout — take it off the order the customer is placing.
// Keeping the day window and the "which line counts as a shake" rule here means
// the prize endpoint, the fulfiller and checkout can never disagree about what
// the prize is worth or when it is still good.
const TZ = 'America/Chicago';

/** Today's date (YYYY-MM-DD) in store-local time. */
export function storeToday(): string {
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Today's unfulfilled milkshake win for one player, or null.
 *
 * The win record's own owner fields belong to the service account (a win is
 * written on the player's behalf), so the player is identified by
 * winner_user_id — the same field the monthly win limit uses.
 */
export async function todaysMilkshakePrize(base44: any, userId: string | undefined) {
  if (!userId) return null;
  try {
    const wins = await base44.asServiceRole.entities.FindSmashieWinner
      .filter({ game_date: storeToday(), winner_user_id: userId });
    return (wins || []).find((w: any) => w?.prize_choice === 'milkshake' && !w?.prize_fulfilled) || null;
  } catch (error) {
    // A prize lookup that cannot run must never break checkout: the caller gets
    // no prize, which is a smaller failure than refusing a paying customer.
    console.error('todaysMilkshakePrize failed:', (error as Error).message);
    return null;
  }
}

// The shake categories: "Whirl & Twirl" holds the made-to-order shakes and malts,
// "Blend & Bliss" the specialty Bliss shakes. Both are shakes the winner can pick
// on the Milkshakes page, so both qualify for the free one.
export const SHAKE_CATEGORIES = ['Whirl & Twirl', 'Blend & Bliss'];

/**
 * Is this order line a milkshake? Used with the line's authoritative MenuItem, so
 * the answer comes from the catalog rather than from the client. A build-your-own
 * shake counts even when it carries no catalog id.
 */
export function isSmashieShake(menuItem: any, line: any): boolean {
  if (line?.isBuildShake === true) return true;
  return SHAKE_CATEGORIES.includes(String(menuItem?.square_category || ''));
}