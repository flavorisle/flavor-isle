import React from 'react';
import { Check, Clock, ChefHat, PackageCheck, Bike, Utensils } from 'lucide-react';
import AppDroppingSoonBanner from './AppDroppingSoonBanner';

const PICKUP_STEPS = [
  { key: 'pending',   label: 'Order Received',  icon: Clock },
  { key: 'confirmed', label: 'Confirmed',        icon: Check },
  { key: 'preparing', label: 'Being Prepared',   icon: ChefHat },
  { key: 'ready',     label: 'Ready for Pickup', icon: PackageCheck },
  { key: 'completed', label: 'Completed',        icon: Check },
];

const DELIVERY_STEPS = [
  { key: 'pending',   label: 'Order Received', icon: Clock },
  { key: 'confirmed', label: 'Confirmed',      icon: Check },
  { key: 'preparing', label: 'Preparing',      icon: ChefHat },
  { key: 'ready',     label: 'Out for Delivery', icon: Bike },
  { key: 'completed', label: 'Delivered',      icon: Check },
];

const DINE_IN_STEPS = [
  { key: 'pending',   label: 'Order Received', icon: Clock },
  { key: 'confirmed', label: 'Confirmed',      icon: Check },
  { key: 'preparing', label: 'Being Prepared', icon: ChefHat },
  { key: 'ready',     label: 'Table Ready',    icon: Utensils },
  { key: 'completed', label: 'Completed',      icon: Check },
];

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

export default function OrderStatusTracker({ order }) {
  const steps = order.order_type === 'delivery' ? DELIVERY_STEPS
    : order.order_type === 'dine_in' ? DINE_IN_STEPS
    : PICKUP_STEPS;

  const currentIndex = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="mt-3 px-4 py-3 bg-red-50 rounded-2xl text-sm text-red-600 font-semibold text-center">
        This order was cancelled
      </div>
    );
  }

  return (
    <div className="mt-4 px-1">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200 rounded z-0" />
        <div
          className="absolute top-5 left-5 h-1 bg-midnight-cherry rounded z-0 transition-all duration-500"
          style={{ width: `calc(${(currentIndex / (steps.length - 1)) * 100}% - 0px)` }}
        />

        {steps.map((step, i) => {
          const Icon = step.icon;
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                done ? 'bg-midnight-cherry border-midnight-cherry text-white'
                : active ? 'bg-white border-midnight-cherry text-midnight-cherry shadow-float animate-pulse'
                : 'bg-white border-gray-300 text-gray-400'
              }`}>
                <Icon size={16} />
              </div>
              <span className={`text-xs text-center font-semibold leading-tight max-w-[60px] ${
                active ? 'text-midnight-cherry' : done ? 'text-obsidian-roast' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {order.status === 'preparing' && <AppDroppingSoonBanner />}
    </div>
  );
}