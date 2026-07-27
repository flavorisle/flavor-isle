import React from 'react';
import { ShieldCheck, MapPin, Phone, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: [
      {
        heading: 'Payment Information',
        text: 'Payment is processed securely through our payment partners. We do not store your full card number, CVV, or sensitive card details on our servers; a tokenized reference is saved to link your payment to your order.',
      },
      {
        heading: 'Order History & Preferences',
        text: 'We keep a record of your past orders, favorites, and any special instructions you provide so we can serve you faster next time and power features like loyalty rewards and order tracking.',
      },
      {
        heading: 'Order & Account Information',
        text: 'When you place an order or create an account, we collect your name, email address, phone number, and — for delivery orders — your delivery address. For dine-in orders we may also store your table number.',
      },
    ],
  },
  {
    title: 'How We Use Your Information',
    body: [
      {
        heading: 'To Prepare & Deliver Your Order',
        text: 'Your contact and address details are used solely to prepare, fulfill, and deliver your order and to contact you about its status.',
      },
      {
        heading: 'Customer Support & Communication',
        text: 'We may use your email or phone number to send order confirmations, status updates, and to respond to your questions or concerns.',
      },
      {
        heading: 'Loyalty & Rewards',
        text: 'If you join our loyalty program, we track points earned and redeemed so your rewards stay available across visits.',
      },
      {
        heading: 'Improving Our Restaurant',
        text: 'Aggregate, de-identified order data helps us understand what guests love and improve our menu, service, and kitchen operations.',
      },
    ],
  },
  {
    title: 'How We Share Your Information',
    body: [
      {
        heading: 'Service Partners',
        text: 'We share only what is necessary with our trusted service partners — for payment processing, in-store order syncing, and delivery courier services — to run our business.',
      },
      {
        heading: 'Phone & SMS Communications',
        text: 'With your consent, we may send order updates by SMS or use automated phone systems to contact you about your order. Standard message rates may apply.',
      },
      {
        heading: 'Legal Requirements',
        text: 'We never sell your personal information. We may disclose information when required by law or to protect the rights, property, or safety of our guests and staff.',
      },
    ],
  },
  {
    title: 'Data Security',
    body: [
      {
        heading: 'Protection Measures',
        text: 'We use industry-standard safeguards — encrypted connections (TLS/SSL), tokenized payments, and access controls — to protect your personal information from unauthorized access, alteration, or disclosure.',
      },
      {
        heading: 'Data Retention',
        text: 'We keep your order history for as long as your account is active or as needed to provide our services and comply with legal obligations. You can request deletion of your account data at any time.',
      },
    ],
  },
  {
    title: 'Cookies & Analytics',
    body: [
      {
        heading: 'Cookies',
        text: 'We use essential cookies to keep your cart, remember your order type, and keep you signed in. We do not use cookies to sell your data to third parties.',
      },
      {
        heading: 'Analytics',
        text: 'We use event tracking to understand which menu items and order types are popular so we can improve the experience. This data is aggregated and never tied to your identity for marketing.',
      },
    ],
  },
  {
    title: 'Your Privacy Rights',
    body: [
      {
        heading: 'Access & Correction',
        text: 'You can review and update your profile information from the My Account page at any time.',
      },
      {
        heading: 'Opt-Out',
        text: 'You can opt out of promotional messages by using the unsubscribe link in any email or replying STOP to any text message. Transactional messages about your active orders are unaffected.',
      },
      {
        heading: 'Request Data Deletion',
        text: 'To request deletion of your personal data, contact us using the details below. We will respond within 30 days.',
      },
    ],
  },
];

export default function PrivacyPolicy() {
  const lastUpdated = 'July 27, 2026';
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-midnight-cherry rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={26} className="text-white" />
          </div>
          <h1 className="font-heading text-4xl text-obsidian-roast mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">How Flavor Isle collects, uses, and protects your information.</p>
          <p className="text-xs text-muted-foreground mt-2">Last updated: {lastUpdated}</p>
        </div>

        {/* Intro */}
        <div className="card-diner p-6 mb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            At Flavor Isle, your privacy is important to us. This policy explains what information we collect
            from guests who order online, dine with us, or use our website, and how we use, share, and protect
            that information. By using our website or placing an order, you agree to the practices described here.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map(section => (
            <div key={section.title} className="card-diner p-6">
              <h2 className="font-heading text-xl text-midnight-cherry mb-3">{section.title}</h2>
              <div className="space-y-3">
                {section.body.map((item, i) => (
                  <div key={i}>
                    <h3 className="font-heading text-sm text-obsidian-roast mb-1">{item.heading}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="card-diner p-8 text-center mt-8">
          <h2 className="font-heading text-2xl text-obsidian-roast mb-2">Questions About Your Privacy?</h2>
          <p className="text-muted-foreground mb-6">Reach out and we'll be happy to help.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:+12705634618" className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading inline-flex items-center justify-center gap-2">
              <Phone size={16} /> (270) 563-4618
            </a>
            <a href="mailto:hello@flavorisle.com" className="btn-mint chrome-hover px-8 py-4 text-sm font-heading inline-flex items-center justify-center gap-2">
              <Mail size={16} /> Email Us
            </a>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
            <MapPin size={14} className="text-patina-mint" />
            103 N Main St, Smiths Grove, KY 42171
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}