import React from 'react';
import { menuSchema } from '@/lib/schemaMarkup';

// Menu JSON-LD for the menu page (issue #37, step 4). Renders the sections and
// item names the page is displaying right now, from the live menu data.
export default function MenuStructuredData({ rows, renames }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(menuSchema(rows, renames)) }}
    />
  );
}