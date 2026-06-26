import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { base, flavors, mixIns, topping } = await req.json();
    
    if (!base) {
      return Response.json({ error: 'Base is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Build the custom shake item
    const customShake = {
      name: `Custom ${base} Shake`,
      description: `${base} base${flavors?.length ? ` with ${flavors.join(', ')}` : ''}${mixIns?.length ? ` and ${mixIns.join(', ')}` : ''}${topping ? ` topped with ${topping}` : ''}`,
      category: 'Shakes',
      price: 5.99, // Base price; can be adjusted per ingredients
      is_available: true,
      tags: ['custom', 'shake'],
      selected_base: base,
      selected_flavors: flavors || [],
      selected_mix_ins: mixIns || [],
      selected_topping: topping || null,
    };

    // Calculate price based on selections (each add-on is ~$0.50)
    let finalPrice = 5.99;
    if (flavors?.length) finalPrice += flavors.length * 0.50;
    if (mixIns?.length) finalPrice += mixIns.length * 0.75;
    if (topping) finalPrice += 0.50;

    customShake.price = Math.round(finalPrice * 100) / 100;

    return Response.json({ success: true, shake: customShake });
  } catch (error) {
    console.error('buildCustomShake error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});