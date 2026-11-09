import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, UtensilsCrossed, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import { getMenuSetting } from '@/lib/menuSettings';
import { itemCategoryKey, categoryLabel, sortCategories } from '@/lib/menuCategory';
import { optimizedImageUrl } from '@/lib/utils';

// Emoji per category, matched loosely so admin-defined categories still get an
// icon instead of the generic plate.
const CATEGORY_ICONS = {
  burger: '🍔',
  chicken: '🍗',
  side: '🍟',
  shake: '🥤',
  drink: '🧃',
  breakfast: '🍳',
  special: '⭐',
  dessert: '🍰',
  combo: '🌯',
  whirl: '🥤',
};

const iconFor = (key) => {
  const k = (key || '').toLowerCase();
  for (const [word, emoji] of Object.entries(CATEGORY_ICONS)) {
    if (k.includes(word)) return emoji;
  }
  return '🍽️';
};

// One card per menu category (burgers, shakes, sides…) so a customer can find
// the section they want and jump straight to it on the menu. Grouping, renames,
// hiding and sort order all follow the same MenuSetting the menu page uses.
export default function MenuCategories() {
  const [items, setItems] = useState([]);
  const [setting, setSetting] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await getMenuSetting();
        setSetting(s || {});
      } catch (e) {
        // A missing settings record just means default order and no renames.
      }
      try {
        const data = await base44.entities.MenuItem.list();
        setItems((data || []).filter((i) => !i.is_hidden));
      } catch (e) {
        // Falls through to the empty state.
      }
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const hidden = setting.hidden_categories || [];
    const order = setting.category_sort_order || [];
    const renames = setting.category_renames || {};

    const grouped = {};
    for (const item of items) {
      const key = itemCategoryKey(item);
      if (hidden.includes(key)) continue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return sortCategories(Object.keys(grouped), order).map((key) => {
      const list = grouped[key];
      const prices = list.map((i) => Number(i.price)).filter((p) => Number.isFinite(p) && p > 0);
      const withPhoto = list.find((i) => i.image_url_opt || i.image_url);
      return {
        key,
        label: categoryLabel(key, renames),
        count: list.length,
        from: prices.length ? Math.min(...prices) : null,
        photo: withPhoto ? withPhoto.image_url_opt || withPhoto.image_url : null,
        icon: iconFor(key),
      };
    });
  }, [items, setting]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        path="/menu-categories"
        title="Menu Categories | Burgers, Shakes & Sides — Flavor Isle"
        description="Browse the Flavor Isle menu by category — burgers, chicken, sides, milkshakes, drinks and more. Find what you want and jump straight to it."
      />
      <Navbar />
      <CartDrawer />

      <section className="bg-obsidian-roast text-white px-4 sm:px-6 py-14">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-heading uppercase tracking-widest mb-2 text-smashie-yellow">
            FIND YOUR FAVORITE
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl leading-tight">Menu Categories</h1>
          <p className="font-body text-white/85 mt-4 max-w-2xl">
            Burgers, shakes, sides — pick the section you're after and jump straight to it on the menu.
          </p>
          <Link
            to="/menu"
            className="btn-yellow chrome-hover inline-flex items-center gap-2 mt-6 px-6 py-3 text-sm font-heading"
          >
            See the full menu <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">
            <Loader2 size={32} className="animate-spin mx-auto mb-3" />
            <p className="font-heading">Loading categories…</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="card-diner p-10 text-center">
            <UtensilsCrossed size={32} className="mx-auto mb-3 text-midnight-cherry" />
            <h2 className="font-heading text-2xl text-obsidian-roast mb-2">Nothing on the board right now</h2>
            <p className="text-sm text-muted-foreground">Check the full menu again in a moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                to="/menu"
                state={{ category: cat.key }}
                className="card-diner overflow-hidden flex flex-col group"
              >
                <div className="relative h-40 bg-patina-mint flex items-center justify-center overflow-hidden">
                  {cat.photo ? (
                    <img
                      src={optimizedImageUrl(cat.photo, 600, 400, 'fit')}
                      alt={`${cat.label} at Flavor Isle`}
                      width="600"
                      height="400"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-6xl" aria-hidden="true">{cat.icon}</span>
                  )}
                  <span className="absolute top-3 left-3 bg-white/90 text-obsidian-roast rounded-full px-3 py-1 font-heading text-xs tracking-wide">
                    {cat.count} item{cat.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="p-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-heading text-2xl text-obsidian-roast leading-tight truncate">
                      <span className="mr-2" aria-hidden="true">{cat.icon}</span>
                      {cat.label}
                    </h2>
                    {cat.from !== null && (
                      <p className="text-sm text-muted-foreground">From ${cat.from.toFixed(2)}</p>
                    )}
                  </div>
                  <ArrowRight
                    size={20}
                    className="flex-shrink-0 text-midnight-cherry transition-transform group-hover:translate-x-1"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}