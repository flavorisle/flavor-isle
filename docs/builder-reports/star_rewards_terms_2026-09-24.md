# Builder report: star_rewards_terms_2026-09-24

## Star Rewards terms (ToS section + Rewards FAQ)

**Status:** approved  
**App entity:** BuilderReport `6ab546f449875d2479d7db00`

### Before

TermsOfService.jsx had a 'Loyalty & Rewards' section but no language addressing a customer entering their phone number on another customer's purchase to claim that purchase's points, the distinction between automatic card recognition and signing in online, or a rewards dispute contact email. The Rewards page FAQ had no entry covering these points.

### After

Added a new 'Star Rewards' section to TermsOfService.jsx (and to the plain-HTML publicTermsOfService function) with the approved language, lightly polished for voice, substance preserved exactly: points accrue only to the account matching the checkout phone number; entering your number on another customer's purchase does not transfer that purchase's points (points belong to the account that earned them); if we reasonably suspect someone claimed points on another's purchase we may suspend/terminate the rewards account and void its points; automatic card recognition at the register is a convenience and not the same as signing in on the website; disputes to hello@order.flavor-isle.com. Added two FAQ entries to the Rewards page (shown on both logged-out and signed-in views) covering the same points in friendly voice with the same contact email. NO change to Square loyalty data or program mechanics; October promo left on hold. /reviews, homepage, and checkout untouched.
