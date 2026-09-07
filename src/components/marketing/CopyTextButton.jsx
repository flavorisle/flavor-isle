import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

// Small copy-to-clipboard pill used across the marketing toolkit pages.
export default function CopyTextButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={onCopy}
      className="flex items-center gap-2 text-xs font-heading uppercase tracking-widest px-3 py-1.5 rounded-full bg-midnight-cherry text-white hover:opacity-90 transition-opacity"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : label}
    </button>
  );
}