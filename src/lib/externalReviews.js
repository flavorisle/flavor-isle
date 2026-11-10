// Verified reviews left on other platforms (Tripadvisor, Facebook, Yelp,
// Google). They are not records in the Review entity, so they live here once
// and every surface that shows external proof — the Reviews page and the home
// page — imports the same array instead of keeping a copy.
export const EXTERNAL_REVIEWS = [
  {
    text: 'The food menu was delicious and the ice creams were the perfect treat. Milkshakes were fantastic.',
    name: 'Tripadvisor reviewer',
    source: 'Tripadvisor',
  },
  {
    text: 'the BEST food and milkshakes in the area',
    name: 'Facebook reviewer',
    source: 'Facebook',
  },
  {
    text: "The service was quick and kind. I hardly ever see chuck wagon sandwiches on menus any more, so I had to try theirs. It was incredible, one of the best I've had... This place was super easy to get to from the interstate and way better tasting and maybe even more affordable than stopping at a fast food chain.",
    name: 'Sydney L.',
    source: 'Yelp',
  },
  {
    text: "Cute little hole in the wall... The woman who took our order was super sweet and efficient. The pork tenderloin was perfectly crispy and seasoned well. Will definitely make a return trip if I find myself out this way.",
    name: 'Holly W.',
    source: 'Yelp',
  },
  {
    text: "Don't let the looks fool ya... everything is made fresh as you order and it's well worth the wait. I had the bacon double cheeseburger, Cajun fries and a peanut butter milkshake. Everything was delicious. The staff were as friendly as you could ask for.",
    name: 'Jeff S.',
    source: 'Yelp',
  },
  {
    text: 'Love this small town local legend place! Try the mini burgers, fried mushrooms, onion rings, actually just try everything! The ice cream is fantastic!',
    name: 'Rebecca L.',
    source: 'Yelp',
  },
  {
    text: 'This is such a cute stop and was seriously one of the best cheeseburgers I have ever had. I will be stopping here on every road trip. The chili dog was really good too!',
    name: 'Emily A.',
    source: 'Yelp',
  },
  {
    text: 'Food is served on paper plates picked up at the counter, and good ice cream and shakes are available. It is truly a reminder of a simpler yesterday... It is genuinely a Smiths Grove Jewell.',
    name: 'William J.',
    source: 'Yelp',
  },
  {
    text: 'Get off the hwy, drive past the chains and you will find this gem. Had the cheese burger and curly fries. Fresh not frozen burger. And you can taste the difference!',
    name: 'Chris S.',
    source: 'Yelp',
  },
  {
    text: 'The food is really good and the staff were nice. Truly a hidden gem. The burgers gave me a nostalgic feeling & the milkshakes are like no other.',
    name: 'Juwan C.',
    source: 'Yelp',
  },
  {
    text: 'Absolutely amazing! From the fries the milkshakes! Worth the drive if you are around!',
    name: 'John W.',
    source: 'Yelp',
  },
  {
    text: "I've been wanting a butterscotch milkshake and I finally got my craving filled. Great spot with picnic tables outside to enjoy your tasty treats.",
    name: 'Kelly F.',
    source: 'Yelp',
  },
  {
    text: 'Flavor Isle was amazing - my favourite stop during our time in the US. Not just because the milkshakes and burgers were on another level, but because of the warm welcome and hospitality...',
    name: 'Toby Wadey',
    source: 'Google',
  },
  {
    text: 'What a gem of a find! The food was absolutely delicious, and the chocolate malt tasted just like the ones my Nan used to make me when I was little...',
    name: 'Danielle Roller',
    source: 'Google',
  },
  {
    text: 'We were hungry for lunch and needed to get off the highway for a break. Saw the massive Buckees but decided to head into town and support a local business. This spot popped up and had to try it...',
    name: 'Thomas Llewellyn',
    source: 'Google',
  },
];