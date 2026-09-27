// PUBLIC plain-HTML Privacy Policy for Twilio A2P carrier reviewers.
// Carrier review bots can't run the client-rendered React page, so this
// endpoint serves the full policy as static text/html with zero JavaScript.
// No auth — anyone (including review crawlers) can fetch it.
// Keep the body text in sync with src/pages/PrivacyPolicy.jsx.

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Flavor Isle — Privacy Policy</title>
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
<h1>Privacy Policy</h1>
<p class="muted">How Flavor Isle collects, uses, and protects your information.</p>
<p class="muted">Last updated: August 28, 2026</p>

<p>At Flavor Isle, your privacy is important to us. This policy explains what information we collect from guests who order online, dine with us, use our website, or use our mobile app, and how we use, share, and protect that information. By using our website, mobile app, or placing an order, you agree to the practices described here.</p>

<h2>Information We Collect</h2>
<h3>Payment Information</h3>
<p>Payment is processed securely through our payment partners. We do not store your full card number, CVV, or sensitive card details on our servers; a tokenized reference is saved to link your payment to your order.</p>
<h3>Order History &amp; Preferences</h3>
<p>We keep a record of your past orders, favorites, and any special instructions you provide so we can serve you faster next time and power features like loyalty rewards and order tracking.</p>
<h3>Order &amp; Account Information</h3>
<p>When you place an order or create an account, we collect your name, email address, phone number, and — for delivery orders — your delivery address. For dine-in orders we may also store your table number.</p>
<h3>Photos &amp; Your Likeness</h3>
<p>We may take photographs or video in our restaurant and at events. If you appear in those photos, we may use them as described in this policy. You may also choose to share a photo with us directly (for example, in a review or feedback submission).</p>

<h2>How We Use Your Information</h2>
<h3>To Prepare &amp; Deliver Your Order</h3>
<p>Your contact and address details are used solely to prepare, fulfill, and deliver your order and to contact you about its status.</p>
<h3>Customer Support &amp; Communication</h3>
<p>We may use your email or phone number to send order confirmations, status updates, and to respond to your questions or concerns — including through our AI assistant, Smashie.</p>
<h3>Loyalty &amp; Rewards</h3>
<p>Your Star Rewards loyalty account is managed through Square, our point-of-sale system. When you join, Square stores your loyalty membership, points, and reward history; we use your phone number to look up your account so your rewards stay available in-store and online. Flavor Isle does not keep a separate copy of your loyalty points or balances.</p>
<h3>Marketing &amp; Promotions</h3>
<p>With your consent, we may use your name, photo, comments, or order stories to promote Flavor Isle — on our website, in our social media posts (including Facebook and Google), and in promotional materials. See "SMS, Phone &amp; Marketing Consent" below.</p>
<h3>Your Photos &amp; Likeness</h3>
<p>Photos taken of you in our restaurant or shared with us may be displayed on our website and used in promotions, social media (including Facebook and Google), and advertising — but only with your consent, which you can withdraw at any time.</p>
<h3>Improving Our Restaurant</h3>
<p>Aggregate, de-identified order data helps us understand what guests love and improve our menu, service, and kitchen operations.</p>

<h2>How We Share Your Information</h2>
<h3>Service Partners</h3>
<p>We share only what is necessary with our trusted service partners — for payment processing and in-store order syncing (Square), delivery courier services, and merchandise fulfillment (Printful) — to run our business.</p>
<h3>Phone &amp; SMS Communications (Twilio)</h3>
<p>We use Twilio to send you SMS messages and to place or receive phone calls. When you provide your phone number and consent, Twilio processes that number and message content to deliver SMS updates and connect calls. Message and data rates may apply. You can opt out at any time by replying STOP to any text.</p>
<h3>AI Assistant (OpenAI)</h3>
<p>Our virtual assistant, Smashie, is powered by OpenAI. When you chat with Smashie online, by SMS, or by phone, the content of your conversation is sent to OpenAI to generate a response. We do not use your conversations to train OpenAI's models. Avoid sharing sensitive personal or payment details in chat.</p>
<h3>Marketing on Facebook &amp; Google</h3>
<p>With your consent, we may feature your photo, name, or feedback in paid and organic promotions on Facebook and Google. We do not share your contact information with these platforms for marketing beyond what is needed to display the promotion.</p>
<h3>Legal Requirements</h3>
<p>We never sell your personal information. We may disclose information when required by law or to protect the rights, property, or safety of our guests and staff.</p>

<h2>Mobile App (iOS &amp; Android)</h2>
<h3>Device &amp; App Data</h3>
<p>Our mobile app (available on iOS and Android) collects the same order and account information described above. When you use the app, we may also receive a push notification token and basic device identifiers so we can deliver order updates and keep your session secure.</p>
<h3>Push Notifications</h3>
<p>If you allow notifications, we send push notifications about your order status, rewards, and occasional offers. You can turn notifications off at any time in your device settings. We do not use push notifications to track your location.</p>
<h3>Permissions</h3>
<p>The app may request permission to send notifications. It does not require access to your camera, contacts, microphone, or location to place an order. Any permission prompts come from your device and can be managed in your device settings.</p>
<h3>Data Sync</h3>
<p>When you sign in, your account, orders, rewards, and bag sync across the website and the app. If you use the app without signing in, your order and bag data stays on that device and is not shared with other devices.</p>

