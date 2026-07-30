import 'dotenv/config';
import { createHmac } from 'node:crypto';

const orderId = process.argv[2];
if (!orderId) {
  console.error('Usage: tsx test-webhook.ts <surfboardOrderId>');
  process.exit(1);
}

const secret = process.env.SURFBOARD_WEBHOOK_SECRET as string;

const payload = {
  eventType: 'order.paymentcompleted',
  metadata: {
    eventId: `test-evt-${Date.now()}`,
    created: Date.now(),
    retryAttempt: 0,
    terminalId: process.env.SURFBOARD_DEMO_TERMINAL_ID,
    originalCreated: Date.now(),
    webhookEventId: `test-evt-${Date.now()}`,
  },
  data: {
    orderId,
    referenceId: 'gf-test',
    paymentStatus: 'PAYMENT_COMPLETED',
    paymentMethod: 'CARD',
    paymentId: `test-payment-${Date.now()}`,
    amount: '15000',
    type: 'PURCHASE',
  },
};

const body = JSON.stringify(payload);
const signature = createHmac('sha512', secret).update(body).digest('base64');

async function main() {
  const res = await fetch('http://localhost:4000/webhooks/surfboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-signature': signature },
    body,
  });
  console.log('status:', res.status);
  console.log(await res.json());
}

main();
