// Restaurant Guru 2026 "Best takeaway food in Smiths Grove" circular award badge.
import React, { useEffect } from 'react';

const AWARD_CSS = 'https://awards.infcdn.net/delivery_takeaway/delivery_circ_large.css';
const ICON = 'https://restaurantguru.com/css/badge/img/takeaway_red.svg';
const LISTING_URL = 'https://restaurantguru.com/Flavor-Isle-Smiths-Grove';
const VENDOR_URL = 'https://restaurantguru.com';

export default function RestaurantGuruTakeawayBadge() {
  useEffect(() => {
    const id = 'rg-takeaway-award-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = AWARD_CSS;
    document.head.appendChild(link);
  }, []);

  const openListing = (event) => {
    if (event.target.closest && event.target.closest('a')) return;
    window.open(LISTING_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div id="delivery_bage_circ" className="en">
      <div
        className="bage_wrapper"
        onClick={openListing}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.open(LISTING_URL, '_blank', 'noopener,noreferrer');
          }
        }}
        role="link"
        tabIndex={0}
        aria-label="Restaurant Guru 2026 Best takeaway food in Smiths Grove award for Flavor Isle"
      >
        <div
          className="bage_icon"
          style={{ background: `url('${ICON}') no-repeat center center` }}
        >
          &nbsp;
        </div>
        <a className="bage_header" href={LISTING_URL} target="_blank" rel="noopener noreferrer">
          Flavor Isle
        </a>
        <div className="bage_city">
          <span>Best takeaway food</span>
          <span className="bage_city_name">in Smiths Grove</span>
        </div>
        <a className="bage_title" href={VENDOR_URL} target="_blank" rel="noopener noreferrer">
          <span>on Restaurant Guru</span>
          <span>2026</span>
        </a>
      </div>
    </div>
  );
}