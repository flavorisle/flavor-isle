export async function squarePhoneApi(base44) {
  const { accessToken, connectionConfig } = await base44.asServiceRole.connectors.getConnection('square');
  const request = async (path, method = 'GET', body = undefined) => {
    const response = await fetch(`https://connect.squareup.com/v2/${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': '2026-09-16', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.errors?.map(error => error.detail || error.code).join('; ') || 'Square payment request failed.');
    return data;
  };
  const location = async () => connectionConfig?.locationId || (await request('locations')).locations?.find(item => item.status === 'ACTIVE')?.id;
  return { request, location };
}