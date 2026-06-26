import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    // List children of /Flavor Isle/Flavor-Isle
    const folderPath = encodeURIComponent('Flavor Isle/Flavor-Isle');
    const data = await graphRequest(accessToken, `/me/drive/root:/${folderPath}:/children?$top=100`);

    const files = (data.value || []).map(f => ({
      id: f.id,
      name: f.name,
      type: f.folder ? 'folder' : 'file',
      size: f.size,
      mimeType: f.file?.mimeType,
      downloadUrl: f['@microsoft.graph.downloadUrl'],
      webUrl: f.webUrl,
      lastModified: f.lastModifiedDateTime,
    }));

    return Response.json({ files });
  } catch (error) {
    console.error('getOneDriveFiles error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});