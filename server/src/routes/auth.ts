import { randomBytes } from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PublisherStatus, Role, type User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { FirebaseNotConfiguredError, verifyGoogleIdToken } from '../lib/firebaseAdmin';
import { createMerchant, getStoreDetails, SurfboardApiError } from '../services/surfboard';

export const authRouter = Router();

// Pre-provisioned once via scripts/test-create-billing-plan.ts — Create
// Merchant fails without an existing billing plan for the partner.
const TRANSACTION_PRICING_PLAN = 'GF_STANDARD';

interface PublisherBusinessDetails {
  storeName: string;
  corporateId: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phoneCode: string;
  phoneNumber: string;
}

// Fires the real Create Merchant call and persists whatever Surfboard
// returns onto the Publisher row. Failure here must never fail the
// signup itself — the account still needs to exist locally so an admin
// can review it, same as if onboarding is simply started later.
async function startMerchantOnboarding(publisherId: string, email: string, details: PublisherBusinessDetails) {
  try {
    const res = await createMerchant({
      country: details.countryCode,
      organisation: { corporateId: details.corporateId },
      controlFields: {
        transactionPricingPlan: TRANSACTION_PRICING_PLAN,
        store: {
          name: details.storeName,
          email,
          phoneNumber: { code: details.phoneCode, number: details.phoneNumber },
          address: {
            addressLine1: details.addressLine1,
            city: details.city,
            countryCode: details.countryCode,
            postalCode: details.postalCode,
          },
        },
      },
    });
    await prisma.publisher.update({
      where: { id: publisherId },
      data: { surfboardApplicationId: res.data.applicationId, webKybUrl: res.data.webKybUrl },
    });
    return { applicationId: res.data.applicationId, webKybUrl: res.data.webKybUrl };
  } catch (err) {
    if (err instanceof SurfboardApiError) {
      console.error('Create Merchant failed at signup:', err.status, JSON.stringify(err.body));
    } else {
      console.error('Create Merchant failed at signup:', err);
    }
    return null;
  }
}

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

authRouter.post('/signup', asyncHandler(async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    role,
    storeName,
    corporateId,
    addressLine1,
    city,
    postalCode,
    countryCode,
    phoneCode,
    phoneNumber,
  } = req.body ?? {};
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'email, password, firstName, and lastName are required' });
  }
  // Self-serve signup only covers Customer and Publisher — Admin accounts are
  // provisioned separately, never created from a public-facing form.
  if (role !== undefined && role !== Role.CUSTOMER && role !== Role.PUBLISHER) {
    return res.status(400).json({ error: 'role must be CUSTOMER or PUBLISHER' });
  }
  const requestedRole = role === Role.PUBLISHER ? Role.PUBLISHER : Role.CUSTOMER;

  // A real Create Merchant call needs real business details — required only
  // for publisher signup, since a customer account has no merchant behind it.
  if (
    requestedRole === Role.PUBLISHER &&
    (!storeName || !corporateId || !addressLine1 || !city || !postalCode || !countryCode || !phoneCode || !phoneNumber)
  ) {
    return res.status(400).json({
      error:
        'storeName, corporateId, addressLine1, city, postalCode, countryCode, phoneCode, and phoneNumber are required for a publisher account',
    });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, role: requestedRole },
  });

  let surfboardOnboarding: { applicationId: string; webKybUrl: string } | null = null;
  if (requestedRole === Role.PUBLISHER) {
    const publisher = await prisma.publisher.create({ data: { userId: user.id, status: PublisherStatus.PENDING } });
    // Real Create Merchant call — fires here, not as a later manual step.
    // Failure doesn't fail the signup; the account still needs to exist so
    // an admin can review it, same as if onboarding starts later.
    surfboardOnboarding = await startMerchantOnboarding(publisher.id, email, {
      storeName,
      corporateId,
      addressLine1,
      city,
      postalCode,
      countryCode,
      phoneCode,
      phoneNumber,
    });
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user), surfboardOnboarding });
}));

