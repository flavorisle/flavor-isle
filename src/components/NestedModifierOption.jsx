import React from 'react';
import ModifierTile from '@/components/ModifierTile';
import { getModifierPhoto } from '@/lib/modifierPhotos';
import { modifierLevelOptions, levelFromNested, withModifierLevel } from '@/lib/modifierLevels';
import { atMax } from '@/lib/modifierRules';

export default function NestedModifierOption({ mod, list, selections = {}, onChange }) {
  const multiple = list.selection_type === 'MULTIPLE';
  const current = selections[list.name];
  const picks = multiple ? (current || []) : current ? [current] : [];
  const chosen = picks.find((option) => option.id === mod.id);
  const select = (level) => {
    if (mod.sold_out || (!chosen && level != null && multiple && atMax(list, picks))) return;
    const next = level == null ? null : {
      ...mod, nestedSelections: withModifierLevel(mod, chosen?.nestedSelections, level),
    };
    const updated = multiple
      ? chosen ? picks.flatMap((option) => option.id === mod.id ? next ? [next] : [] : [option])
        : next ? [...picks, next] : picks
      : next;
    onChange({ ...selections, [list.name]: updated });
  };
  return (
    <ModifierTile
      name={mod.name}
      price={mod.price}
      photo={getModifierPhoto(mod.name)}
      disabled={mod.sold_out}
      state={chosen ? (levelFromNested(chosen.nestedSelections) || 'reg') : null}
      levels={modifierLevelOptions(mod)}
      onSelect={select}
    />
  );
}