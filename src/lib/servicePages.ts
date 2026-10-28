import { supabase } from '@/lib/supabase';
export const servicePages = [
  {
    "slug": "vehicle-wraps",
    "name": "Vehicle wraps & fleet graphics",
    "type": "wrap",
    "alt": "White cargo van with charcoal and cyan partial wrap concept",
    "hint": "Vehicle year, make and model, coverage, fleet size, and deadline"
  },
  {
    "slug": "custom-banners",
    "name": "Custom banners",
    "type": "banner",
    "alt": "Printed banner with reinforced edges on an outdoor display frame",
    "hint": "Banner width and height, quantity, indoor or outdoor use, and event date"
  },
  {
    "slug": "vehicle-magnets",
    "name": "Vehicle magnets",
    "type": "sign",
    "alt": "Rectangular magnetic business graphic fitted to a flat pickup door",
    "hint": "Magnet size, quantity, vehicle and door material, and artwork needs"
  },
  {
    "slug": "stickers-decals",
    "name": "Custom stickers & decals",
    "type": "decal",
    "alt": "Die-cut stickers and branded kraft packaging on a work table",
    "hint": "Sticker dimensions, quantity, shape, application surface, and deadline"
  },
  {
    "slug": "business-signs",
    "name": "Business signs",
    "type": "sign",
    "alt": "Printed rigid sign mounted beside a workshop entry",
    "hint": "Sign dimensions, quantity, display location, mounting, and deadline"
  },
  {
    "slug": "window-graphics",
    "name": "Window graphics & lettering",
    "type": "sign",
    "alt": "Storefront glass with cut-vinyl graphics and frosted film",
    "hint": "Window measurements, photos, desired coverage, and installation needs"
  }
] as const;
export interface ServiceMedia { service_slug: string; video_path: string | null; image_path: string | null; captions_path: string | null; }
export const serviceAssetUrl = (path: string | null | undefined) => path ? supabase.storage.from('bwb-service-media').getPublicUrl(path).data.publicUrl : '';
