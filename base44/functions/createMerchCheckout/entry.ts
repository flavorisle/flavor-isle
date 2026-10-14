import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { fetchStoreProducts, getShippingRates } from "../../shared/printful.ts";
import { helcimPayPageUrl } from "../../shared/helcimCheckout.ts";

// Our own secure page for this merch order — the page whose card form the customer
// pays in, so a link the crew shares lands on the order's own saved total.
const PAY_PAGE_ORIGIN = "https://flavor-isle.com";

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, customer, shipping, subtotal, total } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: "No items provided" }, { status: 400 });
    }
    if (!customer?.email || !customer?.name) {
      return Response.json({ error: "Customer name and email are required" }, { status: 400 });
    }

    // ── Server-side price authority ──
    // This endpoint used to charge exactly what the request said. Item prices
    // now come from Printful's own variant catalog and shipping from that
    // address's live rates, so a cart of one-cent line items cannot be checked
    // out; a request that disagrees with the catalog is refused rather than
    // quietly charged a different amount.
    const products = await fetchStoreProducts();
    const catalogPrices = new Map<string, number>();
    for (const product of products || []) {
      for (const variant of product?.variants || []) {
        if (variant?.id) catalogPrices.set(String(variant.id), Number(variant.price) || 0);
      }
    }

    const pricedItems: any[] = [];
    let catalogSubtotal = 0;
    for (const item of items) {
      const catalogPrice = catalogPrices.get(String(item.sync_variant_id ?? ""));
      if (catalogPrice == null) {
        return Response.json({ error: `${item.name || "An item"} is no longer available — please refresh your bag.` }, { status: 409 });
      }
      const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1));
      catalogSubtotal += catalogPrice * quantity;
      pricedItems.push({ ...item, price: catalogPrice, quantity });
    }
    catalogSubtotal = Math.round(catalogSubtotal * 100) / 100;

    if (Math.abs(catalogSubtotal - (Number(subtotal) || 0)) > 0.01) {
      return Response.json({ error: "Prices for one or more items have changed — please refresh your bag and try again." }, { status: 409 });
    }

    const rates = await getShippingRates({
      recipient: customer.address || {},
      items: pricedItems.map((i: any) => ({ variant_id: i.variant_id, quantity: i.quantity })),
    });
    const claimedShipping = Number(shipping) || 0;
    if (!rates.some((rate: any) => Math.abs(rate.cost - claimedShipping) <= 0.01)) {
      return Response.json({ error: "Shipping for that address has changed — please recalculate shipping and try again." }, { status: 409 });
    }
    const shippingCost = Math.round(claimedShipping * 100) / 100;
    const orderTotal = Math.round((catalogSubtotal + shippingCost) * 100) / 100;

    const orderNumber = "MERCH-" + Date.now().toString().slice(-6);
    const address = customer.address || {};

    // The record both payment paths save. Nothing is sent to production until a
    // payment has been verified, whichever path took it.
    const merchOrderRecord = {
      order_number: orderNumber,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || "",
      shipping_address: {
        name: customer.name,
        address1: address.address1 || "",
        address2: address.address2 || "",
        city: address.city || "",
        state_code: address.state_code || "",
        country_code: address.country_code || "US",
        zip: address.zip || "",
        phone: customer.phone || "",
        email: customer.email || "",
      },
      items: pricedItems.map((i: any) => ({
        name: i.name,
        variant_name: i.variantName || "",
        sku: i.sku || "",
        sync_variant_id: i.sync_variant_id,
        price: i.price,
        quantity: i.quantity,
        image: i.image || "",
      })),
      subtotal: catalogSubtotal,
      shipping: shippingCost,
      total: orderTotal,
      payment_status: "pending",
      fulfillment_status: "pending",
    };

    // ── Our own payment page ──
    // The order is saved with its verified catalog prices and live shipping rate,
    // and the card is then taken on our own payment page,
    // keyed to this order. Printful is only asked to produce the order once the
    // payment has been verified against this order's own total.
    let merchOrder = null;
    try {
      merchOrder = await base44.asServiceRole.entities.MerchOrder.create({
        ...merchOrderRecord,
        payment_provider: "helcim",
      });
    } catch (dbError) {
      console.error("MerchOrder save error:", dbError.message);
      return Response.json({ error: "Could not save your order. No charge was made — please try again." }, { status: 500 });
    }

    try {
      // The order's own secure page, kept on the record so the same link can be
      // shared with the customer and never points anywhere but this order.
      const payUrl = helcimPayPageUrl(PAY_PAGE_ORIGIN, orderNumber);
      await base44.asServiceRole.entities.MerchOrder.update(merchOrder.id, {
        payment_provider: "helcim",
        payment_url: payUrl,
      });
      return Response.json({
        provider: "helcim",
        order_number: orderNumber,
        payment_url: payUrl,
        total: orderTotal,
      });
    } catch (linkErr) {
      console.error("Merch card checkout setup failed:", linkErr.message);
      return Response.json({ error: "Could not open the secure payment page, so nothing was charged. Please try again." }, { status: 502 });
    }

  } catch (error) {
    console.error("Merch checkout error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}