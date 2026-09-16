// "What People Are Saying" — influencer video embeds + curated customer reviews.
// Matches the site design (navy/cream/orange palette, Bebas Neue / Nunito fonts,
// same Navbar/Footer) and the BusynessGuide page's centered, generous layout.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageCircle, Facebook, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import LazyEmbed from '@/components/LazyEmbed';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CV6yjuufbFatEAE/review';

const TIKTOK_VIDEOS = [
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

const INSTAGRAM_REEL = {
  type: 'instagram',
  url: 'https://www.instagram.com/reel/DarDRBmt4Es/embed',
  title: "Anytime I'm in Smiths Grove I'm stopping by Flavor Isle",
};

// Verified external reviews (not from our Review entity).
const EXTERNAL_REVIEWS = [
  {
    text: 'The food menu was delicious and the ice creams were the perfect treat. Milkshakes were fantastic.',
    name: 'Tripadvisor reviewer',
    source: 'Tripadvisor',
  },
  {
    text: 'the BEST food and milkshakes in the area',
    name: 'Facebook reviewer',
    source: 'Facebook',
  },
];

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
      />
      <Navbar />

      {/* Hero */}
      <section className="bg-patina-mint/10 px-4 sm:px-6 py-14">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-midnight-cherry text-sm font-heading uppercase tracking-widest mb-2">Flavor Isle</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast mb-4 leading-tight">
            Real people, real reactions.
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Food lovers from all over Kentucky (and beyond) stopped by the Isle — here's what they found.
          </p>

          {/* Rating badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <div className="card-diner px-5 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Facebook size={20} className="text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-heading text-lg text-obsidian-roast leading-none">90%</p>
                <p className="text-xs text-muted-foreground">249 reviews</p>
              </div>
            </div>

            <div className="card-diner px-5 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="font-heading text-xs text-green-700">TA</span>
              </div>
              <div className="text-left">
                <p className="font-heading text-lg text-obsidian-roast leading-none">4.5/5</p>
                <p className="text-xs text-muted-foreground">Tripadvisor</p>
              </div>
            </div>

            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="card-diner px-5 py-3 flex items-center gap-3 hover:shadow-float-lg transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Star size={20} className="text-amber-600 fill-amber-500" />
              </div>
              <div className="text-left">
                <p className="font-heading text-lg text-obsidian-roast leading-none">Review us</p>
                <p className="text-xs text-muted-foreground">on Google</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* As Seen on TikTok & Instagram */}
      <section className="px-4 sm:px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl text-obsidian-roast mb-2">As Seen on TikTok & Instagram</h2>
            <p className="text-muted-foreground">Food creators stopped by the Isle — here's what they captured.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {TIKTOK_VIDEOS.map((v, i) => (
              <LazyEmbed key={i} type="tiktok" {...v} />
            ))}
            <LazyEmbed {...INSTAGRAM_REEL} />
          </div>
        </div>
      </section>

      {/* Wall of Love */}
      <section className="bg-patina-mint/5 px-4 sm:px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-heading text-3xl text-obsidian-roast mb-2">Wall of Love</h2>
            <p className="text-muted-foreground">What our neighbors are saying about Flavor Isle.</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin"
                style={{ borderTopColor: 'var(--midnight-cherry)' }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allReviews.map((r, i) => (
                <ReviewCard key={i} {...r} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-obsidian-roast px-4 sm:px-6 py-14">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl text-white mb-2">Tried us lately? Tell the world.</h2>
          <p className="text-gray-300 mb-6">Your review helps other food lovers find the Isle.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2"
            >
              <Star size={16} /> Review us on Google
            </a>
            <Link
              to="/feedback"
              className="btn-yellow px-6 py-3 text-sm font-heading flex items-center gap-2"
            >
              <MessageCircle size={16} /> Share Feedback
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ReviewCard({ text, name, source, rating }) {
  return (
    <div className="card-diner p-5">
      <div className="flex items-center gap-2 mb-3">
        {rating > 0 && (
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
              />
            ))}
          </div>
        )}
        {source && (
          <span className="text-xs font-heading uppercase tracking-wider text-patina-mint">{source}</span>
        )}
      </div>
      <p className="text-sm text-obsidian-roast leading-relaxed mb-3">&ldquo;{text}&rdquo;</p>
      <p className="text-xs text-muted-foreground font-semibold">— {name}</p>
    </div>
  );
}