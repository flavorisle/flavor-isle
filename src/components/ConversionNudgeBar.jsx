import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

export default function ConversionNudgeBar() {
  const [activeOrders, setActiveOrders] = useState(null);
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    base44.entities.Order.list('-created_date', 200)
      .then((data) => {
        const n = (data || []).filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
        setActiveOrders(n);
      })
      .catch(() => setActiveOrders(null));
  }, []);

  const messages = [
    activeOrders > 0
      ? `🔥 ${activeOrders} order${activeOrders !== 1 ? 's' : ''} on the grill right now`
      : null,
    '⭐ Earn points on your very first order → redeem for free food',
    '🚚 Pickup ready in 15–25 min · Delivery in 35–50 min',
    '❤️ Family-owned in Smiths Grove since 1964',
  ].filter(Boolean);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (messages.length <= 1) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 4200);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, activeOrders]);

  const msg = messages[index] || messages[0];

  return (
    <div className="bg-obsidian-roast text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center text-center">
        <span key={msg} className="text-xs sm:text-sm font-body tracking-wide truncate animate-float-up">
          {msg}
        </span>
      </div>
    </div>
  );
}