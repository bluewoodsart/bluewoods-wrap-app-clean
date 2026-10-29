import { validateCanvasPng } from './sticker-png.mjs';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const totalFor = (delivery: string) => delivery === 'mail' ? 1111 : delivery === 'pickup' ? 1000 : 0;
export function verifySignature(raw: Buffer, header: string, secret: string, now = Date.now()) {
  const parts = header.split(',').map(p => p.split('='));
  const timestamp = parts.find(p => p[0] === 't')?.[1] || '';
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(timestamp + '.').update(raw).digest();
  return parts.filter(p => p[0] === 'v1' && /^[a-f0-9]{64}$/.test(p[1])).some(p => timingSafeEqual(expected, Buffer.from(p[1], 'hex')));
}
export function validPaidSession(session: any, order: any) {
  return session.id === order.stripe_session_id && session.client_reference_id === order.id &&
    session.metadata?.sticker_order_id === order.id && session.payment_status === 'paid' &&
    session.currency === 'usd' && session.amount_total === order.amount_total &&
    session.livemode === (order.stripe_mode === 'live');
}
export function validateArtwork(base64: unknown) {
  if (typeof base64 !== 'string' || base64.length > 2800000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw Error('Invalid artwork.');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > 2097152 || bytes.length < 33 || bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || bytes.toString('ascii',12,16) !== 'IHDR' || bytes.readUInt32BE(16) !== 1200 || bytes.readUInt32BE(20) !== 1200) throw Error('Artwork must be a 1200 by 1200 PNG under 2 MB.');
  validateCanvasPng(bytes);
  return bytes;
}
