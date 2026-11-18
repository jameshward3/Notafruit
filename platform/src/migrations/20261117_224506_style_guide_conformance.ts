import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_kind" AS ENUM('photo', 'seal', 'illustration', 'document');
  CREATE TYPE "public"."enum_media_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_link_checks_status" AS ENUM('ok', 'broken', 'blocked', 'error');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'checkLinks';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'checkLinks';
  CREATE TABLE "link_checks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"status" "enum_link_checks_status" NOT NULL,
  	"http_status" numeric,
  	"final_url" varchar,
  	"detail" varchar,
  	"checked_at" timestamp(3) with time zone NOT NULL,
  	"referenced_by" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "media" ALTER COLUMN "alt" DROP NOT NULL;
  ALTER TABLE "media" ADD COLUMN "kind" "enum_media_kind" DEFAULT 'photo' NOT NULL;
  ALTER TABLE "media" ADD COLUMN "decorative" boolean DEFAULT false;
  ALTER TABLE "media" ADD COLUMN "capture_date" timestamp(3) with time zone;
  ALTER TABLE "media" ADD COLUMN "approved_by_id" integer;
  ALTER TABLE "media" ADD COLUMN "approved_at" timestamp(3) with time zone;
  ALTER TABLE "media" ADD COLUMN "checksum_sha256" varchar;
  ALTER TABLE "media" ADD COLUMN "verification_status" "enum_media_verification_status" DEFAULT 'unverified' NOT NULL;
  ALTER TABLE "media" ADD COLUMN "sizes_card_avif_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_avif_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_avif_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_avif_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_card_avif_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_card_avif_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_avif_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_avif_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_avif_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_avif_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_avif_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_avif_filename" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "link_checks_id" integer;
  CREATE UNIQUE INDEX "link_checks_url_idx" ON "link_checks" USING btree ("url");
  CREATE INDEX "link_checks_updated_at_idx" ON "link_checks" USING btree ("updated_at");
  CREATE INDEX "link_checks_created_at_idx" ON "link_checks" USING btree ("created_at");
  ALTER TABLE "media" ADD CONSTRAINT "media_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_link_checks_fk" FOREIGN KEY ("link_checks_id") REFERENCES "public"."link_checks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_approved_by_idx" ON "media" USING btree ("approved_by_id");
  CREATE INDEX "media_sizes_card_avif_sizes_card_avif_filename_idx" ON "media" USING btree ("sizes_card_avif_filename");
  CREATE INDEX "media_sizes_hero_avif_sizes_hero_avif_filename_idx" ON "media" USING btree ("sizes_hero_avif_filename");
  CREATE INDEX "payload_locked_documents_rels_link_checks_id_idx" ON "payload_locked_documents_rels" USING btree ("link_checks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "link_checks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "link_checks" CASCADE;
  ALTER TABLE "media" DROP CONSTRAINT "media_approved_by_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_link_checks_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'publicationSweep', 'deliverOutbox', 'reconcileSearch', 'importBatch');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'publicationSweep', 'deliverOutbox', 'reconcileSearch', 'importBatch');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "media_approved_by_idx";
  DROP INDEX "media_sizes_card_avif_sizes_card_avif_filename_idx";
  DROP INDEX "media_sizes_hero_avif_sizes_hero_avif_filename_idx";
  DROP INDEX "payload_locked_documents_rels_link_checks_id_idx";
  ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
  ALTER TABLE "media" DROP COLUMN "kind";
  ALTER TABLE "media" DROP COLUMN "decorative";
  ALTER TABLE "media" DROP COLUMN "capture_date";
  ALTER TABLE "media" DROP COLUMN "approved_by_id";
  ALTER TABLE "media" DROP COLUMN "approved_at";
  ALTER TABLE "media" DROP COLUMN "checksum_sha256";
  ALTER TABLE "media" DROP COLUMN "verification_status";
  ALTER TABLE "media" DROP COLUMN "sizes_card_avif_url";
  ALTER TABLE "media" DROP COLUMN "sizes_card_avif_width";
  ALTER TABLE "media" DROP COLUMN "sizes_card_avif_height";
  ALTER TABLE "media" DROP COLUMN "sizes_card_avif_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_card_avif_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_card_avif_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_avif_url";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_avif_width";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_avif_height";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_avif_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_avif_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_avif_filename";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "link_checks_id";
  DROP TYPE "public"."enum_media_kind";
  DROP TYPE "public"."enum_media_verification_status";
  DROP TYPE "public"."enum_link_checks_status";`)
}
