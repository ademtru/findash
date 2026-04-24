ALTER TABLE "transactions" ADD COLUMN "group_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_transactions_group" ON "transactions" USING btree ("group_id");