export interface BrandChannel {
  slug: string;
  name: string;
  eyebrow: string;
  headerSubtitle: string;
  parentBrand: string;
  poweredBy: string;
  repSlug: string;
  wrapQuotePath: string;
  bannerQuotePath?: string;
  fullProjectPath?: string;
  heroImagePath?: string;
  headline: string;
  description: string;
  body?: string[];
  cardEyebrow: string;
  cardHeadline: string;
  cardDescription: string;
  featureBullets: string[];
  comingSoonTitle?: string;
  comingSoonItems?: string[];
  comingSoonNote?: string;
}

export const brandChannels: Record<string, BrandChannel> = {
  trapstar: {
    slug: 'trapstar',
    name: 'Trapstar Wraps',
    eyebrow: 'Trapstar Wraps',
    headerSubtitle: 'Blue Woods Brands',
    parentBrand: 'Brought to you by Blue Woods Brands',
    poweredBy: '',
    repSlug: 'trapstar',
    wrapQuotePath: '/wraps?rep=trapstar',
    bannerQuotePath: '/banners?rep=trapstar',
    fullProjectPath: '/wraps/full?rep=trapstar',
    heroImagePath: '/trapstar/trapstar-customs-lg-hero.png',
    headline: 'Where your car is the star.',
    description:
      'Custom wrap energy, sharp camo graphics, bold logos, and show-ready style backed by Blue Woods Brands production support.',
    cardEyebrow: 'Trapstar Customs',
    cardHeadline: 'Make the vehicle the headline',
    cardDescription:
      'Trapstar Customs LG gives you a direct path to intense vehicle wraps, banners, and brand visibility with every request tracked from quote to production.',
    featureBullets: [
      'Custom vehicle wraps and racing-inspired graphics',
      'Bold sponsor/logo placement and business visibility',
      'Quote requests stay connected with Trapstar from start to finish'
    ]
  },
  jazzy: {
    slug: 'jazzy',
    name: 'Jazzy Automotive Wraps',
    eyebrow: 'Jazzy Automotive',
    headerSubtitle: 'Powered by Blue Woods Apps',
    parentBrand: 'Powered by SlapWrapz',
    poweredBy: '',
    repSlug: 'jazzy',
    wrapQuotePath: '/wraps?rep=jazzy',
    headline: 'Vehicle wraps and commercial graphics for businesses that need to be seen.',
    description:
      'Work with Jazzy Automotive through SlapWrapz to get a clean, professional wrap quote for your vehicle, van, truck, trailer, or business fleet.',
    body: [
      'Whether you need a full wrap, partial wrap, lettering, or branded graphics, this page sends your request directly into the SlapWrapz quote flow with Jazzy attribution.'
    ],
    cardEyebrow: 'Coming soon from Jazzy Automotive',
    cardHeadline: 'Wrap quotes now. More services soon.',
    cardDescription: 'These services are coming soon. For now, use this page for wrap quote requests only.',
    featureBullets: [
      'Window Tinting',
      'Paint Protection Film'
    ],
    comingSoonTitle: 'Coming soon from Jazzy Automotive:',
    comingSoonItems: [
      'Window Tinting',
      'Paint Protection Film'
    ]
  },
  jarrel: {
    slug: 'jarrel',
    name: 'Jarrel Wraps',
    eyebrow: 'Jarrel Rep Portal',
    headerSubtitle: 'Powered by Blue Woods Brands',
    parentBrand: 'Powered by SlapWrapz',
    poweredBy: '',
    repSlug: 'jarrel',
    wrapQuotePath: '/wraps?rep=jarrel',
    bannerQuotePath: '/banners?rep=jarrel',
    fullProjectPath: '/wraps/full?rep=jarrel',
    headline: 'Vehicle wraps, banners, and brand visibility with Jarrel as your rep.',
    description:
      'Start a wrap, banner, or full project quote through Jarrel and keep the request connected from intake to follow-up.',
    cardEyebrow: 'Jarrel Rep Page',
    cardHeadline: 'Quotes connected to Jarrel',
    cardDescription:
      'This starter page keeps leads attributed to Jarrel while the rep portal and manager flow are tested.',
    featureBullets: [
      'Vehicle wrap quote requests',
      'Banner and print quote requests',
      'Lead tracking connected to Jarrel from the first click'
    ],
    comingSoonNote: 'Custom cover art can be swapped in after portal testing passes.'
  }
};

export const getBrandChannel = (slug: string) => brandChannels[slug];
