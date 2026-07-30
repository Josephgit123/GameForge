import 'dotenv/config';
import {
  registerOnlineTerminal,
  createOrder,
  initiatePayment,
  getOrderStatus,
  SurfboardApiError,
} from '../services/surfboard';

const MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;
const STORE_ID = process.env.SURFBOARD_DEMO_FALLBACK_STORE_ID as string;

async function main() {
  try {
    console.log('--- 1. Register online terminal (PaymentPage) ---');
    const terminal = await registerOnlineTerminal(MERCHANT_ID, STORE_ID);
    console.log(JSON.stringify(terminal, null, 2));
    const terminalId = terminal.data.terminalId;

    console.log('\n--- 2. Create order ---');
    const order = await createOrder(MERCHANT_ID, {
      'terminal$id': terminalId,
      referenceId: `gf-test-${Date.now()}`,
      orderLines: [
        {
          id: 'ashfall-protocol',
          name: 'Ashfall Protocol',
          quantity: 1,
          amount: { regular: 20000, total: 20000, currency: '752' }, // 752 = SEK, 20000 = 200.00 SEK
        },
      ],
      totalOrderAmount: { regular: 20000, total: 20000, currency: '752' },
      customer: { person: { name: { firstName: 'Test', lastName: 'Customer' }, email: 'customer@gameforge.dev' } },
    });
    console.log(JSON.stringify(order, null, 2));
    const orderId = order.data.orderId;

    console.log('\n--- 3. Initiate payment (CARD) ---');
    const payment = await initiatePayment(MERCHANT_ID, { orderId, paymentMethod: 'CARD', terminalId });
    console.log(JSON.stringify(payment, null, 2));

    console.log('\n--- 4. Check order status ---');
    const status = await getOrderStatus(MERCHANT_ID, orderId);
    console.log(JSON.stringify(status, null, 2));
  } catch (err) {
    if (err instanceof SurfboardApiError) {
      console.error('SURFBOARD API ERROR', err.status, JSON.stringify(err.body, null, 2));
    } else {
      console.error('UNEXPECTED ERROR', err);
    }
  }
}

main();
