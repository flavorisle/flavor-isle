import IssueWinterBliss from '@/components/newsletter/IssueWinterBliss';
import IssueNovember2026 from '@/components/newsletter/IssueNovember2026';

// Every newsletter issue the archive can render, newest first. Add an issue here
// after writing its component and it appears on /newsletter-archive with no other
// change needed.
export const NEWSLETTER_ISSUES = [
  {
    slug: 'winter-bliss',
    date: 'November 5, 2026',
    title: 'Winter Bliss is here.',
    summary: 'Seven new peppermint, cocoa, and gingerbread shakes are pouring, plus the three flavors still on the board.',
    image: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/d7170f196_banner-v2.jpg',
    imageAlt: 'Winter Bliss milkshakes at Flavor Isle',
    Component: IssueWinterBliss,
  },
  {
    slug: 'november-2026',
    date: 'November 2, 2026',
    title: 'Fall is officially Bliss season.',
    summary: 'New Bliss shakes, online ordering back on, and the new 7:00 PM closing time.',
    image: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1ade54fbc_IMG_0427.jpeg',
    imageAlt: 'The Flavor Isle sign on Main Street in Smiths Grove',
    Component: IssueNovember2026,
  },
];