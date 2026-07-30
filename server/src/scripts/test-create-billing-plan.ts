import 'dotenv/config';
import { createBillingPlans, SurfboardApiError } from '../services/surfboard';

async function main() {
  try {
    const res = await createBillingPlans([
      {
        id: 'GF_STANDARD',
        cardBrand: 'VISA',
        terminalType: 'STANDARD',
        paymentMethod: 'CARD',
        planType: 'FIXED',
        description: 'GameForge standard demo plan',
        fixedPercentage: 0.029,
      },
    ]);
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
