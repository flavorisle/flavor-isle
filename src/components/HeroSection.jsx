import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { optimizedImageUrl } from '@/lib/utils';
import { issue23Photos } from '@/lib/issue23Photos';

export default function HeroSection() {
  const navigate = useNavigate();
  const handleOrder = () => {
    base44.analytics.track({ eventName: 'start_order_clicked', properties: { source: 'hero' } });
    navigate('/order');
  };

  return (
    <section className="relative min-h-[560px] sm:min-h-[650px] flex items-center justify-center overflow-hidden bg-obsidian-roast">
      <img src={optimizedImageUrl(issue23Photos.hero, 1600, 900)} alt="Flavor Isle storefront glowing at night" width="1600" height="900" className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" decoding="async" />
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center text-white">
        <p className="font-body uppercase tracking-widest mb-4">Smiths Grove, Kentucky</p>
        <h1 className="font-heading uppercase text-5xl sm:text-7xl lg:text-8xl leading-none mb-6">Flavor Isle — I-65 Exit 38</h1>
        <p className="font-body text-lg sm:text-xl max-w-xl mx-auto mb-8">Fresh burgers, thick shakes, and a warm welcome just off the highway.</p>
        <button type="button" onClick={handleOrder} className="btn-cherry inline-flex items-center justify-center min-h-12 px-9 py-3 text-lg">Order Now</button>
      </div>
    </section>
  );
}