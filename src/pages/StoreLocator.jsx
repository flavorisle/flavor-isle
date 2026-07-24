import React from 'react';
import { MapPin, Phone, Clock, Mail, Navigation } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import useBusinessHours from '@/hooks/useBusinessHours';
import { DAY_KEYS, DAY_LABELS, dayHoursLabel } from '@/lib/businessHours';

export default function StoreLocator() {
  const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
  const businessHours = useBusinessHours();
  const HOURS = DAY_KEYS.map(k => ({ day: DAY_LABELS[k], hours: dayHoursLabel(businessHours[k]) }));

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Find Us</p>
        <h1 className="font-heading text-5xl text-obsidian-roast mb-10">Store Locator</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Map */}
          <div className="lg:col-span-3 rounded-3xl overflow-hidden shadow-float bg-white min-h-[320px]">
            <iframe
              title="Flavor Isle location map"
              src="https://www.google.com/maps?q=103+N+Main+St,+Smiths+Grove,+KY+42171&output=embed"
              className="w-full h-full min-h-[320px] lg:min-h-[520px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact card */}
            <div className="card-diner p-8 space-y-6">
              <h2 className="font-heading text-xl text-obsidian-roast">Flavor Isle</h2>
              {[
                { icon: MapPin, label: 'Address', value: '103 N Main St, Smiths Grove, Kentucky 42171', href: 'https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171' },
                { icon: Phone, label: 'Phone', value: '(270) 563-4618', href: 'tel:+12705634618' },
                { icon: Mail, label: 'Email', value: 'hello@flavor-isle.com', href: 'mailto:hello@flavor-isle.com' },
              ].map(info => (
                <div key={info.label} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-midnight-cherry/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <info.icon size={20} className="text-midnight-cherry" />
                  </div>
                  <div>
                    <p className="font-heading text-sm text-obsidian-roast mb-0.5">{info.label}</p>
                    <a href={info.href} target={info.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-muted-foreground text-sm hover:text-midnight-cherry transition-colors">
                      {info.value}
                    </a>
                  </div>
                </div>
              ))}
              <a
                href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cherry chrome-hover w-full py-3.5 text-sm font-heading flex items-center justify-center gap-2"
              >
                <Navigation size={16} /> Get Directions
              </a>
            </div>

            {/* Hours card */}
            <div className="card-diner p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-patina-mint/10 rounded-2xl flex items-center justify-center">
                  <Clock size={20} className="text-patina-mint" />
                </div>
                <h2 className="font-heading text-xl text-obsidian-roast">Business Hours</h2>
              </div>
              <div className="divide-y divide-border">
                {HOURS.map((h, i) => (
                  <div key={h.day} className={`flex items-center justify-between py-2.5 text-sm ${i === todayIndex ? 'font-semibold text-midnight-cherry' : 'text-muted-foreground'}`}>
                    <span className="font-body">{h.day}{i === todayIndex && <span className="ml-2 text-xs bg-midnight-cherry/10 px-2 py-0.5 rounded-full">Today</span>}</span>
                    <span>{h.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}