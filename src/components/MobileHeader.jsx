import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

// Floating mobile back control, shown only on nested (non-home) routes
// under the md breakpoint as a native-style back affordance.
// Root tab screens — no back button there (the bottom tab bar is the nav affordance).
const PRIMARY = ['/', '/menu', '/order-status', '/account'];

export default function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  if (PRIMARY.includes(location.pathname)) return null;
  if (window.matchMedia('(min-width: 768px)').matches) return null;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <button
      onClick={goBack}
      className="md:hidden fixed left-4 z-[55] tap-44 flex items-center gap-1.5 glass-back select-none"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
      aria-label="Go back"
    >
      <ChevronLeft size={18} className="text-midnight-cherry" />
      <span className="text-xs font-heading uppercase tracking-wide text-obsidian-roast">Back</span>
    </button>
  );
}