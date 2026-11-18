import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_legislation_fiscal_kind" AS ENUM('spending', 'revenue', 'no_cost', 'unknown');
  CREATE TYPE "public"."enum__legislation_v_version_fiscal_kind" AS ENUM('spending', 'revenue', 'no_cost', 'unknown');
  ALTER TABLE "legislation" ADD COLUMN "fiscal_amount_cents" numeric;
  ALTER TABLE "legislation" ADD COLUMN "fiscal_kind" "enum_legislation_fiscal_kind";
  ALTER TABLE "legislation" ADD COLUMN "fiscal_category" varchar;
  ALTER TABLE "legislation" ADD COLUMN "fiscal_basis" varchar;
  ALTER TABLE "_legislation_v" ADD COLUMN "version_fiscal_amount_cents" numeric;
  ALTER TABLE "_legislation_v" ADD COLUMN "version_fiscal_kind" "enum__legislation_v_version_fiscal_kind";
  ALTER TABLE "_legislation_v" ADD COLUMN "version_fiscal_category" varchar;
  ALTER TABLE "_legislation_v" ADD COLUMN "version_fiscal_basis" varchar;
  CREATE INDEX "legislation_fiscal_fiscal_category_idx" ON "legislation" USING btree ("fiscal_category");
  CREATE INDEX "_legislation_v_version_fiscal_version_fiscal_category_idx" ON "_legislation_v" USING btree ("version_fiscal_category");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "legislation_fiscal_fiscal_category_idx";
  DROP INDEX "_legislation_v_version_fiscal_version_fiscal_category_idx";
  ALTER TABLE "legislation" DROP COLUMN "fiscal_amount_cents";
  ALTER TABLE "legislation" DROP COLUMN "fiscal_kind";
  ALTER TABLE "legislation" DROP COLUMN "fiscal_category";
  ALTER TABLE "legislation" DROP COLUMN "fiscal_basis";
  ALTER TABLE "_legislation_v" DROP COLUMN "version_fiscal_amount_cents";
  ALTER TABLE "_legislation_v" DROP COLUMN "version_fiscal_kind";
  ALTER TABLE "_legislation_v" DROP COLUMN "version_fiscal_category";
  ALTER TABLE "_legislation_v" DROP COLUMN "version_fiscal_basis";
  DROP TYPE "public"."enum_legislation_fiscal_kind";
  DROP TYPE "public"."enum__legislation_v_version_fiscal_kind";`)
}
