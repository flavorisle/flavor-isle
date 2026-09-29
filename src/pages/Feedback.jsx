import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ReviewForm from '@/components/ReviewForm';
import Seo from '@/components/Seo';
import { optimizedImageUrl } from '@/lib/utils';

export default function Feedback() {
  const location = useLocation();
  const orderId = new URLSearchParams(location.search).get('order');
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        title="Share Feedback — Flavor Isle | Smiths Grove, KY"
        description="Tell us how we did. Share your Flavor Isle feedback, rate your experience, and help us serve you better off I-65 Exit 38."
      />
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="bg-patina-mint/10 px-4 sm:px-6 py-14">
        <div className="max-w-3xl mx-auto text-center">
          <img
            src={optimizedImageUrl('https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/8684a938f_Shareyourexperience.png', 200, 200, 'fit')}
            alt="Share your Flavor Isle experience"
            width="200"
            height="200"
            className="w-24 h-24 object-contain mx-auto mb-5 drop-shadow-md"
          />
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">We'd Love to Hear From You</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast mb-4">Share Your Experience</h1>
          <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Visited Flavor Isle recently? Drop us a comment, suggestion, or review. We read every one — and the best ones show up on our home page in "What Our Neighbors Are Saying."
          </p>
        </div>
      </section>

      {/* Form card */}
      <section className="px-4 sm:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="card-diner p-6 sm:p-8">
            <ReviewForm submitLabel="Submit Feedback" orderId={orderId} />
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-6 text-center">
            <ShieldCheck size={14} className="text-patina-mint" />
            All reviews are moderated and appear after approval.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}