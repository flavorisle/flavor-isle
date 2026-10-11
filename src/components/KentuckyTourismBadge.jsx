import React from 'react';

const LISTING_URL = 'https://www.kentuckytourism.com/explore/flavor-isle-20084';

export default function KentuckyTourismBadge() {
  return (
    <a
      href={LISTING_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Flavor Isle, listed on KentuckyTourism.com"
      className="inline-flex items-center gap-3 h-14 rounded-2xl bg-white border border-[#E5E0D6] px-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <span className="w-10 h-10 rounded-md bg-[#0082B4] flex items-center justify-center flex-shrink-0">
        <img src="/logos/kentucky-tourism.svg" alt="" aria-hidden="true" className="w-7 h-7" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-heading text-sm font-bold text-[#2B1F1A]">KENTUCKY TOURISM</span>
        <span className="text-xs text-[#0082B4] mt-1">Listed on KentuckyTourism.com</span>
      </span>
    </a>
  );
}