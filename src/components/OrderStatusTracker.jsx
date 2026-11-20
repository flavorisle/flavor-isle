import React from 'react';
import StageRail from '@/components/ui/StageRail';
import TicketCard from '@/components/ui/TicketCard';
import AppDroppingSoonBanner from './AppDroppingSoonBanner';

// The three stages a customer watches, presented as a kitchen ticket (issue
// #339). The order's own status is still the single source of truth — this only
// maps it onto the rail, so nothing about how an order moves has changed.
const STAGES = [
  { key: 'placed', label: 'Placed' },
  { key: 'grill', label: 'On the grill' },
  { key: 'ready', label: 'Ready' },
];

// pending → Placed; the crew has the ticket and is cooking → On the grill;
// bagged and waiting (or already collected) → Ready.
function railStage(status) {
  if (status === 'pending') return 'placed';
  if (status === 'confirmed' || status === 'preparing') return 'grill';
  return 'ready';
}

export default function OrderStatusTracker({ order }) {
  if (order.status === 'cancelled') {
    return (
      <div className="mt-3 px-4 py-3 bg-red-50 rounded-2xl text-sm text-red-600 font-semibold text-center">
        This order was cancelled
      </div>
    );
  }

  return (
    <TicketCard className="mt-4">
      <StageRail stages={STAGES} current={railStage(order.status)} />
      {order.status === 'preparing' && <AppDroppingSoonBanner />}
    </TicketCard>
  );
}