import 'dotenv/config';
import { getMerchantStatus, SurfboardApiError } from '../services/surfboard';

const applicationId = process.argv[2];
if (!applicationId) {
  console.error('Usage: tsx test-merchant-status.ts <applicationId>');
  process.exit(1);
}

async function main() {
  try {
    const res = await getMerchantStatus(applicationId);
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
