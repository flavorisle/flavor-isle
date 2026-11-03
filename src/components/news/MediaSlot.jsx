import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// One upload area in the news composer — `media` is { url, kind } or null.
export default function MediaSlot({ label, media, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange({ url: file_url, kind: file.type.startsWith('video/') ? 'video' : 'image' });
    } catch {
      setError('Upload failed — try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (media?.url) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-2xl border border-border bg-white">
        {media.kind === 'video' ? (
          <video src={media.url} className="w-16 h-16 rounded-xl object-cover bg-black" muted playsInline />
        ) : (
          <img src={media.url} alt="" className="w-16 h-16 rounded-xl object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-body text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-sm text-obsidian-roast">{media.kind === 'video' ? 'Video attached' : 'Photo attached'}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Remove ${label} media`}
          className="tap-44 flex items-center justify-center text-muted-foreground hover:text-midnight-cherry"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full min-h-[52px] px-4 py-3 rounded-2xl border-2 border-dashed border-border bg-white font-body text-sm text-obsidian-roast inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Upload size={15} />
        {busy ? 'Uploading…' : `Add ${label}`}
      </button>
      <p className="font-body text-[11px] text-muted-foreground mt-1">Photo or video</p>
      {error && <p className="font-body text-[11px] text-midnight-cherry mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}