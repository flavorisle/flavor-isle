import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { ChevronDown, ChevronUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';

const SECTIONS = [
  { value: 'shops', label: 'Shops & Stops' },
  { value: 'surrounding', label: 'Surrounding Area' },
  { value: 'flavor', label: 'Local Flavor' },
  { value: 'attractions', label: 'Attractions' },
];

const TILES = [
  { value: 'photo', label: 'Photo' },
  { value: 'mono', label: 'Navy tile' },
  { value: 'monoRed', label: 'Red tile' },
  { value: 'stripe', label: 'Stripe tile' },
];

// Swatch shown in the list when a row has no outside photo.
const TILE_SWATCH = {
  photo: 'bg-[#F5E9D2]',
  mono: 'bg-[#003366]',
  monoRed: 'bg-[#CC3300]',
  stripe: 'bg-[repeating-linear-gradient(135deg,#003366,#003366_4px,#0a3d70_4px,#0a3d70_8px)]',
};

const EMPTY = {
  name: '',
  section: 'shops',
  tag: '',
  copy: '',
  detail: '',
  photo_url: '',
  photo_alt: '',
  interior_photo_url: '',
  interior_photo_alt: '',
  interior_caption: '',
  tile: 'photo',
  address: '',
  maps_query: '',
  instagram: '',
  hours: '',
  phone: '',
  website: '',
  cta_label: '',
  cta_to: '',
  link_label: '',
  link_to: '',
  distance: '',
  anchor_id: '',
  amenities: [],
  sort_order: '',
  is_active: true,
};

function toForm(rec) {
  return {
    name: rec.name || '',
    section: rec.section || 'shops',
    tag: rec.tag || '',
    copy: rec.copy || '',
    detail: rec.detail || '',
    photo_url: rec.photo_url || '',
    photo_alt: rec.photo_alt || '',
    interior_photo_url: rec.interior_photo_url || '',
    interior_photo_alt: rec.interior_photo_alt || '',
    interior_caption: rec.interior_caption || '',
    tile: rec.tile || 'photo',
    address: rec.address || '',
    maps_query: rec.maps_query || '',
    instagram: Array.isArray(rec.instagram) ? rec.instagram.join(', ') : '',
    hours: rec.hours || '',
    phone: rec.phone || '',
    website: rec.website || '',
    cta_label: rec.cta_label || '',
    cta_to: rec.cta_to || '',
    link_label: rec.link_label || '',
    link_to: rec.link_to || '',
    distance: rec.distance || '',
    anchor_id: rec.anchor_id || '',
    amenities: Array.isArray(rec.amenities) ? rec.amenities : [],
    sort_order: rec.sort_order === undefined || rec.sort_order === null ? '' : String(rec.sort_order),
    is_active: rec.is_active !== false,
  };
}

const sectionLabel = (value) => SECTIONS.find((s) => s.value === value)?.label || value;

// One photo slot: upload, direct URL, alt text, and a caption when the slot has one.
function PhotoField({ title, urlKey, altKey, captionKey, form, setField, onUpload, uploading }) {
  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <Label className="block">{title}</Label>
      <div className="flex items-start gap-3">
        {form[urlKey] ? (
          <img src={form[urlKey]} alt="" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <Input type="file" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0], urlKey, e.target)} />
          {uploading === urlKey && <p className="text-xs text-muted-foreground">Uploading…</p>}
          <Input value={form[urlKey]} onChange={(e) => setField(urlKey, e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <Input
        value={form[altKey]}
        onChange={(e) => setField(altKey, e.target.value)}
        placeholder="Photo description (alt text)"
      />
      {captionKey && (
        <Input
          value={form[captionKey]}
          onChange={(e) => setField(captionKey, e.target.value)}
          placeholder="Caption shown under the photo"
        />
      )}
    </div>
  );
}

// Admin → Explore Shops. Curates /explore-smiths-grove: which shops and stops
// appear in each section, in what order, and what their pop-up panel says.
export default function AdminExploreShops() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  // Amenities are a plain list of strings on the record: ticking a box adds its
  // name once, unticking removes it.
  const toggleAmenity = (name, checked) => setForm((current) => ({
    ...current,
    amenities: checked
      ? [...new Set([...current.amenities, name])]
      : current.amenities.filter((a) => a !== name),
  }));

  const load = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.ExploreShop.list({ sort: 'sort_order', limit: 200 });
      setRecords(page.items || []);
    } catch (err) {
      toast({ title: 'Could not load shops', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY, sort_order: String(records.length) });
    setFormOpen(true);
  };

  const startEdit = (rec) => {
    setEditingId(rec.id);
    setForm(toForm(rec));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const upload = async (file, field, input) => {
    if (!file) return;
    setUploading(field);
    try {
      const up = await base44.integrations.Core.UploadPublicFile({ file });
      setField(field, up.file_url);
      toast({ title: 'Photo uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message });
    } finally {
      setUploading('');
      if (input) input.value = '';
    }
  };

  const valid = form.name.trim().length > 0 && !!form.section;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      // Walk fields (lat, lng, walk_steps, walk_polyline) are seeded directly on
      // the records, so they are never sent from this form and never overwritten.
      const payload = {
        name: form.name.trim(),
        section: form.section,
        tag: form.tag.trim(),
        copy: form.copy.trim(),
        detail: form.detail.trim(),
        photo_url: form.photo_url.trim(),
        photo_alt: form.photo_alt.trim(),
        interior_photo_url: form.interior_photo_url.trim(),
        interior_photo_alt: form.interior_photo_alt.trim(),
        interior_caption: form.interior_caption.trim(),
        tile: form.tile,
        address: form.address.trim(),
        maps_query: form.maps_query.trim(),
        instagram: form.instagram
          .split(',')
          .map((handle) => handle.trim().replace(/^@/, ''))
          .filter(Boolean),
        hours: form.hours.trim(),
        phone: form.phone.trim(),
        website: form.website.trim(),
        cta_label: form.cta_label.trim(),
        cta_to: form.cta_to.trim(),
        link_label: form.link_label.trim(),
        link_to: form.link_to.trim(),
        distance: form.distance.trim(),
        anchor_id: form.anchor_id.trim(),
        amenities: form.amenities,
        sort_order: form.sort_order === '' ? records.length : Number(form.sort_order),
        is_active: form.is_active,
      };

      if (editingId) {
        await base44.entities.ExploreShop.update(editingId, payload);
        toast({ title: 'Shop saved' });
      } else {
        await base44.entities.ExploreShop.create(payload);
        toast({ title: 'Shop added' });
      }
      closeForm();
      await load();
    } catch (err) {
      toast({ title: 'Could not save', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rec, value) => {
    try {
      await base44.entities.ExploreShop.update(rec.id, { is_active: value });
      await load();
    } catch (err) {
      toast({ title: 'Could not update', description: err.message });
    }
  };

  // Swap sort_order with the neighbouring row and persist both.
  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= records.length) return;
    const current = records[index];
    const neighbour = records[target];
    let currentOrder = Number.isFinite(current.sort_order) ? current.sort_order : index;
    let neighbourOrder = Number.isFinite(neighbour.sort_order) ? neighbour.sort_order : target;
    if (currentOrder === neighbourOrder) {
      currentOrder = index;
      neighbourOrder = target;
    }
    try {
      await base44.entities.ExploreShop.update(current.id, { sort_order: neighbourOrder });
      await base44.entities.ExploreShop.update(neighbour.id, { sort_order: currentOrder });
      await load();
    } catch (err) {
      toast({ title: 'Could not reorder', description: err.message });
    }
  };

  const remove = async (rec) => {
    if (!window.confirm(`Delete “${rec.name}”? This cannot be undone.`)) return;
    try {
      await base44.entities.ExploreShop.delete(rec.id);
      toast({ title: 'Shop deleted' });
      await load();
    } catch (err) {
      toast({ title: 'Could not delete', description: err.message });
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <AdminNav />

      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">ADMINISTRATION</p>
            <h1 className="font-heading text-4xl text-white mt-2">Explore Shops</h1>
            <p className="text-gray-300 mt-3 max-w-2xl">
              Everything listed on the Explore Smiths Grove page. Edit a card, add a new stop, or hide one without deleting it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/explore-smiths-grove"
              className="inline-flex items-center gap-2 text-sm font-heading text-white/80 hover:text-white"
            >
              <ExternalLink size={15} /> View page
            </Link>
            <Button className="btn-cherry" onClick={startAdd}>
              <Plus size={15} className="mr-2" /> Add shop
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {formOpen && (
          <div className="card-diner p-6 sm:p-8 space-y-4">
            <h2 className="font-heading text-xl text-obsidian-roast">{editingId ? 'Edit shop' : 'Add shop'}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Name *</Label>
                <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="The Foxhole" />
              </div>
              <div>
                <Label className="mb-1.5 block">Section *</Label>
                <select
                  value={form.section}
                  onChange={(e) => setField('section', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {SECTIONS.map((section) => (
                    <option key={section.value} value={section.value}>{section.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Tag</Label>
                <Input value={form.tag} onChange={(e) => setField('tag', e.target.value)} placeholder="Antiques" />
              </div>
              <div>
                <Label className="mb-1.5 block">Card tile</Label>
                <select
                  value={form.tile}
                  onChange={(e) => setField('tile', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {TILES.map((tile) => (
                    <option key={tile.value} value={tile.value}>{tile.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Card copy</Label>
              <Textarea
                value={form.copy}
                maxLength={400}
                rows={2}
                onChange={(e) => setField('copy', e.target.value)}
                placeholder="MCM/Vintage finds & sly designs."
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{form.copy.length}/400</p>
            </div>

            <div>
              <Label className="mb-1.5 block">Panel detail</Label>
              <Textarea
                value={form.detail}
                maxLength={1200}
                rows={4}
                onChange={(e) => setField('detail', e.target.value)}
                placeholder="The fuller story shown in the pop-up. Falls back to the card copy when blank."
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{form.detail.length}/1200</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhotoField
                title="Outside photo"
                urlKey="photo_url"
                altKey="photo_alt"
                form={form}
                setField={setField}
                onUpload={upload}
                uploading={uploading}
              />
              <PhotoField
                title="Inside photo"
                urlKey="interior_photo_url"
                altKey="interior_photo_alt"
                captionKey="interior_caption"
                form={form}
                setField={setField}
                onUpload={upload}
                uploading={uploading}
              />
            </div>

            <div className="rounded-xl border border-border p-3 space-y-2">
              <Label className="block">Amenities</Label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--midnight-cherry)]"
                  checked={form.amenities.includes('Restroom')}
                  onChange={(e) => toggleAmenity('Restroom', e.target.checked)}
                />
                <span className="text-sm text-obsidian-roast">Restroom</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Address</Label>
                <Input value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="105 Main Street" />
              </div>
              <div>
                <Label className="mb-1.5 block">Maps query</Label>
                <Input value={form.maps_query} onChange={(e) => setField('maps_query', e.target.value)} placeholder="https://www.google.com/maps/search/?api=1&query=…" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Instagram handles</Label>
                <Input value={form.instagram} onChange={(e) => setField('instagram', e.target.value)} placeholder="foxholeinthegrove, smallsonmain" />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated, without the @.</p>
              </div>
              <div>
                <Label className="mb-1.5 block">Hours</Label>
                <Input value={form.hours} onChange={(e) => setField('hours', e.target.value)} placeholder="Tue–Sat 10–5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Phone</Label>
                <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="(270) 555-0123" />
              </div>
              <div>
                <Label className="mb-1.5 block">Website</Label>
                <Input value={form.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://…" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">CTA label</Label>
                <Input value={form.cta_label} onChange={(e) => setField('cta_label', e.target.value)} placeholder="Order online" />
              </div>
              <div>
                <Label className="mb-1.5 block">CTA link</Label>
                <Input value={form.cta_to} onChange={(e) => setField('cta_to', e.target.value)} placeholder="/menu" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Link label</Label>
                <Input value={form.link_label} onChange={(e) => setField('link_label', e.target.value)} placeholder="Exit 38 guide" />
              </div>
              <div>
                <Label className="mb-1.5 block">Link</Label>
                <Input value={form.link_to} onChange={(e) => setField('link_to', e.target.value)} placeholder="/i65-exit-38" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Distance</Label>
                <Input value={form.distance} onChange={(e) => setField('distance', e.target.value)} placeholder="15 min south on I-65" />
              </div>
              <div>
                <Label className="mb-1.5 block">Anchor id</Label>
                <Input value={form.anchor_id} onChange={(e) => setField('anchor_id', e.target.value)} placeholder="bucees" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <Label className="mb-1.5 block">Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setField('sort_order', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-3 pb-2">
                <Switch checked={form.is_active} onCheckedChange={(value) => setField('is_active', value)} />
                <Label className="mb-0">Show on page</Label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="btn-cherry" onClick={save} disabled={!valid || saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add shop'}
              </Button>
              <Button variant="outline" onClick={closeForm} disabled={saving}>Cancel</Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length > 0 ? (
          <div className="card-diner p-6 sm:p-8">
            <h2 className="font-heading text-xl text-obsidian-roast mb-4">Shops &amp; stops</h2>
            <div>
              {records.map((rec, index) => (
                <div key={rec.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0 flex-wrap sm:flex-nowrap">
                  {rec.photo_url ? (
                    <img src={rec.photo_url} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className={`w-14 h-14 rounded-lg flex-shrink-0 ${TILE_SWATCH[rec.tile] || TILE_SWATCH.photo}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-obsidian-roast truncate">{rec.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {sectionLabel(rec.section)}
                      {rec.tag ? ` · ${rec.tag}` : ''}
                      {rec.address ? ` · ${rec.address}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">Show on page</span>
                    <Switch checked={rec.is_active !== false} onCheckedChange={(value) => toggleActive(rec, value)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${rec.name} up`}
                    >
                      <ChevronUp size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => move(index, 1)}
                      disabled={index === records.length - 1}
                      aria-label={`Move ${rec.name} down`}
                    >
                      <ChevronDown size={16} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startEdit(rec)}>
                      <Pencil size={14} className="mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(rec)}>
                      <Trash2 size={14} className="mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card-diner p-10 text-center">
            <p className="text-muted-foreground mb-4">No shops yet. Add the first one.</p>
            <Button className="btn-cherry" onClick={startAdd}>
              <Plus size={15} className="mr-2" /> Add shop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}