import React from 'react';
import { Link } from 'react-router-dom';
import { Apple, Play, ArrowRight, Bell, Star, Truck, MessageCircle, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SmashieChat from '@/components/SmashieChat';

const SMASHIE_HERO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/77ba3b486_IMG_9971.png'; // hands up
const SMASHIE_POSE = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1332ef4b2_IMG_9978.png'; // waving

const FEATURES = [
  { icon: Zap, title: 'Order Ahead', desc: 'Skip the wait. Build your order and grab it hot — pickup, delivery, or dine-in.' },
  { icon: Star, title: 'Star Rewards', desc: 'Every order earns points toward free food. Your tier grows the more you smash.' },
  { icon: Bell, title: 'Order Ready Alerts', desc: 'We ping you the second your food is ready. No guessing, no waiting around.' },
  { icon: MessageCircle, title: 'Chat with Smashie', desc: 'Ask the menu, get recommendations, or place an order — Smashie is built in.' },
];

export default function DownloadApp() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
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
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <a
                href="#"
                className="bg-white text-obsidian-roast font-heading px-6 py-3.5 rounded-2xl text-sm hover:bg-vanilla-malt transition-colors flex items-center gap-3 chrome-hover"
              >
                <Apple size={22} />
                <span className="text-left leading-tight">
                  <span className="block text-[10px] font-body font-semibold opacity-70">Download on the</span>
                  App Store
                </span>
              </a>
              <a
                href="#"
                className="bg-white text-obsidian-roast font-heading px-6 py-3.5 rounded-2xl text-sm hover:bg-vanilla-malt transition-colors flex items-center gap-3 chrome-hover"
              >
                <Play size={20} className="fill-current" />
                <span className="text-left leading-tight">
                  <span className="block text-[10px] font-body font-semibold opacity-70">Get it on</span>
                  Google Play
                </span>
              </a>
            </div>
            <p className="text-gray-400 text-xs mt-4">Free to download. Order anytime we're open.</p>
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
              <a href="#" className="bg-white text-patina-mint font-heading px-6 py-3 rounded-full text-sm hover:bg-vanilla-malt transition-colors flex items-center gap-2">
                <Apple size={18} /> App Store
              </a>
              <a href="#" className="bg-white text-patina-mint font-heading px-6 py-3 rounded-full text-sm hover:bg-vanilla-malt transition-colors flex items-center gap-2">
                <Play size={16} className="fill-current" /> Google Play
              </a>
              <Link to="/menu" className="border-2 border-white/40 text-white font-heading px-6 py-3 rounded-full text-sm hover:bg-white/10 transition-colors flex items-center gap-2">
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