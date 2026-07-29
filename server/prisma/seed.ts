import 'dotenv/config';
import { PrismaClient, Role, PublisherStatus, GameStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'password123';

const PLACEHOLDER_MERCHANT = 'replace-with-preapproved-merchant-id';
const PLACEHOLDER_STORE = 'replace-with-preapproved-store-id';

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gameforge.dev' },
    update: {},
    create: {
      email: 'admin@gameforge.dev',
      passwordHash,
      role: Role.ADMIN,
      firstName: 'Ada',
      lastName: 'Admin',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@gameforge.dev' },
    update: {},
    create: {
      email: 'customer@gameforge.dev',
      passwordHash,
      role: Role.CUSTOMER,
      firstName: 'Casey',
      lastName: 'Customer',
    },
  });

  const publisherUser = await prisma.user.upsert({
    where: { email: 'publisher@gameforge.dev' },
    update: {},
    create: {
      email: 'publisher@gameforge.dev',
      passwordHash,
      role: Role.PUBLISHER,
      firstName: 'Pat',
      lastName: 'Publisher',
    },
  });

  const merchantId = process.env.SURFBOARD_DEMO_FALLBACK_MERCHANT_ID || PLACEHOLDER_MERCHANT;
  const storeId = process.env.SURFBOARD_DEMO_FALLBACK_STORE_ID || PLACEHOLDER_STORE;

  if (merchantId === PLACEHOLDER_MERCHANT || storeId === PLACEHOLDER_STORE) {
    console.warn(
      '\n[seed] SURFBOARD_DEMO_FALLBACK_MERCHANT_ID / SURFBOARD_DEMO_FALLBACK_STORE_ID are not set to real values.\n' +
        '[seed] Seeding the demo Publisher with placeholder IDs — checkout against this publisher will fail\n' +
        '[seed] against the real Surfboard sandbox until you complete the merchant onboarding + KYB flow and\n' +
        '[seed] set both env vars. See docs/API_INTEGRATION.md#kyb-timing-constraint-and-the-demo-fallback.\n'
    );
  }

  let publisher = await prisma.publisher.findUnique({ where: { userId: publisherUser.id } });
  if (!publisher) {
    publisher = await prisma.publisher.create({
      data: {
        userId: publisherUser.id,
        surfboardMerchantId: merchantId,
        surfboardApplicationId: null,
        status: PublisherStatus.APPROVED,
      },
    });
  }

  const existingStore = await prisma.store.findFirst({ where: { publisherId: publisher.id } });
  if (!existingStore) {
    await prisma.store.create({
      data: {
        publisherId: publisher.id,
        surfboardStoreId: storeId,
      },
    });
  }

  const existingGames = await prisma.game.count({ where: { publisherId: publisher.id } });
  if (existingGames === 0) {
    await prisma.game.createMany({
      data: [
        {
          publisherId: publisher.id,
          title: 'Ashfall Protocol',
          description: 'A tactical roguelike set in the ruins of a collapsed orbital foundry.',
          price: 1999,
          currency: 'USD',
          status: GameStatus.PUBLISHED,
        },
        {
          publisherId: publisher.id,
          title: 'Driftwood Harbor',
          description: 'A slow, cozy sailing-and-trading sim across a foggy archipelago.',
          price: 1499,
          currency: 'USD',
          status: GameStatus.PUBLISHED,
        },
        {
          publisherId: publisher.id,
          title: 'Circuit Breaker',
          description: 'A twin-stick arena shooter with a fully destructible arena.',
          price: 2499,
          currency: 'USD',
          status: GameStatus.PUBLISHED,
        },
        {
          publisherId: publisher.id,
          title: 'Loom & Ledger',
          description: 'An unannounced project still in production — not yet for sale.',
          price: 2999,
          currency: 'USD',
          status: GameStatus.DRAFT,
        },
      ],
    });
  }

  console.log('\n[seed] done. Test accounts (all use the same password):');
  console.log(`[seed]   admin@gameforge.dev     (ADMIN)`);
  console.log(`[seed]   publisher@gameforge.dev (PUBLISHER)`);
  console.log(`[seed]   customer@gameforge.dev  (CUSTOMER)`);
  console.log(`[seed]   password: ${SEED_PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
