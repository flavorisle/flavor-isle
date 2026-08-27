// Bottom-tab routes that are kept mounted (toggled with a `hidden` class)
// so their view state and scroll position survive tab switches instead of
// being unmounted by the router. Shared between App.jsx and ScrollToTop.
export const KEEP_ALIVE_TABS = ['/', '/menu'];

export const isKeepAliveTab = (pathname) => KEEP_ALIVE_TABS.includes(pathname);