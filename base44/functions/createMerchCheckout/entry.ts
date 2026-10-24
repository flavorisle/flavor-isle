import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { fetchStoreProducts, getShippingRates } from '../../shared/printful.ts';
import { getSmashieSettings, webPaymentProvider } from '../../shared/smashieSettings.ts';
import { openWixCheckoutSession, resolveAppUrl, wixPayPageUrl } from '../../shared/wixCheckout.ts';

// Tasty Threads merch checkout. The order is priced from Printful's own variant
// catalog and that address's live shipping rate, saved, and then paid on whichever
// secure page the owner has switched on (issue #116, Part A step 5): Base44 Payments
// on the primary path, the Square page on the alternative.
const PAY_PAGE_ORIGIN = "https://flavor-isle.com";

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, customer, shipping, subtotal } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: "No items provided" }, { status: 400 });
    }
    if (!customer?.email || !customer?.name) {
      return Response.json({ error: "Customer name and email are required" }, { status: 400 });
    }

    // ── Server-side price authority ──
    // Item prices come from Printful's own variant catalog and shipping from that
    // address's live rates, so a cart of one-cent line items cannot be checked out;
    // a request that disagrees with the catalog is refused rather than quietly
    // charged a different amount.
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

    // The provider this order will pay on, decided by the owner's switch on the server.
    const settings = await getSmashieSettings(base44);
    const provider = webPaymentProvider(settings);
    const appUrl = resolveAppUrl(req);

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

    let merchOrder = null;
    try {
      merchOrder = await base44.asServiceRole.entities.MerchOrder.create({
        ...merchOrderRecord,
        payment_provider: provider,
      });
    } catch (dbError) {
      console.error("MerchOrder save error:", dbError.message);
      return Response.json({ error: "Could not save your order. No charge was made — please try again." }, { status: 500 });
    }

    try {
      // ── Base44 Payments (the primary path) ──
      if (provider === "wix") {
        const session = await openWixCheckoutSession(base44, {
          orderNumber,
          itemName: `Flavor Isle Tasty Threads #${orderNumber}`,
          amount: orderTotal,
          appUrl,
          thankYouPath: `/merch-confirmation?order_number=${encodeURIComponent(orderNumber)}&wix=1`,
          postFlowPath: "/merch",
          buyer: { email: customer.email, phone: customer.phone || "", firstName: String(customer.name).split(" ")[0] || "" },
        });
        // The order's own pay page, kept on the record so the crew can always open it.
        const payUrl = wixPayPageUrl(PAY_PAGE_ORIGIN, orderNumber);
        await base44.asServiceRole.entities.MerchOrder.update(merchOrder.id, {
          payment_url: payUrl,
          wix_checkout_session_id: session.checkoutSessionId,
        });
        return Response.json({
          provider: "wix",
          order_number: orderNumber,
          checkoutUrl: session.redirectUrl,
          payment_url: payUrl,
          total: orderTotal,
        });
      }

      // ── Square (the alternative path) ──
      const squareRes = await base44.functions.invoke("createMerchSquareCheckout", {
        items: pricedItems,
        customer,
        shipping: shippingCost,
        subtotal: catalogSubtotal,
        total: orderTotal,
        order_number: orderNumber,
        merch_order_id: merchOrder.id,
      });
      const squareData = squareRes?.data || squareRes || {};
      if (!squareData?.payment_url) throw new Error(squareData?.error || "The Square payment page could not be opened.");
      return Response.json({
        provider: "square",
        order_number: orderNumber,
        checkoutUrl: squareData.payment_url,
        payment_url: squareData.payment_url,
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