import React, { useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import PayOrderSummary from '@/components/pay/PayOrderSummary';
import PayTipSelector from '@/components/pay/PayTipSelector';
import PayPageState from '@/components/pay/PayPageState';
import { defaultTipPreset, tipAmountFor, tipPresetsFor } from '@/lib/phoneTip';

const sampleOrder = {
  order_number: 'DEMO', order_type: 'pickup', subtotal: 14.5, tax: 0.87,
  delivery_fee: 0,
  items: [
    { name: 'Cheeseburger', quantity: 1, price: 9.5 },
    { name: 'Milkshake', quantity: 1, price: 5 },
  ],
};

export default function PayPhoneDemo() {
  const [preset, setPreset] = useState(defaultTipPreset(sampleOrder.subtotal));
  const [customTip, setCustomTip] = useState('');
  const [complete, setComplete] = useState(false);
  const presets = tipPresetsFor(sampleOrder.subtotal);
  const tip = tipAmountFor(preset, presets, customTip);
  const total = sampleOrder.subtotal + sampleOrder.tax + tip;

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="text-center">
          <p className="font-heading text-sm tracking-widest text-midnight-cherry">NO-CHARGE DEMO · NO REAL ORDER</p>
          <h1 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">PAY FOR YOUR ORDER</h1>
          <p className="text-sm text-muted-foreground">Flavor Isle · 103 N Main St, Smiths Grove</p>
        </div>
        {complete ? (
          <PayPageState Icon={CheckCircle2} tone="good" title="Demo checkout complete" body="This was only a preview. No card was charged and no order was placed." />
        ) : (
          <>
            <PayOrderSummary order={sampleOrder} tip={tip} />
            <PayTipSelector presets={presets} preset={preset} onPreset={setPreset} customTip={customTip} onCustomTip={setCustomTip} />
            <div className="card-diner p-5">
              <p className="text-sm text-muted-foreground mb-4">Card entry is unavailable in this no-charge demo. No payment information is collected.</p>
              <button type="button" onClick={() => setComplete(true)} className="btn-cherry w-full min-h-12 py-3 font-heading text-sm flex items-center justify-center gap-2">
                <Lock size={15} /> Preview checkout · ${total.toFixed(2)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}