<h2>Tasty Threads Merchandise</h2>
<h3>Shipping Information</h3>
<p>When you order from our Tasty Threads merchandise store, we collect your name, shipping address, email, and phone number to process and ship your order. Your shipping address is shared with our fulfillment partner to deliver your items.</p>
<h3>Fulfillment Partner (Printful)</h3>
<p>Merchandise is printed and shipped on demand by Printful. When you place a merch order, your order details and shipping address are sent to Printful to manufacture and deliver your items. Printful uses this information solely to fulfill your order.</p>
<h3>Merch Order Records</h3>
<p>We keep a record of your merch orders, tracking numbers, and fulfillment status so you can track your shipment and we can assist with any issues.</p>

<h2>SMS, Phone &amp; Marketing Consent</h2>
<h3>SMS Consent (Split — Order Updates vs. Promotional Offers)</h3>
<p>Providing your phone number does not by itself consent to text messages. Flavor Isle offers two separate, optional text programs you can choose independently: (1) Order Updates — transactional texts about your order (confirmed, preparing, ready, completed) and a secure pay-by-text link; and (2) Promotional Offers — recurring marketing texts about specials and deals. You opt in to each separately and independently by checking the matching box at checkout, on our sign-up page, in your account, or by texting ORDERS (order updates only) or OFFERS (order updates + offers) to our number. Neither is required to place an order, and consent is never bundled — checking the order-updates box does not sign you up for offers, and vice versa. Message and data rates may apply. Reply STOP to cancel all texts, HELP for help, ORDERS for order updates only, or OFFERS for order updates + offers. Message frequency: order-related texts are sent only around orders you place (typically 1–4 per order); promotional texts are sent only if you separately opted in to offers (typically a few per month). We do not share, sell, or provide your mobile phone number or messaging consent data to third parties or affiliates for marketing or promotional purposes. Full terms: https://taste-isle-express.base44.app/terms-of-service.</p>
<h3>Receiving Phone Calls</h3>
<p>By providing your phone number, you also consent to receive phone calls from us — including automated or AI-assisted calls from Smashie — about your order, rewards, or to follow up on feedback. You can withdraw this consent by removing your phone number from your account or contacting us.</p>
<h3>Use of Your Information on Our Website &amp; in Promos</h3>
<p>With your consent, we may display your first name, review, rating, or photo on our website and use them in promotions. Reviews submitted through our feedback form may be shown publicly once approved. You can ask us to remove your information from public display at any time.</p>
<h3>Use of Photos Taken of You</h3>
<p>Photos or video taken of you in our restaurant or at our events may be used on our website and in promotions, social media (including Facebook and Google), and advertising. Where practical, we will ask for your consent before prominently featuring you. To opt out or request removal of a photo, contact us using the details below.</p>
<h3>Withdrawing Consent</h3>
<p>You can withdraw any consent given here at any time — remove your phone number from your account, reply STOP to a text, or contact us to remove your photo or information from public display. Withdrawing consent does not affect messages already sent or orders already placed.</p>

<h2>Data Security</h2>
<h3>Protection Measures</h3>
<p>We use industry-standard safeguards — encrypted connections (TLS/SSL), tokenized payments, and access controls — to protect your personal information from unauthorized access, alteration, or disclosure.</p>
<h3>Data Retention</h3>
<p>We keep your order history for as long as your account is active or as needed to provide our services and comply with legal obligations. You can request deletion of your account data at any time.</p>

<h2>Cookies &amp; Analytics</h2>
<h3>Cookies</h3>
<p>We use essential cookies to keep your bag, remember your order type, and keep you signed in. We do not use cookies to sell your data to third parties.</p>
<h3>Analytics</h3>
<p>We use event tracking to understand which menu items and order types are popular so we can improve the experience. This data is aggregated and never tied to your identity for marketing.</p>

<h2>Your Privacy Rights</h2>
<h3>Access &amp; Correction</h3>
<p>You can review and update your profile information from the My Account page at any time.</p>
<h3>Opt-Out</h3>
<p>You can opt out of promotional messages by using the unsubscribe link in any email or replying STOP to any text message. You can also remove your phone number from your account to stop SMS and phone calls. Transactional messages about your active orders are unaffected.</p>
<h3>Withdraw Photo &amp; Marketing Consent</h3>
<p>To withdraw consent for us to use your photo, name, or information on our website, social media, or in promotions, contact us using the details below and we will remove it promptly.</p>
<h3>Request Data Deletion</h3>
<p>To request deletion of your personal data, contact us using the details below. We will respond within 30 days.</p>

<h2>Questions About Your Privacy?</h2>
<p>Reach out and we'll be happy to help.</p>
<p>Phone: <a href="tel:+12705634618">(270) 563-4618</a><br>
Email: <a href="mailto:hello@order.flavor-isle.com">hello@order.flavor-isle.com</a><br>
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
    return new Response('Error rendering privacy policy.', { status: 500 });
  }
}