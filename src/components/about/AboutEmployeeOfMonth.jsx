import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Quote } from 'lucide-react';

// Employee of the Month — the one featured crew member the owner picked from
// Admin -> Employee of the Month. Reads the most recent is_featured record on a
// public page, so it renders nothing until the owner has featured someone (no
// broken empty state on the About page).
export default function AboutEmployeeOfMonth() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const page = await base44.entities.EmployeeOfTheMonth.filter(
          { is_featured: true },
          { sort: '-created_date', limit: 1 },
        );
        if (active) setEmployee((page.items || [])[0] || null);
      } catch (err) {
        // Public page: an anonymous visitor can hit a 401 before any record
        // exists — render nothing rather than a broken section.
        if (active) setEmployee(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading || !employee) return null;

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 py-16">
      <div className="text-center mb-10">
        <p className="font-heading text-sm uppercase tracking-widest text-midnight-cherry mb-2">Employee of the Month</p>
        <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">{employee.month_label || 'This Month'}</h2>
      </div>
      <div className="card-diner overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-0 items-stretch">
        {employee.photo_url ? (
          <div className="aspect-[4/5] md:aspect-auto md:min-h-[320px] bg-muted">
            <img
              src={employee.photo_url}
              alt={employee.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <Quote size={36} className="text-midnight-cherry/30 mb-4" />
          <p className="font-heading text-2xl sm:text-3xl text-obsidian-roast leading-snug mb-6">
            &ldquo;{employee.quote}&rdquo;
          </p>
          <div>
            <p className="font-heading text-xl text-midnight-cherry">{employee.name}</p>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">{employee.role}</p>
          </div>
        </div>
      </div>
    </section>
  );
}