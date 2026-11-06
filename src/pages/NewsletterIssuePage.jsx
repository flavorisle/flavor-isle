import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import NewsletterIssue from '@/components/newsletter/NewsletterIssue';
import FooterEmailSignup from '@/components/FooterEmailSignup';
import { NEWSLETTER_ISSUES, formatIssueDate } from '@/data/newsletterIssues';

// A single archived issue at /newsletters/:slug. The issue itself is the same
// newsletter component the /newsletter page renders, opened by slug; nothing
// about the issue copy changes here.
export default function NewsletterIssuePage() {
  const { slug } = useParams();
  const issue = NEWSLETTER_ISSUES.find((entry) => entry.slug === slug) || null;

  // A missing issue is a real 404 for crawlers, once we know it's missing —
  // the lookup is synchronous, so there is no loading state to wait out.
  useEffect(() => {
    if (issue) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, [issue]);

  if (!issue) {
    return (
      <div className="min-h-screen bg-vanilla-malt">
        <Seo
          title="Issue Not Found — Flavor Isle Newsletter"
          description="That newsletter issue isn't here. Browse every past issue of the Flavor Isle newsletter in Smiths Grove, KY."
        />
        <Navbar />
        <CartDrawer />

        <section className="max-w-xl mx-auto px-4 sm:px-6 py-16">
          <div className="card-diner p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-4">
              <FileQuestion size={26} className="text-midnight-cherry" />
            </div>
            <h1 className="font-heading text-2xl text-obsidian-roast mb-2">That issue isn't here</h1>
            <p className="text-sm text-muted-foreground font-body leading-relaxed mb-6">
              We couldn't find a newsletter with that name. Every issue we've sent is in the archive.
            </p>
            <Link to="/newsletters" className="btn-mint chrome-hover inline-block px-6 py-3 text-sm font-heading">
              Back to all issues
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title={`${issue.title} — Flavor Isle Newsletter`}
        description={issue.summary}
      />
      <Navbar />
      <CartDrawer />

      <section className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <Link
          to="/newsletters"
          className="inline-flex items-center gap-1.5 font-heading text-sm text-patina-mint hover:text-midnight-cherry transition-colors"
        >
          <ArrowLeft size={16} /> Back to all issues
        </Link>
        <p className="font-heading text-xs tracking-[0.18em] uppercase text-muted-foreground mt-4">
          {formatIssueDate(issue.date)}
        </p>
      </section>

      <NewsletterIssue issue={issue.component} />

      <div className="bg-obsidian-roast text-white">
        <FooterEmailSignup />
      </div>

      <Footer />
    </div>
  );
}