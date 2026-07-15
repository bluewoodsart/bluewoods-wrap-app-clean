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
    name: 'Todd Wheeler',
    email: 'trapstarcustoms@gmail.com'
  },
  trapstar: {
    name: 'Trapstar Customs LG',
    email: 'trapstarcustomslg@gmail.com'
  },
  jazzy: {
    name: 'Jazzy Automotive',
    email: 'jazzyautoimaging@gmail.com'
  },
  jarrel: {
    name: 'Jarrel',
    email: 'flukerjarrel@gmail.com'
  },
  anthony: {
    name: 'Anthony Gabbard',
    email: 'a.gabbard@refinedhospitalitysolutions.com'
  },
  adam: {
    name: 'Adam Callaway',
    email: 'acallaway@mail.com'
  },
  pressplay: {
    name: 'PressPlay Rep',
    email: 'pressplayadvertising@gmail.com'
  },
  test: {
    name: 'Test Sales Rep',
    email: 'pressplayadvertising@gmail.com'
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
