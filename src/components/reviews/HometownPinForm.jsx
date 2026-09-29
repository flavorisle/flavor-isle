import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { geocodeHometown } from './geocodeHometown';

export default function HometownPinForm({ onAdded }) {
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!city.trim() || !region.trim() || saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const place = await geocodeHometown(city, region);
      const pin = await base44.entities.VisitorHometown.create(place);
      onAdded(pin);
      setSuccess(`${place.city}, ${place.region} is on the map!`);
      setCity('');
      setRegion('');
    } catch (err) {
      setError(err.message || 'Could not add your pin. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
      <label className="block text-sm font-semibold text-obsidian-roast">Your city
        <input required maxLength={80} autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Bowling Green" className="mt-1 block w-full min-h-12 rounded-xl border border-border bg-card px-4 text-foreground" />
      </label>
      <label className="block text-sm font-semibold text-obsidian-roast">State, province or country
        <input required maxLength={80} autoComplete="address-level1" value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. Kentucky" className="mt-1 block w-full min-h-12 rounded-xl border border-border bg-card px-4 text-foreground" />
      </label>
      <button type="submit" disabled={saving} className="btn-cherry min-h-12 px-6 disabled:opacity-60">{saving ? 'Adding pin…' : 'Add my pin'}</button>
      {(error || success) && <p role="status" className={`text-sm sm:col-span-3 ${error ? 'text-destructive' : 'text-obsidian-roast'}`}>{error || success}</p>}
    </form>
  );
}