CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "institution" text,
  "last4" char(4) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "pending_transactions"
ADD COLUMN IF NOT EXISTS "is_own_transfer" boolean DEFAULT false NOT NULL;
