-- Surfboard's Promotions API is a marketing-banner system, not a
-- discount-code system — there's no real Surfboard entity to reference for
-- our Promotion model, so this becomes local-only. Dropping NOT NULL is
-- safe regardless of existing data (never a required value going forward).
ALTER TABLE "Promotion" ALTER COLUMN "surfboardPromotionId" DROP NOT NULL;
