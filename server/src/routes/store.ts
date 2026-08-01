import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import {
  activatePaymentMethods,
  getBranding,
  getMerchantDetails,
  getPaymentMethods,
  updateBranding,
  SurfboardApiError,
  type ActivatePaymentMethodsInput,
  type MerchantBranding,
} from '../services/surfboard';

export const storeRouter = Router();

const FALLBACK_MERCHANT_ID = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID as string;

async function requirePublisher(userId: string) {
  return prisma.publisher.findUnique({ where: { userId } });
}

// The seed data (and potentially other setup) sets a publisher's OWN
// surfboardMerchantId directly to the shared fallback merchant ID — so a
// plain truthiness check on surfboardMerchantId is not enough to prove a
// publisher has a distinct merchant of their own. Must explicitly exclude
// the fallback ID, or a publisher seeded/pointed at the shared merchant
// would wrongly unlock writes against it.
function ownsDistinctMerchant(surfboardMerchantId: string | null): surfboardMerchantId is string {
  return Boolean(surfboardMerchantId) && surfboardMerchantId !== FALLBACK_MERCHANT_ID;
}

// Reads use the publisher's own merchant if they have one, otherwise the
// shared demo fallback — informational either way, no mutation risk.
storeRouter.get(
  '/merchant-details',
  requireAuth,
  requireRole(Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const publisher = await requirePublisher(req.user!.id);
    if (!publisher) {
      return res.status(403).json({ error: 'You have not registered as a publisher yet' });
    }
    const merchantId = publisher.surfboardMerchantId ?? FALLBACK_MERCHANT_ID;
    try {
      const details = await getMerchantDetails(merchantId);
      res.json({ merchant: details.data, isOwnMerchant: ownsDistinctMerchant(publisher.surfboardMerchantId) });
    } catch (err) {
      if (err instanceof SurfboardApiError) {
        return res.status(502).json({ error: 'Could not fetch merchant details right now' });
      }
      throw err;
    }
  })
);

storeRouter.get(
  '/payment-methods',
  requireAuth,
  requireRole(Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const publisher = await requirePublisher(req.user!.id);
    if (!publisher) {
      return res.status(403).json({ error: 'You have not registered as a publisher yet' });
    }
    const merchantId = publisher.surfboardMerchantId ?? FALLBACK_MERCHANT_ID;
    try {
      const methods = await getPaymentMethods(merchantId);
      res.json({ paymentMethods: methods.data, isOwnMerchant: ownsDistinctMerchant(publisher.surfboardMerchantId) });
    } catch (err) {
      if (err instanceof SurfboardApiError) {
        return res.status(502).json({ error: 'Could not fetch payment methods right now' });
      }
      throw err;
    }
  })
);

// Write: activating a payment method mutates the merchant's REAL config on
// Surfboard's side. The shared demo fallback merchant is used by every
// publisher without their own onboarded merchant — activating something
// there would visibly change what every one of those publishers' customers
// sees, so this is only allowed once a publisher has their own real
// merchant. Same reasoning as checkout.ts's per-publisher merchant routing.
storeRouter.post(
  '/payment-methods',
  requireAuth,
  requireRole(Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const publisher = await requirePublisher(req.user!.id);
    if (!publisher) {
      return res.status(403).json({ error: 'You have not registered as a publisher yet' });
    }
    const merchantId = publisher.surfboardMerchantId;
    if (!ownsDistinctMerchant(merchantId)) {
      return res.status(403).json({
        error: 'Activating payment methods is only available once you have your own Surfboard merchant — the shared demo merchant is used by other publishers too.',
      });
    }

    const input = (req.body ?? {}) as ActivatePaymentMethodsInput;
    try {
      const result = await activatePaymentMethods(merchantId, input);
      res.json({ results: result.data });
    } catch (err) {
      if (err instanceof SurfboardApiError) {
        return res.status(502).json({ error: 'Could not activate payment method right now' });
      }
      throw err;
    }
  })
);

storeRouter.get(
  '/branding',
  requireAuth,
  requireRole(Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const publisher = await requirePublisher(req.user!.id);
    if (!publisher) {
      return res.status(403).json({ error: 'You have not registered as a publisher yet' });
    }
    const merchantId = publisher.surfboardMerchantId ?? FALLBACK_MERCHANT_ID;
    try {
      const branding = await getBranding(merchantId);
      res.json({ branding: branding.data, isOwnMerchant: ownsDistinctMerchant(publisher.surfboardMerchantId) });
    } catch (err) {
      if (err instanceof SurfboardApiError) {
        return res.status(502).json({ error: 'Could not fetch branding right now' });
      }
      throw err;
    }
  })
);

// Write: same shared-merchant reasoning as payment methods above — setting
// branding on the fallback merchant would change the checkout page every
// other fallback-merchant publisher's customers see.
storeRouter.patch(
  '/branding',
  requireAuth,
  requireRole(Role.PUBLISHER),
  asyncHandler(async (req, res) => {
    const publisher = await requirePublisher(req.user!.id);
    if (!publisher) {
      return res.status(403).json({ error: 'You have not registered as a publisher yet' });
    }
    const merchantId = publisher.surfboardMerchantId;
    if (!ownsDistinctMerchant(merchantId)) {
      return res.status(403).json({
        error: 'Setting branding is only available once you have your own Surfboard merchant — the shared demo merchant is used by other publishers too.',
      });
    }

    const input = (req.body ?? {}) as MerchantBranding;
    try {
      await updateBranding(merchantId, input);
      const fresh = await getBranding(merchantId);
      res.json({ branding: fresh.data });
    } catch (err) {
      if (err instanceof SurfboardApiError) {
        return res.status(502).json({ error: 'Could not update branding right now' });
      }
      throw err;
    }
  })
);
