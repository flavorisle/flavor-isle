# Builder report: remove_guest_order_lookup_account_2026-09-23

## src/pages/Account.jsx — guest OrderLookup banner (unauthenticated view)

**Status:** applied  
**App entity:** BuilderReport `6ab433eded3df07360ac11ad`

### Before

) : (
  <div>
    {/* Order tracking — available to everyone, no sign-in needed */}
    <div className="bg-patina-mint/5 border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <p className="text-midnight-cherry text-sm font-heading uppercase tracking-widest mb-2">Track Your Order</p>
          <h2 className="font-heading text-4xl text-obsidian-roast mb-3">Where's My Food?</h2>
          <p className="text-muted-foreground font-body max-w-lg mx-auto">Drop in your order number and we'll tell you if it's still sizzling or ready to roll.</p>
        </div>
        <OrderLookup />
      </div>
    </div>
    <GuestAuth />
  </div>
)}

### After

) : (
  <GuestAuth />
)}
