import React from 'react';
import { Phone, MessageSquare, KeyRound, CheckCircle2, Circle, ExternalLink } from 'lucide-react';

// Compact setup card shown on the Phone Orders admin page so the operator can
// wire Twilio (voice + SMS) to the Smashie AI webhooks. The three Twilio secrets
// must be set on the main branch — they're shared app config and can't be set
// from a branch.
export default function PhoneOrderSetup() {
  const secrets = [
    { name: 'TWILIO_ACCOUNT_SID', desc: 'Twilio account SID (starts with AC…)' },
    { name: 'TWILIO_AUTH_TOKEN', desc: 'Twilio auth token' },
    { name: 'TWILIO_PHONE_NUMBER', desc: 'Your Twilio number in E.164 (e.g. +12705551234)' },
  ];

  const steps = [
    {
      icon: KeyRound,
      title: 'Add the Twilio secrets',
      body: (
        <>
          On the <span className="font-semibold text-obsidian-roast">main branch</span>, set these three app secrets (Settings → Secrets):
          <ul className="mt-2 space-y-1">
            {secrets.map((s) => (
              <li key={s.name} className="flex items-start gap-2">
                <Circle size={12} className="mt-1 flex-shrink-0 text-muted-foreground" />
                <span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-patina-mint">{s.name}</code>
                  <span className="text-muted-foreground"> — {s.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      icon: Phone,
      title: 'Point voice calls at the webhook',
      body: (
        <>
          In the Twilio console open your number → <span className="font-semibold text-obsidian-roast">Voice & Fax</span>. Set
          <span className="font-semibold text-obsidian-roast"> "A Call Comes In"</span> to
          <span className="font-semibold text-obsidian-roast"> Webhook · POST</span> and paste the
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-patina-mint mx-1">twilioVoiceWebhook</code>
          function URL (copy it from that function's page in the builder).
        </>
      ),
    },
    {
      icon: MessageSquare,
      title: 'Point text messages at the webhook',
      body: (
        <>
          On the same number → <span className="font-semibold text-obsidian-roast">Messaging</span>. Set
          <span className="font-semibold text-obsidian-roast"> "A Message Comes In"</span> to
          <span className="font-semibold text-obsidian-roast"> Webhook · POST</span> and paste the
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-patina-mint mx-1">twilioSmsWebhook</code>
          function URL.
        </>
      ),
    },
    {
      icon: CheckCircle2,
      title: 'Save and test',
      body: <>Save both, then call your Twilio number — Smashie will answer, read the menu, take the order, and log it to this page.</>,
    },
  ];

  return (
    <div className="card-diner p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Phone size={18} className="text-midnight-cherry" />
        <h3 className="font-heading text-lg text-obsidian-roast">Smashie Phone Ordering — Setup</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Wire your Twilio number to Smashie so he can answer calls and texts, give info, read the menu, and take orders.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-vanilla-malt/60 border border-border">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-midnight-cherry text-white flex items-center justify-center font-heading text-sm">
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={14} className="text-patina-mint" />
                  <p className="font-heading text-sm text-obsidian-roast">{s.title}</p>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">{s.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
        <ExternalLink size={12} />
        Webhook URLs live on each backend function's page in the builder — open
        <code className="bg-muted px-1.5 py-0.5 rounded text-patina-mint mx-1">twilioVoiceWebhook</code>
        and
        <code className="bg-muted px-1.5 py-0.5 rounded text-patina-mint mx-1">twilioSmsWebhook</code>
        to copy them.
      </p>
    </div>
  );
}