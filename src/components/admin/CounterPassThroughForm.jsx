import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus } from 'lucide-react';

// Add a number to the counter pass-through list. Calls from these numbers skip
// Smashie entirely and ring the counter phone during open hours.
export default function CounterPassThroughForm({ onAdded }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim() || !phone.trim()) {
      toast({ title: 'Add a name and a phone number', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.CounterPassThrough.create({
        name: name.trim(),
        phone: phone.trim(),
        note: note.trim(),
        is_active: true,
      });
      onAdded(created);
      setName(''); setPhone(''); setNote('');
      toast({ title: 'Added to pass-through', description: 'Their calls ring the counter instead of Smashie while we are open.' });
    } catch (error) {
      toast({ title: 'Could not save the number', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-4 sm:p-5 shadow-float">
      <h3 className="font-heading text-lg text-obsidian-roast mb-3">Send a number straight to the counter</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="passthrough-name" className="text-xs">Who is this?</Label>
          <Input id="passthrough-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Wesley" />
        </div>
        <div>
          <Label htmlFor="passthrough-phone" className="text-xs">Phone number</Label>
          <Input id="passthrough-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(270) 555-1234" />
        </div>
        <div>
          <Label htmlFor="passthrough-note" className="text-xs">Note (optional)</Label>
          <Input id="passthrough-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rings the counter line" />
        </div>
      </div>
      <Button onClick={add} disabled={saving} className="mt-4 btn-mint tap-44">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        <span className="ml-2">Add to pass-through</span>
      </Button>
    </div>
  );
}