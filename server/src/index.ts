import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import { authRouter } from './routes/auth';
import { gamesRouter } from './routes/games';

const app = express();
const port = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/games', gamesRouter);

app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
