import React from 'react';

// FAQPage JSON-LD for the Star Rewards page. Built from the same array that
// renders the visible FAQ, so the structured data can never drift from what a
// visitor (or a crawler) reads on the page.
export default function RewardsFaqStructuredData({ faqs }) {
  if (!faqs?.length) return null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://flavor-isle.com/rewards#faq',
    url: 'https://flavor-isle.com/rewards',
    about: { '@type': 'Restaurant', name: 'Flavor Isle', '@id': 'https://flavor-isle.com/#restaurant' },
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}