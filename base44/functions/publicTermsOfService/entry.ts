// PUBLIC plain-HTML Terms of Service for Twilio A2P carrier reviewers.
// Carrier review bots can't run the client-rendered React page, so this
// endpoint serves the full terms as static text/html with zero JavaScript.
// No auth — anyone (including review crawlers) can fetch it.
// Keep the body text in sync with src/pages/TermsOfService.jsx.

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Flavor Isle — Terms of Service</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 760px; margin: 0 auto; padding: 24px 20px 60px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 20px; margin: 28px 0 8px; color: #CC3300; }
  h3 { font-size: 15px; margin: 14px 0 4px; }
  p { margin: 0 0 10px; font-size: 15px; }
  .muted { color: #666; font-size: 13px; }
  a { color: #003366; }
</style>
</head>
<body>
<h1>Terms of Service</h1>
<p class="muted">The rules and terms for using Flavor Isle's website and services.</p>
<p class="muted">Last updated: August 28, 2026</p>

<p>Welcome to Flavor Isle! These Terms of Service explain the rules for using our website, placing orders, earning rewards, chatting with our assistant Smashie, using our mobile app, and receiving messages from us. By using our services, you agree to these terms — including your consent to SMS, phone, and push notifications, the use of OpenAI for our assistant, and the promotional use of your information and photos as described here.</p>

<h2>Acceptance of These Terms</h2>
<h3>Agreement to Terms</h3>
<p>These Terms of Service govern your use of the Flavor Isle website, online ordering, loyalty program, and our AI assistant, Smashie. By placing an order, creating an account, chatting with Smashie, or providing your phone number, you agree to these terms. If you do not agree, please do not use our services.</p>
<h3>Changes to These Terms</h3>
<p>We may update these terms from time to time. The "Last updated" date below reflects the most recent revision. Continued use of our services after changes means you accept the updated terms.</p>

<h2>Ordering &amp; Payment</h2>
<h3>Placing an Order</h3>
<p>When you place an order, you agree to pay the total shown, including applicable taxes, fees, and any tip you choose to add. Prices and availability may change without notice. We reserve the right to cancel or refund an order if an error in pricing or availability occurs.</p>
<h3>Payment</h3>
<p>Payment is processed securely through our payment partner, Square. We do not store your full card details. By submitting payment, you authorize us to charge the total shown for your order.</p>
<h3>Order Times &amp; Availability</h3>
<p>Estimated ready times are approximate and may vary with kitchen volume. Online ordering may be paused near closing time or during unexpected downtime.</p>

<h2>SMS, Phone &amp; Communication Consent</h2>
<h3>SMS Consent (Split — Order Updates vs. Promotional Offers)</h3>
<p>Providing your phone number does not by itself enroll you in text messages. Flavor Isle offers two separate, optional text programs you can choose independently: (1) Order Updates — transactional texts about your order (confirmed, preparing, ready, completed) and a secure pay-by-text link; and (2) Promotional Offers — recurring marketing texts about specials and deals. You opt in to each separately by checking the matching box at checkout, on our sign-up page, in your account, or by texting ORDERS (order updates only) or OFFERS (order updates + offers) to our number. Neither is required to place an order, and the two choices are never bundled — checking one does not sign you up for the other. Message and data rates may apply. Reply STOP to cancel all texts, HELP for help, ORDERS for order updates only, or OFFERS for order updates + offers. Message frequency: order-related texts are sent only around orders you place (typically 1–4 per order); promotional texts are sent only if you separately opted in to offers (typically a few per month). We do not share, sell, or provide your mobile phone number or messaging consent data to third parties or affiliates for marketing or promotional purposes. See our Privacy Policy at https://flavor-isle.com/privacy-policy.</p>
<h3>Receiving Phone Calls From Us</h3>
<p>By providing your phone number, you consent to receive phone calls from us — including automated or AI-assisted calls from Smashie — about your order, rewards, or to follow up on feedback. You can withdraw this consent by removing your phone number from your account or contacting us.</p>
<h3>Twilio</h3>
<p>SMS and phone calls are delivered through Twilio. When you consent, Twilio processes your phone number and message content to deliver these communications on our behalf.</p>

<h2>AI Assistant (Smashie &amp; OpenAI)</h2>
<h3>Using Smashie</h3>
<p>Smashie is our AI assistant, powered by OpenAI. You can chat with Smashie on our website, by SMS, or by phone to ask about our menu, place an order, or get help. Conversations with Smashie are sent to OpenAI to generate responses.</p>
<h3>Your Responsibility</h3>
<p>Do not share sensitive personal, medical, or payment details with Smashie. Smashie may make mistakes; confirm important order details in your confirmation. We are not liable for errors in AI-generated responses.</p>

<h2>Marketing, Photos &amp; Promotional Use</h2>
<h3>Use of Your Information on Our Website &amp; in Promos</h3>
<p>With your consent, we may display your first name, review, rating, or photo on our website and use them in promotions. Reviews submitted through our feedback form may be shown publicly once approved.</p>
<h3>Use of Photos Taken of You</h3>
<p>Photos or video taken of you in our restaurant or at our events may be used on our website and in promotions, social media (including Facebook and Google), and advertising. Where practical, we will ask for your consent before prominently featuring you.</p>
<h3>Being Featured on Facebook &amp; Google</h3>
<p>With your consent, we may feature your photo, name, or feedback in paid and organic promotions on Facebook and Google. You can withdraw this consent and request removal at any time by contacting us.</p>
<h3>Withdrawing Consent</h3>
<p>You can withdraw marketing and photo consent at any time by contacting us. Removal from public display will be handled promptly, though content already published may take time to update across all platforms.</p>

<h2>Mobile App (iOS &amp; Android)</h2>
<h3>App Availability</h3>
<p>Flavor Isle is also available as a mobile app for iOS and Android, built from the same platform as our website. By downloading and using the app, you agree to these Terms along with the terms of Apple's App Store or Google Play, as applicable.</p>
<h3>Push Notifications</h3>
<p>When you allow notifications, we may send you push notifications about your order status, rewards, and occasional offers. You can turn notifications off at any time in your device settings. Turning them off does not affect order confirmation emails or texts.</p>
<h3>App Updates</h3>
<p>We may release app updates with new features, fixes, or changes. Keeping the app updated helps ensure it works correctly. We are not liable for issues caused by using an outdated version of the app.</p>
<h3>Account Sync</h3>
<p>Your account, orders, rewards, and bag sync across the website and the mobile app when you sign in. If you use the app without signing in, your data stays on that device only.</p>

<h2>Tasty Threads Merchandise</h2>
<h3>Merch Orders</h3>
<p>When you order from our Tasty Threads merchandise store, you agree to pay the total shown, including shipping and applicable taxes. Merchandise prices and availability may change without notice.</p>
<h3>Print-on-Demand Fulfillment</h3>
<p>Merchandise is printed and shipped on demand by our fulfillment partner, Printful. Production typically takes 2–7 business days before shipping. Estimated delivery times are approximate and may vary.</p>
<h3>Shipping</h3>
<p>Shipping costs are calculated at checkout based on your address and the items in your order. We are not responsible for delays caused by the shipping carrier or incorrect addresses provided at checkout.</p>
<h3>Returns &amp; Exchanges</h3>
<p>Because each item is made to order, we generally do not accept returns or exchanges for size or preference reasons. If your item arrives damaged, defective, or incorrect, contact us promptly with a photo and we will arrange a replacement or refund.</p>

<h2>Loyalty &amp; Rewards</h2>
<h3>Star Rewards</h3>
<p>Star Rewards is Flavor Isle's loyalty program, operated and managed by Flavor Isle through our Square point-of-sale system. The program allows customers to earn Stars on qualifying purchases and redeem them for available rewards. By participating in Star Rewards, you agree to the terms outlined in this section.</p>
<h3>Eligibility</h3>
<p>To participate in Star Rewards, you must provide a valid phone number at checkout or link your phone number to your online account. Only one Star Rewards account may be associated with a single phone number. Accounts cannot be shared, transferred, or merged. Flavor Isle reserves the right to deny enrollment, suspend participation, or remove accounts that violate program rules, provide false information, or attempt to misuse the program. Star Rewards is intended for individual customer use. Commercial, automated, or bulk participation is not permitted.</p>
<h3>Earning Stars</h3>
<p>Stars are earned on eligible in-store and online purchases when your phone number is provided at checkout or linked to your online account. The number of Stars awarded may vary based on purchase amount, promotional activity, or program adjustments. Flavor Isle may change earning rates, qualifying items, or promotional bonuses at any time without notice. Stars have no cash value, are non-transferable, and may expire or change according to program rules.</p>
<h3>Redeeming Stars</h3>
<p>Stars may be redeemed for available rewards at the register or during online checkout when eligible. Reward availability may vary based on inventory, seasonal offerings, or program updates. Flavor Isle may modify, suspend, or discontinue any reward, tier, or benefit at any time without notice. Rewards cannot be transferred, combined across accounts, or exchanged for cash.</p>
<h3>Account &amp; Phone Number Responsibility</h3>
<p>Your Star Rewards account is linked directly to your phone number and synced with our in-store Square loyalty system. You are responsible for keeping your phone number and account information accurate so Stars and rewards are tracked correctly. Flavor Isle is not liable for missed Stars, untracked purchases, or unavailable rewards caused by incorrect, outdated, or unverified contact information.</p>
<h3>Fraud &amp; Misuse</h3>
<p>Flavor Isle may suspend or terminate your participation in Star Rewards if we detect or suspect fraudulent activity, misuse, manipulation of earning or redemption mechanics, creation of duplicate accounts, or any attempt to obtain Stars or rewards dishonestly. Examples of misuse include, but are not limited to: using multiple phone numbers to accumulate Stars, attempting to redeem rewards not legitimately earned, providing false or misleading account information, abusing promotions, loopholes, or system errors, or harassing staff or attempting to force unauthorized reward redemption. Flavor Isle reserves the right to revoke Stars, cancel rewards, or close accounts involved in fraudulent or abusive behavior.</p>
<h3>Program Changes &amp; Limitations</h3>
<p>Flavor Isle may modify, suspend, or discontinue the Star Rewards program — including earning rules, reward tiers, expiration policies, and promotional bonuses — at any time without notice. Continued participation after changes means you accept the updated terms. Participation in Star Rewards does not guarantee the availability of any specific reward, earning rate, or benefit. Flavor Isle may limit reward quantities, restrict eligibility, or adjust program mechanics as needed.</p>

<h2>Star Rewards</h2>
<h3>Points &amp; Phone Number Ownership</h3>
<p>Flavor Isle Star Rewards is our free rewards program. Points accrue only to the rewards account matching the phone number provided at checkout. Entering a phone number on another customer's purchase does not transfer that purchase's points to the person entering the number; points belong to the account that earned them. If we reasonably suspect that someone has claimed points on another customer's purchase, we may suspend or terminate the rewards account used and void its points. Automatic card recognition at the register is a convenience feature and is not the same as signing in to your account on this website. Rewards questions or disputes: rewards@flavor-isle.com.</p>

<h2>Cancellations, Refunds &amp; Conduct</h2>
<h3>Cancellations &amp; Refunds</h3>
<p>Orders can usually be cancelled before preparation begins. Once your order is being prepared, cancellations may not be possible. Refunds for issues with your order are handled case-by-case — contact us promptly and we will make it right.</p>
<h3>Acceptable Use</h3>
<p>You agree not to misuse our website, abuse our staff or assistant, place fraudulent orders, or attempt to disrupt our services. We may suspend access or refuse service in cases of abuse.</p>

<h2>Limitation of Liability</h2>
<h3>Service Provided "As Is"</h3>
<p>Our website and services are provided "as is" and "as available." We do not guarantee uninterrupted or error-free service. To the fullest extent permitted by law, Flavor Isle is not liable for indirect or incidental damages arising from your use of our services.</p>
<h3>Third-Party Services</h3>
<p>Our services rely on third parties (including Square, Twilio, OpenAI, and Printful). We are not responsible for their separate policies or service interruptions.</p>

<h2>Questions About These Terms?</h2>
<p>Reach out and we'll be happy to help.</p>
<p>Phone: <a href="tel:+12705634618">(270) 563-4618</a><br>
Email: <a href="mailto:hello@flavor-isle.com">hello@flavor-isle.com</a><br>
103 N Main St, Smiths Grove, KY 42171</p>

</body>
</html>`;

export default async function (req: Request): Promise<Response> {
  try {
    return new Response(HTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new Response('Error rendering terms of service.', { status: 500 });
  }
}