import React from 'react';
import { Link } from 'react-router-dom';
import { Apple, Play, ArrowRight, Bell, Star, Truck, MessageCircle, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SmashieChat from '@/components/SmashieChat';
import AppPhoneMockup from '@/components/AppPhoneMockup';
import Seo from '@/components/Seo';

const SMASHIE_HERO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/77ba3b486_IMG_9971.png'; // hands up
const SMASHIE_POSE = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1332ef4b2_IMG_9978.png'; // waving
const APP_ICON = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

const FEATURES = [
  { icon: Zap, title: 'Order Ahead', desc: 'Skip the wait. Build your order and grab it hot — pickup, delivery, or dine-in.' },
  { icon: Star, title: 'Star Rewards', desc: 'Every order earns points toward free food. Your tier grows the more you smash.' },
  { icon: Bell, title: 'Order Ready Alerts', desc: 'We ping you the second your food is ready. No guessing, no waiting around.' },
  { icon: MessageCircle, title: 'Chat with Smashie', desc: 'Ask the menu, get recommendations, or place an order — Smashie is built in.' },
];

export default function DownloadApp() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        title="Get the Flavor Isle App — Order Ahead, Earn Rewards | Smiths Grove, KY"
        description="Download the Flavor Isle app for iOS or Android. Order ahead, earn Star Rewards, get order-ready alerts, and chat with Smashie AI — all in one place."
      />
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="relative overflow-hidden bg-obsidian-roast py-20 px-4 sm:px-6">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 60%, #CC3300 0%, transparent 60%), radial-gradient(circle at 80% 40%, #F5A623 0%, transparent 60%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-shrink-0 w-52 md:w-72 h-72 md:h-96">
            <img
              src={SMASHIE_HERO}
              alt="Smashie mascot cheering"
              className="w-full h-full object-contain drop-shadow-2xl animate-float-up"
            />
          </div>
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-smashie-yellow/20 border border-smashie-yellow/40 text-smashie-yellow px-4 py-2 rounded-full text-sm font-semibold mb-5">
              <Bell size={14} /> Flavor Isle in your pocket
            </div>
            <h1 className="font-heading text-5xl sm:text-7xl text-white leading-tight mb-4">
              GET THE<br />
              <span style={{ color: '#F5A623' }}>FLAVOR ISLE APP</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-lg leading-relaxed mb-8">
              Order ahead, earn Star Rewards, track your food in real time, and chat with Smashie — all from your phone. Smashie says it's a no-brainer.
            </p>
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <img
                src={APP_ICON}
                alt="Flavor Isle app icon"
                className="w-20 h-20 rounded-2xl object-contain bg-white p-1.5 shadow-float-lg"
              />
              <div>
                <div className="inline-flex items-center gap-2 bg-smashie-yellow/20 border border-smashie-yellow/40 text-smashie-yellow px-3 py-1 rounded-full text-xs font-heading mb-2">
                  <span className="w-1.5 h-1.5 bg-smashie-yellow rounded-full animate-pulse" /> COMING SOON
                </div>
                <p className="text-gray-300 text-sm leading-snug max-w-xs">
                  Launching on the App Store & Google Play soon. For now, order right here on the web.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-6">
              <span className="bg-white/10 border border-white/20 text-gray-400 font-heading px-6 py-3.5 rounded-2xl text-sm flex items-center gap-3 cursor-not-allowed">
                <Apple size={22} />
                <span className="text-left leading-tight">
                  <span className="block text-[10px] font-body font-semibold opacity-70">Coming to the</span>
                  App Store
                </span>
              </span>
              <span className="bg-white/10 border border-white/20 text-gray-400 font-heading px-6 py-3.5 rounded-2xl text-sm flex items-center gap-3 cursor-not-allowed">
                <Play size={20} className="fill-current" />
                <span className="text-left leading-tight">
                  <span className="block text-[10px] font-body font-semibold opacity-70">Coming to</span>
                  Google Play
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* App preview — phone mockup */}
      <section className="py-16 px-4 sm:px-6 bg-background">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <p className="text-obsidian-roast text-sm font-heading uppercase tracking-widest mb-2">A Sneak Peek</p>
            <h2 className="font-heading text-4xl text-obsidian-roast mb-3">The App, In Your Pocket</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto md:mx-0">
              Browse best sellers, build a shake, track your order in real time, and watch your Star Rewards stack up — all in a clean, fast app built for Flavor Isle.
            </p>
            <ul className="space-y-2 text-sm text-obsidian-roast max-w-md mx-auto md:mx-0">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-midnight-cherry" /> Craving pills to jump to burgers, shakes & more</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-midnight-cherry" /> One-tap add to cart from best sellers</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-midnight-cherry" /> Live order tracking + rewards on the home screen</li>
            </ul>
          </div>
          <div className="flex-shrink-0">
            <AppPhoneMockup />
          </div>
        </div>
      </section>

      {/* Why download */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Why You'll Love It</p>
          <h2 className="font-heading text-4xl text-obsidian-roast">Everything Smashie Loves, On Tap</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-diner p-7 text-center">
                <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} className="text-midnight-cherry" />
                </div>
                <h3 className="font-heading text-obsidian-roast text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Smashie CTA band */}
      <section className="py-16 bg-patina-mint px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <img src={SMASHIE_POSE} alt="Smashie waving" className="w-32 flex-shrink-0 drop-shadow-lg" />
          <div className="flex-1">
            <h2 className="font-heading text-3xl text-white mb-2">Smashie's Already On It</h2>
            <p className="text-teal-200 mb-6 max-w-xl">
              Download the app, sign in, and Smashie's right there in your pocket — ready to take your order, drop a recommendation, or just hype you up.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <span className="bg-white/15 border border-white/30 text-white/70 font-heading px-6 py-3 rounded-full text-sm flex items-center gap-2 cursor-not-allowed">
                <Apple size={18} /> App Store · Soon
              </span>
              <span className="bg-white/15 border border-white/30 text-white/70 font-heading px-6 py-3 rounded-full text-sm flex items-center gap-2 cursor-not-allowed">
                <Play size={16} className="fill-current" /> Google Play · Soon
              </span>
              <Link to="/menu" className="bg-white text-patina-mint font-heading px-6 py-3 rounded-full text-sm hover:bg-vanilla-malt transition-colors flex items-center gap-2">
                Order on the Web <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <SmashieChat />
    </div>
  );
}