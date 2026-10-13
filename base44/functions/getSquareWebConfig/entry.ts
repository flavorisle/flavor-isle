import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { squareWebConfig } from '../../shared/squareWebPay.ts';

// What the browser's on-site card form needs to initialize: the store's Square
// application id and location. Both are public values — neither can move money —
// and this endpoint is public because the payment page is: the customer arrives
// there from checkout or from a text link, with no session.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const config = await squareWebConfig(base44);
    return Response.json(config);
  } catch (error) {
    console.error('getSquareWebConfig error:', (error as Error).message);
    return Response.json({ configured: false, reason: 'The card form is unavailable right now.' }, { status: 500 });
  }
}