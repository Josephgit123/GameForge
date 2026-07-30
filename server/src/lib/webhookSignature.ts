import { createHmac, timingSafeEqual } from 'node:crypto';

// Confirmed live from Surfboard's webhook guide: HMAC-SHA512 over the raw
// JSON body string, base64-encoded, sent in the `x-webhook-signature` header.
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac('sha512', secret).update(rawBody).digest('base64');

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
