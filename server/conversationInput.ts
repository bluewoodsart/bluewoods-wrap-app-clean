import { z } from 'zod';

const short = z.string().trim().max(240);
export const conversationInput = z.object({
  conversationId: z.string().uuid(),
  requestId: z.string().uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
  message: z.string().trim().min(1).max(2000),
  attribution: z.object({
    landingPath: z.string().startsWith('/').max(500),
    referrerHost: short.optional(),
    utmSource: short.optional(), utmMedium: short.optional(),
    utmCampaign: short.optional(), qr: short.optional(),
  }).strict().optional(),
  reportedSource: short.optional(),
  reportedSearch: short.optional(),
  contact: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    requestFollowUp: z.literal(true),
  }).strict().optional(),
}).strict();

export function conversationReply(message: string, hasContact: boolean) {
  if (hasContact) return 'Your request is saved for our team. They can read this conversation before following up.';
  if (/\b(don.t know|not sure|just looking|curious)\b/i.test(message))
    return 'Let’s explore. You can browse wraps, signs, and printed graphics below. What catches your eye?';
  return 'Thanks for sharing. Add anything else you’d like us to know, explore our services, or ask our team to follow up.';
}
