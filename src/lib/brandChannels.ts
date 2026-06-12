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
    eyebrow: 'Todd Wheeler branded sales channel',
    parentBrand: 'Brought to you by Blue Woods Brands',
    poweredBy: 'Powered by the SlapWrapz quote system',
    repSlug: 'todd',
    wrapQuotePath: '/wraps?rep=todd',
    bannerQuotePath: '/banners?rep=todd',
    headline: 'Wraps, banners, and brand visibility with Todd in your corner.',
    description:
      'Trapstar Wraps gives customers a direct branded door into the same SlapWrapz quote system, keeping Todd attached to every wrap and banner lead.'
  }
};

export const getBrandChannel = (slug: string) => brandChannels[slug];
