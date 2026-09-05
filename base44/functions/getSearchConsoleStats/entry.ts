import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin-only: pulls Google Search Console performance for the connected site.
// Returns 28-day totals, a daily series, and the top queries + pages.
const API = 'https://www.googleapis.com/webmasters/v3';

const dayString = (daysAgo) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

async function query(token, siteUrl, body) {
  const res = await fetch(`${API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Search Console error: ${await res.text()}`);
  const data = await res.json();
  return data.rows || [];
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { site_url: requestedSite, days } = await req.json().catch(() => ({}));
    const range = days === 7 || days === 90 ? days : 28;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');

    // Resolve which property to report on.
    const sitesRes = await fetch(`${API}/sites`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!sitesRes.ok) throw new Error(`Search Console error: ${await sitesRes.text()}`);
    const sites = ((await sitesRes.json()).siteEntry || []).map((s) => s.siteUrl);
    const siteUrl = requestedSite || sites[0];
    if (!siteUrl) return Response.json({ sites: [], site_url: null, error: 'No Search Console properties found for this account.' });

    // Data lags ~2 days, so end the window there.
    const startDate = dayString(range + 2);
    const endDate = dayString(2);
    const base = { startDate, endDate, dataState: 'all' };

    const [daily, queries, pages] = await Promise.all([
      query(accessToken, siteUrl, { ...base, dimensions: ['date'], rowLimit: 100 }),
      query(accessToken, siteUrl, { ...base, dimensions: ['query'], rowLimit: 10 }),
      query(accessToken, siteUrl, { ...base, dimensions: ['page'], rowLimit: 10 }),
    ]);

    const totals = daily.reduce(
      (acc, r) => ({
        clicks: acc.clicks + (r.clicks || 0),
        impressions: acc.impressions + (r.impressions || 0),
        positionWeight: acc.positionWeight + (r.position || 0) * (r.impressions || 0),
      }),
      { clicks: 0, impressions: 0, positionWeight: 0 }
    );

    return Response.json({
      site_url: siteUrl,
      sites,
      range_days: range,
      start_date: startDate,
      end_date: endDate,
      totals: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
        avg_position: totals.impressions ? totals.positionWeight / totals.impressions : 0,
      },
      daily: daily.map((r) => ({
        date: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
      })),
      top_queries: queries.map((r) => ({
        query: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      })),
      top_pages: pages.map((r) => ({
        page: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}