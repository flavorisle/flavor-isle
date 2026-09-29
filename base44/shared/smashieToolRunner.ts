// Executes the tools Smashie's delegated backend asks for during a Live SIP
// call. Thin wrappers over the functions the phone line already uses, so the
// SIP pipeline and the current Twilio pipeline place orders the same way.
import { getSmashieSettings } from './smashieSettings.ts';
import { abilityEnabled } from './smashieAdminContext.ts';

const MAX_MENU_RESULTS = 20;
const MAX_GROUPS_PER_ITEM = 3;
const MAX_OPTIONS_PER_GROUP = 8;

function summariseModifiers(modifiers) {
  return (modifiers || [])
    .slice(0, MAX_GROUPS_PER_ITEM)
    .map((group) => {
      const options = (group.modifiers || [])
        .filter((option) => option && !option.sold_out)
        .slice(0, MAX_OPTIONS_PER_GROUP)
        .map((option) => (Number(option.price) > 0 ? `${option.name} (+$${Number(option.price).toFixed(2)})` : option.name));
      return `${group.name}: ${options.join(', ')}`;
    })
    .filter((line) => !line.endsWith(': '));
}

async function lookupMenu(base44, { query, category }) {
  const items = await base44.asServiceRole.entities.MenuItem.filter({ is_available: true });
  const wanted = String(query || '').trim().toLowerCase();
  const wantedCategory = String(category || '').trim().toLowerCase();

  const matches = (items || [])
    .filter((item) => item.name && !item.is_hidden)
    .filter((item) => {
      const group = String(item.display_category || item.category || '').toLowerCase();
      return (!wantedCategory || group.includes(wantedCategory))
        && (!wanted || `${item.name} ${item.description || ''} ${group}`.toLowerCase().includes(wanted));
    });

  const list = matches.slice(0, MAX_MENU_RESULTS).map((item) => ({
    name: item.name,
    price: Number(item.price) || 0,
    category: item.display_category || item.category || '',
    description: item.description || '',
    options: summariseModifiers(item.modifiers),
  }));

  return {
    output: JSON.stringify({
      matches: matches.length,
      shown: list.length,
      note: list.length < matches.length ? 'More items match — narrow the question or ask again.' : undefined,
      items: list,
    }),
  };
}

async function invokeFunction(base44, name, payload) {
  const res = await base44.asServiceRole.functions.invoke(name, payload);
  const data = res?.data ?? res;
  return { output: JSON.stringify(data) };
}

async function placeOrder(base44, args, callerPhone) {
  return invokeFunction(base44, 'logPhoneOrder', {
    customer_name: args.customer_name,
    customer_phone: args.customer_phone || callerPhone,
    customer_email: args.customer_email || undefined,
    order_type: args.order_type || 'pickup',
    delivery_address: args.delivery_address || undefined,
    special_instructions: args.special_instructions || undefined,
    items: Array.isArray(args.items) ? args.items : [],
  });
}

async function takeMessage(base44, args, callerPhone, sessionId) {
  const saved = await base44.asServiceRole.entities.PhoneMessage.create({
    caller_name: args.caller_name || 'Unknown caller',
    caller_phone: callerPhone || 'unknown',
    recipient: args.recipient || 'Management',
    message: args.message || '',
    conversation_id: sessionId,
    call_sid: sessionId,
    channel: 'voice',
    status: 'new',
  });
  return { output: JSON.stringify({ saved: true, id: saved.id }) };
}

// The counter address lives in SmashieSettings (Admin → Communications) so the
// crew can see and update it; the SIP_TRANSFER_TARGET secret stays as the
// fallback for when the field is blank.
async function requestTransfer(base44) {
  const settings = await getSmashieSettings(base44);
  const configured = String(settings.sip_transfer_target || '').trim() || Deno.env.get('SIP_TRANSFER_TARGET');
  // A bare user@domain address gets the sip: scheme the REFER needs.
  const target = configured && !/^(sip|sips|tel):/i.test(configured) ? `sip:${configured}` : configured;
  if (!target) {
    return {
      output: JSON.stringify({
        transfer_available: false,
        note: 'The counter line cannot take a transfer right now. Offer (270) 563-4618 or take a message for the crew.',
      }),
    };
  }
  return { output: JSON.stringify({ transfer_available: true }), transferTargetUri: target };
}

// Returns { output } — the JSON string handed back to the Live session — and
// transferTargetUri when the call should be handed to the counter.
export async function runSmashieTool(base44, { name, args = {}, callerPhone, sessionId }) {
  const needed = { place_order: 'orders', lookup_menu: 'menu', burger_toppings: 'menu', shake_menu: 'menu', take_message: 'messages', transfer_to_counter: 'transfer' }[name];
  if (needed && !abilityEnabled(await getSmashieSettings(base44), needed)) {
    return { output: JSON.stringify({ error: 'This ability is currently unavailable.' }) };
  }
  switch (name) {
    case 'lookup_menu':
      return lookupMenu(base44, args);
    case 'burger_toppings':
      return invokeFunction(base44, 'deluxeOrderHelper', {});
    case 'shake_menu':
      return invokeFunction(base44, 'milkshakeOrderHelper', {});
    case 'place_order':
      return placeOrder(base44, args, callerPhone);
    case 'take_message':
      return takeMessage(base44, args, callerPhone, sessionId);
    case 'transfer_to_counter':
      return requestTransfer(base44);
    default:
      return { output: JSON.stringify({ error: `Unknown tool ${name}` }) };
  }
}