import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import GalleryLightbox from '@/components/gallery/GalleryLightbox';
import Seo from '@/components/Seo';
import { GALLERY_PHOTOS, GALLERY_CATEGORIES } from '@/lib/galleryPhotos';
import CinematicHero from '@/components/cinematic/CinematicHero';

export default function Gallery() {
  const [category, setCategory] = useState('Food');
  const [openIndex, setOpenIndex] = useState(null);

  const photos = useMemo(() => {
    const seen = new Set();
    return GALLERY_PHOTOS.filter((photo) => {
      if (seen.has(photo.url) || photo.category !== category) return false;
      seen.add(photo.url);
      return true;
    });
  }, [category]);

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Gallery — Flavor Isle Photos | Smiths Grove, KY"
        description="Photos of Flavor Isle's hand-patted burgers, thick milkshakes, and burgers and shakes restaurant in Smiths Grove, KY. See what's cooking off I-65 Exit 38."
      />
      <Navbar />

      <CinematicHero
        heading="A look around Flavor Isle."
        subtitle="Real food. Real folks. Real Smiths Grove."
        photo={{
          url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/48f62e309_IMG_8855.jpeg',
          alt: 'Flavor Isle dining room looking toward the entrance',
          caption: 'Pull up a seat. Stay a while.',
        }}
      />
      {/* Category filter */}
      <div className="sticky top-[104px] z-30 bg-vanilla-malt/95 backdrop-blur py-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto scrollbar-hide">
          {GALLERY_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCategory(c); setOpenIndex(null); }}
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