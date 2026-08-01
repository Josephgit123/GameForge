import 'dotenv/config';
import { registerOnlineTerminal, SurfboardApiError } from '../services/surfboard';

// One-off: registers the second terminal GameForge+ renewals need, in
// MerchantInitiated mode, against the existing demo merchant/store. Run
// once; paste the resulting terminalId into server/.env as
// SURFBOARD_SUBSCRIPTION_TERMINAL_ID.
async function main() {
  const merchantId = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;
  const storeId = process.env.SURFBOARD_DEMO_FALLBACK_STORE_ID as string;
  try {
    const res = await registerOnlineTerminal(merchantId, storeId, 'MerchantInitiated');
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
