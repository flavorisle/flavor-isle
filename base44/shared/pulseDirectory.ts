// The Pulse customer directory client (issue #96, section B step 5).
//
// The admin Customers page searches the Pulse app's own Customer directory —
// that is the directory of record — and this module is the only place that talks
// to it.
//
// FAIL CLOSED: PULSE_API_KEY (and the Pulse app's API address, PULSE_API_URL)
// are added by Wesley, not by this build. When either is missing, every call
// refuses with a clear error saying exactly what is missing, so the page can
// show the reason instead of an empty result that looks like "no customers".

export const PULSE_NOT_CONFIGURED =
  'The Pulse customer directory is not connected yet: PULSE_API_URL and PULSE_API_KEY still have to be added to this app.';

export function pulseCredentials(): { apiKey: string; apiUrl: string } | null {
  const apiKey = (Deno.env.get('PULSE_API_KEY') || '').trim();
  const apiUrl = (Deno.env.get('PULSE_API_URL') || '').trim().replace(/\/$/, '');
  if (!apiKey || !apiUrl) return null;
  return { apiKey, apiUrl };
}

export function pulseConfigured(): boolean {
  return pulseCredentials() !== null;
}

// One page of the directory, filtered by whatever the admin typed. The search
// goes to Pulse as a server-side filter (phone, email, or name-contains) so the
// directory is never pulled into memory to be searched here.
export async function searchPulseCustomers(rawQuery: string, limit = 25) {
  const credentials = pulseCredentials();
  if (!credentials) throw new Error(PULSE_NOT_CONFIGURED);

  const query = String(rawQuery || '').trim();
  const digits = query.replace(/\D/g, '');
  const isEmail = /@/.test(query);
  const looksLikePhone = digits.length >= 7 && digits.length <= 11 && !isEmail;

  const url = new URL(`${credentials.apiUrl}/entities/Customer`);
  url.searchParams.set('limit', String(limit));

  if (looksLikePhone) {
    const last10 = digits.length > 10 ? digits.slice(-10) : digits;
    url.searchParams.set('normalized_phone[$regex]', last10);
  } else if (isEmail) {
    url.searchParams.set('email', query.toLowerCase());
  } else if (query) {
    url.searchParams.set('name[$regex]', query);
    url.searchParams.set('name[$options]', 'i');
  } else {
    url.searchParams.set('sort', '-last_order_date');
  }

  const response = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${credentials.apiKey}`,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`The Pulse directory did not answer (${response.status}). ${text.slice(0, 200)}`);
  }

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('The Pulse directory answered with something that was not JSON.');
  }
  const rows = Array.isArray(data) ? data : data?.items || data?.data || data?.records || [];
  return rows.map(mapPulseCustomer);
}

export function mapPulseCustomer(row: any) {
  return {
    pulse_customer_id: String(row?.id || row?.pulse_customer_id || ''),
    name: row?.name || '',
    phone: row?.phone || '',
    email: row?.email || '',
    normalized_phone: row?.normalized_phone || '',
    profile_id: row?.profile_id || '',
    source: row?.source || '',
    square_customer_id: row?.square_customer_id || '',
    online_orders: Number(row?.online_orders) || 0,
    online_total_spent: Number(row?.online_total_spent) || 0,
    in_store_orders: Number(row?.in_store_orders) || 0,
    in_store_total_spent: Number(row?.in_store_total_spent) || 0,
    first_order_date: row?.first_order_date || '',
    last_order_date: row?.last_order_date || '',
    last_order_source: row?.last_order_source || '',
    notes: row?.notes || '',
    birthday: row?.birthday || '',
  };
}