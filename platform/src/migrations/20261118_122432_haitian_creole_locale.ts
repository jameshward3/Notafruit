import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."_locales" ADD VALUE 'ht';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "services_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_services_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "notices_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_notices_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "events_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_events_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "seasonal_features_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_seasonal_features_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "departments_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  DROP TYPE "public"."_locales";
  CREATE TYPE "public"."_locales" AS ENUM('en', 'es');
  ALTER TABLE "services_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_services_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "notices_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_notices_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "events_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_events_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "seasonal_features_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_seasonal_features_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "departments_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";`)
}
