import { settleSquareCheckoutOrder } from './squareCheckoutSettlement.ts';

// Phone payment links are Square hosted checkouts, so the verification and
// settlement rules live in one shared place (squareCheckoutSettlement.ts) that
// the website's secure payment page uses as well. Behavior is unchanged: same
// exact-total rule, same single POS ticket, same push to Square + the kitchen.
export async function settleSquarePhonePayment(base44, order, suppliedSquareOrder = null) {
  return await settleSquareCheckoutOrder(base44, order, suppliedSquareOrder);
}