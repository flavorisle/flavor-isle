import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { formatItemModifiers } from '../../shared/ticketFormat.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { items, orderType, orderNumber, orderId, customer, instructions, total, tax, deliveryFee, tip, discount, happyHourDiscount, pickupMethod, vehicle } = body;
    const storedOrder = orderId ? await base44.asServiceRole.entities.Order.get(orderId) : null;
    const cashPickup = storedOrder?.pay_cash_on_pickup === true && storedOrder.order_type === 'pickup';

    // Atomic claim: try to set square_sync_claimed_at only if it's currently
    // null/empty. If another concurrent call already claimed or pushed the
    // order, updated === 0 and we skip — preventing duplicate Square orders
    // when the Stripe webhook fires both checkout.session.completed and
    // payment_intent.succeeded ~1s apart. This is a database-level atomic
    // operation (conditional updateMany), so the race window is eliminated.
    if (orderId) {
      try {
        const claim = await base44.asServiceRole.entities.Order.updateMany(
          { id: orderId, square_sync_claimed_at: null },
          { $set: { square_sync_claimed_at: new Date().toISOString() } }
        );
        if (!claim || claim.updated === 0) {
          const existing = await base44.asServiceRole.entities.Order.get(orderId);
          if (existing?.square_order_id) {
            console.log(`Order ${orderNumber} already pushed (${existing.square_order_id}) — skipping duplicate create`);
            return Response.json({ order_id: existing.square_order_id, already_synced: true });
          }
          console.log(`Order ${orderNumber} is being claimed by another call — skipping`);
          return Response.json({ order_id: null, already_synced: true });
        }
      } catch (claimErr) {
        console.warn('Atomic claim failed, falling back to pre-check:', claimErr.message);
        try {
          const existing = await base44.asServiceRole.entities.Order.get(orderId);
          if (existing?.square_order_id) {
            return Response.json({ order_id: existing.square_order_id, already_synced: true });
          }
          // Another call has a sync claim but hasn't set square_order_id yet
          // (still in the Square API call). Return already_synced to avoid a
          // duplicate — autoSyncUnpushedOrders will retry if no call succeeds.
          if (existing?.square_sync_claimed_at) {
            console.log(`Order ${orderNumber} has a sync claim from another call — skipping to avoid duplicate`);
            return Response.json({ order_id: null, already_synced: true });
          }
          // No claim and no square_order_id — the atomic claim threw for a
          // transient reason and no other call is in flight. Safe to proceed.
          console.log(`Order ${orderNumber} — atomic claim threw but no existing claim, proceeding`);
        } catch (e) {
          // Can't read the order — be conservative, let autoSync retry.
          return Response.json({ order_id: null, already_synced: true });
        }
      }
    }

    const orderTypeLabel = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' }[orderType] || 'Pickup';
    const displayName = orderNumber
      ? `${customer.name} (#${orderNumber}) ${orderTypeLabel}`
      : `${customer.name} ${orderTypeLabel}`;

    // Get Square access token via connector
    const connection = await base44.asServiceRole.connectors.getConnection('square');
    const accessToken = connection.accessToken;

    // Resolve actual location ID
    let locationId = connection.connectionConfig?.locationId;
    if (!locationId) {
      const locRes = await fetch('https://connect.squareup.com/v2/locations', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': '2026-09-16' }
      });
      const locData = await locRes.json();
      locationId = locData.locations?.[0]?.id;
    }
    if (!locationId) return Response.json({ error: 'Could not resolve Square location ID' }, { status: 500 });

    const sqHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Square-Version': '2026-09-16',
      'Content-Type': 'application/json',
    };

    // Find or create a Square customer (by phone first, then email) so the
    // order links to their customer account like Square Online orders do.
    let customerId = null;
    const digits = (customer.phone || '').replace(/\D/g, '');
    const e164Phone = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : null;
    // Phone/chat orders taken without an email carry a placeholder so the
    // required field is satisfied — never match or create a Square customer
    // with it as if it were a real address. The phone still links the customer.
    const rawEmail = (customer.email || '').toLowerCase().trim();
    const normalizedEmail = rawEmail === 'phone-order@flavorisle.com' ? '' : rawEmail;

    const searchCustomer = async (filter) => {
      const res = await fetch('https://connect.squareup.com/v2/customers/search', {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({ query: { filter }, limit: 1 }),
      });
      const data = await res.json();
      return data?.customers?.[0]?.id || null;
    };

    try {
      if (e164Phone) customerId = await searchCustomer({ phone_number: { exact: e164Phone } });
      if (!customerId && normalizedEmail) customerId = await searchCustomer({ email_address: { exact: normalizedEmail } });

      if (!customerId) {
        const nameParts = (customer.name || '').trim().split(/\s+/);
        const createCustomer = async (includePhone) => {
          const res = await fetch('https://connect.squareup.com/v2/customers', {
            method: 'POST',
            headers: sqHeaders,
            body: JSON.stringify({
              idempotency_key: crypto.randomUUID(),
              given_name: nameParts[0] || '',
              family_name: nameParts.slice(1).join(' ') || undefined,
              ...(normalizedEmail ? { email_address: normalizedEmail } : {}),
              ...(includePhone && e164Phone ? { phone_number: e164Phone } : {}),
            }),
          });
          const data = await res.json();
          if (!res.ok) console.error('Square customer create error:', JSON.stringify(data.errors));
          return data?.customer?.id || null;
        };
        customerId = await createCustomer(true);
        // Square rejects some phone formats — retry without the phone so the
        // customer still gets linked by name/email.
        if (!customerId && e164Phone) customerId = await createCustomer(false);
        if (customerId) console.log('Square customer created:', customerId);
      } else {
        console.log('Square customer matched:', customerId);
      }
    } catch (err) {
      console.error('Square customer lookup/create failed:', err.message);
    }

    // Deterministic idempotency key derived from the app order id so Square
    // rejects a duplicate create even if two triggers race past the pre-check
    // above. Square returns the SAME order for a repeated key.
    const idempotencyKey = orderId ? `flavor-isle-order-${orderId}` : crypto.randomUUID();

    // Batch-retrieve catalog objects so each line item can reference its ITEM
    // VARIATION (not the top-level item) via catalog_object_id, and modifier
    // options via the modifiers array. The Orders API requires the variation
    // id — square_item_id stores the ITEM id, so we resolve the default
    // variation here. Items without a Square catalog match fall back to ad-hoc
    // line items (name + price only) so they still push.
    const squareItemIds = [...new Set(
      items.map(i => i.square_item_id || i.catalog_object_id).filter(Boolean)
    )];
    const catalogMap: Record<string, { variations: any[]; modifierListIds: string[] }> = {};
    const allModifierListIds = new Set<string>();
    if (squareItemIds.length > 0) {
      try {
        const catRes = await fetch('https://connect.squareup.com/v2/catalog/batch-retrieve', {
          method: 'POST',
          headers: sqHeaders,
          body: JSON.stringify({ object_ids: squareItemIds }),
        });
        const catData = await catRes.json();
        for (const obj of (catData.objects || [])) {
          if (obj.type === 'ITEM' && obj.item_data) {
            const variations = obj.item_data.variations || [];
            const modifierListIds = (obj.item_data.modifier_list_info || [])
              .filter((mli: any) => mli.enabled && !mli.hidden_from_customer)
              .map((mli: any) => mli.modifier_list_id);
            catalogMap[obj.id] = { variations, modifierListIds };
            modifierListIds.forEach((id: string) => allModifierListIds.add(id));
          }
        }
      } catch (catErr) {
        console.warn('Catalog batch-retrieve failed, using ad-hoc line items:', catErr.message);
      }
    }

    // Batch-retrieve modifier lists so we can reference modifier options by
    // their catalog IDs (line item modifiers) instead of ad-hoc text. This
    // makes modifier-level sales and pricing report correctly in Square.
    // Nested (child) modifier lists are retrieved recursively up to 3 levels
    // so selections from child lists (e.g., sauce preference, ice level, drink
    // flavor) are also catalog-referenced instead of ad-hoc text.
    const modifierOptionToList: Record<string, string> = {};
    const modifierOptionToName: Record<string, string> = {};
    const childListMap: Record<string, string[]> = {};
    const retrievedListIds = new Set<string>();

    async function retrieveModifierLists(ids: string[]) {
      if (ids.length === 0) return [];
      const res = await fetch('https://connect.squareup.com/v2/catalog/batch-retrieve', {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({ object_ids: ids }),
      });
      const data = await res.json();
      return data.objects || [];
    }

    if (allModifierListIds.size > 0) {
      try {
        let toRetrieve = [...allModifierListIds];
        let depth = 0;
        while (toRetrieve.length > 0 && depth < 4) {
          const objs = await retrieveModifierLists(toRetrieve);
          const nextBatch: string[] = [];
          for (const obj of objs) {
            if (obj.type !== 'MODIFIER_LIST' || !obj.modifier_list_data) continue;
            retrievedListIds.add(obj.id);
            const childIds: string[] = [];
            for (const mod of (obj.modifier_list_data.modifiers || [])) {
              modifierOptionToList[mod.id] = obj.id;
              modifierOptionToName[mod.id] = mod.modifier_data?.name || '';
              for (const cid of (mod.modifier_data?.child_modifier_list_ids || [])) {
                childIds.push(cid);
                if (!retrievedListIds.has(cid)) nextBatch.push(cid);
              }
            }
            if (childIds.length > 0) childListMap[obj.id] = childIds;
          }
          toRetrieve = [...new Set(nextBatch)];
          depth++;
        }
      } catch (modErr) {
        console.warn('Modifier list batch-retrieve failed:', modErr.message);
      }
    }

    // Compute the transitive closure of all modifier list IDs reachable from
    // a given set of direct list IDs (including nested child lists) so nested
    // selections are treated as catalog-referenced, not ad-hoc.
    function getAllReachableListIds(directIds: string[]): Set<string> {
      const result = new Set<string>(directIds);
      const queue = [...directIds];
      while (queue.length > 0) {
        const id = queue.shift()!;
        const childIds = childListMap[id];
        if (!childIds) continue;
        for (const cid of childIds) {
          if (!result.has(cid)) {
            result.add(cid);
            queue.push(cid);
          }
        }
      }
      return result;
    }

    const lineItems = items.map(item => {
      // Resolve the ITEM VARIATION id from the catalog so Square reports the
      // item under its proper category. For multi-variation items (e.g. drinks
      // with sizes), match the selected Size modifier's id to the variation
      // id; otherwise use the first variation. Falls back to ad-hoc if the
      // item isn't in the catalog.
      let catalogObjectId: string | null = null;
      const squareItemId = item.square_item_id || item.catalog_object_id;
      const catEntry = squareItemId ? catalogMap[squareItemId] : null;
      const variations = catEntry?.variations || [];
      const variationIds = new Set(variations.map((v: any) => v.id));
      const itemModListIds = getAllReachableListIds(catEntry?.modifierListIds || []);

      if (variations.length > 0) {
        const modIds = (item.selectedModifiers || []).map((m: any) => m.id);
        const matched = variations.find((v: any) => modIds.includes(v.id));
        catalogObjectId = (matched || variations[0]).id;
      }

      // Separate selected modifiers into catalog-referenced (added as Square
      // line item modifiers with catalog_object_id) and ad-hoc (kept in the
      // name only). Size selections (id = variation id) are skipped — they're
      // already handled by catalog_object_id. Only modifiers from the item's
      // own attached modifier lists are catalog-referenced; everything else
      // (e.g. milkshake flavors on an item with no modifier lists) stays
      // ad-hoc so Square doesn't reject the order.
      // Square computes each modifier's total as base_price_money × line item
      // quantity, so we set the per-unit price and let Square scale it.
      const appliedModifiers: any[] = [];
      let catalogModPerUnit = 0;
      // Names of modifiers already shown on the POS ticket as a variation
      // (size) line or a catalog modifier sub-line. These are excluded from
      // the line item name's parenthetical so the kitchen ticket never prints
      // a modifier twice (once in the name, once as a sub-line). The Deluxe
      // preset label and true ad-hoc modifiers stay in the name.
      const alreadyOnTicket = new Set<string>();
      const selections = item.selectedModifiers || [];
      for (let index = 0; index < selections.length; index++) {
        const sm = selections[index];
        if (!sm?.id) continue;
        if (variationIds.has(sm.id)) {
          if (sm.name) alreadyOnTicket.add(sm.name); // Size selection
          continue;
        }
        const next = selections[index + 1];
        // The cart stores a merged display name immediately followed by its
        // silent preference (Regular/Extra/Lite). Print only that complete name
        // as a zero-priced ad-hoc modifier; its full price stays in the item
        // base price. Never send either catalog option as a separate row.
        if (sm.name && next?.silent && /^Preferences on (Sauce|Toppings)$/i.test(next.group || '')) {
          appliedModifiers.push({ name: sm.name, base_price_money: { amount: 0, currency: 'USD' } });
          alreadyOnTicket.add(sm.name);
          index++; // skip the paired silent child preference
          continue;
        }
        if (sm.silent) continue;
        const modListId = modifierOptionToList[sm.id];
        if (modListId && itemModListIds.has(modListId)) {
          const mod: any = { catalog_object_id: sm.id };
          if (typeof sm.price === 'number') {
            mod.base_price_money = { amount: Math.round(sm.price * 100), currency: 'USD' };
          }
          appliedModifiers.push(mod);
          catalogModPerUnit += sm.price || 0;
          if (sm.name && sm.name === modifierOptionToName[sm.id]) alreadyOnTicket.add(sm.name);
        }
        // True ad-hoc extras stay in the name and in base_price_money.
      }

      // Deluxe preset toppings print as the preset label ("Deluxe" / "Deluxe,
      // no Tomato") instead of a raw topping list. Only modifiers NOT already
      // shown as a POS sub-line (ad-hoc extras + the Deluxe label) are folded
      // into the name, so nothing prints twice.
      const displayMods = formatItemModifiers(item).filter((m: string) => !alreadyOnTicket.has(m));
      const name = displayMods.length ? `${item.name || 'Item'} (${displayMods.join(', ')})` : (item.name || 'Item');

      // base_price_money = item price minus catalog modifier upcharges (those
      // are added via the modifiers array). Ad-hoc modifier prices and size
      // upcharges stay in the base price so the line item total matches what
      // the customer paid: (base + ad-hoc + size) × qty + catalog_mods × qty.
      const basePrice = (item.price || 0) - catalogModPerUnit;

      const lineItem: any = {
        name,
        quantity: String(item.quantity || 1),
        base_price_money: {
          amount: Math.round(basePrice * 100),
          currency: 'USD',
        },
      };
      if (catalogObjectId) {
        lineItem.catalog_object_id = catalogObjectId;
      }
      if (appliedModifiers.length > 0) {
        lineItem.modifiers = appliedModifiers;
      }
      return lineItem;
    });

    // Send tax as a real order-level tax (not a service charge) so Square
    // shows it once in its standard Tax line instead of a second tax-looking row.
    const itemsSubtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    // Loyalty reward discount as an order-level fixed discount so the Square
    // total matches what the customer actually paid.
    const orderDiscounts = [];
    if (discount > 0) {
      orderDiscounts.push({
        uid: 'loyalty-reward',
        name: 'Loyalty Reward',
        type: 'FIXED_AMOUNT',
        amount_money: { amount: Math.round(discount * 100), currency: 'USD' },
        scope: 'ORDER',
      });
    }
    // Happy Hour drink discount as a separate order-level fixed discount so
    // reporting can track it independently from loyalty rewards.
    if (happyHourDiscount > 0) {
      orderDiscounts.push({
        uid: 'happy-hour',
        name: 'Happy Hour 50% Off Drinks',
        type: 'FIXED_AMOUNT',
        amount_money: { amount: Math.round(happyHourDiscount * 100), currency: 'USD' },
        scope: 'ORDER',
      });
    }
    // Square applies the ADDITIVE tax to the post-discount amount, so base the
    // percentage on the discounted subtotal to keep the applied tax equal to ours.
    const taxBase = itemsSubtotal - (discount || 0) - (happyHourDiscount || 0);
    const orderTaxes = [];
    if (tax > 0 && taxBase > 0) {
      const pct = ((tax / taxBase) * 100).toFixed(2);
      orderTaxes.push({
        uid: 'sales-tax',
        name: 'Sales Tax',
        type: 'ADDITIVE',
        percentage: pct,
        scope: 'ORDER',
      });
    }

    // Delivery fee stays a fixed-amount service charge.
    const serviceCharges = [];
    if (deliveryFee > 0) {
      serviceCharges.push({
        uid: 'delivery-fee',
        name: 'Delivery Fee',
        amount_money: { amount: Math.round(deliveryFee * 100), currency: 'USD' },
        calculation_phase: 'TOTAL_PHASE',
        taxable: false,
      });
    }

    // Format note based on order type for kitchen/counter printing
    let pickupNote = '';
    if (orderType === 'pickup') {
      const curbside = pickupMethod === 'curbside' && vehicle;
      const carDesc = curbside ? [vehicle.car_color, vehicle.car_make, vehicle.car_model].filter(Boolean).join(' ') : '';
      pickupNote = `${curbside ? 'CURBSIDE' : 'PICKUP'}\n${customer.name}\n${customer.phone || ''}${curbside && carDesc ? `\nCar: ${carDesc}` : ''}`;
    } else if (orderType === 'delivery') {
      pickupNote = `DELIVERY\n${customer.name}\n${customer.address || ''}\n${customer.phone || ''}`;
    } else if (orderType === 'dine_in') {
      pickupNote = `DINE IN\nTable: ${customer.table || 'N/A'}\n${customer.name}`;
    }

    if (cashPickup) pickupNote += `\nCASH AT PICKUP — ${storedOrder.payment_status === 'paid' ? 'PAID' : 'COLLECT $' + Number(storedOrder.total).toFixed(2)}`;

    const squareOrder = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: locationId,
        source: { name: orderTypeLabel },
        ...(customerId ? { customer_id: customerId } : {}),
        fulfillments: [{
          type: 'PICKUP',
          state: 'PROPOSED',
          pickup_details: {
            recipient: {
              display_name: displayName,
              phone_number: e164Phone || customer.phone || '',
              ...(normalizedEmail ? { email_address: normalizedEmail } : {}),
              ...(customerId ? { customer_id: customerId } : {}),
            },
            pickup_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
            note: pickupNote + (instructions ? '\n\nNOTES: ' + instructions : ''),
            // Curbside pickup — add car details so staff know what to look for.
            // Square doesn't have a DINE_IN fulfillment type and DELIVERY
            // requires a formal Square partnership (would hide the order from
            // POS), so all order types use PICKUP with the type in the note.
            ...(pickupMethod === 'curbside' && vehicle ? {
              curbside_pickup_details: {
                buyer_curbside_info: {
                  car_description: [vehicle.car_color, vehicle.car_make, vehicle.car_model]
                    .filter(Boolean).join(' ') || 'Not specified',
                },
              },
            } : {}),
          },
        }],
        line_items: lineItems,
        ...(orderDiscounts.length > 0 ? { discounts: orderDiscounts } : {}),
        ...(orderTaxes.length > 0 ? { taxes: orderTaxes } : {}),
        ...(serviceCharges.length > 0 ? { service_charges: serviceCharges } : {}),
        metadata: {
          customer_email: customer.email,
          order_source: 'flavor-isle-website',
          order_type: orderType,
          ...(orderId ? { app_order_id: orderId } : {}),
        },
      },
    };

    const response = await fetch('https://connect.squareup.com/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2026-09-16',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(squareOrder),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Square error:', JSON.stringify(data));
      // Release the claim so the order can be retried by autoSyncUnpushedOrders
      if (orderId) {
        try {
          await base44.asServiceRole.entities.Order.updateMany(
            { id: orderId, square_sync_claimed_at: { $ne: null } },
            { $unset: { square_sync_claimed_at: "" } }
          );
        } catch (e) {
          console.warn('Failed to release Square sync claim:', e.message);
        }
      }
      return Response.json({ error: 'Square order creation failed', details: data }, { status: 500 });
    }

    console.log('Square order created:', data.order?.id);

    // Persist square_order_id on the app order immediately so concurrent
    // triggers see it and skip. This narrows the race window to just the
    // Square API call duration.
    if (orderId && data.order?.id) {
      try {
        await base44.asServiceRole.entities.Order.update(orderId, { square_order_id: data.order.id });
        console.log(`App order ${orderNumber} updated with square_order_id ${data.order.id}`);
      } catch (updateErr) {
        console.error('Failed to update app order with square_order_id:', updateErr.message);
      }
    }

    // Record the payment (already collected via Stripe) as an EXTERNAL payment.
    // Square POS only surfaces PAID orders as active tickets, so without this
    // step the order never appears on the register.
    const netDue = data.order?.net_amount_due_money?.amount || 0;
    if (netDue > 0 && !cashPickup) {
      const payRes = await fetch('https://connect.squareup.com/v2/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2026-09-16',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: orderId ? `flavor-isle-payment-${orderId}` : crypto.randomUUID(),
          source_id: 'EXTERNAL',
          external_details: { type: 'CARD', source: 'Card' },
          order_id: data.order.id,
          location_id: locationId,
          ...(customerId ? { customer_id: customerId } : {}),
          amount_money: { amount: netDue, currency: 'USD' },
          ...(tip > 0 ? { tip_money: { amount: Math.round(tip * 100), currency: 'USD' } } : {}),
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        console.error('Square payment recording failed:', JSON.stringify(payData));
      } else {
        console.log('Square payment recorded:', payData.payment?.id);
      }
    }

    return Response.json({ order_id: data.order?.id, order: data.order, already_synced: false });
  } catch (error) {
    console.error('Square order error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}