import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Award, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import PromosSection from '@/components/PromosSection';
import FaqSection from '@/components/FaqSection';

export default function About() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <div className="relative h-96 overflow-hidden">
        <img
          src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/0c28555d1_IMG_8924.jpg"
          alt="Flavor Isle exterior"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-12">
            <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Our Story</p>
            <h1 className="font-heading text-5xl text-white">The Heart of<br />Smiths Grove</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <h2 className="font-heading text-3xl text-obsidian-roast mb-6">More Than a Diner. A Community Landmark.</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>Flavor Isle was born from a simple idea: that every town deserves a place where the food is real, the portions are generous, and everyone feels like a regular.</p>
              <p>Nestled in the heart of Smiths Grove, Kentucky, we've been slinging fresh, never-frozen hand-patted burgers, thick milkshakes, and diner classics to families, farmers, and friends since we first fired up the griddle.</p>
              <p>Everything on our menu is made from scratch — from the burger patties (hand-patted fresh daily, never frozen) to the milkshakes (real ice cream, never mix) to our legendary homemade pies that come out of the oven every morning.</p>
            </div>
            <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-7 py-3.5 text-sm mt-8">
              See Our Menu <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-float-lg">
            <img
              src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/75533f8d0_IMG_8839.png"
              alt="Customers dining at Flavor Isle"
              className="w-full h-80 object-cover"
            />
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            { icon: Heart, title: 'Made with Love', desc: 'Every dish is crafted by hand by our cooks who genuinely care about the food they put out.' },
            { icon: Award, title: 'Quality First', desc: 'Fresh ingredients, never frozen beef, real ice cream in every shake. No shortcuts, ever.' },
            { icon: Users, title: 'Community First', desc: 'We know our regulars by name. Smiths Grove is family, and Flavor Isle is the family table.' },
          ].map((v) => (
            <div key={v.title} className="card-diner p-8 text-center">
              <div className="w-14 h-14 bg-midnight-cherry/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <v.icon size={26} className="text-midnight-cherry" />
              </div>
              <h3 className="font-heading text-lg text-obsidian-roast mb-3">{v.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Promos */}
      <PromosSection />

      {/* FAQ */}
      <FaqSection />

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-midnight-cherry rounded-3xl p-12 text-center">
          <h2 className="font-heading text-4xl text-white mb-4">Come Say Hello</h2>
          <p className="text-red-200 mb-8">We're open every day. Pull up a stool and stay a while.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/menu" className="bg-white text-midnight-cherry font-heading px-8 py-4 rounded-2xl hover:bg-vanilla-malt transition-colors">
              Order Online
            </Link>
            <Link to="/contact" className="border-2 border-white text-white font-heading px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors">
              Get Directions
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}