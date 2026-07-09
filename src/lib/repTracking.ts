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

export const getRepAwareBackTarget = () => {
  if (typeof window === 'undefined') return '/';

  const sameSiteReferrer = document.referrer && (() => {
    try {
      return new URL(document.referrer).origin === window.location.origin;
    } catch {
      return false;
    }
  })();

  if (sameSiteReferrer && window.history.length > 1) return -1;
  return getRepLandingPath();
};
