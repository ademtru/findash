ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "starting_balance" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "starting_date" date DEFAULT '1970-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "balance_snapshot" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "snapshot_at" timestamp with time zone;
