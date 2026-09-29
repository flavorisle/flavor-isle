import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import GalleryLightbox from '@/components/gallery/GalleryLightbox';
import Seo from '@/components/Seo';
import { GALLERY_PHOTOS, GALLERY_CATEGORIES } from '@/lib/galleryPhotos';
import CinematicHero from '@/components/cinematic/CinematicHero';

export default function Gallery() {
  const [category, setCategory] = useState('All');
  const [openIndex, setOpenIndex] = useState(null);

  const photos = useMemo(
    () => (category === 'All' ? GALLERY_PHOTOS : GALLERY_PHOTOS.filter((p) => p.category === category)),
    [category]
  );

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Gallery — Flavor Isle Photos | Smiths Grove, KY"
        description="Photos of Flavor Isle's hand-patted burgers, thick milkshakes, and roadside diner in Smiths Grove, KY. See what's cooking off I-65 Exit 38."
      />
      <Navbar />

      <CinematicHero heading="A look around Flavor Isle." subtitle="Real food. Real folks. Real Smiths Grove." />
      <section className="px-4 sm:px-6 pt-8 pb-6 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading tracking-widest uppercase text-white mb-3 bg-midnight-cherry">
          <Camera size={13} /> Gallery
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">
          A LOOK AROUND FLAVOR ISLE
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-body mt-3 max-w-xl mx-auto">
          Real food, real folks, real Smiths Grove. Every photo here was taken right at the Isle.
        </p>
      </section>

      {/* Category filter */}
      <div className="sticky top-[104px] z-30 bg-vanilla-malt/95 backdrop-blur py-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto scrollbar-hide">
          {GALLERY_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2.5 rounded-full text-xs font-heading tracking-widest uppercase whitespace-nowrap transition-colors ${
                category === c
                  ? 'bg-midnight-cherry text-white shadow-float'
                  : 'bg-muted text-obsidian-roast hover:bg-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <GalleryGrid photos={photos} onSelect={setOpenIndex} />
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-14 text-center">
        <h2 className="font-heading text-2xl text-obsidian-roast">HUNGRY YET?</h2>
        <p className="text-sm text-muted-foreground font-body mt-2 mb-4">
          Everything you see gets made to order. Come get yours.
        </p>
        <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-7 py-3.5 text-sm">
          Order Now <ArrowRight size={16} />
        </Link>
      </section>

      {openIndex !== null && (
        <GalleryLightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onPrev={() => setOpenIndex((i) => (i - 1 + photos.length) % photos.length)}
          onNext={() => setOpenIndex((i) => (i + 1) % photos.length)}
        />
      )}

      <Footer />
      <CartDrawer />
    </div>
  );
}