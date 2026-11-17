import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { readAllRecords } from '@/lib/readAll';
import { MODIFIER_PHOTOS, canonicalModifierName, getModifierPhoto } from '@/lib/modifierPhotos';
import { Upload, Trash2, ImageOff, ArrowLeft } from 'lucide-react';

// Admin → Modifier photos (issue #324).
//
// Every modifier option name the menu uses, grouped by its Square group name.
// A photo saved here lands on MenuSetting.modifier_photos as
// { "OPTION NAME": { "url": "...", "alt": "..." } } — the public menu merges
// that map over the built-in photos, so a new photo shows with no build.
// Clearing a built-in photo writes an empty url, which the menu reads as
// "no photo".
const BUILT_IN_KEYS = new Set(Object.keys(MODIFIER_PHOTOS).map(canonicalModifierName));

function hasBuiltInPhoto(name) {
  const key = canonicalModifierName(name);
  if (BUILT_IN_KEYS.has(key)) return true;
  return key.endsWith('S') ? BUILT_IN_KEYS.has(key.slice(0, -1)) : BUILT_IN_KEYS.has(`${key}S`);
}

export default function AdminModifierPhotos() {
  const [items, setItems] = useState([]);
  const [settingId, setSettingId] = useState(null);
  const [photos, setPhotos] = useState({});
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [menuItems, settingPage] = await Promise.all([
          readAllRecords((options) => base44.entities.MenuItem.list(options)),
          base44.entities.MenuSetting.list({ sort: '-updated_date', limit: 1 }),
        ]);
        if (cancelled) return;
        const record = settingPage?.items?.[0] || null;
        setItems(menuItems);
        setSettingId(record?.id || null);
        setPhotos(record?.modifier_photos && typeof record.modifier_photos === 'object' ? record.modifier_photos : {});
      } catch (err) {
        if (!cancelled) toast({ title: 'Could not load', description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Every distinct option name the menu carries, grouped by group name.
  const groups = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      for (const group of item.modifiers || []) {
        const groupName = String(group.name || '').trim() || 'Other';
        if (!map.has(groupName)) map.set(groupName, new Set());
        for (const mod of group.modifiers || []) {
          const name = String(mod.name || '').trim();
          if (name) map.get(groupName).add(name);
        }
      }
    }
    return [...map.entries()]
      .map(([name, names]) => ({ name, options: [...names].sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const persist = async (next) => {
    if (!settingId) {
      toast({ title: 'No store settings record found', description: 'Reload the page and try again.' });
      return;
    }
    setPhotos(next);
    setSaving(true);
    try {
      await base44.entities.MenuSetting.update(settingId, { modifier_photos: next });
    } catch (err) {
      toast({ title: 'Could not save that photo', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const savedUrl = (name) => {
    const saved = photos[name];
    if (saved && typeof saved === 'object') return saved.url || '';
    return getModifierPhoto(name)?.url || '';
  };

  const saveUrl = (name, rawUrl) => {
    const url = String(rawUrl || '').trim();
    if (url && !/^https?:\/\//i.test(url)) {
      toast({ title: 'That is not a photo address', description: 'Paste a full https:// link.' });
      return;
    }
    if (!url) return;
    persist({ ...photos, [name]: { url, alt: photos[name]?.alt || name } });
  };

  const upload = async (name, file) => {
    if (!file) return;
    setBusy(name);
    try {
      const up = await base44.integrations.Core.UploadPublicFile({ file });
      if (up?.file_url) {
        await persist({ ...photos, [name]: { url: up.file_url, alt: photos[name]?.alt || name } });
      }
    } catch (err) {
      toast({ title: 'Could not upload that photo', description: err.message });
    } finally {
      setBusy('');
    }
  };

  // Clearing a built-in photo needs an explicit empty entry; one saved in
  // admin is simply removed.
  const clear = (name) => {
    const next = { ...photos };
    if (hasBuiltInPhoto(name)) next[name] = { url: '', alt: '' };
    else delete next[name];
    persist(next);
  };

  const q = search.trim().toLowerCase();
  const visibleGroups = q
    ? groups
      .map((group) => ({ ...group, options: group.options.filter((n) => n.toLowerCase().includes(q)) }))
      .filter((group) => group.options.length > 0)
    : groups;
  const totalOptions = groups.reduce((sum, group) => sum + group.options.length, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <AdminNav />
      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">ADMINISTRATION</p>
          <h1 className="font-heading text-4xl text-white mt-2">Modifier photos</h1>
          <p className="text-gray-300 mt-3 max-w-2xl">
            A real photo in every sauce, topping and flavor button. Most come built in — add or replace any of them
            here, and the menu picks it up on the next page load.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="card-diner p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/admin/menu" className="inline-flex items-center gap-1.5 text-sm font-heading text-patina-mint hover:underline">
              <ArrowLeft size={15} /> Back to Menu Manager
            </Link>
            <span className="text-xs text-muted-foreground">
              {groups.length} groups · {totalOptions} options
            </span>
            {saving && <span className="text-xs text-patina-mint font-heading">Saving…</span>}
          </div>
          <input
            type="text"
            placeholder="Search options…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm mt-4 px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
          />
          <p className="text-xs text-muted-foreground mt-3">
            Photos are stored publicly so the menu can show them (anyone with the link can open them). Chocolate,
            Hot Fudge, Caramel, Butterscotch and Peanut Butter are meant to stay words, so they ship without a photo.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : visibleGroups.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            {groups.length === 0 ? 'No modifier options found. Sync from Square to pull them in.' : 'No options match that search.'}
          </p>
        ) : (
          <div className="space-y-5">
            {visibleGroups.map((group) => (
              <div key={group.name} className="card-diner p-5 sm:p-6">
                <h2 className="font-heading text-lg text-obsidian-roast mb-3">{group.name}</h2>
                <div className="divide-y divide-border">
                  {group.options.map((name) => {
                    const url = savedUrl(name);
                    const rowKey = `${group.name}::${name}`;
                    return (
                      <div key={rowKey} className="py-3 flex flex-wrap items-center gap-3">
                        {url ? (
                          <img
                            src={url}
                            alt={photos[name]?.alt || name}
                            width={44}
                            height={44}
                            loading="lazy"
                            className="w-11 h-11 rounded-lg object-cover border border-border flex-shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0" title="No photo">
                            <ImageOff size={16} className="text-muted-foreground" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="font-body text-sm font-semibold text-obsidian-roast break-words">{name}</p>
                          <p className="text-[11px] text-muted-foreground">{url ? 'Photo set' : 'No photo'}</p>
                        </div>

                        <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border text-xs font-heading cursor-pointer hover:bg-muted transition-colors ${busy === name ? 'opacity-60' : ''}`}>
                          <Upload size={13} />
                          {busy === name ? 'Uploading…' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={busy === name}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              upload(name, file);
                            }}
                          />
                        </label>

                        <Input
                          value={drafts[rowKey] ?? (photos[name]?.url || '')}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [rowKey]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            saveUrl(name, e.target.value);
                            setDrafts((prev) => { const next = { ...prev }; delete next[rowKey]; return next; });
                          }}
                          onBlur={(e) => {
                            if (drafts[rowKey] === undefined) return;
                            saveUrl(name, e.target.value);
                            setDrafts((prev) => { const next = { ...prev }; delete next[rowKey]; return next; });
                          }}
                          placeholder="Paste a photo URL"
                          className="w-full sm:w-64 text-xs"
                        />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => clear(name)}
                          disabled={!url && !photos[name]}
                          title={`Clear photo for ${name}`}
                        >
                          <Trash2 size={13} className="mr-1" /> Clear
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}