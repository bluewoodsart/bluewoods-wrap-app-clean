import type { UploadedFile } from '@/types';

const STORAGE_KEY = 'slapwrapz.repQuoteHandoff.v1';

export interface RepQuoteHandoff {
  quoteRequestId: string;
  quoteId: string;
  repSlug: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredContact: string;
  quoteSummary: Record<string, unknown>;
  files: UploadedFile[];
}

export const saveRepQuoteHandoff = (handoff: RepQuoteHandoff) => {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(handoff));
};

export const readRepQuoteHandoff = (): RepQuoteHandoff | null => {
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const handoff = JSON.parse(saved) as Partial<RepQuoteHandoff>;
    if (!handoff.quoteRequestId || !handoff.quoteId || !handoff.repSlug) return null;

    return handoff as RepQuoteHandoff;
  } catch {
    return null;
  }
};

export const clearRepQuoteHandoff = () => {
  window.sessionStorage.removeItem(STORAGE_KEY);
};
