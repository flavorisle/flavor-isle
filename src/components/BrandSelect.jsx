import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function BrandOption({ value, children }) {
  return <SelectItem value={value}>{children}</SelectItem>;
}

// A styled wrapper around the Radix UI Select that matches the app's
// premium rounded-corner look used across input fields.
export default function BrandSelect({ value, onValueChange, placeholder, className, contentClassName, children }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          'h-auto w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm font-body text-obsidian-roast shadow-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry data-[placeholder]:text-muted-foreground',
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn('rounded-2xl border-border bg-popover max-h-72', contentClassName)}>
        {children}
      </SelectContent>
    </Select>
  );
}