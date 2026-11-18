import React from 'react';
import PrintAdSheet from '@/components/ads/PrintAdSheet';
import { AD_ARTWORK, AD_PAPER, AD_ART_SCALE, AD_PLACEMENT } from '@/lib/adPageGeometry';

export default function AdPaperPreview({ ad }) {
  return (
    <div className="force-light bg-card" style={{ position: 'relative', width: `${AD_PAPER.width}in`, height: `${AD_PAPER.height}in`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: `${AD_PLACEMENT.x}in`, top: `${AD_PLACEMENT.y}in`,
        width: AD_ARTWORK.width, height: AD_ARTWORK.height, transform: `scale(${AD_ART_SCALE})`, transformOrigin: 'top left' }}>
        <PrintAdSheet ad={ad} sheetId="ad-sheet-preview" />
      </div>
    </div>
  );
}