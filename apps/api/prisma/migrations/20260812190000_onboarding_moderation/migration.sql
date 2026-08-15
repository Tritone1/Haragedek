CREATE TYPE "DealStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'expired');
CREATE TYPE "ClaimRequestStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "ClaimStatus_new" AS ENUM ('unclaimed', 'pending_verification', 'verified');

ALTER TABLE "restaurants"
  ADD COLUMN "claim_status" "ClaimStatus_new" NOT NULL DEFAULT 'unclaimed',
  ADD COLUMN "verification_notes" TEXT;

ALTER TABLE "deals"
  ADD COLUMN "status" "DealStatus" NOT NULL DEFAULT 'approved',
  ADD COLUMN "submitted_by_user_id" TEXT,
  ADD COLUMN "reviewed_by_user_id" TEXT,
  ADD COLUMN "review_notes" TEXT,
  ADD COLUMN "submitted_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_at" TIMESTAMP(3);

UPDATE "deals"
SET "submitted_at" = "created_at",
    "reviewed_at" = "created_at"
WHERE "status" = 'approved';

CREATE TABLE "venue_claim_requests" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "requesting_user_id" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "proof_notes" TEXT NOT NULL,
    "status" "ClaimRequestStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    CONSTRAINT "venue_claim_requests_pkey" PRIMARY KEY ("id")
);

INSERT INTO "venue_claim_requests" ("id", "venue_id", "requesting_user_id", "contact_phone", "contact_email", "proof_notes", "status", "created_at", "reviewed_at")
SELECT "id", "restaurant_id", "user_id", '', '', "evidence",
  CASE
    WHEN "status"::text = 'PENDING' THEN 'pending'::"ClaimRequestStatus"
    WHEN "status"::text = 'VERIFIED' THEN 'approved'::"ClaimRequestStatus"
    ELSE 'rejected'::"ClaimRequestStatus"
  END,
  "created_at",
  NULL
FROM "restaurant_claims";

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "venue_claim_requests_requesting_user_id_venue_id_key" ON "venue_claim_requests"("requesting_user_id", "venue_id");
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

ALTER TABLE "deals" ADD CONSTRAINT "deals_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "venue_claim_requests" ADD CONSTRAINT "venue_claim_requests_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_claim_requests" ADD CONSTRAINT "venue_claim_requests_requesting_user_id_fkey" FOREIGN KEY ("requesting_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "restaurant_claims";
DROP TYPE "ClaimStatus";
ALTER TYPE "ClaimStatus_new" RENAME TO "ClaimStatus";
