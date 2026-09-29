import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import AboutHero from '@/components/about/AboutHero';
import AboutStory from '@/components/about/AboutStory';
import AboutValues from '@/components/about/AboutValues';
import AboutSmashie from '@/components/about/AboutSmashie';
import AboutVisit from '@/components/about/AboutVisit';
import AboutTraveler from '@/components/about/AboutTraveler';
import AboutTastyThreads from '@/components/about/AboutTastyThreads';
import AboutExplore from '@/components/about/AboutExplore';
import FoodPhotoRow from '@/components/FoodPhotoRow';

export default function About() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        title="About Flavor Isle — Family-Owned Burgers & Shakes Since 1964, Smiths Grove KY"
        description="The story behind Flavor Isle: a family-run burgers & shakes spot serving hand-patted burgers and real-fruit shakes since 1964, minutes from Mammoth Cave and the Corvette Museum."
        ogTitle="About Flavor Isle — Burgers & Shakes Off I-65 Exit 38 | Smiths Grove, KY"
        ogDescription="The story behind Flavor Isle: a family-run burgers & shakes spot serving hand-patted burgers and real-fruit shakes, minutes from Mammoth Cave and the Corvette Museum."
        ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/0e9fde1ed_card-about.png"
        ogImageAlt="Flavor Isle burgers & shakes exterior share card"
      />
      <Navbar />
      <CartDrawer />
      <AboutHero />
      <AboutStory />
      <section className="px-4 sm:px-6 py-14 max-w-5xl mx-auto">
        <h2 className="font-heading text-4xl text-obsidian-roast">The history wall</h2>
        <p className="text-muted-foreground mt-3">From Joyce’s roadside stand in 1964 to the anniversary celebrations and the award wall, every frame tells a little of Smiths Grove’s story. See the award photos and the diner’s collected memories in our gallery.</p>
        <a href="/gallery" className="inline-flex min-h-11 items-center font-heading text-midnight-cherry mt-4">Explore the gallery</a>
      </section>
      <section className="pb-20 px-4 sm:px-6" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <div className="max-w-6xl mx-auto">
          <FoodPhotoRow
            heading="Straight From the Kitchen"
            subtext="Hand-patted burgers, sides dropped fresh in the fryer, and shakes spun to order — this is what lands on the tray."
          />
        </div>
      </section>
      <AboutValues />
      <AboutSmashie />
      <AboutTastyThreads />
      <AboutVisit />
      <AboutTraveler />
      <AboutExplore />
      <Footer />
    </div>
  );
}