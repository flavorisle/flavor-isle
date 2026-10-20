import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Upload, Star } from 'lucide-react';

// Admin -> Employee of the Month. One crew member is featured on the public
// About page at a time. Saving a new or edited record demotes every other
// featured record, so is_featured is always held by exactly one. Past featured
// employees are listed below and can be re-featured in one tap.
export default function AdminEmployeeOfMonth() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', quote: '', month_label: '', photo_url: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.EmployeeOfTheMonth.list({ sort: '-created_date', limit: 50 });
      const items = page.items || [];
      setRecords(items);
      const featured = items.find((r) => r.is_featured) || items[0];
      if (featured) {
        setEditingId(featured.id);
        setForm({
          name: featured.name || '',
          role: featured.role || '',
          quote: featured.quote || '',
          month_label: featured.month_label || '',
          photo_url: featured.photo_url || '',
        });
      }
    } catch (err) {
      toast({ title: 'Could not load', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onFile = (e) => setPhotoFile(e.target.files?.[0] || null);

  const demoteOthers = async (keepId) => {
    const others = records.filter((r) => r.is_featured && r.id !== keepId);
    if (!others.length) return;
    await base44.entities.EmployeeOfTheMonth.updateMany(
      { id: { $in: others.map((r) => r.id) } },
      { $set: { is_featured: false } },
    );
  };

  const save = async () => {
    if (!form.name || !form.role || !form.quote) {
      toast({ title: 'Name, role, and quote are required' });
      return;
    }
    setSaving(true);
    try {
      let photo_url = form.photo_url;
      if (photoFile) {
        const up = await base44.integrations.Core.UploadPublicFile({ file: photoFile });
        photo_url = up.file_url;
      }
      await demoteOthers(editingId);
      if (editingId) {
        await base44.entities.EmployeeOfTheMonth.update(editingId, { ...form, photo_url, is_featured: true });
      } else {
        const created = await base44.entities.EmployeeOfTheMonth.create({ ...form, photo_url, is_featured: true });
        setEditingId(created.id);
      }
      setPhotoFile(null);
      toast({ title: 'Employee of the Month saved' });
      await load();
    } catch (err) {
      toast({ title: 'Could not save', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const feature = async (rec) => {
    setSaving(true);
    try {
      await demoteOthers(rec.id);
      await base44.entities.EmployeeOfTheMonth.update(rec.id, { is_featured: true });
      toast({ title: `${rec.name} is now featured` });
      await load();
    } catch (err) {
      toast({ title: 'Could not feature', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const startNew = () => {
    setEditingId(null);
    setForm({ name: '', role: '', quote: '', month_label: '', photo_url: '' });
    setPhotoFile(null);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <AdminNav />
      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">ADMINISTRATION</p>
          <h1 className="font-heading text-4xl text-white mt-2">Employee of the Month</h1>
          <p className="text-gray-300 mt-3 max-w-2xl">Choose the crew member featured on the public About page. Only one is featured at a time.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="card-diner p-6 sm:p-8 space-y-4">
          <h2 className="font-heading text-xl text-obsidian-roast">{editingId ? 'Edit Featured Employee' : 'New Featured Employee'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
            </div>
            <div>
              <Label className="mb-1.5 block">Role</Label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Grill Cook" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Month Label</Label>
            <Input value={form.month_label} onChange={(e) => setForm({ ...form, month_label: e.target.value })} placeholder="October 2026" />
          </div>
          <div>
            <Label className="mb-1.5 block">Quote</Label>
            <Textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder="A short line from the team member" rows={3} />
          </div>
          <div>
            <Label className="mb-1.5 block">Photo</Label>
            {form.photo_url ? (
              <img src={form.photo_url} alt="Current featured employee" className="w-32 h-40 object-cover rounded-xl mb-3" />
            ) : null}
            <Input type="file" accept="image/*" onChange={onFile} />
            {photoFile && <p className="text-xs text-muted-foreground mt-1">New photo selected — uploaded on save (stored publicly — anyone with the link can open them).</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="btn-cherry" onClick={save} disabled={saving}>
              <Upload size={15} className="mr-2" /> {saving ? 'Saving…' : editingId ? 'Update Featured' : 'Save & Feature'}
            </Button>
            <Button variant="outline" onClick={startNew}>Start New</Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length > 0 ? (
          <div className="card-diner p-6 sm:p-8">
            <h2 className="font-heading text-xl text-obsidian-roast mb-4">All Featured Employees</h2>
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                  {r.photo_url ? (
                    <img src={r.photo_url} alt={r.name} className="w-14 h-14 object-cover rounded-lg" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-obsidian-roast">
                      {r.name} {r.is_featured && <span className="text-xs text-midnight-cherry">★ Featured</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.role} · {r.month_label}</p>
                  </div>
                  {!r.is_featured && (
                    <Button size="sm" variant="outline" onClick={() => feature(r)} disabled={saving}>
                      <Star size={14} className="mr-1" /> Feature
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}