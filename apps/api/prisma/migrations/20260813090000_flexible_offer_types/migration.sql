CREATE TYPE "DealOfferType" AS ENUM ('discount', 'combo', 'set_menu', 'perk', 'event', 'bundle', 'other');

ALTER TABLE "deals"
  ADD COLUMN "offer_type" "DealOfferType" NOT NULL DEFAULT 'discount',
  ALTER COLUMN "discount_pct" DROP NOT NULL;
