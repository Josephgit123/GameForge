import 'dotenv/config';
import { createMerchant, SurfboardApiError } from '../services/surfboard';

async function main() {
  try {
    const res = await createMerchant({
      country: 'SE',
      organisation: { corporateId: '5560360793' },
      controlFields: {
        transactionPricingPlan: 'GF_STANDARD',
        store: {
          name: 'GameForge Demo Store',
          email: 'demo@gameforge.dev',
          phoneNumber: { code: '46', number: '701234567' },
          address: {
            addressLine1: 'Main Street 123',
            city: 'Stockholm',
            countryCode: 'SE',
            postalCode: '11122',
          },
        },
      },
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
