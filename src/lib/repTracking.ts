const REP_SLUG_STORAGE_KEY = 'slapwrapz_rep_slug';

export const sanitizeRepSlug = (value: string | null | undefined) => {
  const normalized = (value || '').trim().toLowerCase();
  const match = normalized.match(/^[a-z0-9-]{1,64}$/);
  return match ? normalized : '';
};

export const getStoredRepSlug = () => {
  const urlRepSlug = typeof window !== 'undefined'
    ? sanitizeRepSlug(new URLSearchParams(window.location.search).get('rep'))
    : '';

  if (urlRepSlug && typeof window !== 'undefined') {
    window.sessionStorage.setItem(REP_SLUG_STORAGE_KEY, urlRepSlug);
    return urlRepSlug;
  }

  if (typeof window === 'undefined') return '';
  return sanitizeRepSlug(window.sessionStorage.getItem(REP_SLUG_STORAGE_KEY));
};

export const getRepLandingPath = (repSlug?: string | null) => {
  const sanitizedSlug = sanitizeRepSlug(repSlug || getStoredRepSlug());
  return sanitizedSlug ? `/${sanitizedSlug}` : '/';
};

export const getSafeQuoteBackPath = (repSlug?: string | null) =>
  getRepLandingPath(repSlug);

export const getSafeStartOverPath = (repSlug?: string | null) =>
  getRepLandingPath(repSlug);

export const getRepAwareBackTarget = () => getSafeQuoteBackPath();

const SAFE_REDIRECT_PATHS = [
  '/',
  '/admin',
  '/admin-status',
  '/rep',
  '/wraps',
  '/wraps/full',
  '/quick-quote',
  '/full-project',
  '/banners',
  '/signs',
  '/thank-you',
  '/confirmation',
  '/trapstar',
  '/jazzy',
  '/jarrel',
  '/anthony'
];

export const getSafeInternalRedirect = (
  redirectPath: string | null | undefined,
  fallback = '/'
) => {
  const trimmedPath = (redirectPath || '').trim();
  if (!trimmedPath || !trimmedPath.startsWith('/') || trimmedPath.startsWith('//')) return fallback;

  const pathOnly = trimmedPath.split('?')[0].split('#')[0];
  if (SAFE_REDIRECT_PATHS.includes(pathOnly)) return trimmedPath;

  if (/^\/upload-assets\/[A-Za-z0-9_-]+$/.test(pathOnly)) return trimmedPath;
  if (/^\/proof\/[A-Za-z0-9_-]+$/.test(pathOnly)) return trimmedPath;

  return fallback;
};

export const getRoleSafePostLoginRedirect = (
  redirectPath: string | null | undefined,
  role: string | null | undefined,
  fallback = '/admin'
) => {
  const safeRedirect = getSafeInternalRedirect(redirectPath, fallback);

  if (role === 'sales_rep' || role === 'rep_manager') return '/rep';
  if (role === 'owner_admin' || role === 'staff') {
    return safeRedirect === '/admin' || safeRedirect.startsWith('/admin?') || safeRedirect === '/admin-status'
      ? safeRedirect
      : '/admin';
  }

  return safeRedirect;
};
