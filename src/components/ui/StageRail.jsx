import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Horizontal stage rail (issue #339). Completed stages are filled, the current
// stage is ringed (and pulses only for visitors who have not asked for reduced
// motion), and stages still ahead are muted. `aria-current="step"` marks the
// live stage for a screen reader.
export default function StageRail({ stages = [], current, className }) {
  const currentIndex = stages.findIndex((stage) => stage.key === current);

  return (
    <ol role="list" className={cn('flex w-full items-start gap-1', className)}>
      {stages.map((stage, i) => {
        const done = currentIndex > -1 && i < currentIndex;
        const active = i === currentIndex;
        return (
          <li
            key={stage.key}
            aria-current={active ? 'step' : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 font-heading text-xs',
                done && 'border-midnight-cherry bg-midnight-cherry text-white',
                active && 'border-midnight-cherry bg-white text-midnight-cherry ring-2 ring-midnight-cherry/30 motion-safe:animate-pulse',
                !done && !active && 'border-border bg-white text-muted-foreground',
              )}
            >
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span
              className={cn(
                'text-xs font-semibold leading-tight',
                active ? 'text-midnight-cherry' : done ? 'text-obsidian-roast' : 'text-muted-foreground',
              )}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}