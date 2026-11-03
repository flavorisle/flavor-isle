import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Small pop-up describing one stop on the Smiths Grove walking map.
export default function StopDetailDialog({ stop, onClose }) {
  return (
    <Dialog open={!!stop} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        {stop && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center justify-center w-6 h-6 rounded-full border border-obsidian-roast/60 font-body text-[11px] text-obsidian-roast">
                  {stop.n}
                </span>
                <span className="font-body text-[10px] tracking-[0.18em] uppercase text-midnight-cherry">
                  Stop {stop.n} of 14
                </span>
              </div>
              <DialogTitle className="font-heading text-2xl leading-tight text-obsidian-roast">
                {stop.name}
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="font-body text-sm leading-relaxed text-obsidian-roast">
              {stop.detail}
            </DialogDescription>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}