import { fetchStoreProducts } from "../../shared/printful.ts";

export default async function (req: Request) {
  try {
    const products = await fetchStoreProducts();
    return Response.json({ products });
  } catch (error) {
    console.error("getPrintfulProducts error:", error.message);
    return Response.json({ error: error.message, products: [] }, { status: 500 });
  }
}