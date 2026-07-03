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
    headline: 'Wraps, banners, and brand visibility with Trapstar in your corner.',
    description:
      'Vehicle wraps, banners, and brand visibility backed by Blue Woods Brands production support.',
    cardEyebrow: 'Trapstar Customs',
    cardHeadline: 'Work directly with Trapstar',
    cardDescription:
      'Trapstar Wraps gives you a direct path to vehicle wraps, banners, and brand visibility, backed by Blue Woods Brands production support.',
    featureBullets: [
      'Vehicle wraps and fleet graphics',
      'Banners and printed brand materials',
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
  }
};

export const getBrandChannel = (slug: string) => brandChannels[slug];
