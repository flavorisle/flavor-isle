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
    if (productName && label.startsWith(productName + " / ")) {
      label = label.slice(productName.length + 3);
    }
    const parts = label.split(" / ").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (!color) color = parts[0];
      if (!size) size = parts[parts.length - 1];
    } else if (parts.length === 1) {
      if (!size) size = parts[0];
    }
  }
  const price = v.retail_price != null ? Number(v.retail_price) : v.price != null ? Number(v.price) : 0;
  const image = v.image || v.files?.[0]?.thumbnail_url || v.files?.[0]?.preview_url || productImage || "";
  return {
    id: v.id,
    name,
    sku: v.sku || "",
    price,
    in_stock: v.availability === "active" && !v.is_discontinued,
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
    items: items.map((i) => ({ sync_variant_id: String(i.sync_variant_id), quantity: i.quantity })),
  };
  const res = await fetch(`${PRINTFUL_BASE}/shipping/rates`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Failed to get shipping rates");
  const rates = (data.result || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    cost: Number(r.cost),
    currency: r.currency,
    min_days: r.min_delivery_days,
    max_days: r.max_delivery_days,
  }));
  if (!rates.length) throw new Error("No shipping rates available for this address.");
  rates.sort((a: any, b: any) => a.cost - b.cost);
  return rates;
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