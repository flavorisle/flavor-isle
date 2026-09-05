import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { isKeepAliveTab } from "@/lib/keepAliveTabs";

const getHashId = (hash) => {
  const rawId = hash.slice(1);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;

    // Keep-alive tab routes restore their own saved scroll position (handled
    // in App.jsx), so don't force them to the top on tab switches.
    if (isKeepAliveTab(pathname) && !hash) return;

    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}