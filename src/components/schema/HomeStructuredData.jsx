import React from 'react';
import { restaurantSchema } from '@/lib/schemaMarkup';

// Restaurant JSON-LD for the homepage (issue #37, step 4). Hours are passed in
// from the page so they always come from the live store settings entity; the
// block re-renders with the real schedule as soon as it loads.
export default function HomeStructuredData({ hours }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema(hours)) }}
    />
  );
}