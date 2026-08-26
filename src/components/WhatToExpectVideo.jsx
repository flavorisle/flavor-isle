import React, { useRef, useState, useEffect } from 'react';

// Three 8-second generated clips that play back-to-back as one continuous
// ~24-second tour of the What to Expect page: exterior → interior → food & busyness.
const SEGMENTS = [
  {
    src: 'https://media.base44.com/videos/public/6a3d84f2fe4ae4efe7f629bf/9f74f924f_FI_Tour_-_Exterior.mp4',
    label: 'The spot',
  },
  {
    src: 'https://media.base44.com/videos/public/6a3d84f2fe4ae4efe7f629bf/2d794ac78_FI_Tour_-_Interior.mp4',
    label: 'Inside',
  },
  {
    src: 'https://media.base44.com/videos/public/6a3d84f2fe4ae4efe7f629bf/94f343cf3_FI_Tour_-_Food___Busyness.mp4',
    label: 'Food & wait times',
  },
];

export default function WhatToExpectVideo() {
  const videoRef = useRef(null);
  const [index, setIndex] = useState(0);

  // When the current segment ends, advance to the next; loop back to the
  // first segment after the last one finishes so the tour replays.
  const handleEnded = () => {
    setIndex((prev) => (prev + 1) % SEGMENTS.length);
  };

  // Load + play the new segment whenever the index changes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    const play = v.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
  }, [index]);

  return (
    <div className="card-diner overflow-hidden mb-8">
      <video
        ref={videoRef}
        src={SEGMENTS[index].src}
        controls
        playsInline
        preload="metadata"
        onEnded={handleEnded}
        className="w-full aspect-video object-cover bg-black"
        aria-label={`Flavor Isle What to Expect tour — ${SEGMENTS[index].label}`}
      />
      <div className="flex items-center justify-between px-4 py-2.5 bg-white">
        <span className="text-xs font-heading text-obsidian-roast tracking-wider uppercase">
          {SEGMENTS[index].label}
        </span>
        <div className="flex items-center gap-1.5">
          {SEGMENTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Play segment ${i + 1}`}
              className={`h-2 rounded-full transition-all tap-44 ${
                i === index ? 'w-6 bg-midnight-cherry' : 'w-2 bg-muted hover:bg-midnight-cherry/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}