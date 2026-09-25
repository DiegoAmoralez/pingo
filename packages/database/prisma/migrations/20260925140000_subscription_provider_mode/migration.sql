-- AlterTable: which Stripe world (live/test) a subscription row came from.
ALTER TABLE "Subscription" ADD COLUMN "providerMode" TEXT;

-- Existing Stripe rows were created while only a single (test) key set existed.
UPDATE "Subscription"
SET "providerMode" = 'test'
WHERE "provider" = 'stripe' AND "providerCustomerId" IS NOT NULL;

CREATE INDEX "Subscription_providerMode_idx" ON "Subscription"("providerMode");
