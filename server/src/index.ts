import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import { authRouter } from './routes/auth';
import { gamesRouter } from './routes/games';
import { checkoutRouter } from './routes/checkout';
import { webhooksRouter } from './routes/webhooks';
import { refundsRouter } from './routes/refunds';
import { giftCardsRouter } from './routes/giftcards';
import { promotionsRouter } from './routes/promotions';
import { analyticsRouter } from './routes/analytics';
import { libraryRouter } from './routes/library';
import { adminRawgRouter } from './routes/admin-rawg';
import { discoverRouter } from './routes/discover';
import { adminRouter } from './routes/admin';
import { subscriptionsRouter } from './routes/subscriptions';
import { storeRouter } from './routes/store';

const app = express();
const port = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN }));
// Captures the raw body alongside the parsed JSON — the webhook route needs
// the exact raw bytes to verify Surfboard's HMAC signature.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/games', gamesRouter);
app.use('/checkout', checkoutRouter);
app.use('/webhooks', webhooksRouter);
app.use('/refunds', refundsRouter);
app.use('/gift-cards', giftCardsRouter);
app.use('/promotions', promotionsRouter);
app.use('/analytics', analyticsRouter);
app.use('/library', libraryRouter);
app.use('/admin/rawg', adminRawgRouter);
app.use('/discover', discoverRouter);
app.use('/admin', adminRouter);
app.use('/subscriptions', subscriptionsRouter);
app.use('/store', storeRouter);

app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
});

// Last-resort safety net — catches anything forwarded via next(err)
// (see asyncHandler) so one bad request returns a 500 instead of taking
// the whole server down for every other user.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
