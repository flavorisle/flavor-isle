import React, { useEffect, useMemo, useState } from 'react';
import { deriveFoodBuilds } from '@/lib/foodBuilds';
import { getMenuSetting } from '@/lib/menuSettings';
import { applyModifierOverrides, getModifierOverrides, EMPTY_OVERRIDES } from '@/lib/modifierOverrides';
import FoodBuildCard from '@/components/admin/FoodBuildCard';

// Food Builds tab: the loaded fries the crew builds by stacking Square
// modifiers on the base fries. The store's modifier overrides are applied here
// too, so a preselected option (Ranch) and a one-of cap (one sauce) show exactly
// as the customer's picker will.
export default function AdminFoodBuilds({ items = [] }) {
  const [overrides, setOverrides] = useState(EMPTY_OVERRIDES);

  useEffect(() => {
    let cancelled = false;
    getMenuSetting()
      .then((setting) => { if (!cancelled) setOverrides(getModifierOverrides(setting)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const builds = useMemo(
    () => deriveFoodBuilds(items).map((build) => ({
      ...build,
      groups: applyModifierOverrides(build.groups, overrides),
    })),
    [items, overrides],
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Each card starts with the base fries, then stacks that item's own Square modifier groups on top.
        Ticked tiles are the options the store preselects. Options, prices, defaults and selection rules print exactly as Square holds them.
      </p>

      {builds.map((build) => build.loaded ? (
        <FoodBuildCard key={build.key} build={build} />
      ) : (
        <div key={build.key} className="card-diner p-5">
          <p className="font-heading text-lg text-obsidian-roast">{build.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Its Square item isn't in the menu catalog yet. Run “Sync from Square” above and the card fills in.
          </p>
        </div>
      ))}
    </div>
  );
}