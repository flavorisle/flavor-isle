import React from 'react';
import { Instagram, Camera, Send, Gift } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import InstagramReviewForm from '@/components/social/InstagramReviewForm';
import GoogleReviewsCard from '@/components/GoogleReviewsCard';
import Seo from '@/components/Seo';
import { useAuth } from '@/lib/AuthContext';

const STEPS = [
  { Icon: Camera, title: '1. Snap & Post', text: 'Share a photo or video of your Flavor Isle visit on Instagram — tag us or mention Flavor Isle.' },
  { Icon: Send, title: '2. Drop the Link', text: 'Paste your Instagram post link below with the email on your rewards account.' },
  { Icon: Gift, title: '3. Get 100 Points', text: 'We credit 100 loyalty points straight to your account. Once per week, every week.' },
];

export default function SocialReviews() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Instagram Reviews & Rewards — Flavor Isle | Smiths Grove, KY"
        description="Share your Flavor Isle visit on Instagram and earn 100 loyalty points. Post a photo or video, drop the link, and get rewarded."
      />
      <Navbar />

      <section className="px-4 sm:px-6 pt-8 pb-6 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading tracking-widest uppercase text-white mb-3 bg-midnight-cherry">
          <Instagram size={13} /> Social Reviews
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">
          POST IT. TAG IT. GET PAID IN POINTS.
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-body mt-3 max-w-xl mx-auto">
          Share your Flavor Isle experience on Instagram and earn 100 loyalty points toward your next meal.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map(({ Icon, title, text }) => (
            <div key={title} className="card-diner p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-3">
                <Icon size={22} className="text-midnight-cherry" />
              </div>
              <h3 className="font-heading text-base text-obsidian-roast mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground font-body leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-8">
        <GoogleReviewsCard />
      </section>

      <section className="max-w-xl mx-auto px-4 sm:px-6 pb-16">
        <InstagramReviewForm defaultEmail={user?.email || ''} defaultName={user?.full_name || ''} />
        <p className="text-xs text-muted-foreground font-body text-center mt-4">
          Points are credited to your Flavor Isle rewards account. Each Instagram post can only be claimed once,
          and points can be earned once per week.
        </p>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}