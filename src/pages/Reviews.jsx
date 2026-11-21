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
import PhotoTile from '@/components/ui/PhotoTile';
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

// ── Photo-forward review wall (issue #339) ──
// A dish tag is only ever a dish the reviewer named in their own words: the
// tags are read from the review text, never assigned by hand, and the photo is
// the site's real photograph for that dish. When a review names a dish we have
// no photograph of, the card falls back to the house burger photo. No review
// is added, removed, shortened or reworded.
// Photos are the real Square catalog photo of that exact item, so a review
// about the tenderloin shows the tenderloin. Ordered most specific first: a
// named flavor wins over the generic word it contains, and `family` keeps a
// review from being tagged twice for the same kind of item.
const ITEM_PHOTO = (file) => `https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/${file}`;

const REVIEW_DISHES = [
  { test: /butterscotch/i, tag: 'Butterscotch shake', family: 'shake', photo: { url: ITEM_PHOTO('080c07b1d_menu-item-oxdtpymose2fjfrmup57v47n-800x800.webp'), alt: 'Butterscotch milkshake' } },
  { test: /peanut butter/i, tag: 'Peanut butter shake', family: 'shake', photo: { url: ITEM_PHOTO('892c440b4_menu-item-iey7za552tbuv57coyvcpfdz-800x800.webp'), alt: 'Peanut butter milkshake' } },
  { test: /\bmalt\b/i, tag: 'Malt', family: 'shake', photo: { url: ITEM_PHOTO('62ce4d5ba_menu-item-gr6tuvc2ym6r3j6rtisoygic-671x800.webp'), alt: 'Chocolate malt' } },
  { test: /milkshake|shake/i, tag: 'Milkshake', family: 'shake', photo: { url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/c59e1956e7aafd8972d0793828ed15ade1d4f3fa/original.jpeg', alt: 'Chocolate milkshake' } },
  { test: /bacon double|double bacon/i, tag: 'Bacon double cheeseburger', family: 'burger', photo: { url: ITEM_PHOTO('a4b17ed7c_menu-item-7rj7gyarxj5xjce6uh6i6qeq-800x685.webp'), alt: 'Double bacon cheeseburger' } },
  { test: /double cheese ?burger/i, tag: 'Double cheeseburger', family: 'burger', photo: { url: ITEM_PHOTO('edaa9b42b_menu-item-7qesu7ujarv5oatv2ubjhiqu-800x800.webp'), alt: 'Double cheeseburger' } },
  { test: /mini (cheese)?burger/i, tag: 'Mini burgers', family: 'burger', photo: { url: ITEM_PHOTO('e441aa23c_menu-item-wgmpcvo2kvnthu32wkmyhqv4-762x800.webp'), alt: 'Mini burger' } },
  { test: /cheese ?burger|burger/i, tag: 'Burger', family: 'burger', photo: { url: ITEM_PHOTO('761e396cc_menu-item-db5azxgfodq4mxddhh2gn34f-800x800.webp'), alt: 'Cheeseburger' } },
  { test: /chuck ?wagon/i, tag: 'Chuckwagon', photo: { url: ITEM_PHOTO('c092af2e3_menu-item-sab3ljnxbv4zr7b2hezfnaqn-800x800.webp'), alt: 'Chuckwagon sandwich' } },
  { test: /tenderloin/i, tag: 'Pork tenderloin', photo: { url: ITEM_PHOTO('19f9ba495_menu-item-74griojmx77l6rj5w3ysi7pm-600x800.webp'), alt: 'Pork tenderloin sandwich' } },
  { test: /fried mushrooms/i, tag: 'Fried mushrooms', photo: { url: ITEM_PHOTO('cb09af83c_menu-item-kj3lclbtbys57kn7ghsv5l4s-800x715.webp'), alt: 'Basket of fried mushrooms' } },
  { test: /mozzarella sticks/i, tag: 'Mozzarella sticks', photo: { url: ITEM_PHOTO('b5e041291_menu-item-bbfdv4ktdqaumhgfjbm3awo2-800x800.webp'), alt: 'Mozzarella sticks' } },
  { test: /onion rings/i, tag: 'Onion rings', photo: { url: ITEM_PHOTO('6a64bf3ce_menu-item-l5zuo4dh3sbt5hc677ys43qs-800x645.webp'), alt: 'Plate of onion rings' } },
  { test: /curly fries/i, tag: 'Curly fries', family: 'fries', photo: { url: ITEM_PHOTO('f7f79026e_menu-item-aojvtfwpkdb6ebvqfitqvp2r-800x600.webp'), alt: 'Curly fries' } },
  { test: /cajun fries/i, tag: 'Cajun fries', family: 'fries', photo: { url: ITEM_PHOTO('ec58d4e5c_menu-item-yvfjwpqed67s3us323arglu6-800x800.webp'), alt: 'Cajun waffle fries' } },
  { test: /fries/i, tag: 'Fries', family: 'fries', photo: { url: ITEM_PHOTO('d0ff22ee1_menu-item-lgehvsumwm27xyzx23lrxcqy-800x533.webp'), alt: 'French fries' } },
  { test: /chili dog|hot dog/i, tag: 'Chili dog', photo: { url: ITEM_PHOTO('aa4ca4f9a_menu-item-4yqekvfxucwm67cougvief5w-370x800.webp'), alt: 'Chili dog' } },
  { test: /ice cream|sundae/i, tag: 'Ice cream', photo: { url: ITEM_PHOTO('881a366c8_menu-item-emfbychxt7fynvxernm4ynld-533x800.webp'), alt: 'Soft serve ice cream cone' } },
];

const REVIEW_FALLBACK_PHOTO = { url: ITEM_PHOTO('761e396cc_menu-item-db5azxgfodq4mxddhh2gn34f-800x800.webp'), alt: 'Cheeseburger' };

function dishFor(review) {
  const text = review.text || '';
  const hits = [];
  for (const dish of REVIEW_DISHES) {
    const at = text.search(dish.test);
    if (at === -1) continue;
    if (dish.family && hits.some((hit) => hit.family === dish.family)) continue;
    hits.push({ ...dish, at });
  }
  // The picture is the first dish the reviewer actually named.
  hits.sort((a, b) => a.at - b.at);
  return {
    tags: hits.slice(0, 2).map((dish) => dish.tag),
    photo: (hits[0] && hits[0].photo) || REVIEW_FALLBACK_PHOTO,
  };
}

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
            <>
              {/* The verified external reviews become the photo-forward wall;
                  customer-submitted reviews keep their carousel below it. */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {EXTERNAL_REVIEWS.map((review, i) => {
                  const { tags, photo } = dishFor(review);
                  return (
                    <figure
                      key={`${review.name}-${i}`}
                      className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
                    >
                      <PhotoTile imageUrl={photo.url} alt={photo.alt} size="lg" className="rounded-none" />
                      <div className="p-4">
                        {tags.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-patina-mint/10 px-2 py-0.5 text-xs font-semibold text-patina-mint">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <blockquote className="text-sm leading-relaxed text-obsidian-roast">{`“${review.text}”`}</blockquote>
                        <figcaption className="mt-3 flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-obsidian-roast">{review.name}</span>
                          <span className="text-muted-foreground">{review.source}</span>
                        </figcaption>
                      </div>
                    </figure>
                  );
                })}
              </div>
              {reviews.length > 0 && (
                <div className="mt-10">
                  <ReviewsCarousel reviews={reviews} />
                </div>
              )}
            </>
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