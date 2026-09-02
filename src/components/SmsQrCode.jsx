import React from 'react';
import { Download, QrCode } from 'lucide-react';

// In-store QR code that opens the SMS sign-up page. Rendered as a real,
// scannable QR image so it can be downloaded and submitted to Twilio /
// printed for the counter.
export default function SmsQrCode() {
  const target = `${window.location.origin}/sms-signup`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=16&color=003366&data=${encodeURIComponent(target)}`;

  return (
    <div className="card-diner p-6 sm:p-8 mt-8 text-center">
      <div className="flex items-center justify-center gap-2 text-midnight-cherry mb-2">
        <QrCode size={18} />
        <p className="font-heading text-sm tracking-[0.2em]">SCAN IN STORE</p>
      </div>
      <h2 className="font-heading text-2xl text-obsidian-roast mb-1">Text Updates QR Code</h2>
      <p className="text-sm text-muted-foreground mb-5">Point your camera at the code on our counter to sign up for Flavor Isle texts.</p>
      <img src={qrUrl} alt="QR code linking to the Flavor Isle SMS sign-up page" className="w-56 h-56 mx-auto rounded-2xl bg-white p-2 border border-border" />
      <p className="text-xs text-muted-foreground mt-3 break-all">{target}</p>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed max-w-md mx-auto">
        Scanning opts you in to recurring order notifications, payment links, and offers from Flavor Isle. Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help.
      </p>
      <a href={qrUrl} download="flavor-isle-sms-qr.png" target="_blank" rel="noopener noreferrer"
        className="btn-mint chrome-hover inline-flex items-center gap-2 px-5 py-3 text-sm font-heading mt-5">
        <Download size={15} /> Download QR Image
      </a>
    </div>
  );
}