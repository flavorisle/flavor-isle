import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Check, ExternalLink, Loader2, Images, UtensilsCrossed } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';
import { GALLERY_PHOTOS } from '@/lib/galleryPhotos';
import { optimizedImageUrl } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Ad-photo kit: only real Flavor Isle photos — the gallery collection and the
// live menu-item photos (Square catalog). Every row copies a public image link
// so an ad can be built from either set. Nothing generated, nothing stock.

const TABS = [
  { id: 'gallery', label: 'Gallery photos', Icon: Images },
  { id: 'items', label: 'Menu items', Icon: UtensilsCrossed },
];

function PhotoTile({ photo, copied, onCopy }) {
  const isCopied = copied === photo.url;
  return (
    <div className="card-diner overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-muted">
        <img
          src={optimizedImageUrl(photo.url, 480, 360)}
          alt={photo.alt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="font-heading text-sm text-obsidian-roast leading-tight">{photo.label}</p>
        {photo.category && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{photo.category}</p>
        )}
        <div className="mt-auto flex items-center gap-2">
          <button
            onClick={() => onCopy(photo.url)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-heading bg-patina-mint text-white hover:opacity-90 transition-opacity"
          >
            {isCopied ? <Check size={13} /> : <Copy size={13} />}
            {isCopied ? 'Copied' : 'Copy link'}
          </button>
          <a
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${photo.label}`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-muted text-obsidian-roast hover:bg-midnight-cherry hover:text-white transition-colors"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminAdPhotos() {
  const { toast } = useToast();
  const [tab, setTab] = useState('gallery');
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const page = await base44.entities.MenuItem.filter({}, { sort: 'name', limit: 400 });
        if (alive) setItems(page.items || []);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoadingItems(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const galleryPhotos = useMemo(
    () => GALLERY_PHOTOS.map((p) => ({
      url: p.url,
      alt: p.alt || p.caption || 'Flavor Isle photo',
      label: p.caption || p.alt || 'Flavor Isle photo',
      category: p.category,
    })),
    []
  );

  const itemPhotos = useMemo(
    () => items
      .filter((i) => i.image_url_opt || i.image_url)
      .map((i) => ({
        // The optimized copy is the ≤800px WebP — the size an ad wants.
        url: i.image_url_opt || i.image_url,
        alt: i.name,
        label: i.name,
        category: i.display_category || i.category,
      })),
    [items]
  );

  const photos = tab === 'gallery' ? galleryPhotos : itemPhotos;

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      toast({ title: 'Could not copy', description: 'Open the photo and copy its address instead.', variant: 'destructive' });
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(photos.map((p) => p.url).join('\n'));
      toast({ title: `${photos.length} links copied`, description: 'One link per line.' });
    } catch {
      toast({ title: 'Could not copy', description: 'Copy the links one at a time.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Navbar />
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
          <div>
            <h1 className="font-heading text-3xl text-obsidian-roast">Ad photos</h1>
            <p className="text-sm text-muted-foreground">
              Real Flavor Isle photography only: the gallery collection and the live menu-item photos. Copy a link
              into an ad, and nothing else is needed.
            </p>
          </div>
          <button
            onClick={copyAll}
            disabled={!photos.length}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading bg-midnight-cherry text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Copy size={13} /> Copy all {photos.length} links
          </button>
        </div>

        <div className="flex gap-2 mt-5 mb-6">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-heading transition-colors ${
                tab === id
                  ? 'bg-patina-mint text-white'
                  : 'bg-white text-obsidian-roast hover:bg-muted'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tab === 'items' && loadingItems ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="animate-spin" size={18} /> Loading menu photos…
          </div>
        ) : photos.length === 0 ? (
          <div className="card-diner p-10 text-center text-muted-foreground">
            No photos here yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <PhotoTile key={`${photo.url}-${photo.label}`} photo={photo} copied={copied} onCopy={copy} />
            ))}
          </div>
        )}
      </div>

      <CartDrawer />
    </div>
  );
}