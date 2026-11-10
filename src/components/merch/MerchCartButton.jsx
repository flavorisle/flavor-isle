// Tasty Threads floating cart trigger.
import React from 'react';
import { Shirt } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMerchCart } from '@/context/MerchCartContext';

// Floating merch-cart trigger for the storefront. Separate from the food cart
// emblem so the two order flows never collide.
export default function MerchCartButton() {
  const { totalItems, setIsCartOpen } = useMerchCart();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => pathname === '/merch' ? setIsCartOpen(true) : navigate('/merch')}
      className="relative p-1 rounded-full hover:opacity-90 transition"
      aria-label={pathname === '/merch' ? `Tasty Threads cart, ${totalItems} item${totalItems !== 1 ? 's' : ''}` : 'Shop Tasty Threads'}
    >
      <Shirt size={26} className="text-obsidian-roast" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-midnight-cherry text-white text-[10px] font-heading leading-none w-4 h-4 rounded-full flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </button>
  );
}