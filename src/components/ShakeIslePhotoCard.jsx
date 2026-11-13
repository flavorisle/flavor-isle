import React from 'react';
import { Link } from 'react-router-dom';
import { optimizedImageUrl } from '@/lib/utils';

// Real Flavor Isle chocolate milkshake photo (Square menu asset) — the Shake
// Isle entry in the Fan Favorites rail links to the milkshake menu instead of
// opening a single product, so it gets its own photo card built like
// FavoritePhotoCard.
const SHAKE_ISLE_IMAGE = 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/a4d8b6451_menu-item-kse4vpwxpfh43ro5vmorgjxd-800x800.webp';

export default function ShakeIslePhotoCard({ flavorCount }) {
  // Live count only — never a hardcoded number. Until it loads, just the name.
  const title = flavorCount ? `Shake Isle — ${flavorCount} flavors` : 'Shake Isle';

  return (
    <Link to="/milkshakes" className="block card-diner overflow-hidden group focus-visible:outline-2 focus-visible:outline-primary" aria-label="View Shake Isle milkshakes">
      <div className="aspect-[4/3] overflow-hidden">
        <img src={optimizedImageUrl(SHAKE_ISLE_IMAGE, 500, 500)} alt="Shake Isle chocolate milkshake" width="500" height="500" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <span className="font-heading text-lg text-obsidian-roast leading-tight">{title}</span>
      </div>
    </Link>
  );
}