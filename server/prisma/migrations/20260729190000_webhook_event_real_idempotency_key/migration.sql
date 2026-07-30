-- WebhookEvent table is empty in every environment this has been applied to
-- (verified before writing this migration), so adding a NOT NULL column
-- with no default is safe here.
ALTER TABLE "WebhookEvent" ADD COLUMN "surfboardEventId" TEXT NOT NULL;

CREATE UNIQUE INDEX "WebhookEvent_surfboardEventId_key" ON "WebhookEvent"("surfboardEventId");
