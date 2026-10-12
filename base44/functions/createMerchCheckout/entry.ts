import Stripe from "npm:stripe@14.25.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { fetchStoreProducts, getShippingRates } from "../../shared/printful.ts";
import { getSmashieSettings, webPaymentProvider } from "../../shared/smashieSettings.ts";
import { createSquareCheckoutLink } from "../../shared/squareWebCheckout.ts";
import { createHelcimCheckoutLink } from "../../shared/helcimCheckout.ts";

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

    const webProvider = webPaymentProvider(await getSmashieSettings(base44));

    // ── Helcim path (issue #97, Part B): the same hosted-page shape as the
    // Square one below. If Helcim has no credentials yet, or cannot open a page,
    // the customer is handed the Square page instead — a merch checkout must
    // never land on a page that cannot be paid. Printful is only asked to
    // produce the order once the payment is verified.
    if (webProvider === "helcim") {
      let helcimMerchOrder = null;
      try {
        helcimMerchOrder = await base44.asServiceRole.entities.MerchOrder.create({
          ...merchOrderRecord,
          payment_provider: "helcim",
        });
      } catch (dbError) {
        console.error("MerchOrder save error:", dbError.message);
        return Response.json({ error: "Could not save your order. No charge was made — please try again." }, { status: 500 });
      }

      try {
        const link = await createHelcimCheckoutLink({
          invoiceNumber: helcimMerchOrder.id,
          orderNumber,
          amountUsd: orderTotal,
          payPageOrigin: origin,
          allowTipping: false,
        });
        await base44.asServiceRole.entities.MerchOrder.update(helcimMerchOrder.id, {
          payment_provider: "helcim",
          helcim_checkout_id: link.checkoutToken,
          payment_url: link.url,
        });
        return Response.json({
          provider: "helcim",
          order_number: orderNumber,
          payment_url: link.url,
          total: orderTotal,
        });
      } catch (helcimErr) {
        console.warn("Helcim merch checkout unavailable — opening the alternate secure page:", helcimErr.message);
        try {
          const link = await createSquareCheckoutLink(base44, {
            idempotencyKey: `merch-square-${helcimMerchOrder.id}`,
            referenceId: helcimMerchOrder.id,
            sourceName: "Tasty Threads",
            lineItems: pricedItems.map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              note: item.variantName || "",
              unitPriceUsd: item.price,
            })),
            serviceCharges: shippingCost > 0 ? [{ uid: "shipping", name: "Shipping", amountUsd: shippingCost }] : [],
            totalCents: Math.round(orderTotal * 100),
            redirectUrl: `${origin}/merch-confirmation?order_number=${orderNumber}&square=1`,
            paymentNote: `Tasty Threads order ${orderNumber}`,
            fulfillmentNote: `${customer.name}\n${address.address1 || ""}\n${address.city || ""}, ${address.state_code || ""} ${address.zip || ""}`.trim(),
            allowTipping: false,
            metadata: { merch_order_id: helcimMerchOrder.id, order_source: "flavor-isle-merch" },
          });
          await base44.asServiceRole.entities.MerchOrder.update(helcimMerchOrder.id, {
            payment_provider: "square",
            square_checkout_order_id: link.orderId,
            payment_url: link.url,
          });
          return Response.json({
            provider: "square",
            order_number: orderNumber,
            payment_url: link.url,
            total: orderTotal,
          });
        } catch (squareErr) {
          console.error("Alternate merch checkout setup failed too:", squareErr.message);
          try {
            await base44.asServiceRole.entities.MerchOrder.delete(helcimMerchOrder.id);
          } catch (cleanupErr) {
            console.error(`Failed to remove stranded merch order ${orderNumber}:`, cleanupErr.message);
          }
          return Response.json({ error: "Could not open the secure payment page, so nothing was charged. Please try again." }, { status: 502 });
        }
      }
    }

    // ── Alternate path (issue #95): a hosted secure payment page ──
    // Built from the same verified catalog prices and live shipping rate, and
    // Square's own total is checked to the cent before the URL is handed back.
    // Nothing about the merch experience changes: same cart, same shipping, same
    // confirmation, and Printful is only asked to produce the order once the
    // payment is verified.
    if (webProvider === "square") {
      let squareMerchOrder = null;
      try {
        squareMerchOrder = await base44.asServiceRole.entities.MerchOrder.create({
          ...merchOrderRecord,
          payment_provider: "square",
        });
      } catch (dbError) {
        console.error("MerchOrder save error:", dbError.message);
        return Response.json({ error: "Could not save your order. No charge was made — please try again." }, { status: 500 });
      }

      try {
        const link = await createSquareCheckoutLink(base44, {
          idempotencyKey: `merch-square-${squareMerchOrder.id}`,
          referenceId: squareMerchOrder.id,
          sourceName: "Tasty Threads",
          lineItems: pricedItems.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            note: item.variantName || "",
            unitPriceUsd: item.price,
          })),
          serviceCharges: shippingCost > 0 ? [{ uid: "shipping", name: "Shipping", amountUsd: shippingCost }] : [],
          totalCents: Math.round(orderTotal * 100),
          redirectUrl: `${origin}/merch-confirmation?order_number=${orderNumber}&square=1`,
          paymentNote: `Tasty Threads order ${orderNumber}`,
          fulfillmentNote: `${customer.name}\n${address.address1 || ""}\n${address.city || ""}, ${address.state_code || ""} ${address.zip || ""}`.trim(),
          allowTipping: false,
          metadata: { merch_order_id: squareMerchOrder.id, order_source: "flavor-isle-merch" },
        });
        await base44.asServiceRole.entities.MerchOrder.update(squareMerchOrder.id, {
          payment_provider: "square",
          square_checkout_order_id: link.orderId,
        });
        return Response.json({
          provider: "square",
          order_number: orderNumber,
          payment_url: link.url,
          total: orderTotal,
        });
      } catch (linkErr) {
        console.error("Square merch checkout setup failed:", linkErr.message);
        return Response.json({ error: "Could not open the secure payment page, so nothing was charged. Please try again." }, { status: 502 });
      }
    }

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

    try {
      await base44.asServiceRole.entities.MerchOrder.create({
        ...merchOrderRecord,
        payment_provider: "stripe",
        stripe_session_id: session.id,
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