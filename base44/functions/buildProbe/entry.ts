import { mapSquareStatus } from '../../shared/squareOrderStatus.ts';

export default async function(req) {
  return Response.json({
    nonce: 'roost-call-1441',
    evidence: 'App-workspace source snapshot captured at deployment; status results execute on the server.',
    tab_bar_file: 'src/components/BottomTabBar.jsx',
    tab_array: `  const tabs = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { call: true, label: 'Call', icon: Phone },
    { cart: true, label: 'Bag', icon: ShoppingBag },
    { smashie: true, label: 'Smashie', icon: Bot },
    { to: '/account', label: 'Account', icon: User },
  ];`,
    walkin_mapping_files: [
      'base44/shared/squareOrderStatus.ts',
      'base44/functions/syncSquarePOS/entry.ts',
    ],
    shop_cards_file: 'src/components/explore/StopCard.jsx',
    shops_inside_present: true,
    mapping_results: {
      register_open: mapSquareStatus('OPEN', { inStore: true }),
      default_open: mapSquareStatus('OPEN'),
      register_completed: mapSquareStatus('COMPLETED', { inStore: true }),
      register_canceled: mapSquareStatus('CANCELED', { inStore: true }),
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}