import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Single canonical host for the site. Every page sets its own canonical URL
// so Google consolidates flavor-isle.com and flavor-isle.com onto one
// host instead of indexing duplicate copies.
const BASE = 'https://flavor-isle.com';

export default function CanonicalLink() {
  const { pathname } = useLocation();
  useEffect(() => {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    const path = pathname === '/' ? '' : pathname;
    link.setAttribute('href', `${BASE}${path}`);
  }, [pathname]);
  return null;
}