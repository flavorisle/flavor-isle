// Reads every record of an entity read, following the cursor until there are
// no more pages. A read without options silently stops at one page, so anything
// that genuinely needs the whole table (broadcasts, catalog comparisons) pages
// through it instead of losing records beyond the first page.
//
// `fetchPage(options)` must be the entity read itself, e.g.
//   readAllRecords((options) => base44.asServiceRole.entities.MenuItem.list(options))
export async function readAllRecords(fetchPage, pageSize = 500) {
  const all = [];
  let cursor = null;
  for (;;) {
    const page = await fetchPage(cursor ? { limit: pageSize, cursor } : { limit: pageSize });
    // Older SDK responses come back as a plain array with no cursor to follow.
    if (Array.isArray(page)) {
      all.push(...page);
      break;
    }
    all.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return all;
}