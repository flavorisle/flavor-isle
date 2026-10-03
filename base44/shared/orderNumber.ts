export async function createOrderNumber(base44: any) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    const orderNumber = String(10_000_000 + (value[0] % 90_000_000));
    const matches = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber }, '-created_date', 1);
    if (!matches?.length) return orderNumber;
  }
  throw new Error('Could not generate a unique order number. Please try again.');
}
