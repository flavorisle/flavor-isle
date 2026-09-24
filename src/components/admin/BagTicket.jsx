import React from 'react';
import { formatChicagoTime } from '@/lib/chicagoTime';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

// The platform stores dates as UTC instants without a timezone designator.
// Force UTC parsing so the instant is correct (mirrors chicagoTime.js).
function toUtcDate(iso) {
  if (!iso) return null;
  const s = String(iso);
  const hasTz = /[zZ]$/.test(s) || /[+-]\d\d:?\d\d$/.test(s);
  return hasTz ? new Date(s) : new Date(s + 'Z');
}

function readyTimeStr(order) {
  if (order.scheduled_for) {
    return formatChicagoTime(order.scheduled_for, { hour: 'numeric', minute: '2-digit' });
  }
  const created = toUtcDate(order.created_date);
  if (!created) return '—';
  const ready = new Date(created.getTime() + (order.estimated_time || 20) * 60000);
  return ready.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
}

// Customer-facing bag ticket for online orders. Designed for 80mm receipt /
// label printers as well as regular paper — 300px wide, high contrast, compact.
// Inline styles ensure the ticket renders correctly in the print portal
// regardless of Tailwind purging or theme overrides.
export default function BagTicket({ order }) {
  const items = order.items || [];
  const isCurbside = order.order_type === 'pickup' && order.pickup_method === 'curbside';
  const arrival = order.arrival_details || {};

  const pickupLabel =
    order.order_type === 'delivery' ? 'Delivery'
    : isCurbside ? 'Curbside'
    : order.order_type === 'dine_in' ? 'Dine-In'
    : 'Pickup';

  const carDesc = [arrival.car_color, arrival.car_make, arrival.car_model].filter(Boolean).join(' ');
  const isPaid = order.payment_status === 'paid';
  const placedTime = formatChicagoTime(order.created_date, { hour: 'numeric', minute: '2-digit' });
  const ready = readyTimeStr(order);

  return (
    <div className="bag-ticket" style={{
      width: '300px',
      margin: '0 auto',
      background: '#ffffff',
      color: '#000000',
      fontFamily: '"Nunito", Arial, sans-serif',
      padding: '10px',
      boxSizing: 'border-box',
    }}>
      {/* Header — logo + branding */}
      <div style={{ textAlign: 'center', borderBottom: '3px solid #000', paddingBottom: '6px', marginBottom: '8px' }}>
        <img src={LOGO} alt="Flavor Isle" style={{ width: '44px', height: '44px', borderRadius: '50%', margin: '0 auto 2px', display: 'block' }} />
        <div style={{ fontFamily: '"Bebas Neue", Arial, sans-serif', fontSize: '22px', letterSpacing: '2px', lineHeight: 1 }}>FLAVOR ISLE</div>
        <div style={{ fontSize: '8px', letterSpacing: '1px', color: '#666' }}>EST. 1964 &middot; BOWLING GREEN, KY</div>
      </div>

      {/* Order number — LARGE */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '1px', color: '#666', textTransform: 'uppercase' }}>Order Number</div>
        <div style={{ fontFamily: '"Bebas Neue", Arial, sans-serif', fontSize: '38px', lineHeight: 1.05, letterSpacing: '1px' }}>
          #{order.order_number || '—'}
        </div>
      </div>

      {/* Customer & fulfillment info */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '6px', fontSize: '12px', lineHeight: 1.5 }}>
        <div><strong>Name:</strong> {order.customer_name || '—'}</div>
        <div><strong>Pickup:</strong> {pickupLabel}</div>
        {isCurbside && carDesc && <div><strong>Vehicle:</strong> {carDesc}</div>}
        {isCurbside && arrival.zone && <div><strong>Zone:</strong> {arrival.zone}</div>}
        {order.order_type === 'dine_in' && order.table_number && <div><strong>Table:</strong> {order.table_number}</div>}
        <div><strong>Placed:</strong> {placedTime}</div>
        <div><strong>Ready:</strong> ~{ready}</div>
      </div>

      {/* Items */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '6px' }}>
        <div style={{ fontFamily: '"Bebas Neue", Arial, sans-serif', fontSize: '14px', letterSpacing: '1px', marginBottom: '3px' }}>ITEMS</div>
        {items.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#666' }}>No items</div>
        ) : items.map((item, i) => {
          const qty = item.quantity || 1;
          const mods = item.selectedModifiers || item.modifiers || [];
          const modNames = mods.map(m => m.name || m).filter(Boolean);
          return (
            <div key={i} style={{ marginBottom: '3px', fontSize: '12px' }}>
              <div style={{ fontWeight: 'bold' }}>{qty}&times; {item.name}</div>
              {modNames.length > 0 && (
                <div style={{ fontSize: '10px', paddingLeft: '10px', color: '#333' }}>
                  {modNames.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Special instructions — big and readable, boxed */}
      {order.special_instructions && (
        <div style={{ border: '2px solid #000', padding: '6px', marginBottom: '6px' }}>
          <div style={{ fontFamily: '"Bebas Neue", Arial, sans-serif', fontSize: '12px', letterSpacing: '1px' }}>SPECIAL INSTRUCTIONS</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>{order.special_instructions}</div>
        </div>
      )}

      {/* Payment status */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{
          display: 'inline-block',
          fontFamily: '"Bebas Neue", Arial, sans-serif',
          fontSize: '18px',
          letterSpacing: '2px',
          padding: '3px 14px',
          border: '2px solid #000',
          background: isPaid ? '#000' : '#fff',
          color: isPaid ? '#fff' : '#000',
        }}>
          {isPaid ? '\u2713 PAID' : 'PAY AT PICKUP'}
        </div>
      </div>

      {/* Thank you */}
      <div style={{ textAlign: 'center', fontSize: '11px', borderTop: '1px solid #ccc', paddingTop: '5px' }}>
        Thank you! See you soon
      </div>
    </div>
  );
}