import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Newspaper } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import { NEWSLETTER_ISSUES, formatIssueDate } from '@/data/newsletterIssues';

// Every newsletter issue that exists in code, newest first. Nothing is fetched:
// the list is the archive, and each card opens the saved issue itself.
export default function NewsletterArchive() {
  const issues = [...NEWSLETTER_ISSUES].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Newsletter Archive — Flavor Isle | Smiths Grove, KY"
        description="Every issue of the Flavor Isle newsletter in one place, newest first: new menu items, seasonal shakes, and what's changed at the Isle in Smiths Grove, KY."
      />
      <Navbar />
      <CartDrawer />

      <section className="bg-patina-mint text-white px-4 sm:px-6 py-14">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full font-heading text-sm tracking-wide mb-5">
            <Newspaper size={16} /> PAST ISSUES
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl leading-tight">Newsletter Archive</h1>
          <p className="font-body text-base sm:text-lg text-white/90 mt-3 max-w-lg mx-auto">
            Every issue we've sent, in one place. Pick one and read it here.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        {issues.length === 0 ? (
          <div className="card-diner p-8 text-center">
            <p className="font-heading text-lg text-obsidian-roast mb-1">No issues archived yet</p>
            <p className="text-sm text-muted-foreground font-body mb-5">
              The first issue will show up here once it goes out.
            </p>
            <Link to="/newsletter" className="btn-mint chrome-hover inline-block px-6 py-3 text-sm font-heading">
              Get the Scoop
            </Link>
          </div>
        ) : (
          issues.map((issue) => (
            <Link
              key={issue.slug}
              to={`/newsletters/${issue.slug}`}
              className="card-diner group block p-6 sm:p-7 focus:outline-none focus-visible:ring-2 focus-visible:ring-midnight-cherry focus-visible:ring-offset-2"
            >
              <p className="font-heading text-xs tracking-[0.18em] uppercase text-midnight-cherry">
                {formatIssueDate(issue.date)}
              </p>
              <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast leading-tight mt-2">
                {issue.title}
              </h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed mt-2">{issue.summary}</p>
              <span className="inline-flex items-center gap-1.5 mt-4 font-heading text-sm text-patina-mint group-hover:text-midnight-cherry transition-colors">
                Read the issue <ArrowRight size={16} />
              </span>
            </Link>
          ))
        )}
      </section>

      <Footer />
    </div>
  );
}