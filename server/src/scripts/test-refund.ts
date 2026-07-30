import 'dotenv/config';
import { createOrder, SurfboardApiError } from '../services/surfboard';

const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;
const TERMINAL_ID = process.env.SURFBOARD_DEMO_TERMINAL_ID as string;

async function main() {
  try {
    const res = await createOrder(MERCHANT_ID, {
      'terminal$id': TERMINAL_ID,
      referenceId: 'refund-debug-test',
      orderLines: [
        {
          id: 'd270445c-3070-4cd3-a576-b5752e0ae94f',
          name: 'Driftwood Harbor',
          quantity: -1,
          purchaseOrderId: '844d54727e0b08ac120b',
          amount: { regular: 15000, total: -15000, currency: '752' },
        },
      ],
      totalOrderAmount: { regular: 15000, total: -15000, currency: '752' },
      controlFunctions: {
        initiatePaymentsOptions: { paymentMethod: 'CARD_NP' },
        callBackUrl: process.env.SURFBOARD_WEBHOOK_URL,
      },
    });
    console.log('RAW RESPONSE:', JSON.stringify(res, null, 2));
  } catch (err) {
    if (err instanceof SurfboardApiError) {
      console.error('SURFBOARD API ERROR', err.status, JSON.stringify(err.body, null, 2));
    } else {
      console.error('UNEXPECTED ERROR', err);
    }
  }
}

main();
