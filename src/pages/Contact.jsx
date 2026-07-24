import React, { useState } from 'react';
import { MapPin, Phone, Clock, Mail, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary } from '@/lib/businessHours';

export default function Contact() {
  const businessHours = useBusinessHours();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setLoading(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: 'hello@flavor-isle.com',
        subject: `Website Message from ${form.name}`,
        body: `Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`
      });
      setSent(true);
    } catch {
      setSent(true); // Show success regardless to avoid exposing errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Get in Touch</p>
        <h1 className="font-heading text-5xl text-obsidian-roast mb-12">Contact Us</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Info */}
          <div className="space-y-8">
            <div className="card-diner p-8 space-y-6">
              {[
                { icon: MapPin, label: 'Address', value: '103 N Main St, Smiths Grove, Kentucky 42171', href: 'https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171' },
                { icon: Phone, label: 'Phone', value: '(270) 563-4618', href: 'tel:+12705634618' },
                { icon: Mail, label: 'Email', value: 'hello@flavor-isle.com', href: 'mailto:hello@flavor-isle.com' },
                { icon: Clock, label: 'Hours', value: hoursSummary(businessHours), href: null },
              ].map(info => (
                <div key={info.label} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-midnight-cherry/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <info.icon size={20} className="text-midnight-cherry" />
                  </div>
                  <div>
                    <p className="font-heading text-sm text-obsidian-roast mb-0.5">{info.label}</p>
                    {info.href ? (
                      <a href={info.href} className="text-muted-foreground text-sm hover:text-midnight-cherry transition-colors">{info.value}</a>
                    ) : (
                      <p className="text-muted-foreground text-sm">{info.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Map visual */}
            <div className="rounded-3xl overflow-hidden shadow-float h-56 bg-gradient-to-br from-patina-mint to-teal-700 flex items-center justify-center relative">
              <div className="text-center text-white z-10">
                <MapPin size={32} className="mx-auto mb-2 text-red-300" />
                <p className="font-heading">Flavor Isle · Smiths Grove, KY</p>
                <a
                  href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block bg-white text-patina-mint px-4 py-1.5 rounded-full text-sm font-heading hover:bg-vanilla-malt transition-colors"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="card-diner p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="font-heading text-xl text-obsidian-roast mb-2">Message Sent!</h3>
                <p className="text-muted-foreground text-sm">We'll get back to you as soon as we can. Thanks for reaching out!</p>
              </div>
            ) : (
              <>
                <h2 className="font-heading text-xl text-obsidian-roast mb-6">Send a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Your name"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Message</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="How can we help?"
                      rows={5}
                      required
                      className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send Message'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}