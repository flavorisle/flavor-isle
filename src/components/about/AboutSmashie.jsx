import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, MessageCircle } from 'lucide-react';

const SMASHIE_PEACE = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/c08ec5331_IMG_9970.png';

export default function AboutSmashie() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-background">
      <div className="max-w-5xl mx-auto card-diner p-8 sm:p-12 flex flex-col md:flex-row items-center gap-10">
        <img
          src={SMASHIE_PEACE}
          alt="Smashie, the Flavor Isle mascot, flashing a peace sign"
          className="w-40 sm:w-52 object-contain drop-shadow-xl flex-shrink-0"
        />
        <div className="text-center md:text-left">
          <p className="font-heading uppercase tracking-widest text-sm text-patina-mint mb-3">The Newest Member of the Crew</p>
          <h2 className="font-heading uppercase text-4xl text-obsidian-roast mb-4">Say Hey to Smashie</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Smashie is our AI mascot and order-taker. He answers the phone, texts you back, and chats right here on the site — day or night. He knows the menu cold, and yes, he'll take your whole order and send it straight to the kitchen.
          </p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <Link to="/meet-smashie" className="btn-mint chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading">
              Meet Smashie <ArrowRight size={16} />
            </Link>
            <a href="tel:+12705637230" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-border text-obsidian-roast font-heading text-sm hover:border-patina-mint transition-colors">
              <Phone size={16} /> Call
            </a>
            <a href="sms:+12705637230" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-border text-obsidian-roast font-heading text-sm hover:border-patina-mint transition-colors">
              <MessageCircle size={16} /> Text
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}