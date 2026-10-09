# Builder report: homepage_order_direct_merge_2026-09-21

## Homepage Order-Direct Merge

**Status:** approved  
**App entity:** BuilderReport `6ab0bfa956e2c654b3334c48`

### Before

WhyFlavorIsle.jsx: 4 cards (Fresh Every Day, Made to Order, Community Roots, Hot & Fast), heading only, no subtitle, no rewards. WhyOrderDirect.jsx: separate section — 'Order Direct. Get More.' eyebrow, 'Why Order Straight From Us?' h2, intro paragraph, 3 reason cards (No App Markups, Talk to the Kitchen, Support Local), + Star Rewards block. Home.jsx: imported & rendered both sections sequentially.

### After

WhyFlavorIsle.jsx: heading kept; centered subtitle 'We love seeing you walk through the door.' added; 5th card 'Support Local' added; Star Rewards block moved in VERBATIM (word-for-word identical — badge, title, paragraph, both buttons, gradient panel all unchanged). WhyOrderDirect.jsx: DELETED. Home.jsx: WhyOrderDirect import + usage removed; WhyFlavorIsle kept in place. ROLLBACK: restore WhyOrderDirect.jsx, revert WhyFlavorIsle.jsx to 4-card version, re-add import+<WhyOrderDirect/> in Home.jsx. No other section/notification/menu/pricing changed.
