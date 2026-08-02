import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, Clock } from 'lucide-react';

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function liveLabel(pct) {
  if (pct < 70) return 'Live · quieter than usual';
  if (pct <= 125) return 'Live · about as busy as usual';
  if (pct <= 175) return 'Live · a little busier than usual';
  return 'Live · much busier than usual';
}

function hourLabel(h) {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

export default function PopularTimesCard({ embedded = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('getBusyness', {});
      setData(res.data || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const hour = data?.hour ?? new Date().getHours();
  const OPEN_HOUR = 10;   // 10a
  const CLOSE_HOUR = 21;  // 9p
  const chart = (data?.chart || []).filter(c => c.hour >= OPEN_HOUR && c.hour <= CLOSE_HOUR);
  const peak = Math.max(1, ...chart.map(c => c.avg));
  const hasData = !!(data && (data.peakAvg > 1 || data.liveCount > 0 || chart.some(c => c.avg > 0)));
  const busyPct = data?.busyPercent ?? 0;
  const weekday = data?.weekday ?? new Date().getDay();

  const Wrapper = embedded
    ? ({ children }) => <div className="w-full max-w-md mx-auto">{children}</div>
    : ({ children }) => (
        <section className="px-4 sm:px-6 py-8" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
          <div className="max-w-3xl mx-auto">{children}</div>
        </section>
      );

  return (
    <Wrapper>
      <div className="card-diner p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-midnight-cherry" />
              <h3 className="font-heading text-xl text-obsidian-roast">How busy are we?</h3>
            </div>
            {hasData && (
              <span className="inline-flex items-center gap-1.5 bg-midnight-cherry/10 text-midnight-cherry text-[11px] font-heading px-2.5 py-1 rounded-full whitespace-nowrap">
                <span className="w-1.5 h-1.5 bg-midnight-cherry rounded-full animate-pulse" />
                {liveLabel(busyPct)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            {hasData
              ? `Typical ${WEEKDAY_LABELS[weekday] || ''} traffic — the current hour is highlighted.`
              : 'We learn our busy times from every order, in-store and online.'}
          </p>

          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-10">
              <div className="w-4 h-4 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
              Checking how busy we are…
            </div>
          ) : !hasData ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-10">
              <Clock size={15} /> Gathering busyness data — check back soon.
            </div>
          ) : (
            <>
              <div className="flex items-end gap-[3px] sm:gap-1 h-28 mb-2">
                {chart.map((c) => {
                  const pctH = Math.max(4, Math.round((c.avg / peak) * 100));
                  const isNow = c.hour === hour;
                  return (
                    <div key={c.hour} className="flex-1 flex flex-col items-center justify-end h-full relative">
                      {isNow && (
                        <span className="absolute -top-4 text-[9px] font-heading text-midnight-cherry">Now</span>
                      )}
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{
                          height: pctH + '%',
                          backgroundColor: isNow ? 'var(--midnight-cherry)' : 'rgba(0,51,102,0.28)',
                          minHeight: 4,
                        }}
                        title={`${hourLabel(c.hour)} — avg ${c.avg} order${c.avg === 1 ? '' : 's'}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-[3px] sm:gap-1 text-[9px] text-muted-foreground">
                {chart.map((c) => (
                  <div key={c.hour} className="flex-1 text-center">
                    {(c.hour - OPEN_HOUR) % 2 === 0 ? hourLabel(c.hour) : ''}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-4 text-center">
                Bars show our typical orders by hour. Live status compares this hour to the usual.
              </p>
            </>
          )}
      </div>
    </Wrapper>
  );
}