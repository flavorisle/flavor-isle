import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus } from 'lucide-react';

// Add a phone number and/or a customer email to the block list. Whatever is
// filled in is what gets matched — a number blocks that caller, an email
// blocks that customer's account and online orders.
export default function BlockedContactForm({ onAdded }) {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!phone.trim() && !email.trim()) {
      toast({ title: 'Add a phone number or an email', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.BlockedContact.create({
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        customer_name: name.trim(),
        reason: reason.trim(),
        is_active: true,
      });
      onAdded(created);
      setPhone(''); setEmail(''); setName(''); setReason('');
      toast({ title: 'Blocked', description: 'They can no longer order by phone, text, chat, or online.' });
    } catch (error) {
      toast({ title: 'Could not save the block', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-4 sm:p-5 shadow-float">
      <h3 className="font-heading text-lg text-obsidian-roast mb-3">Block a number or customer</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="block-phone" className="text-xs">Phone number</Label>
          <Input id="block-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(270) 555-1234" />
        </div>
        <div>
          <Label htmlFor="block-email" className="text-xs">Email (optional)</Label>
          <Input id="block-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
        </div>
        <div>
          <Label htmlFor="block-name" className="text-xs">Who is this? (optional)</Label>
          <Input id="block-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sam K." />
        </div>
        <div>
          <Label htmlFor="block-reason" className="text-xs">Reason (optional)</Label>
          <Input id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Repeated prank calls" />
        </div>
      </div>
      <Button onClick={add} disabled={saving} className="mt-4 btn-cherry tap-44">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        <span className="ml-2">Block them</span>
      </Button>
    </div>
  );
}