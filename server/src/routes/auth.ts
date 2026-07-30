import { randomBytes } from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PublisherStatus, Role, type User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { FirebaseNotConfiguredError, verifyGoogleIdToken } from '../lib/firebaseAdmin';

export const authRouter = Router();

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
  const { email, password, firstName, lastName, role } = req.body ?? {};
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'email, password, firstName, and lastName are required' });
  }
  // Self-serve signup only covers Customer and Publisher — Admin accounts are
  // provisioned separately, never created from a public-facing form.
  if (role !== undefined && role !== Role.CUSTOMER && role !== Role.PUBLISHER) {
    return res.status(400).json({ error: 'role must be CUSTOMER or PUBLISHER' });
  }
  const requestedRole = role === Role.PUBLISHER ? Role.PUBLISHER : Role.CUSTOMER;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, role: requestedRole },
  });

  if (requestedRole === Role.PUBLISHER) {
    // Real Surfboard merchant onboarding (Create Merchant + KYB) happens as
    // a separate step, not at signup — this just reserves the account.
    await prisma.publisher.create({ data: { userId: user.id, status: PublisherStatus.PENDING } });
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
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
