import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_meetings_documents_kind" AS ENUM('agenda', 'minutes', 'legislation', 'video', 'bill_list', 'notice', 'comments', 'other');
  CREATE TYPE "public"."enum__meetings_v_version_documents_kind" AS ENUM('agenda', 'minutes', 'legislation', 'video', 'bill_list', 'notice', 'comments', 'other');
  CREATE TYPE "public"."enum_legislation_documents_kind" AS ENUM('agenda', 'minutes', 'legislation', 'video', 'bill_list', 'notice', 'comments', 'other');
  CREATE TYPE "public"."enum__legislation_v_version_documents_kind" AS ENUM('agenda', 'minutes', 'legislation', 'video', 'bill_list', 'notice', 'comments', 'other');
  CREATE TABLE "meetings_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum_meetings_documents_kind" DEFAULT 'other' NOT NULL,
  	"session" varchar,
  	"url" varchar NOT NULL,
  	"checksum_sha256" varchar,
  	"retrieved_at" timestamp(3) with time zone,
  	"text" varchar
  );
  
  CREATE TABLE "_meetings_v_version_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum__meetings_v_version_documents_kind" DEFAULT 'other' NOT NULL,
  	"session" varchar,
  	"url" varchar NOT NULL,
  	"checksum_sha256" varchar,
  	"retrieved_at" timestamp(3) with time zone,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "legislation_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum_legislation_documents_kind" DEFAULT 'other' NOT NULL,
  	"session" varchar,
  	"url" varchar NOT NULL,
  	"checksum_sha256" varchar,
  	"retrieved_at" timestamp(3) with time zone,
  	"text" varchar
  );
  
  CREATE TABLE "_legislation_v_version_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum__legislation_v_version_documents_kind" DEFAULT 'other' NOT NULL,
  	"session" varchar,
  	"url" varchar NOT NULL,
  	"checksum_sha256" varchar,
  	"retrieved_at" timestamp(3) with time zone,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "meetings" ADD COLUMN "time_confirmed" boolean DEFAULT true;
  ALTER TABLE "_meetings_v" ADD COLUMN "version_time_confirmed" boolean DEFAULT true;
  ALTER TABLE "meetings_documents" ADD CONSTRAINT "meetings_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_meetings_v_version_documents" ADD CONSTRAINT "_meetings_v_version_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_meetings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legislation_documents" ADD CONSTRAINT "legislation_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legislation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legislation_v_version_documents" ADD CONSTRAINT "_legislation_v_version_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_legislation_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "meetings_documents_order_idx" ON "meetings_documents" USING btree ("_order");
  CREATE INDEX "meetings_documents_parent_id_idx" ON "meetings_documents" USING btree ("_parent_id");
  CREATE INDEX "_meetings_v_version_documents_order_idx" ON "_meetings_v_version_documents" USING btree ("_order");
  CREATE INDEX "_meetings_v_version_documents_parent_id_idx" ON "_meetings_v_version_documents" USING btree ("_parent_id");
  CREATE INDEX "legislation_documents_order_idx" ON "legislation_documents" USING btree ("_order");
  CREATE INDEX "legislation_documents_parent_id_idx" ON "legislation_documents" USING btree ("_parent_id");
  CREATE INDEX "_legislation_v_version_documents_order_idx" ON "_legislation_v_version_documents" USING btree ("_order");
  CREATE INDEX "_legislation_v_version_documents_parent_id_idx" ON "_legislation_v_version_documents" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "meetings_documents" CASCADE;
  DROP TABLE "_meetings_v_version_documents" CASCADE;
  DROP TABLE "legislation_documents" CASCADE;
  DROP TABLE "_legislation_v_version_documents" CASCADE;
  ALTER TABLE "meetings" DROP COLUMN "time_confirmed";
  ALTER TABLE "_meetings_v" DROP COLUMN "version_time_confirmed";
  DROP TYPE "public"."enum_meetings_documents_kind";
  DROP TYPE "public"."enum__meetings_v_version_documents_kind";
  DROP TYPE "public"."enum_legislation_documents_kind";
  DROP TYPE "public"."enum__legislation_v_version_documents_kind";`)
}
