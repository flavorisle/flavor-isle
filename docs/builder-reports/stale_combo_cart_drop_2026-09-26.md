# Builder report: stale_combo_cart_drop_2026-09-26

3 items in this batch.

## Stale-combo cart drop — FINAL STATUS: live (re-verified 2026-09-27)

**Status:** applied  
**App entity:** BuilderReport `6ab885f42683f168dbf6e2c6`

### Before

const [cartItems, setCartItems] = useState(() => readSession('cartItems', []));
...
setCartItems(saved.cartItems);

### After

const dropComboLines = (items) =>
  (items || []).filter(i => !i?.comboConfigId && !i?.comboComponents);

const [cartItems, setCartItems] = useState(() => dropComboLines(readSession('cartItems', [])));
...
setCartItems(dropComboLines(saved.cartItems));

---

## Cart load from saved CustomerProfile cart — drop stale combo lines (src/context/CartContext.jsx)

**Status:** applied  
**App entity:** BuilderReport `6ab83ca4d3d2396e26d733bb`

### Before

setCartItems(saved.cartItems);

### After

setCartItems(dropComboLines(saved.cartItems));

---

## Cart load from sessionStorage — drop stale combo lines (src/context/CartContext.jsx)

**Status:** applied  
**App entity:** BuilderReport `6ab83ca4d3d2396e26d733ba`

### Before

const [cartItems, setCartItems] = useState(() => readSession('cartItems', []));

### After

const dropComboLines = (items) => (items || []).filter(i => !i?.comboConfigId && !i?.comboComponents);

const [cartItems, setCartItems] = useState(() => dropComboLines(readSession('cartItems', [])));
