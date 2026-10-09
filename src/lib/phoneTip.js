// Tip presets for the phone-order payment page — the same "smart tipping" the
// web checkout uses: percentage presets normally, flat dollars on tiny orders
// (where even the biggest percentage tip stays under $1). These numbers are for
// display only; the charged amount is always priced server-side from the saved
// order.

export function tipPresetsFor(subtotal) {
  const amount = Number(subtotal) || 0;
  if (amount * 0.20 < 1) {
    return [
      { key: '1', label: '$1', amount: 1 },
      { key: '2', label: '$2', amount: 2 },
      { key: '3', label: '$3', amount: 3 },
    ];
  }
  return [
    { key: '15', label: '15%', amount: +(amount * 0.15).toFixed(2) },
    { key: '18', label: '18%', amount: +(amount * 0.18).toFixed(2) },
    { key: '20', label: '20%', amount: +(amount * 0.20).toFixed(2) },
  ];
}

export function defaultTipPreset(subtotal) {
  return (Number(subtotal) || 0) * 0.20 < 1 ? '2' : '18';
}

export function tipAmountFor(presetKey, presets, customTip) {
  if (presetKey === 'custom') return Math.max(0, parseFloat(customTip) || 0);
  if (presetKey === '0') return 0;
  return presets.find((p) => p.key === presetKey)?.amount ?? 0;
}