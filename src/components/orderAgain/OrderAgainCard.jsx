import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, Pencil } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { optimizedImageUrl } from '@/lib/utils';
import { productPath } from '@/lib/productSlug';
import { buildReorderLine, reorderCartItems } from '@/lib/reorderLine';

// One thing the customer ordered before, as a card: today's price and photo, the
// build they chose last time, and two ways to act — add it again in one tap, or
// open it to change something first.
const MAX_LINES = 5;

export default function OrderAgainCard({ item, stored, orderingEnabled }) {
  const navigate = useNavigate();
  const { addItem, menuSetting } = useCart();
  const [added, setAdded] = useState(false);
  const { lines, price } = buildReorderLine(item, stored, menuSetting);
  const shown = lines.slice(0, MAX_LINES);
  const more = lines.length - shown.length;

  const handleAdd = () => {
    reorderCartItems(item, stored, menuSetting).forEach((line) => addItem(line));
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  // Editing opens the item page with this build already in place.
  const handleEdit = () => navigate(productPath(item), {
    state: {
      reorderItem: {
        selectedModifiers: stored?.selectedModifiers || [],
        flavorLevel: stored?.flavorLevel,
        quantity: stored?.quantity,
      },
    },
  });

  const imageUrl = item.image_url_opt || item.image_url;

  return (
    <div className="snap-start flex-shrink-0 w-72 card-diner overflow-hidden flex flex-col">
      <div className="relative h-36 bg-gray-100">
        {imageUrl ? (
          <img
            src={optimizedImageUrl(imageUrl, 400, 400)}
            alt={item.name}
            width="400"
            height="400"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-amber-50 to-orange-100">⭐</div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <p className="font-heading text-base text-obsidian-roast leading-tight">{item.name}</p>
        <p className="text-sm text-patina-mint font-semibold mb-2">${price.toFixed(2)}</p>

        {shown.length > 0 && (
          <ul className="space-y-0.5 mb-3">
            {shown.map((line, i) => (
              <li key={`${line.id || line.name}-${i}`} className="text-xs text-muted-foreground leading-snug">
                {line.name}
              </li>
            ))}
            {more > 0 && <li className="text-xs text-muted-foreground">+{more} more</li>}
          </ul>
        )}
        {shown.length === 0 && <p className="text-xs text-muted-foreground mb-3">As it comes</p>}

        <div className="flex items-center gap-2 mt-auto">
          <button
            onClick={handleAdd}
            disabled={!orderingEnabled || added}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-heading transition-all ${added ? 'bg-patina-mint text-white' : 'btn-cherry chrome-hover'} disabled:opacity-60`}
          >
            {added ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add to Bag</>}
          </button>
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-heading bg-patina-mint/10 text-patina-mint hover:bg-patina-mint/20 transition-colors"
            aria-label={`Edit ${item.name} before adding`}
          >
            <Pencil size={12} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}