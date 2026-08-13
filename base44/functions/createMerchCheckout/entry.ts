import Stripe from "npm:stripe@14.25.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    const origin = req.headers.get("origin") || "https://flavor-isle.com";
    const orderNumber = "MERCH-" + Date.now().toString().slice(-6);

    const lineItems = items.map((item: any) => ({
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

    if (shipping && shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: customer.email,
      success_url: `${origin}/merch-confirmation?session_id={CHECKOUT_SESSION_ID}&order_number=${orderNumber}`,
      cancel_url: `${origin}/merch-checkout`,
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
        items: items.map((i: any) => ({
          name: i.name,
          variant_name: i.variantName || "",
          sku: i.sku || "",
          sync_variant_id: i.sync_variant_id,
          price: i.price,
          quantity: i.quantity,
          image: i.image || "",
        })),
        subtotal,
        shipping: shipping || 0,
        total,
        stripe_session_id: session.id,
        payment_status: "pending",
        fulfillment_status: "pending",
      });
    } catch (dbError) {
      console.error("MerchOrder save error (non-fatal):", dbError.message);
    }

    return Response.json({ url: session.url, session_id: session.id, order_number: orderNumber });
  } catch (error) {
    console.error("Merch checkout error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}