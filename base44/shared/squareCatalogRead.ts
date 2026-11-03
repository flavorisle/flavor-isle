// Shared, read-only Square catalog transport. Every page is read before returning.
const SQUARE_VERSION = '2026-09-16';

export async function squareCatalogFetch(accessToken, path) {
  const response = await fetch(`https://connect.squareup.com/v2${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': SQUARE_VERSION },
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Square catalog request failed: ${JSON.stringify(data.errors)}`);
  return data;
}

export async function fetchAllCatalog(accessToken, types) {
  const objects = [];
  let cursor;
  do {
    const data = await squareCatalogFetch(accessToken,
      `/catalog/list?types=${encodeURIComponent(types)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    objects.push(...(data.objects || []));
    cursor = data.cursor;
  } while (cursor);
  return objects;
}