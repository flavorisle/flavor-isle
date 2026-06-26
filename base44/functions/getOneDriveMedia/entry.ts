import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function graphRequest(accessToken, url) {
  const res = await fetch(url.startsWith('https://') ? url : `https://graph.microsoft.com/v1.0${url}`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'];

function isImage(item) {
  if (item.type === 'folder') return false;
  if (item.mimeType && IMAGE_MIMES.some(m => item.mimeType.includes(m.split('/')[1]))) return true;
  const lower = item.name.toLowerCase();
  return IMAGE_EXTS.some(ext => lower.endsWith(ext));
}

async function getChildrenFlat(accessToken, folderPath, depth = 0) {
  if (depth > 2) return []; // limit recursion
  try {
    const encoded = encodeURIComponent(folderPath);
    const data = await graphRequest(accessToken, `/me/drive/root:/${encoded}:/children?$top=200`);
    const items = data.value || [];

    let images = [];
    const subFolderPromises = [];

    for (const f of items) {
      const item = {
        id: f.id,
        name: f.name,
        type: f.folder ? 'folder' : 'file',
        mimeType: f.file?.mimeType,
        downloadUrl: f['@microsoft.graph.downloadUrl'],
        size: f.size,
        path: folderPath,
      };
      if (isImage(item)) {
        images.push(item);
      } else if (f.folder && depth < 2) {
        subFolderPromises.push(getChildrenFlat(accessToken, `${folderPath}/${f.name}`, depth + 1));
      }
    }

    const subResults = await Promise.all(subFolderPromises);
    for (const sub of subResults) images = images.concat(sub);

    return images;
  } catch (e) {
    console.warn(`Could not read ${folderPath}:`, e.message);
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    // Gather images from the key Flavor Isle folders
    const folders = [
      'Desktop/flavor isle/images for visit',
      'Desktop/flavor isle/emblems',
      'Desktop/flavor isle/Logo',
      'Desktop/flavor isle/Advertising',
      'Desktop/Graphics for flavor isle',
    ];

    const results = await Promise.all(folders.map(f => getChildrenFlat(accessToken, f)));
    const allImages = results.flat().filter(i => i.downloadUrl);

    return Response.json({ images: allImages, total: allImages.length });
  } catch (error) {
    console.error('getOneDriveMedia error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});