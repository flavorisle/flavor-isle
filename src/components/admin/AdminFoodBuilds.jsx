import React, { useMemo } from 'react';
import { deriveFoodBuilds } from '@/lib/foodBuilds';
import FoodBuildCard from '@/components/admin/FoodBuildCard';

// Food Builds tab: the loaded fries the crew builds by stacking Square
// modifiers on the base fries.
export default function AdminFoodBuilds({ items = [] }) {
  const builds = useMemo(() => deriveFoodBuilds(items), [items]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Each card starts with the base fries, then stacks that item's own Square modifier groups on top.
        Options, prices, defaults and selection rules print exactly as Square holds them.
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