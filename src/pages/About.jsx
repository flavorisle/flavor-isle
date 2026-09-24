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

export default function About() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        ogTitle="About Flavor Isle — Small-Town Diner Off I-65 Exit 38 | Smiths Grove, KY"
        ogDescription="The story behind Flavor Isle: a family-run diner serving hand-patted burgers and real-fruit shakes, minutes from Mammoth Cave and the Corvette Museum."
        ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/0e9fde1ed_card-about.png"
        ogImageAlt="Flavor Isle diner exterior share card"
      />
      <Navbar />
      <CartDrawer />
      <AboutHero />
      <AboutStory />
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