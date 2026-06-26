import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');
    const body = await req.json();
    const path = body.path || '';

    const encoded = encodeURIComponent(path);
    const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${encoded}:/children?$top=200&$select=id,name,folder,file,size`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    const data = await res.json();

    const files = (data.value || [])
      .filter(f => !f.folder)
      .map(f => f.name)
      .sort();

    const folders = (data.value || [])
      .filter(f => f.folder)
      .map(f => f.name)
      .sort();

    return Response.json({ files, folders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});