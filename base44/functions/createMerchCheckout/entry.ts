import Stripe from "npm:stripe@14.25.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { fetchStoreProducts, getShippingRates } from "../../shared/printful.ts";

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    const origin = req.headers.get("origin") || "https://flavor-isle.com";
    const orderNumber = "MERCH-" + Date.now().toString().slice(-6);

    const lineItems = pricedItems.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          ...(item.image ? { images: [item.image] } : {}),
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Embedded checkout — the Stripe form renders inside our merch checkout
    // page (iframe) instead of redirecting the customer away to a hosted page.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      ui_mode: "embedded",
      customer_email: customer.email,
      return_url: `${origin}/merch-confirmation?session_id={CHECKOUT_SESSION_ID}&order_number=${orderNumber}`,
      metadata: {
        order_number: orderNumber,
        order_type: "merch",
        customer_name: customer.name,
      },
    });

    const address = customer.address || {};
    try {
      await base44.asServiceRole.entities.MerchOrder.create({
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
        stripe_session_id: session.id,
        payment_status: "pending",
        fulfillment_status: "pending",
      });
    } catch (dbError) {
      console.error("MerchOrder save error (non-fatal):", dbError.message);
    }

    return Response.json({
      client_secret: session.client_secret,
      publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
      session_id: session.id,
      order_number: orderNumber,
    });
  } catch (error) {
    console.error("Merch checkout error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}