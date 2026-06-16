export interface BrandChannel {
  slug: string;
  name: string;
  eyebrow: string;
  parentBrand: string;
  poweredBy: string;
  repSlug: string;
  wrapQuotePath: string;
  bannerQuotePath: string;
  headline: string;
  description: string;
}

export const brandChannels: Record<string, BrandChannel> = {
  trapstar: {
    slug: 'trapstar',
    name: 'Trapstar Wraps',
    eyebrow: 'Trapstar Wraps with Todd Wheeler',
    parentBrand: 'Brought to you by Blue Woods Brands',
    poweredBy: 'Powered by the SlapWrapz quote system',
    repSlug: 'todd',
    wrapQuotePath: '/wraps?rep=todd',
    bannerQuotePath: '/banners?rep=todd',
    headline: 'Wraps, banners, and brand visibility with Todd in your corner.',
    description:
      'Work directly with Todd Wheeler on vehicle wraps, banners, and brand visibility backed by Blue Woods Brands production support.'
  }
};

export const getBrandChannel = (slug: string) => brandChannels[slug];
