import 'dotenv/config';
import { createOrder, SurfboardApiError } from '../services/surfboard';

const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;
const TERMINAL_ID = process.env.SURFBOARD_DEMO_TERMINAL_ID as string;

async function main() {
  try {
    const res = await createOrder(MERCHANT_ID, {
      'terminal$id': TERMINAL_ID,
      referenceId: 'promo-debug-test',
      orderLines: [
        { id: '1d0d7659-6677-4f6d-9ce3-42c8755768f0', name: 'Circuit Breaker', quantity: 1, amount: { regular: 25000, total: 25000, currency: '752' } },
      ],
      totalOrderAmount: { regular: 25000, total: 20000, campaign: 5000, currency: '752' },
    });
    console.log('SUCCESS:', JSON.stringify(res, null, 2));
  } catch (err) {
    if (err instanceof SurfboardApiError) {
      console.error('SURFBOARD API ERROR', err.status, JSON.stringify(err.body, null, 2));
    } else {
      console.error('UNEXPECTED ERROR', err);
    }
  }
}

main();
