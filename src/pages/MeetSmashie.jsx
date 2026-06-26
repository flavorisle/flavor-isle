import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Sparkles, Zap, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SmashieChat from '@/components/SmashieChat';

const SMASHIE_TRAITS = [
  { emoji: '🔥', label: 'Always Hyped', desc: 'Smashie loves this food more than anyone. Every item slaps and he will tell you exactly why.' },
  { emoji: '🤙', label: 'Real Talk Only', desc: "No corporate speak here. Smashie tells it straight — what's good, what's bussin, what you should order." },
  { emoji: '🧠', label: 'Knows the Menu Cold', desc: 'Ask him anything — from calorie counts to what pairs best with the Hot Fudge Cake. He knows.' },
  { emoji: '⚡', label: '24/7 Available', desc: "Even after we close, Smashie's still online to help you plan your next visit or answer any question." },
  { emoji: '📱', label: 'Takes Orders Too', desc: 'Call us and Smashie picks up. Text us and Smashie texts back. He\'ll take your order and get it to the kitchen.' },
  { emoji: '💯', label: 'Flavor Isle to the Core', desc: 'Smashie grew up on this food. The Isle Smash Burger and Hot Fudge Cake? His personal favorites, no cap.' },
];

const FAQS = [
  { q: "Can Smashie actually take my order?", a: "Yep! Text or call the restaurant number and Smashie will take your order, confirm it, and route it straight to the kitchen. He's legit." },
  { q: "What if I have allergies or dietary needs?", a: "Smashie knows the menu inside out. Ask him about ingredients, substitutions, or what's safe for your dietary needs and he'll give you the real answer." },
  { q: "Is Smashie a robot?", a: "He's AI — but he's built specifically for Flavor Isle. He knows our menu, our vibe, our story. He's basically one of us at this point." },
  { q: "What's Smashie's favorite order?", a: "Isle Smash Burger, loaded fries, and a Chocolate Fudge Shake. Hot Fudge Cake for dessert, obviously. No cap." },
  { q: "Can I chat with him on the website?", a: "Hit the chat bubble in the bottom right corner of any page. Smashie's always there, always ready." },
];

export default function MeetSmashie() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="relative overflow-hidden bg-obsidian-roast py-24 px-4 sm:px-6">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 20% 60%, #C0392B 0%, transparent 60%), radial-gradient(circle at 80% 40%, #1A3A5C 0%, transparent 60%)`
        }} />
        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-52 h-52 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-midnight-cherry to-red-900 flex items-center justify-center shadow-float-lg border-4 border-red-700/30 text-9xl">
              🥤
            </div>
          </div>

          {/* Text */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-midnight-cherry/20 border border-midnight-cherry/40 text-red-300 px-4 py-2 rounded-full text-sm font-semibold mb-5">
              <Sparkles size={14} />
              Flavor Isle's AI Mascot
            </div>
            <h1 className="font-heading text-5xl sm:text-7xl text-white leading-tight mb-4">
              MEET<br />
              <span style={{ color: '#FF6B6B' }}>SMASHIE</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-lg leading-relaxed mb-8">
              Smashie is Flavor Isle's resident hype man, order-taker, and menu expert. He's always online, always real, and he genuinely loves every bite of this food.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <a
                href="#chat"
                className="btn-cherry chrome-hover px-7 py-3.5 text-sm font-heading flex items-center gap-2"
                onClick={e => { e.preventDefault(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
              >
                <MessageCircle size={16} />
                Chat with Smashie
              </a>
              <Link to="/menu" className="border-2 border-white/30 text-white font-heading px-7 py-3.5 rounded-2xl text-sm hover:bg-white/10 transition-colors flex items-center gap-2">
                See the Menu <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Smashie Smashie */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">The Rundown</p>
          <h2 className="font-heading text-4xl text-obsidian-roast">What Makes Smashie, Smashie</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SMASHIE_TRAITS.map(trait => (
            <div key={trait.label} className="card-diner p-7">
              <div className="text-5xl mb-4">{trait.emoji}</div>
              <h3 className="font-heading text-obsidian-roast text-lg mb-2">{trait.label}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{trait.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to reach Smashie */}
      <section className="py-16 bg-patina-mint px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl text-white mb-3">How to Reach Smashie</h2>
            <p className="text-teal-200">Three ways to connect. Smashie's ready for all of them.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 border border-white/20 rounded-3xl p-7 text-center">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="font-heading text-white text-lg mb-2">Live Chat</h3>
              <p className="text-teal-200 text-sm">Hit the chat bubble on any page of the website. Smashie responds instantly.</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-3xl p-7 text-center">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="font-heading text-white text-lg mb-2">Text Us</h3>
              <p className="text-teal-200 text-sm mb-3">Text your order to our number and Smashie takes it from there.</p>
              <a href="sms:+12705634618" className="bg-white text-patina-mint font-heading text-sm px-5 py-2 rounded-full hover:bg-vanilla-malt transition-colors">
                Text (270) 563-4618
              </a>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-3xl p-7 text-center">
              <div className="text-5xl mb-4">📞</div>
              <h3 className="font-heading text-white text-lg mb-2">Call In</h3>
              <p className="text-teal-200 text-sm mb-3">Call and Smashie answers. He'll take your order over the phone like a pro.</p>
              <a href="tel:+12705634618" className="bg-white text-patina-mint font-heading text-sm px-5 py-2 rounded-full hover:bg-vanilla-malt transition-colors">
                Call (270) 563-4618
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* His faves */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <Heart size={32} className="mx-auto mb-4 text-midnight-cherry" />
        <h2 className="font-heading text-4xl text-obsidian-roast mb-4">Smashie's Personal Top Picks</h2>
        <p className="text-muted-foreground mb-10">Ask him for a recommendation. This is usually where he starts.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { name: 'Isle Smash Burger', desc: 'Double smashed patties, special sauce. His ride-or-die.', emoji: '🍔', price: '$10.99' },
            { name: 'Chocolate Fudge Shake', desc: 'Thick, rich, made with real ice cream. Bussin every time.', emoji: '🥤', price: '$5.49' },
            { name: 'Hot Fudge Cake', desc: 'End every meal with this. No exceptions.', emoji: '🍰', price: '$5.99' },
          ].map(item => (
            <div key={item.name} className="card-diner p-6 text-center">
              <div className="text-5xl mb-3">{item.emoji}</div>
              <h3 className="font-heading text-obsidian-roast mb-1">{item.name}</h3>
              <p className="text-muted-foreground text-sm mb-3">{item.desc}</p>
              <span className="text-midnight-cherry font-heading">{item.price}</span>
            </div>
          ))}
        </div>
        <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-8 py-4 font-heading text-sm mt-10">
          Order These Now <ArrowRight size={16} />
        </Link>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl text-obsidian-roast">FAQs About Smashie</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-float">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left p-5 font-heading text-obsidian-roast flex justify-between items-center"
                >
                  {faq.q}
                  <span className="text-patina-mint text-lg ml-4">{openFaq === i ? '▲' : '▼'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <SmashieChat />
    </div>
  );
}