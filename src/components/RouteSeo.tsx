import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const origin = 'https://www.slapwrapz.com';
const pages: Record<string, [string, string]> = {
  '/': ['Vehicle Wraps, Banners & Signs in Fayetteville, GA | SlapWrapz', 'SlapWrapz creates vehicle wraps, banners, magnets, stickers, signs, and window graphics in Fayetteville, Georgia. Share your project and request a custom quote.'],
  '/wraps': ['Request a Vehicle Wrap Quote | SlapWrapz', 'Tell SlapWrapz about your vehicle, coverage, and project goals to start a custom vehicle wrap quote.'],
  '/wraps/full': ['Start Your Vehicle Wrap Project | SlapWrapz', 'Send vehicle photos, logos, artwork, and project details for a complete SlapWrapz wrap project review.'],
  '/banners': ['Request a Custom Banner Quote | SlapWrapz', 'Share your banner dimensions, quantity, artwork, event date, and finishing needs with SlapWrapz.'],
  '/signs': ['Request a Sign or Magnet Quote | SlapWrapz', 'Start a custom signage project with SlapWrapz. Share your dimensions, application, quantity, and design requirements.'],
  '/stickers-decals': ['Request a Sticker & Decal Quote | SlapWrapz', 'Tell SlapWrapz the size, quantity, shape, and intended use for your custom sticker or decal project.']
};
for (const [path, name] of Object.entries({
  '/trapstar': 'Trapstar Wraps', '/jazzy': 'Jazzy Automotive', '/jarrel': 'Jarrel Wraps',
  '/anthony': 'Anthony', '/adam': 'Adam', '/wesley': 'Wesley', '/zoe': 'Zoe',
  '/music-bingo': 'Music Bingo', '/trapstar/local/wheelers-towing': "Wheeler's Towing"
})) {
  pages[path] = [name + ' | SlapWrapz', 'Connect with ' + name + ' through SlapWrapz by Blue Woods Brands.'];
}
export default function RouteSeo() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const page = pages[path];
    const isPreview = ['preview','api','storage'].some(key => new URLSearchParams(search).has(key));
    const indexable = Boolean(page) && !isPreview;
    const [title, description] = page || ['SlapWrapz | Blue Woods Brands', 'SlapWrapz project and customer portal by Blue Woods Brands.'];
    document.title = title;
    const meta = (key: string, value: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let tag = document.head.querySelector<HTMLMetaElement>('meta[' + attr + '="' + key + '"]');
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attr, key); document.head.appendChild(tag); }
      tag.content = value;
    };
    meta('description', description);
    meta('robots', indexable ? 'index, follow' : 'noindex, follow');
    meta('og:title', title, true);
    meta('og:description', description, true);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (indexable) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
      canonical.href = origin + path;
      meta('og:url', origin + path, true);
    } else {
      canonical?.remove();
      document.head.querySelector('meta[property="og:url"]')?.remove();
    }
    document.getElementById('slapwrapz-organization')?.remove();
    if (path === '/' && indexable) {
      const schema = document.createElement('script');
      schema.id = 'slapwrapz-organization'; schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify({'@context':'https://schema.org','@type':'Organization','@id':origin + '/#organization',name:'SlapWrapz',url:origin,logo:origin + '/favicon/favicon1.png',parentOrganization:{'@type':'Organization',name:'Blue Woods Brands'}});
      document.head.appendChild(schema);
    }
  }, [pathname, search]);
  return null;
}
