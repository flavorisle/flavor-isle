import React from 'react';
import { FileText, MapPin, Phone, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

const SECTIONS = [
  {
    title: 'Acceptance of These Terms',
    body: [
      {
        heading: 'Agreement to Terms',
        text: 'These Terms of Service govern your use of the Flavor Isle website, online ordering, loyalty program, and our AI assistant, Smashie. By placing an order, creating an account, chatting with Smashie, or providing your phone number, you agree to these terms. If you do not agree, please do not use our services.',
      },
      {
        heading: 'Changes to These Terms',
        text: 'We may update these terms from time to time. The "Last updated" date below reflects the most recent revision. Continued use of our services after changes means you accept the updated terms.',
      },
    ],
  },
  {
    title: 'Ordering & Payment',
    body: [
      {
        heading: 'Placing an Order',
        text: 'When you place an order, you agree to pay the total shown, including applicable taxes, fees, and any tip you choose to add. Prices and availability may change without notice. We reserve the right to cancel or refund an order if an error in pricing or availability occurs.',
      },
      {
        heading: 'Payment',
        text: 'Payment is processed securely through our payment partner, Square. We do not store your full card details. By submitting payment, you authorize us to charge the total shown for your order.',
      },
      {
        heading: 'Order Times & Availability',
        text: 'Estimated ready times are approximate and may vary with kitchen volume. Online ordering may be paused near closing time or during unexpected downtime.',
      },
    ],
  },
  {
    title: 'SMS, Phone & Communication Consent',
    body: [
      {
        heading: 'SMS Consent',
        text: 'By providing your phone number at checkout, in your account, or to our staff, you consent to receive SMS messages from Flavor Isle — including order confirmations, status updates (preparing, ready, completed), and replies from our assistant. Message and data rates may apply. Reply STOP to opt out or HELP for help. Providing your number is optional but required to receive these messages.',
      },
      {
        heading: 'Receiving Phone Calls From Us',
        text: 'By providing your phone number, you consent to receive phone calls from us — including automated or AI-assisted calls from Smashie — about your order, rewards, or to follow up on feedback. You can withdraw this consent by removing your phone number from your account or contacting us.',
      },
      {
        heading: 'Twilio',
        text: 'SMS and phone calls are delivered through Twilio. When you consent, Twilio processes your phone number and message content to deliver these communications on our behalf.',
      },
    ],
  },
  {
    title: 'AI Assistant (Smashie & OpenAI)',
    body: [
      {
        heading: 'Using Smashie',
        text: 'Smashie is our AI assistant, powered by OpenAI. You can chat with Smashie on our website, by SMS, or by phone to ask about our menu, place an order, or get help. Conversations with Smashie are sent to OpenAI to generate responses.',
      },
      {
        heading: 'Your Responsibility',
        text: 'Do not share sensitive personal, medical, or payment details with Smashie. Smashie may make mistakes; confirm important order details in your confirmation. We are not liable for errors in AI-generated responses.',
      },
    ],
  },
  {
    title: 'Marketing, Photos & Promotional Use',
    body: [
      {
        heading: 'Use of Your Information on Our Website & in Promos',
        text: 'With your consent, we may display your first name, review, rating, or photo on our website and use them in promotions. Reviews submitted through our feedback form may be shown publicly once approved.',
      },
      {
        heading: 'Use of Photos Taken of You',
        text: 'Photos or video taken of you in our restaurant or at our events may be used on our website and in promotions, social media (including Facebook and Google), and advertising. Where practical, we will ask for your consent before prominently featuring you.',
      },
      {
        heading: 'Being Featured on Facebook & Google',
        text: 'With your consent, we may feature your photo, name, or feedback in paid and organic promotions on Facebook and Google. You can withdraw this consent and request removal at any time by contacting us.',
      },
      {
        heading: 'Withdrawing Consent',
        text: 'You can withdraw marketing and photo consent at any time by contacting us. Removal from public display will be handled promptly, though content already published may take time to update across all platforms.',
      },
    ],
  },
  {
    title: 'Tasty Threads Merchandise',
    body: [
      {
        heading: 'Merch Orders',
        text: 'When you order from our Tasty Threads merchandise store, you agree to pay the total shown, including shipping and applicable taxes. Merchandise prices and availability may change without notice.',
      },
      {
        heading: 'Print-on-Demand Fulfillment',
        text: 'Merchandise is printed and shipped on demand by our fulfillment partner, Printful. Production typically takes 2–7 business days before shipping. Estimated delivery times are approximate and may vary.',
      },
      {
        heading: 'Shipping',
        text: 'Shipping costs are calculated at checkout based on your address and the items in your order. We are not responsible for delays caused by the shipping carrier or incorrect addresses provided at checkout.',
      },
      {
        heading: 'Returns & Exchanges',
        text: 'Because each item is made to order, we generally do not accept returns or exchanges for size or preference reasons. If your item arrives damaged, defective, or incorrect, contact us promptly with a photo and we will arrange a replacement or refund.',
      },
    ],
  },
  {
    title: 'Loyalty & Rewards',
    body: [
      {
        heading: 'Star Rewards',
        text: 'Our Star Rewards loyalty program is linked to your phone number and synced with our in-store Square loyalty program. Points are earned on qualifying purchases and may be redeemed for available rewards. Points have no cash value and may expire or change per program rules.',
      },
      {
        heading: 'Account Responsibility',
        text: 'You are responsible for keeping your account and phone number accurate so your rewards are tracked correctly. We are not liable for rewards missed due to incorrect contact information.',
      },
    ],
  },
  {
    title: 'Cancellations, Refunds & Conduct',
    body: [
      {
        heading: 'Cancellations & Refunds',
        text: 'Orders can usually be cancelled before preparation begins. Once your order is being prepared, cancellations may not be possible. Refunds for issues with your order are handled case-by-case — contact us promptly and we will make it right.',
      },
      {
        heading: 'Acceptable Use',
        text: 'You agree not to misuse our website, abuse our staff or assistant, place fraudulent orders, or attempt to disrupt our services. We may suspend access or refuse service in cases of abuse.',
      },
    ],
  },
  {
    title: 'Limitation of Liability',
    body: [
      {
        heading: 'Service Provided "As Is"',
        text: 'Our website and services are provided "as is" and "as available." We do not guarantee uninterrupted or error-free service. To the fullest extent permitted by law, Flavor Isle is not liable for indirect or incidental damages arising from your use of our services.',
      },
      {
        heading: 'Third-Party Services',
        text: 'Our services rely on third parties (including Square, Twilio, OpenAI, and Printful). We are not responsible for their separate policies or service interruptions.',
      },
    ],
  },
];

export default function TermsOfService() {
  const lastUpdated = 'August 26, 2026';
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-patina-mint rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={26} className="text-white" />
          </div>
          <h1 className="font-heading text-4xl text-obsidian-roast mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">The rules and terms for using Flavor Isle's website and services.</p>
          <p className="text-xs text-muted-foreground mt-2">Last updated: {lastUpdated}</p>
        </div>

        {/* Intro */}
        <div className="card-diner p-6 mb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome to Flavor Isle! These Terms of Service explain the rules for using our website, placing orders,
            earning rewards, chatting with our assistant Smashie, and receiving messages from us. By using our services,
            you agree to these terms — including your consent to SMS and phone communications, the use of OpenAI for our
            assistant, and the promotional use of your information and photos as described here.
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
          <h2 className="font-heading text-2xl text-obsidian-roast mb-2">Questions About These Terms?</h2>
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