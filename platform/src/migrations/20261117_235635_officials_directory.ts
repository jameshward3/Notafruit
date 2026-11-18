import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_officials_category" AS ENUM('executive', 'council', 'clerk', 'department');
  ALTER TABLE "officials" ADD COLUMN "slug" varchar NOT NULL;
  ALTER TABLE "officials" ADD COLUMN "category" "enum_officials_category" DEFAULT 'council' NOT NULL;
  ALTER TABLE "officials" ADD COLUMN "sort_order" numeric DEFAULT 100;
  ALTER TABLE "officials" ADD COLUMN "photo_id" integer;
  ALTER TABLE "officials" ADD COLUMN "email" varchar;
  ALTER TABLE "officials" ADD COLUMN "phone" varchar;
  ALTER TABLE "officials" ADD COLUMN "address" varchar;
  ALTER TABLE "officials" ADD COLUMN "bio" varchar;
  ALTER TABLE "officials" ADD COLUMN "department_id" integer;
  ALTER TABLE "officials" ADD COLUMN "term_note" varchar;
  ALTER TABLE "officials" ADD CONSTRAINT "officials_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "officials" ADD CONSTRAINT "officials_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "officials_slug_idx" ON "officials" USING btree ("slug");
  CREATE INDEX "officials_category_idx" ON "officials" USING btree ("category");
  CREATE INDEX "officials_photo_idx" ON "officials" USING btree ("photo_id");
  CREATE INDEX "officials_department_idx" ON "officials" USING btree ("department_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "officials" DROP CONSTRAINT "officials_photo_id_media_id_fk";
  
  ALTER TABLE "officials" DROP CONSTRAINT "officials_department_id_departments_id_fk";
  
  DROP INDEX "officials_slug_idx";
  DROP INDEX "officials_category_idx";
  DROP INDEX "officials_photo_idx";
  DROP INDEX "officials_department_idx";
  ALTER TABLE "officials" DROP COLUMN "slug";
  ALTER TABLE "officials" DROP COLUMN "category";
  ALTER TABLE "officials" DROP COLUMN "sort_order";
  ALTER TABLE "officials" DROP COLUMN "photo_id";
  ALTER TABLE "officials" DROP COLUMN "email";
  ALTER TABLE "officials" DROP COLUMN "phone";
  ALTER TABLE "officials" DROP COLUMN "address";
  ALTER TABLE "officials" DROP COLUMN "bio";
  ALTER TABLE "officials" DROP COLUMN "department_id";
  ALTER TABLE "officials" DROP COLUMN "term_note";
  DROP TYPE "public"."enum_officials_category";`)
}
