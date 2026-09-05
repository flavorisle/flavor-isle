// Printful REST API helpers — shared by the merch store backend functions.
// Docs: https://developers.printful.com/

const PRINTFUL_BASE = "https://api.printful.com";

function authHeaders(): Record<string, string> {
  const key = Deno.env.get("PRINTFUL_API_KEY");
  if (!key) throw new Error("PRINTFUL_API_KEY is not set. Add it in Settings → Secrets.");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// Pick the best mockup image (product photo with the design applied) for a
// variant. Printful's variant `image` field is the mockup; when it's missing
// we look for a file typed "preview"/"mockup" rather than the bare design
// ("default" type), which is just the artwork file.
function pickMockupImage(v: any, productImage?: string): string {
  if (v.image) return v.image;
  const files: any[] = v.files || [];
  const mockup = files.find((f: any) => {
    const t = (f.type || "").toLowerCase();
    return t === "preview" || t === "mockup" || t.includes("mockup");
  });
  if (mockup) return mockup.preview_url || mockup.thumbnail_url || mockup.image_url || "";
  // Any non-"default" file (e.g. "back", "embroidery_front") is still a product
  // photo, preferable to the bare design artwork.
  const nonDefault = files.find((f: any) => {
    const t = (f.type || "").toLowerCase();
    return t && t !== "default";
  });
  if (nonDefault) return nonDefault.preview_url || nonDefault.thumbnail_url || nonDefault.image_url || "";
  return productImage || "";
}

// Parse a sync_variant into a compact, UI-friendly shape. Apparel variants
// usually name themselves like "Black / S"; we split that into color + size so
// the storefront can render pill selectors.
function parseVariant(v: any, productImage?: string, productName?: string) {
  const name: string = v.name || "";
  let size = v.variant?.size || "";
  let color = v.variant?.color || v.variant?.color_code || "";
  if (!size || !color) {
    // Printful names apparel variants like "Design / Color / Size". Strip the
    // leading product/design name so the remaining "Color / Size" parses into
    // a real color (e.g. "Black") instead of the design name.
    let label = name;
    let stripped = false;
    if (productName) {
      const pn = productName.trim();
      if (label.startsWith(pn + " / ")) {
        label = label.slice(pn.length + 3);
        stripped = true;
      }
    }
    const parts = label.split(" / ").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      // Stripped → "Color / Size". Not stripped → "Design / Color / Size",
      // where the color is the middle part, not the first.
      if (!color) color = !stripped && parts.length >= 3 ? parts[1] : parts[0];
      if (!size) size = parts[parts.length - 1];
    } else if (parts.length === 1) {
      if (!size) size = parts[0];
    }
  }
  const price = v.retail_price != null ? Number(v.retail_price) : v.price != null ? Number(v.price) : 0;
  const image = pickMockupImage(v, productImage);
  return {
    id: v.id,
    // Base Printful catalog variant id — the shipping-rates API requires this
    // (it does NOT accept sync_variant_id). The orders API uses `id` above.
    variant_id: v.variant_id || v.variant?.id || null,
    name,
    sku: v.sku || "",
    price,
    in_stock: (v.availability_status || "active") === "active" && !v.is_discontinued,
    size,
    color,
    image,
  };
}

// Fetch the full store catalog with per-product variant detail.
export async function fetchStoreProducts() {
  const listRes = await fetch(`${PRINTFUL_BASE}/store/products`, { headers: authHeaders() });
  const listData = await listRes.json();
  if (!listRes.ok) throw new Error(listData?.error?.message || "Failed to fetch Printful products");

  const products = listData.result || [];
  const detailed = await Promise.all(
    products.map(async (p: any) => {
      try {
        const r = await fetch(`${PRINTFUL_BASE}/store/products/${p.id}`, { headers: authHeaders() });
        const d = await r.json();
        if (!r.ok) return null;
        const sp = d.result?.sync_product || {};
        const variants = (d.result?.sync_variants || []).map((v: any) => parseVariant(v, sp.image, sp.name));
        const prices = variants.map((v: any) => v.price).filter((n: number) => n > 0);
        const images: string[] = [];
        if (sp.image) images.push(sp.image);
        variants.forEach((v: any) => {
          if (v.image && !images.includes(v.image)) images.push(v.image);
        });
        return {
          id: sp.id,
          name: sp.name,
          description: sp.description || "",
          thumbnail_url: sp.image || variants[0]?.image || "",
          images,
          variants,
          fromPrice: prices.length ? Math.min(...prices) : 0,
        };
      } catch {
        return null;
      }
    })
  );
  return detailed.filter(Boolean);
}

// Get live shipping rates for a recipient + item set. Returns cheapest first.
export async function getShippingRates({ recipient, items }: { recipient: any; items: any[] }) {
  const body = {
    recipient: {
      address1: recipient.address1,
      city: recipient.city,
      state_code: recipient.state_code,
      country_code: recipient.country_code || "US",
      zip: recipient.zip,
    },
    items: items.map((i) => ({ variant_id: Number(i.variant_id), quantity: i.quantity })),
  };
  const res = await fetch(`${PRINTFUL_BASE}/shipping/rates`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to get shipping rates");
  const rates = (data.result || [])
    .map((r: any) => {
      const cost = Number(r.cost != null ? r.cost : r.rate);
      return {
        id: r.id,
        name: r.name,
        cost: Number.isFinite(cost) ? cost : NaN,
        currency: r.currency,
        min_days: r.min_delivery_days ?? r.minDeliveryDays,
        max_days: r.max_delivery_days ?? r.maxDeliveryDays,
      };
    })
    .filter((r: any) => Number.isFinite(r.cost));
  if (!rates.length) throw new Error("No shipping rates available for this address.");
  rates.sort((a: any, b: any) => a.cost - b.cost);
  return rates;
}

// Get the current Printful webhook configuration for the store.
export async function getWebhookConfig() {
  const res = await fetch(`${PRINTFUL_BASE}/webhooks`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to fetch Printful webhook config");
  return data.result;
}

// Register (or replace) the store's webhook configuration. Printful accepts a
// single webhook URL plus the list of event types to forward. Returns the
// saved configuration.
export async function setWebhookConfig({ url, types }: { url: string; types: string[] }) {
  const res = await fetch(`${PRINTFUL_BASE}/webhooks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ url, types }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to set Printful webhook config");
  return data.result;
}

// Place a fulfillment order with Printful. confirm=1 auto-submits it for production.
export async function placeOrder({ external_id, recipient, items, retail_costs }: any) {
  const body = {
    external_id,
    recipient: {
      name: recipient.name,
      address1: recipient.address1,
      address2: recipient.address2 || "",
      city: recipient.city,
      state_code: recipient.state_code,
      country_code: recipient.country_code || "US",
      zip: recipient.zip,
      phone: recipient.phone || "",
      email: recipient.email || "",
    },
    items: items.map((i: any) => ({
      sync_variant_id: String(i.sync_variant_id),
      quantity: i.quantity,
      retail_price: String(Number(i.retail_price).toFixed(2)),
    })),
    retail_costs: {
      currency: retail_costs?.currency || "USD",
      subtotal: String(Number(retail_costs?.subtotal || 0).toFixed(2)),
      shipping: String(Number(retail_costs?.shipping || 0).toFixed(2)),
      total: String(Number(retail_costs?.total || 0).toFixed(2)),
    },
  };
  const res = await fetch(`${PRINTFUL_BASE}/orders?confirm=1`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to place Printful order");
  return data.result;
}