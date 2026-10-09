import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { geocodeHometown } from './geocodeHometown';

export default function HometownPinForm({ onAdded }) {
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const photoInput = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!city.trim() || !region.trim() || !name.trim() || saving) return;
    if (photo && (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 5 * 1024 * 1024)) {
      setError('Choose a JPG, PNG or WebP photo under 5 MB.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const place = await geocodeHometown(city, region);
      const { file_url } = photo ? await base44.integrations.Core.UploadPublicFile({ file: photo }) : {};
      const pin = await base44.entities.VisitorHometown.create({ ...place, visitor_name: name.trim(), ...(file_url ? { photo_url: file_url } : {}) });
      onAdded(pin);
      setSuccess(`${place.city}, ${place.region} is on the map!`);
      setCity('');
      setRegion('');
      setName('');
      setPhoto(null);
      if (photoInput.current) photoInput.current.value = '';
    } catch (err) {
      setError(err.message || 'Could not add your pin. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 items-end">
      <label className="block text-sm font-semibold text-obsidian-roast">Your name
        <input required maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" className="mt-1 block w-full min-h-12 rounded-xl border border-border bg-card px-4 text-foreground" />
      </label>
      <label className="block text-sm font-semibold text-obsidian-roast">Your city
        <input required maxLength={80} autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Bowling Green" className="mt-1 block w-full min-h-12 rounded-xl border border-border bg-card px-4 text-foreground" />
      </label>
      <label className="block text-sm font-semibold text-obsidian-roast">State, province or country
        <input required maxLength={80} autoComplete="address-level1" value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. Kentucky" className="mt-1 block w-full min-h-12 rounded-xl border border-border bg-card px-4 text-foreground" />
      </label>
      <label className="block text-sm font-semibold text-obsidian-roast">Photo (optional)
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] || null)} className="mt-1 block w-full min-h-12 rounded-xl border border-border bg-card px-3 py-2 text-foreground file:mr-3 file:border-0 file:bg-transparent file:font-semibold" />
      </label>
      <p className="text-xs text-muted-foreground sm:col-span-2">Your name and photo will appear on the public map. Photos are public and can be opened by anyone with the link. JPG, PNG or WebP, up to 5 MB.</p>
      <button type="submit" disabled={saving} className="btn-cherry min-h-12 px-6 disabled:opacity-60 sm:justify-self-start">{saving ? 'Adding pin…' : 'Add my pin'}</button>
      {(error || success) && <p role={error ? 'alert' : 'status'} className={`text-sm sm:col-span-2 ${error ? 'text-destructive' : 'text-obsidian-roast'}`}>{error || success}</p>}
    </form>
  );
}