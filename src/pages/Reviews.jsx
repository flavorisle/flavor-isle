// "What People Are Saying" — influencer video embeds + curated customer reviews.
// Matches the site design (navy/cream/orange palette, Bebas Neue / Nunito fonts,
// same Navbar/Footer) and the BusynessGuide page's centered, generous layout.
import React, { useState, useEffect } from 'react';
import ReviewsHero from '@/components/reviews/ReviewsHero';
import ReviewWordWall from '@/components/reviews/ReviewWordWall';
import HometownMap from '@/components/reviews/HometownMap';
import PhotoChapter from '@/components/cinematic/PhotoChapter';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import LazyEmbed from '@/components/LazyEmbed';
import ReviewsCarousel from '@/components/ReviewsCarousel';
import ReviewPlatformLinks from '@/components/ReviewPlatformLinks';
import { EXTERNAL_REVIEWS } from '@/lib/externalReviews';
import FindSmashiePromo from '@/components/findSmashie/FindSmashiePromo';

const TIKTOK_VIDEOS = [
  {
    url: 'https://www.tiktok.com/@bigscottexperiences/video/7700747406803012877',
    creator: 'bigscottexperiences',
    title: "Big Scott Food Review: Joyce's Flavor Isle in Smiths Grove, KY",
  },
  {
    url: 'https://www.tiktok.com/@ashtonsjokes/video/7534173940646726942',
    creator: 'ashtonsjokes',
    title: 'Some of the best mozzarella sticks in the game!',
  },
  {
    url: 'https://www.tiktok.com/@lukefoods/video/7505174404419046686',
    creator: 'lukefoods',
    title: "Luke Collins' Flavor Isle review",
    subtitle: '791 comments',
  },
  {
    url: 'https://www.tiktok.com/@remi4alltheesnackgod/video/7534492746791374094',
    creator: 'remi4alltheesnackgod',
    title: 'Discover Flavor Isle: Best Food in Smiths Grove, Kentucky',
  },
  {
    url: 'https://www.tiktok.com/@livingwithdes/video/7649829094653234446',
    creator: 'livingwithdes',
    title: '10/10 dining experience review',
  },
];

const FACEBOOK_REELS = [
  {
    type: 'facebook',
    url: 'https://www.facebook.com/reel/1611434090062222/',
    title: 'Update on the amazing local restaurant that deserves all the love and support',
    creator: 'Luke Collins',
    subtitle: '37K views · 830 reactions',
  },
  {
    type: 'facebook',
    url: 'https://www.facebook.com/reel/2480054055733414/',
    title: 'Real hand-pattied burgers at Flavor Isle | Smiths Grove, Ky',
    creator: 'Brandon Jarrett',
  },
];

const INSTAGRAM_REEL = {
  type: 'instagram',
  url: 'https://www.instagram.com/reel/DarDRBmt4Es/embed',
  title: "Anytime I'm in Smiths Grove I'm stopping by Flavor Isle",
};

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Review.filter({ is_approved: true }, '-created_date', 12)
      .then((list) => {
        setReviews(list || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // External reviews first, then customer-submitted ones.
  const allReviews = [...EXTERNAL_REVIEWS, ...reviews];

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Flavor Isle Reviews — What People Are Saying | Smiths Grove, KY"
        description="Real customer reviews, influencer food videos, and social media reactions for Flavor Isle in Smiths Grove, KY. See what food lovers are saying about our hand-patted burgers and thick milkshakes."
        ogTitle="What People Are Saying | Flavor Isle - Smiths Grove, KY"
        ogDescription="Real reviews from Google, Facebook, Yelp and Tripadvisor, plus viral food videos. See why travelers on I-65 call Flavor Isle the best burger stop in Kentucky."
        ogImage="https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/dfe735e71_reviews-og.png"
        ogImageAlt="Flavor Isle reviews card with logo, star ratings, and a customer quote"
      />
      <Navbar />

      <ReviewsHero />

      {/* As Seen on TikTok & Instagram */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-heading text-4xl sm:text-5xl text-obsidian-roast mb-2">As Seen on TikTok, Instagram & Facebook</h2>
            <p className="text-muted-foreground">Food creators stopped by the Isle — here's what they captured.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {TIKTOK_VIDEOS.map((v, i) => (
              <LazyEmbed key={i} type="tiktok" {...v} />
            ))}
            {FACEBOOK_REELS.map((v, i) => (
              <LazyEmbed key={`fb-${i}`} {...v} />
            ))}
            <LazyEmbed {...INSTAGRAM_REEL} />
          </div>
        </div>
      </section>

      <PhotoChapter
        photo={{
          url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/a0b6bcef9_NorthWarrenCommunityWalk.jpg',
          alt: 'Community walk group holding milkshakes under the Flavor Isle sign',
          caption: 'The people who make the Isle',
        }}
        heading="Good food brings people together."
      />

      <ReviewWordWall />

      {/* Wall of Love */}
      <section className="bg-patina-mint/5 px-4 sm:px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-heading text-4xl sm:text-5xl text-obsidian-roast mb-2">Wall of Love</h2>
            <p className="text-muted-foreground">What our neighbors are saying about Flavor Isle.</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin"
                style={{ borderTopColor: 'var(--midnight-cherry)' }}
              />
            </div>
          ) : allReviews.length > 0 ? (
            <ReviewsCarousel reviews={allReviews} />
          ) : (
            <p className="text-center text-muted-foreground py-8">Reviews coming soon.</p>
          )}
        </div>
      </section>

      <HometownMap />

      {/* Review platforms and ways to share a visit */}
      <ReviewPlatformLinks />

      <FindSmashiePromo />

      <Footer />
    </div>
  );
}