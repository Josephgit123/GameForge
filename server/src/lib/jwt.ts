import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — check server/.env');
}

export interface AuthPayload {
  sub: string;
  role: Role;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET as string) as AuthPayload;
}
