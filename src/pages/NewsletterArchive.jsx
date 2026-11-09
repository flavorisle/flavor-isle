import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ChevronDown, Newspaper } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import { NEWSLETTER_ISSUES } from '@/lib/newsletterIssues';

// Every past Isle News issue, newest first. The newest opens by default; tapping
// a card's header expands that issue inline so customers can read it here.
export default function NewsletterArchive() {
  const [openSlug, setOpenSlug] = useState(NEWSLETTER_ISSUES[0]?.slug || null);

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        path="/newsletter-archive"
        title="Newsletter Archive | Past Issues — Flavor Isle"
        description="Read past Flavor Isle newsletters — community news, new menu items, seasonal shakes, and what's happening at the Isle in Smiths Grove, KY."
      />
      <Navbar />
      <CartDrawer />

      <section className="bg-patina-mint text-white px-4 sm:px-6 py-14">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full font-heading text-sm tracking-wide mb-5">
            <Newspaper size={16} /> ISLE NEWS
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl leading-tight">Newsletter Archive</h1>
          <p className="font-body text-lg text-white/90 mt-4">
            Missed an issue? Everything we've sent is here — newest first.
          </p>
          <Link
            to="/newsletter"
            className="btn-yellow chrome-hover inline-flex items-center gap-2 mt-6 px-6 py-3 text-sm font-heading"
          >
            <Mail size={16} /> Get the next one
          </Link>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {NEWSLETTER_ISSUES.length === 0 ? (
          <div className="card-diner p-10 text-center">
            <p className="font-heading text-xl text-obsidian-roast">No issues archived yet</p>
            <p className="text-sm text-muted-foreground mt-1">Past newsletters will appear here.</p>
          </div>
        ) : (
          NEWSLETTER_ISSUES.map((issue) => {
            const open = openSlug === issue.slug;
            const Issue = issue.Component;
            return (
              <div key={issue.slug} id={issue.slug} className="card-diner overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenSlug(open ? null : issue.slug)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <img
                    src={issue.image}
                    alt={issue.imageAlt}
                    width="200"
                    height="200"
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-xs tracking-[0.18em] uppercase text-smashie-yellow">
                      {issue.date}
                    </p>
                    <h2 className="font-heading text-xl sm:text-2xl text-obsidian-roast leading-tight mt-0.5">
                      {issue.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-snug mt-1 line-clamp-2">
                      {issue.summary}
                    </p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`flex-shrink-0 text-midnight-cherry transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>

                {open && (
                  <div className="border-t border-border bg-white">
                    <Issue />
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      <Footer />
    </div>
  );
}