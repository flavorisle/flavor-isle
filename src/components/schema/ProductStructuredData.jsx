import React from 'react';
import { productPath } from '@/lib/productSlug';

// MenuItem JSON-LD for /product/:slug (Nov 9 2026, AI visibility). The price is
// the live item price, so an assistant can answer "how much is a cheeseburger"
// from the markup instead of guessing. Renders nothing until the item loads.
export default function ProductStructuredData({ item }) {
  if (!item?.name) return null;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: item.name,
    ...(item.description ? { description: item.description } : {}),
    ...(item.image_url_opt || item.image_url ? { image: item.image_url_opt || item.image_url } : {}),
    url: `https://flavor-isle.com${productPath(item)}`,
    ...(Number(item.price) > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: Number(item.price).toFixed(2),
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            seller: { '@type': 'Restaurant', name: 'Flavor Isle', url: 'https://flavor-isle.com' },
          },
        }
      : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
