// Square PREPARED means ready; COMPLETED means handed off.
export function mapSquareFulfillmentStatus(order) {
  const state = order.fulfillments?.[0]?.state;
  if (order.state === 'CANCELED' || state === 'CANCELED') return 'cancelled';
  if (state === 'PREPARED') return 'ready';
  if (state === 'COMPLETED') return 'completed';
  if (order.state === 'COMPLETED') return 'completed';
  if (state === 'PROPOSED' || state === 'RESERVED' || order.state === 'OPEN') return 'confirmed';
  return null;
}

// Square can lag behind a staff update. Never move a tracked order backwards.
export function advanceOrderStatus(current, incoming) {
  if (!incoming || ['completed', 'delivered', 'cancelled'].includes(current)) return current;
  if (incoming === 'cancelled') return incoming;
  const stages = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
  return stages.indexOf(incoming) > stages.indexOf(current) ? incoming : current;
}