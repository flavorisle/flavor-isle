// Executes the tools Smashie's delegated backend asks for during a Live SIP
// call. Thin wrappers over the functions the phone line already uses, so the
// SIP pipeline and the current Twilio pipeline place orders the same way.
import { getSmashieSettings } from './smashieSettings.ts';
import { abilityEnabled } from './smashieAdminContext.ts';
import { searchMenu } from './smashieMenuSearch.ts';

// The explicit limit matters: without one, only the first page of the menu is
// searched and later items would read as "not on the menu".
async function lookupMenu(base44, args) {
  const items = await base44.asServiceRole.entities.MenuItem.filter({ is_available: true }, '-created_date', 500);
  return { output: JSON.stringify(searchMenu(items, args)) };
}

async function invokeFunction(base44, name, payload) {
  // The tools these wrap are keyed to this app's own backend, so a caller from
  // outside cannot drive them directly.
  const res = await base44.asServiceRole.functions.invoke(name, { relay_key: relayKeyValue(), ...payload });
  const data = res?.data ?? res;
  return { output: JSON.stringify(data) };
}

async function placeOrder(base44, args, callerPhone, sessionId) {
  return invokeFunction(base44, 'logPhoneOrder', {
    // The call id travels with the order so a handover that briefly puts two
    // workers on the same call can never turn one order into two.
    call_sid: sessionId,
    customer_name: args.customer_name,
    customer_phone: args.customer_phone || callerPhone,
    customer_email: args.customer_email || undefined,
    order_type: args.order_type || 'pickup',
    payment_method: args.payment_method || 'card',
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

// A REFER destination has to be a routing address. A phone number cannot be
// handed to it, so a number is treated as no transfer target at all rather than
// sending a handoff that cannot connect.
function routingAddress(value) {
  const configured = String(value || '').trim();
  if (!configured) return '';
  if (/^tel:/i.test(configured) || /^\+?[\d\s().-]{7,}$/.test(configured)) return '';
  // A bare user@domain address gets the scheme the REFER needs.
  return /^sips?:/i.test(configured) ? configured : `sip:${configured}`;
}

// The counter address lives in SmashieSettings (Admin → Communications) so the
// crew can see and update it; the SIP_TRANSFER_TARGET secret stays as the
// fallback for when the field is blank.
async function requestTransfer(base44) {
  const settings = await getSmashieSettings(base44);
  const target = routingAddress(settings.sip_transfer_target) || routingAddress(Deno.env.get('SIP_TRANSFER_TARGET'));
  const counterPhone = Deno.env.get('COUNTER_PHONE_NUMBER');
  if (!target) {
    return {
      output: JSON.stringify({
        transfer_available: false,
        note: counterPhone
          ? `The counter line cannot take a transfer right now. Offer ${counterPhone} or take a message for the crew.`
          : 'The counter line cannot take a transfer right now. Take a message for the crew.',
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
      return placeOrder(base44, args, callerPhone, sessionId);
    case 'take_message':
      return takeMessage(base44, args, callerPhone, sessionId);
    case 'transfer_to_counter':
      return requestTransfer(base44);
    default:
      return { output: JSON.stringify({ error: `Unknown tool ${name}` }) };
  }
}