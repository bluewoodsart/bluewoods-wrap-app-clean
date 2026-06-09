import { sanitizeRepSlug } from './repTracking';

export interface SalesRep {
  name: string;
  email: string;
}

export const SALES_REPS: Record<string, SalesRep> = {
  ashley: {
    name: 'Ashley',
    email: 'abussey@gmail.com'
  },
  todd: {
    name: 'Todd',
    email: 'todd@slapwrapz.com'
  }
};

export const getSalesRepForSlug = (repSlug: string | null | undefined) => {
  const sanitizedRepSlug = sanitizeRepSlug(repSlug);
  return sanitizedRepSlug ? SALES_REPS[sanitizedRepSlug] : undefined;
};

export const getRepAttributionForSlug = (repSlug: string | null | undefined) => {
  const sanitizedRepSlug = sanitizeRepSlug(repSlug);
  const assignedRep = getSalesRepForSlug(sanitizedRepSlug);

  return {
    rep_slug: sanitizedRepSlug || null,
    rep_email: assignedRep?.email ?? null,
    assigned_rep_name: assignedRep?.name ?? null
  };
};
