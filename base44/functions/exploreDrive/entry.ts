import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';

async function graphRequest(accessToken, path) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');
    const body = await req.json().catch(() => ({}));
    const folderPath = body.path || '';

    let url;
    if (folderPath) {
      const encoded = encodeURIComponent(folderPath);
      url = `/me/drive/root:/${encoded}:/children?$top=200`;
    } else {
      url = `/me/drive/root/children?$top=200`;
    }

    const data = await graphRequest(accessToken, url);

    const items = (data.value || []).map(f => ({
      id: f.id,
      name: f.name,
      type: f.folder ? 'folder' : 'file',
      size: f.size,
      mimeType: f.file?.mimeType,
      downloadUrl: f['@microsoft.graph.downloadUrl'],
      webUrl: f.webUrl,
      lastModified: f.lastModifiedDateTime,
    }));

    return Response.json({ items });
  } catch (error) {
    console.error('exploreDrive error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});