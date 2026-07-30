import 'dotenv/config';
import { createOrder, initiatePayment, SurfboardApiError } from '../services/surfboard';

const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;
const TERMINAL_ID = process.env.SURFBOARD_DEMO_TERMINAL_ID as string;

async function main() {
  try {
    console.log('--- create order ---');
    const order = await createOrder(MERCHANT_ID, {
      'terminal$id': TERMINAL_ID,
      referenceId: 'giftcard-debug-test',
      orderLines: [
        { id: '03fc8c3b-7dbc-4082-8f20-79adf76d2143', name: 'Ashfall Protocol', quantity: 1, amount: { regular: 20000, total: 20000, currency: '752' } },
      ],
      totalOrderAmount: { regular: 20000, total: 20000, currency: '752' },
    });
    console.log(JSON.stringify(order, null, 2));

    console.log('--- initiate payment with GIFTCARD ---');
    const payment = await initiatePayment(MERCHANT_ID, {
      orderId: order.data.orderId,
      paymentMethod: 'GIFTCARD',
      paymentMethodParams: { giftCardId: '844da228bbe1b0065c' },
    });
    console.log(JSON.stringify(payment, null, 2));
  } catch (err) {
    if (err instanceof SurfboardApiError) {
      console.error('SURFBOARD API ERROR', err.status, JSON.stringify(err.body, null, 2));
    } else {
      console.error('UNEXPECTED ERROR', err);
    }
  }
}

main();
