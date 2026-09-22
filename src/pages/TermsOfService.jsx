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
        heading: 'SMS Consent (Split — Order Updates vs. Promotional Offers)',
        text: 'Providing your phone number does not by itself enroll you in text messages. Flavor Isle offers two separate, optional text programs you can choose independently: (1) Order Updates — transactional texts about your order (confirmed, preparing, ready, completed) and a secure pay-by-text link; and (2) Promotional Offers — recurring marketing texts about specials and deals. You opt in to each separately by checking the matching box at checkout, on our sign-up page, in your account, or by texting ORDERS (order updates only) or OFFERS (order updates + offers) to our number. Neither is required to place an order, and the two choices are never bundled — checking one does not sign you up for the other. Message and data rates may apply. Reply STOP to cancel all texts, HELP for help, ORDERS for order updates only, or OFFERS for order updates + offers. Message frequency: order-related texts are sent only around orders you place (typically 1–4 per order); promotional texts are sent only if you separately opted in to offers (typically a few per month). We do not share, sell, or provide your mobile phone number or messaging consent data to third parties or affiliates for marketing. See our Privacy Policy at https://taste-isle-express.base44.app/privacy-policy.',
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
    title: 'Mobile App (iOS & Android)',
    body: [
      {
        heading: 'App Availability',
        text: 'Flavor Isle is also available as a mobile app for iOS and Android, built from the same platform as our website. By downloading and using the app, you agree to these Terms along with the terms of Apple\u2019s App Store or Google Play, as applicable.',
      },
      {
        heading: 'Push Notifications',
        text: 'When you allow notifications, we may send you push notifications about your order status, rewards, and occasional offers. You can turn notifications off at any time in your device settings. Turning them off does not affect order confirmation emails or texts.',
      },
      {
        heading: 'App Updates',
        text: 'We may release app updates with new features, fixes, or changes. Keeping the app updated helps ensure it works correctly. We are not liable for issues caused by using an outdated version of the app.',
      },
      {
        heading: 'Account Sync',
        text: 'Your account, orders, rewards, and cart sync across the website and the mobile app when you sign in. If you use the app without signing in, your data stays on that device only.',
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
        text: 'Star Rewards is Flavor Isle\u2019s loyalty program, operated and managed by Flavor Isle through our Square point-of-sale system. The program allows customers to earn Stars on qualifying purchases and redeem them for available rewards. By participating in Star Rewards, you agree to the terms outlined in this section.',
      },
      {
        heading: 'Eligibility',
        text: 'To participate in Star Rewards, you must provide a valid phone number at checkout or link your phone number to your online account. Only one Star Rewards account may be associated with a single phone number. Accounts cannot be shared, transferred, or merged. Flavor Isle reserves the right to deny enrollment, suspend participation, or remove accounts that violate program rules, provide false information, or attempt to misuse the program. Star Rewards is intended for individual customer use. Commercial, automated, or bulk participation is not permitted.',
      },
      {
        heading: 'Earning Stars',
        text: 'Stars are earned on eligible in-store and online purchases when your phone number is provided at checkout or linked to your online account. The number of Stars awarded may vary based on purchase amount, promotional activity, or program adjustments. Flavor Isle may change earning rates, qualifying items, or promotional bonuses at any time without notice. Stars have no cash value, are non-transferable, and may expire or change according to program rules.',
      },
      {
        heading: 'Redeeming Stars',
        text: 'Stars may be redeemed for available rewards at the register or during online checkout when eligible. Reward availability may vary based on inventory, seasonal offerings, or program updates. Flavor Isle may modify, suspend, or discontinue any reward, tier, or benefit at any time without notice. Rewards cannot be transferred, combined across accounts, or exchanged for cash.',
      },
      {
        heading: 'Account & Phone Number Responsibility',
        text: 'Your Star Rewards account is linked directly to your phone number and synced with our in-store Square loyalty system. You are responsible for keeping your phone number and account information accurate so Stars and rewards are tracked correctly. Flavor Isle is not liable for missed Stars, untracked purchases, or unavailable rewards caused by incorrect, outdated, or unverified contact information.',
      },
      {
        heading: 'Fraud & Misuse',
        text: 'Flavor Isle may suspend or terminate your participation in Star Rewards if we detect or suspect fraudulent activity, misuse, manipulation of earning or redemption mechanics, creation of duplicate accounts, or any attempt to obtain Stars or rewards dishonestly. Examples of misuse include, but are not limited to: using multiple phone numbers to accumulate Stars, attempting to redeem rewards not legitimately earned, providing false or misleading account information, abusing promotions, loopholes, or system errors, or harassing staff or attempting to force unauthorized reward redemption. Flavor Isle reserves the right to revoke Stars, cancel rewards, or close accounts involved in fraudulent or abusive behavior.',
      },
      {
        heading: 'Program Changes & Limitations',
        text: 'Flavor Isle may modify, suspend, or discontinue the Star Rewards program — including earning rules, reward tiers, expiration policies, and promotional bonuses — at any time without notice. Continued participation after changes means you accept the updated terms. Participation in Star Rewards does not guarantee the availability of any specific reward, earning rate, or benefit. Flavor Isle may limit reward quantities, restrict eligibility, or adjust program mechanics as needed.',
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
  const lastUpdated = 'August 28, 2026';
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
            earning rewards, chatting with our assistant Smashie, using our mobile app, and receiving messages from us. By using our services,
            you agree to these terms — including your consent to SMS, phone, and push notifications, the use of OpenAI for our
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