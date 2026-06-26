import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, FolderOpen, Copy, Check, RefreshCw, Image } from 'lucide-react';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';

const FOLDER_LABELS = {
  'Desktop/flavor isle/images for visit': '📸 Photos',
  'Desktop/flavor isle/emblems': '🏷️ Emblems',
  'Desktop/flavor isle/Logo': '🎨 Logos',
  'Desktop/flavor isle/Advertising': '📢 Advertising',
  'Desktop/Graphics for flavor isle': '🖼️ Graphics',
};

export default function AdminMedia() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('all');
  const [copied, setCopied] = useState(null);
  const [folders, setFolders] = useState([]);

  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getOneDriveMedia', {});
      const imgs = res.data?.images || [];
      setImages(imgs);
      const uniqueFolders = [...new Set(imgs.map(i => i.path))];
      setFolders(uniqueFolders);
    } catch (e) {
      setError(e.message || 'Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedia(); }, []);

  const filtered = images.filter(img => {
    const matchSearch = !search || img.name.toLowerCase().includes(search.toLowerCase());
    const matchFolder = folderFilter === 'all' || img.path === folderFilter;
    return matchSearch && matchFolder;
  });

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-4xl text-obsidian-roast">OneDrive Media</h1>
            <p className="text-muted-foreground mt-1">Browse Flavor Isle images from OneDrive</p>
          </div>
          <button
            onClick={fetchMedia}
            className="btn-cherry chrome-hover px-5 py-2.5 text-sm flex items-center gap-2"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
          <select
            value={folderFilter}
            onChange={e => setFolderFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none"
          >
            <option value="all">All Folders ({images.length})</option>
            {folders.map(f => (
              <option key={f} value={f}>{FOLDER_LABELS[f] || f.split('/').pop()} ({images.filter(i => i.path === f).length})</option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
              <p className="text-muted-foreground text-sm">Loading your OneDrive images...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">
            <p className="font-heading">{error}</p>
            <button onClick={fetchMedia} className="mt-3 text-sm underline">Try again</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24 text-muted-foreground">
            <Image size={48} strokeWidth={1} className="mx-auto mb-4 opacity-40" />
            <p>No images found</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filtered.length} image{filtered.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(img => (
                <div key={img.id} className="group card-diner overflow-hidden">
                  <div className="relative h-36 bg-gray-100 overflow-hidden">
                    <img
                      src={img.downloadUrl}
                      alt={img.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleCopy(img.downloadUrl, img.id)}
                        className="bg-white text-obsidian-roast px-3 py-1.5 rounded-lg text-xs font-heading flex items-center gap-1"
                      >
                        {copied === img.id ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy URL</>}
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-heading text-obsidian-roast truncate" title={img.name}>{img.name}</p>
                    <p className="text-xs text-muted-foreground">{FOLDER_LABELS[img.path] || img.path.split('/').pop()}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}