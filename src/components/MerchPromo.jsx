// Homepage promo block for the Tasty Threads store.
import React from 'react';
import { Link } from 'react-router-dom';
import { Shirt, ArrowRight } from 'lucide-react';

// Homepage promo block funneling visitors to the Tasty Threads merch store.
export default function MerchPromo() {
  return (
    <section className="py-16 px-4 sm:px-6 bg-midnight-cherry">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
        <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
          <Shirt size={44} className="text-white" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <p className="text-sm font-heading uppercase tracking-widest text-white/70 mb-2">FLAVOR ISLE MERCH</p>
          <h2 className="font-heading text-4xl text-white mb-2">Tasty Threads</h2>
          <p className="text-red-200 max-w-xl">
            Rep the flavor with tees, cups, and gear — printed on demand and shipped to your door.
          </p>
        </div>
        <Link to="/merch" className="bg-white text-midnight-cherry font-heading px-8 py-4 rounded-2xl hover:bg-vanilla-malt transition-colors chrome-hover inline-flex items-center gap-2 whitespace-nowrap">
          Shop Now <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}