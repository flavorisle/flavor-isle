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
      {
        heading: 'Photos & Your Likeness',
        text: 'We may take photographs or video in our restaurant and at events. If you appear in those photos, we may use them as described in this policy. You may also choose to share a photo with us directly (for example, in a review or feedback submission).',
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
        text: 'We may use your email or phone number to send order confirmations, status updates, and to respond to your questions or concerns — including through our AI assistant, Smashie.',
      },
      {
        heading: 'Loyalty & Rewards',
        text: 'If you join our loyalty program, we track points earned and redeemed so your rewards stay available across visits. Your phone number is used to link your online rewards to your in-store Star Rewards account.',
      },
      {
        heading: 'Marketing & Promotions',
        text: 'With your consent, we may use your name, photo, comments, or order stories to promote Flavor Isle — on our website, in our social media posts (including Facebook and Google), and in promotional materials. See "SMS, Phone & Marketing Consent" below.',
      },
      {
        heading: 'Your Photos & Likeness',
        text: 'Photos taken of you in our restaurant or shared with us may be displayed on our website and used in promotions, social media (including Facebook and Google), and advertising — but only with your consent, which you can withdraw at any time.',
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
        text: 'We share only what is necessary with our trusted service partners — for payment processing and in-store order syncing (Square), delivery courier services, and merchandise fulfillment (Printful) — to run our business.',
      },
      {
        heading: 'Phone & SMS Communications (Twilio)',
        text: 'We use Twilio to send you SMS messages and to place or receive phone calls. When you provide your phone number and consent, Twilio processes that number and message content to deliver SMS updates and connect calls. Message and data rates may apply. You can opt out at any time by replying STOP to any text.',
      },
      {
        heading: 'AI Assistant (OpenAI)',
        text: 'Our virtual assistant, Smashie, is powered by OpenAI. When you chat with Smashie online, by SMS, or by phone, the content of your conversation is sent to OpenAI to generate a response. We do not use your conversations to train OpenAI\u2019s models. Avoid sharing sensitive personal or payment details in chat.',
      },
      {
        heading: 'Marketing on Facebook & Google',
        text: 'With your consent, we may feature your photo, name, or feedback in paid and organic promotions on Facebook and Google. We do not share your contact information with these platforms for marketing beyond what is needed to display the promotion.',
      },
      {
        heading: 'Legal Requirements',
        text: 'We never sell your personal information. We may disclose information when required by law or to protect the rights, property, or safety of our guests and staff.',
      },
    ],
  },
  {
    title: 'Mobile App (iOS & Android)',
    body: [
      {
        heading: 'Device & App Data',
        text: 'Our mobile app (available on iOS and Android) collects the same order and account information described above. When you use the app, we may also receive a push notification token and basic device identifiers so we can deliver order updates and keep your session secure.',
      },
      {
        heading: 'Push Notifications',
        text: 'If you allow notifications, we send push notifications about your order status, rewards, and occasional offers. You can turn notifications off at any time in your device settings. We do not use push notifications to track your location.',
      },
      {
        heading: 'Permissions',
        text: 'The app may request permission to send notifications. It does not require access to your camera, contacts, microphone, or location to place an order. Any permission prompts come from your device and can be managed in your device settings.',
      },
      {
        heading: 'Data Sync',
        text: 'When you sign in, your account, orders, rewards, and cart sync across the website and the app. If you use the app without signing in, your order and cart data stays on that device and is not shared with other devices.',
      },
    ],
  },
  {
    title: 'Tasty Threads Merchandise',
    body: [
      {
        heading: 'Shipping Information',
        text: 'When you order from our Tasty Threads merchandise store, we collect your name, shipping address, email, and phone number to process and ship your order. Your shipping address is shared with our fulfillment partner to deliver your items.',
      },
      {
        heading: 'Fulfillment Partner (Printful)',
        text: 'Merchandise is printed and shipped on demand by Printful. When you place a merch order, your order details and shipping address are sent to Printful to manufacture and deliver your items. Printful uses this information solely to fulfill your order.',
      },
      {
        heading: 'Merch Order Records',
        text: 'We keep a record of your merch orders, tracking numbers, and fulfillment status so you can track your shipment and we can assist with any issues.',
      },
    ],
  },
  {
    title: 'SMS, Phone & Marketing Consent',
    body: [
      {
        heading: 'SMS Consent',
        text: 'By providing your phone number at checkout, in your account, or to our staff, you consent to receive SMS messages from Flavor Isle — including order confirmations, status updates (preparing, ready, completed), and replies from our assistant. Providing your number is optional but required to receive these messages. Reply STOP at any time to opt out; reply HELP for help.',
      },
      {
        heading: 'Receiving Phone Calls',
        text: 'By providing your phone number, you also consent to receive phone calls from us — including automated or AI-assisted calls from Smashie — about your order, rewards, or to follow up on feedback. You can withdraw this consent by removing your phone number from your account or contacting us.',
      },
      {
        heading: 'Use of Your Information on Our Website & in Promos',
        text: 'With your consent, we may display your first name, review, rating, or photo on our website and use them in promotions. Reviews submitted through our feedback form may be shown publicly once approved. You can ask us to remove your information from public display at any time.',
      },
      {
        heading: 'Use of Photos Taken of You',
        text: 'Photos or video taken of you in our restaurant or at our events may be used on our website and in promotions, social media (including Facebook and Google), and advertising. Where practical, we will ask for your consent before prominently featuring you. To opt out or request removal of a photo, contact us using the details below.',
      },
      {
        heading: 'Withdrawing Consent',
        text: 'You can withdraw any consent given here at any time — remove your phone number from your account, reply STOP to a text, or contact us to remove your photo or information from public display. Withdrawing consent does not affect messages already sent or orders already placed.',
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
        text: 'You can opt out of promotional messages by using the unsubscribe link in any email or replying STOP to any text message. You can also remove your phone number from your account to stop SMS and phone calls. Transactional messages about your active orders are unaffected.',
      },
      {
        heading: 'Withdraw Photo & Marketing Consent',
        text: 'To withdraw consent for us to use your photo, name, or information on our website, social media, or in promotions, contact us using the details below and we will remove it promptly.',
      },
      {
        heading: 'Request Data Deletion',
        text: 'To request deletion of your personal data, contact us using the details below. We will respond within 30 days.',
      },
    ],
  },
];

export default function PrivacyPolicy() {
  const lastUpdated = 'August 28, 2026';
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
            from guests who order online, dine with us, use our website, or use our mobile app, and how we use, share, and protect
            that information. By using our website, mobile app, or placing an order, you agree to the practices described here.
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