authRouter.post('/google', asyncHandler(async (req, res) => {
  const { idToken, allowSignup, role } = req.body ?? {};
  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }
  // Same restriction as /auth/signup — Google sign-in can create a Customer
  // or Publisher account, never a self-serve Admin.
  if (role !== undefined && role !== Role.CUSTOMER && role !== Role.PUBLISHER) {
    return res.status(400).json({ error: 'role must be CUSTOMER or PUBLISHER' });
  }

  let decoded;
  try {
    decoded = await verifyGoogleIdToken(idToken);
  } catch (err) {
    if (err instanceof FirebaseNotConfiguredError) {
      return res.status(503).json({ error: 'Google sign-in is not configured on this server' });
    }
    return res.status(401).json({ error: 'Invalid Google sign-in token' });
  }

  const email = decoded.email;
  if (!email) {
    console.error(`[${Date.now()}] Google sign-in token had no email claim. Decoded token:`, JSON.stringify(decoded));
    return res.status(400).json({ error: 'Google account has no email on file' });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    if (!allowSignup) {
      return res.status(404).json({ error: 'No account found for this Google email' });
    }
    const requestedRole = role === Role.PUBLISHER ? Role.PUBLISHER : Role.CUSTOMER;
    const displayName = typeof decoded.name === 'string' ? decoded.name.trim() : '';
    const [firstName, ...rest] = displayName ? displayName.split(' ') : ['Google'];
    // Google-authenticated accounts never use the password login — this hash
    // is unusable filler so we don't need a nullable passwordHash column.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: requestedRole,
        firstName: firstName || 'Google',
        lastName: rest.join(' ') || 'User',
      },
    });
    if (requestedRole === Role.PUBLISHER) {
      await prisma.publisher.create({ data: { userId: user.id, status: PublisherStatus.PENDING } });
    }
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: toPublicUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: toPublicUser(user) });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: toPublicUser(user) });
}));

// Publisher: their own Surfboard onboarding status — status, real
// merchantId once assigned, and the application/KYB link while still
// pending. Same fields Manage Users shows an admin, scoped to the caller.
authRouter.get('/me/publisher', requireAuth, requireRole(Role.PUBLISHER), asyncHandler(async (req, res) => {
  const publisher = await prisma.publisher.findUnique({
    where: { userId: req.user!.id },
    include: { stores: true },
  });
  if (!publisher) {
    return res.status(404).json({ error: 'You have not registered as a publisher yet' });
  }

  // Live Surfboard call, best-effort — real store name/onboarding status,
  // not anything cached locally (Store has no name column). A failure here
  // just means the panel shows the merchant ID without the store details.
  let storeName: string | null = null;
  let merchantVerified = false;
  const store = publisher.stores[0];
  if (publisher.surfboardMerchantId && store) {
    try {
      const details = await getStoreDetails(publisher.surfboardMerchantId, store.surfboardStoreId);
      storeName = details.data.name;
      merchantVerified = details.data.onlineOnboardingStatus === 'APPROVED';
    } catch (err) {
      console.error('Fetch store details failed:', err instanceof SurfboardApiError ? err.body : err);
    }
  }

  res.json({
    publisher: {
      id: publisher.id,
      status: publisher.status,
      surfboardMerchantId: publisher.surfboardMerchantId,
      surfboardApplicationId: publisher.surfboardApplicationId,
      webKybUrl: publisher.webKybUrl,
      storeName,
      merchantVerified,
      notifyOnNewOrder: publisher.notifyOnNewOrder,
    },
  });
}));

// Any authenticated user: change their own password. Requires the current
// password, same as any "change password while logged in" flow — separate
// from (and much smaller than) a "forgot password" email-reset flow, which
// this project has no email-sending infrastructure to support.
authRouter.patch('/me/password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ status: 'ok' });
}));

// Publisher: persist the notification preference toggle. No notification
// channel exists in this project yet (no email service) — this just saves
// the real setting so it isn't fake, ready to wire up once one does.
authRouter.patch('/me/publisher/notifications', requireAuth, requireRole(Role.PUBLISHER), asyncHandler(async (req, res) => {
  const { notifyOnNewOrder } = req.body ?? {};
  if (typeof notifyOnNewOrder !== 'boolean') {
    return res.status(400).json({ error: 'notifyOnNewOrder must be a boolean' });
  }
  const publisher = await prisma.publisher.findUnique({ where: { userId: req.user!.id } });
  if (!publisher) {
    return res.status(404).json({ error: 'You have not registered as a publisher yet' });
  }
  const updated = await prisma.publisher.update({ where: { id: publisher.id }, data: { notifyOnNewOrder } });
  res.json({ notifyOnNewOrder: updated.notifyOnNewOrder });
}));
