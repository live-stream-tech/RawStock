ALTER TABLE "twoshot_bookings" RENAME TO "mentor_bookings";
UPDATE "transactions" SET "source" = 'mentor' WHERE "source" = 'twoshot';
UPDATE "earnings" SET "type" = 'mentor' WHERE "type" = 'twoshot';
UPDATE "creators" SET "category" = 'mentor' WHERE "category" = 'twoshot';
