import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2024-01-18';

// Pushes the signed-in customer's profile (name + phone) to their Square
// customer directory record so the online account and the in-store POS
// customer stay in sync. Finds the Square customer by email; updates name
// and phone, or creates one if none exists. Called from the Account profile
// save so "whatever I set there updates my Square account".
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Not signed in' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { full_name, phone } = body || {};

    const connection = await base44.asServiceRole.connectors.getConnection('square');
    if (!connection?.accessToken) {
      return Response.json({ error: 'Square is not connected' }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION,
    };

    const normalizedEmail = user.email.toLowerCase().trim();

    // Split full name into given/family for Square's fields.
    const parts = (full_name || '').trim().split(/\s+/);
    const givenName = parts[0] || '';
    const familyName = parts.slice(1).join(' ') || '';

    // 1. Find the existing Square customer by email.
    let customerId: string | null = null;
    try {
      const searchRes = await fetch(`${SQUARE_API}/customers/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: { filter: { email_address: { exact: normalizedEmail } } },
          limit: 1,
        }),
      });
      const searchData = await searchRes.json();
      customerId = searchData?.customers?.[0]?.id || null;
    } catch (err) {
      console.error('Square customer search failed:', (err as Error).message);
    }

    // 2. Update the existing customer's name + phone.
    if (customerId) {
      const updateBody: any = { email_address: normalizedEmail };
      if (givenName) updateBody.given_name = givenName;
      if (familyName) updateBody.family_name = familyName;
      if (phone) updateBody.phone_number = phone;

      const updRes = await fetch(`${SQUARE_API}/customers/${customerId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(updateBody),
      });
      const updData = await updRes.json();

      if (updData?.customer) {
        return Response.json({
          success: true,
          action: 'updated',
          squareCustomerId: updData.customer.id,
          name: `${updData.customer.given_name || ''} ${updData.customer.family_name || ''}`.trim(),
          phone: updData.customer.phone_number,
        });
      }
      // A customer already exists for this email but couldn't be edited
      // (e.g. POS-managed record). Don't create a duplicate — return it as-is
      // so the caller knows the account is linked even if some fields differ.
      console.error('Square customer update failed:', JSON.stringify(updData?.errors || updData));
      return Response.json({
        success: true,
        action: 'exists_uneditable',
        squareCustomerId: customerId,
        message: 'Square customer exists but could not be updated via API',
      });
    }

    // 3. No Square customer found for this email — create one.
    const createRes = await fetch(`${SQUARE_API}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idempotency_key: `base44-sync-${normalizedEmail}-${Date.now()}`,
        email_address: normalizedEmail,
        given_name: givenName,
        family_name: familyName,
        phone_number: phone || undefined,
      }),
    });
    const createData = await createRes.json();

    if (createData?.customer) {
      return Response.json({
        success: true,
        action: 'created',
        squareCustomerId: createData.customer.id,
        name: `${createData.customer.given_name || ''} ${createData.customer.family_name || ''}`.trim(),
        phone: createData.customer.phone_number,
      });
    }

    return Response.json({
      success: false,
      error: 'Could not update or create Square customer',
      details: createData?.errors,
    }, { status: 502 });
  } catch (error) {
    console.error('syncCustomerToSquare error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}