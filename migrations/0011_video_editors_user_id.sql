ALTER TABLE "video_editors" ADD COLUMN "user_id" integer;
--> statement-breakpoint
CREATE UNIQUE INDEX "video_editors_user_id_unique" ON "video_editors" ("user_id") WHERE "user_id" IS NOT NULL;
