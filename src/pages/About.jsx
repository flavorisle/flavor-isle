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
import PhotoChapter from '@/components/cinematic/PhotoChapter';
import { islePhotos } from '@/components/cinematic/photos';

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
      <PhotoChapter photo={islePhotos.dining} heading="The neighborhood’s table." />
      <PhotoChapter photo={islePhotos.awards} heading="A roadside stand that became Smiths Grove’s best." />
      <PhotoChapter photo={islePhotos.colonel} heading="You never know who you’ll run into." />
      <figure className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <img
          src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/0f76418c9_IMG_0884.jpeg"
          alt="Visitors dressed as Ghostbusters beside their themed car in front of Flavor Isle"
          loading="lazy"
          className="w-full h-auto rounded-xl"
        />
        <figcaption className="mt-3 text-center font-body text-sm text-muted-foreground">A memorable visit to Flavor Isle.</figcaption>
      </figure>
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