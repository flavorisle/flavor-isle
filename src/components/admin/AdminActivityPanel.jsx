import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import { Users, Circle } from 'lucide-react';

// How recently an admin must have been on an admin screen to count as "on now".
const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const REFRESH_MS = 60 * 1000;

function timeAgo(value) {
  if (!value) return null;
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export default function AdminActivityPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const page = await base44.entities.AdminActivity.filter({}, { sort: '-last_seen_at', limit: 50 });
      setRows(page.items);
      setLoading(false);
    };
    load();
    const unsubscribe = base44.entities.AdminActivity.subscribe(() => load());
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
      <div className="card-diner p-6">
        <div className="flex items-center gap-2 mb-1">
          <Users size={20} className="text-midnight-cherry" />
          <h2 className="font-heading text-xl text-obsidian-roast">Admin Activity</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Who has been in, and what they are working on right now.</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading admin activity…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admin sign-ins recorded yet — history starts with the next admin login.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const online = row.last_seen_at && Date.now() - new Date(row.last_seen_at).getTime() < ONLINE_WINDOW_MS;
              const activity = row.last_view || 'No activity recorded';
              return (
                <div key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="min-w-[180px]">
                    <p className="font-heading text-obsidian-roast">{row.admin_name || row.admin_email}</p>
                    <p className="text-xs text-muted-foreground">{row.admin_email}</p>
                  </div>

                  <div className="flex items-center gap-2 min-w-[150px]">
                    <Circle
                      size={9}
                      className={online ? 'text-green-600 fill-green-600' : 'text-muted-foreground fill-muted-foreground'}
                    />
                    <span className="text-sm text-obsidian-roast">
                      {online ? 'On now' : `Last seen ${timeAgo(row.last_seen_at) || 'unknown'}`}
                    </span>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground mr-2">
                      {online ? 'Working on' : 'Was on'}
                    </span>
                    <span className="text-sm font-heading text-midnight-cherry">{activity}</span>
                  </div>

                  <div className="text-sm text-muted-foreground" title={row.last_login_at ? new Date(row.last_login_at).toLocaleString() : ''}>
                    Last login {timeAgo(row.last_login_at) || 'not recorded'}
                    {row.login_count ? ` · ${row.login_count} sign-in${row.login_count === 1 ? '' : 's'}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}