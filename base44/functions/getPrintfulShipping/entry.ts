import { getShippingRates } from "../../shared/printful.ts";

export default async function (req: Request) {
  try {
    const body = await req.json();
    const { recipient, items } = body;
    if (!recipient || !recipient.zip || !items || items.length === 0) {
      return Response.json({ error: "recipient and items are required" }, { status: 400 });
    }
    const rates = await getShippingRates({ recipient, items });
    const cheapest = rates[0];
    return Response.json({ shipping: cheapest.cost, rateName: cheapest.name, rates });
  } catch (error) {
    console.error("getPrintfulShipping error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}