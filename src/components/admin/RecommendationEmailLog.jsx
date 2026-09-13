import React, { useEffect, useState } from 'react';
import { Mail, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';

const TYPE_LABELS = {
  dessert: 'Dessert Upsell',
  similar_main: 'Similar Main',
  pairing: 'Side + Dessert Pairing',
};

export default function RecommendationEmailLog() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.RecommendationEmail.list('-sent_at', 25);
      setEmails(list || []);
    } catch (err) {
      console.error('Failed to load recommendation emails', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="card-diner p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-midnight-cherry" />
          <h3 className="font-heading text-lg text-obsidian-roast">Sent Emails</h3>
        </div>
        <button onClick={load} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin text-muted-foreground' : 'text-muted-foreground'} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : emails.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No recommendation emails sent yet.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {emails.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-body text-obsidian-roast truncate">{e.customer_email}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[e.email_type] || e.email_type || '—'}
                </p>
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                <p className="text-xs text-muted-foreground">
                  {e.sent_at ? moment(e.sent_at).format('MMM D, h:mm a') : '—'}
                </p>
                <p className="text-xs text-patina-mint font-heading truncate max-w-[140px]">
                  {e.order_id?.slice(-6) || ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}