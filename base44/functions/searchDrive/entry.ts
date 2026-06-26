import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');
    const body = await req.json();
    const query = body.query || 'Webfolder';

    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=20&$select=id,name,folder,file,parentReference,size,lastModifiedDateTime,webUrl`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();

    const items = (data.value || []).map(f => ({
      id: f.id,
      name: f.name,
      type: f.folder ? 'folder' : 'file',
      parentPath: f.parentReference?.path,
      size: f.size,
      lastModified: f.lastModifiedDateTime,
      webUrl: f.webUrl,
    }));

    return Response.json({ items, count: items.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});