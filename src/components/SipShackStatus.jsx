import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { sipShackStatus, sipShackHoursList } from '@/lib/sipShackHours';

const ROSE = '#d85573';
const ROSE_TEXT = '#8e3a4e';

export default function SipShackStatus() {
  const [status, setStatus] = useState(() => sipShackStatus());

  useEffect(() => {
    const id = setInterval(() => setStatus(sipShackStatus()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-3 mb-4">
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
        style={{ backgroundColor: status.isOpen ? '#27ae60' : '#ffffff', border: `1.5px solid ${status.isOpen ? '#27ae60' : ROSE}` }}
      >
        {status.isOpen && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
        <span
          className="font-heading text-xs uppercase tracking-widest"
          style={{ color: status.isOpen ? '#ffffff' : ROSE_TEXT }}
        >
          {status.isOpen
            ? `Available Now · until ${status.closesAt}`
            : `Not available until ${status.nextDay} ${status.nextOpensAt}`}
        </span>
      </div>

      <div className="w-full max-w-xs rounded-2xl px-4 py-3" style={{ backgroundColor: 'white', border: `1.5px solid ${ROSE}` }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock size={13} style={{ color: ROSE }} />
          <span className="font-heading text-xs uppercase tracking-widest" style={{ color: ROSE_TEXT }}>Available Hours</span>
        </div>
        <div className="space-y-1">
          {sipShackHoursList().map(h => (
            <div key={h.day} className="flex justify-between text-xs font-body" style={{ color: ROSE_TEXT }}>
              <span>{h.day}</span>
              <span className="font-semibold">{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}