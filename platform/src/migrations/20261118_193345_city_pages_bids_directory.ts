import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_info_pages_section" AS ENUM('residents', 'business', 'uez', 'how-do-i', 'government', 'departments');
  CREATE TYPE "public"."enum_info_pages_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_info_pages_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__info_pages_v_version_section" AS ENUM('residents', 'business', 'uez', 'how-do-i', 'government', 'departments');
  CREATE TYPE "public"."enum__info_pages_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__info_pages_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_bids_bid_status" AS ENUM('open', 'closed', 'awarded', 'cancelled');
  CREATE TYPE "public"."enum_bids_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_bids_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__bids_v_version_bid_status" AS ENUM('open', 'closed', 'awarded', 'cancelled');
  CREATE TYPE "public"."enum__bids_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__bids_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_business_listings_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  ALTER TYPE "public"."enum_officials_category" ADD VALUE 'staff';
  CREATE TABLE "info_pages_attachments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "info_pages_external_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"provider" varchar
  );
  
  CREATE TABLE "info_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"section" "enum_info_pages_section" NOT NULL,
  	"parent_id" integer,
  	"sort_order" numeric DEFAULT 100,
  	"official_url" varchar,
  	"department_id" integer,
  	"workflow_status" "enum_info_pages_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_info_pages_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "info_pages_locales" (
  	"title" varchar NOT NULL,
  	"summary" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "info_pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"officials_id" integer,
  	"source_records_id" integer
  );
  
  CREATE TABLE "_info_pages_v_version_attachments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_info_pages_v_version_external_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"provider" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_info_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar NOT NULL,
  	"version_section" "enum__info_pages_v_version_section" NOT NULL,
  	"version_parent_id" integer,
  	"version_sort_order" numeric DEFAULT 100,
  	"version_official_url" varchar,
  	"version_department_id" integer,
  	"version_workflow_status" "enum__info_pages_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__info_pages_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_info_pages_v_locales" (
  	"version_title" varchar NOT NULL,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_info_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"officials_id" integer,
  	"source_records_id" integer
  );
  
  CREATE TABLE "bids_attachments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "bids" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"bid_number" varchar,
  	"category" varchar,
  	"bid_status" "enum_bids_bid_status" DEFAULT 'open' NOT NULL,
  	"published_on" timestamp(3) with time zone,
  	"closes_at" timestamp(3) with time zone,
  	"closes_note" varchar,
  	"summary" varchar,
  	"body" jsonb,
  	"contact" varchar,
  	"official_url" varchar,
  	"department_id" integer,
  	"workflow_status" "enum_bids_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_bids_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bids_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "_bids_v_version_attachments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_bids_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_bid_number" varchar,
  	"version_category" varchar,
  	"version_bid_status" "enum__bids_v_version_bid_status" DEFAULT 'open' NOT NULL,
  	"version_published_on" timestamp(3) with time zone,
  	"version_closes_at" timestamp(3) with time zone,
  	"version_closes_note" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_contact" varchar,
  	"version_official_url" varchar,
  	"version_department_id" integer,
  	"version_workflow_status" "enum__bids_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__bids_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_bids_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "business_listings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"address" varchar,
  	"phone" varchar,
  	"website" varchar,
  	"category" varchar,
  	"verification_status" "enum_business_listings_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "business_listings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  ALTER TABLE "services" ADD COLUMN "info_page_id" integer;
  ALTER TABLE "_services_v" ADD COLUMN "version_info_page_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "info_pages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "bids_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "business_listings_id" integer;
  ALTER TABLE "info_pages_attachments" ADD CONSTRAINT "info_pages_attachments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."info_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "info_pages_external_links" ADD CONSTRAINT "info_pages_external_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."info_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "info_pages" ADD CONSTRAINT "info_pages_parent_id_info_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."info_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "info_pages" ADD CONSTRAINT "info_pages_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "info_pages_locales" ADD CONSTRAINT "info_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."info_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "info_pages_rels" ADD CONSTRAINT "info_pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."info_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "info_pages_rels" ADD CONSTRAINT "info_pages_rels_officials_fk" FOREIGN KEY ("officials_id") REFERENCES "public"."officials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "info_pages_rels" ADD CONSTRAINT "info_pages_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_info_pages_v_version_attachments" ADD CONSTRAINT "_info_pages_v_version_attachments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_info_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_info_pages_v_version_external_links" ADD CONSTRAINT "_info_pages_v_version_external_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_info_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_info_pages_v" ADD CONSTRAINT "_info_pages_v_parent_id_info_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."info_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_info_pages_v" ADD CONSTRAINT "_info_pages_v_version_parent_id_info_pages_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."info_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_info_pages_v" ADD CONSTRAINT "_info_pages_v_version_department_id_departments_id_fk" FOREIGN KEY ("version_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_info_pages_v_locales" ADD CONSTRAINT "_info_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_info_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_info_pages_v_rels" ADD CONSTRAINT "_info_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_info_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_info_pages_v_rels" ADD CONSTRAINT "_info_pages_v_rels_officials_fk" FOREIGN KEY ("officials_id") REFERENCES "public"."officials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_info_pages_v_rels" ADD CONSTRAINT "_info_pages_v_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bids_attachments" ADD CONSTRAINT "bids_attachments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bids"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bids" ADD CONSTRAINT "bids_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bids_rels" ADD CONSTRAINT "bids_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bids"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bids_rels" ADD CONSTRAINT "bids_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bids_v_version_attachments" ADD CONSTRAINT "_bids_v_version_attachments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_bids_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bids_v" ADD CONSTRAINT "_bids_v_parent_id_bids_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bids"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_bids_v" ADD CONSTRAINT "_bids_v_version_department_id_departments_id_fk" FOREIGN KEY ("version_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_bids_v_rels" ADD CONSTRAINT "_bids_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_bids_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_bids_v_rels" ADD CONSTRAINT "_bids_v_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "business_listings_rels" ADD CONSTRAINT "business_listings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."business_listings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "business_listings_rels" ADD CONSTRAINT "business_listings_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "info_pages_attachments_order_idx" ON "info_pages_attachments" USING btree ("_order");
  CREATE INDEX "info_pages_attachments_parent_id_idx" ON "info_pages_attachments" USING btree ("_parent_id");
  CREATE INDEX "info_pages_external_links_order_idx" ON "info_pages_external_links" USING btree ("_order");
  CREATE INDEX "info_pages_external_links_parent_id_idx" ON "info_pages_external_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "info_pages_slug_idx" ON "info_pages" USING btree ("slug");
  CREATE INDEX "info_pages_section_idx" ON "info_pages" USING btree ("section");
  CREATE INDEX "info_pages_parent_idx" ON "info_pages" USING btree ("parent_id");
  CREATE INDEX "info_pages_department_idx" ON "info_pages" USING btree ("department_id");
  CREATE INDEX "info_pages_workflow_status_idx" ON "info_pages" USING btree ("workflow_status");
  CREATE INDEX "info_pages_expires_at_idx" ON "info_pages" USING btree ("expires_at");
  CREATE INDEX "info_pages_updated_at_idx" ON "info_pages" USING btree ("updated_at");
  CREATE INDEX "info_pages_created_at_idx" ON "info_pages" USING btree ("created_at");
  CREATE UNIQUE INDEX "info_pages_locales_locale_parent_id_unique" ON "info_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "info_pages_locales_parent_id_idx" ON "info_pages_locales" USING btree ("_parent_id");
  CREATE INDEX "info_pages_rels_order_idx" ON "info_pages_rels" USING btree ("order");
  CREATE INDEX "info_pages_rels_parent_idx" ON "info_pages_rels" USING btree ("parent_id");
  CREATE INDEX "info_pages_rels_path_idx" ON "info_pages_rels" USING btree ("path");
  CREATE INDEX "info_pages_rels_officials_id_idx" ON "info_pages_rels" USING btree ("officials_id");
  CREATE INDEX "info_pages_rels_source_records_id_idx" ON "info_pages_rels" USING btree ("source_records_id");
  CREATE INDEX "_info_pages_v_version_attachments_order_idx" ON "_info_pages_v_version_attachments" USING btree ("_order");
  CREATE INDEX "_info_pages_v_version_attachments_parent_id_idx" ON "_info_pages_v_version_attachments" USING btree ("_parent_id");
  CREATE INDEX "_info_pages_v_version_external_links_order_idx" ON "_info_pages_v_version_external_links" USING btree ("_order");
  CREATE INDEX "_info_pages_v_version_external_links_parent_id_idx" ON "_info_pages_v_version_external_links" USING btree ("_parent_id");
  CREATE INDEX "_info_pages_v_parent_idx" ON "_info_pages_v" USING btree ("parent_id");
  CREATE INDEX "_info_pages_v_version_version_slug_idx" ON "_info_pages_v" USING btree ("version_slug");
  CREATE INDEX "_info_pages_v_version_version_section_idx" ON "_info_pages_v" USING btree ("version_section");
  CREATE INDEX "_info_pages_v_version_version_parent_idx" ON "_info_pages_v" USING btree ("version_parent_id");
  CREATE INDEX "_info_pages_v_version_version_department_idx" ON "_info_pages_v" USING btree ("version_department_id");
  CREATE INDEX "_info_pages_v_version_version_workflow_status_idx" ON "_info_pages_v" USING btree ("version_workflow_status");
  CREATE INDEX "_info_pages_v_version_version_expires_at_idx" ON "_info_pages_v" USING btree ("version_expires_at");
  CREATE INDEX "_info_pages_v_version_version_updated_at_idx" ON "_info_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_info_pages_v_version_version_created_at_idx" ON "_info_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_info_pages_v_created_at_idx" ON "_info_pages_v" USING btree ("created_at");
  CREATE INDEX "_info_pages_v_updated_at_idx" ON "_info_pages_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_info_pages_v_locales_locale_parent_id_unique" ON "_info_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_info_pages_v_locales_parent_id_idx" ON "_info_pages_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_info_pages_v_rels_order_idx" ON "_info_pages_v_rels" USING btree ("order");
  CREATE INDEX "_info_pages_v_rels_parent_idx" ON "_info_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_info_pages_v_rels_path_idx" ON "_info_pages_v_rels" USING btree ("path");
  CREATE INDEX "_info_pages_v_rels_officials_id_idx" ON "_info_pages_v_rels" USING btree ("officials_id");
  CREATE INDEX "_info_pages_v_rels_source_records_id_idx" ON "_info_pages_v_rels" USING btree ("source_records_id");
  CREATE INDEX "bids_attachments_order_idx" ON "bids_attachments" USING btree ("_order");
  CREATE INDEX "bids_attachments_parent_id_idx" ON "bids_attachments" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "bids_slug_idx" ON "bids" USING btree ("slug");
  CREATE INDEX "bids_bid_status_idx" ON "bids" USING btree ("bid_status");
  CREATE INDEX "bids_department_idx" ON "bids" USING btree ("department_id");
  CREATE INDEX "bids_workflow_status_idx" ON "bids" USING btree ("workflow_status");
  CREATE INDEX "bids_expires_at_idx" ON "bids" USING btree ("expires_at");
  CREATE INDEX "bids_updated_at_idx" ON "bids" USING btree ("updated_at");
  CREATE INDEX "bids_created_at_idx" ON "bids" USING btree ("created_at");
  CREATE INDEX "bids_rels_order_idx" ON "bids_rels" USING btree ("order");
  CREATE INDEX "bids_rels_parent_idx" ON "bids_rels" USING btree ("parent_id");
  CREATE INDEX "bids_rels_path_idx" ON "bids_rels" USING btree ("path");
  CREATE INDEX "bids_rels_source_records_id_idx" ON "bids_rels" USING btree ("source_records_id");
  CREATE INDEX "_bids_v_version_attachments_order_idx" ON "_bids_v_version_attachments" USING btree ("_order");
  CREATE INDEX "_bids_v_version_attachments_parent_id_idx" ON "_bids_v_version_attachments" USING btree ("_parent_id");
  CREATE INDEX "_bids_v_parent_idx" ON "_bids_v" USING btree ("parent_id");
  CREATE INDEX "_bids_v_version_version_slug_idx" ON "_bids_v" USING btree ("version_slug");
  CREATE INDEX "_bids_v_version_version_bid_status_idx" ON "_bids_v" USING btree ("version_bid_status");
  CREATE INDEX "_bids_v_version_version_department_idx" ON "_bids_v" USING btree ("version_department_id");
  CREATE INDEX "_bids_v_version_version_workflow_status_idx" ON "_bids_v" USING btree ("version_workflow_status");
  CREATE INDEX "_bids_v_version_version_expires_at_idx" ON "_bids_v" USING btree ("version_expires_at");
  CREATE INDEX "_bids_v_version_version_updated_at_idx" ON "_bids_v" USING btree ("version_updated_at");
  CREATE INDEX "_bids_v_version_version_created_at_idx" ON "_bids_v" USING btree ("version_created_at");
  CREATE INDEX "_bids_v_created_at_idx" ON "_bids_v" USING btree ("created_at");
  CREATE INDEX "_bids_v_updated_at_idx" ON "_bids_v" USING btree ("updated_at");
  CREATE INDEX "_bids_v_rels_order_idx" ON "_bids_v_rels" USING btree ("order");
  CREATE INDEX "_bids_v_rels_parent_idx" ON "_bids_v_rels" USING btree ("parent_id");
  CREATE INDEX "_bids_v_rels_path_idx" ON "_bids_v_rels" USING btree ("path");
  CREATE INDEX "_bids_v_rels_source_records_id_idx" ON "_bids_v_rels" USING btree ("source_records_id");
  CREATE UNIQUE INDEX "business_listings_key_idx" ON "business_listings" USING btree ("key");
  CREATE INDEX "business_listings_updated_at_idx" ON "business_listings" USING btree ("updated_at");
  CREATE INDEX "business_listings_created_at_idx" ON "business_listings" USING btree ("created_at");
  CREATE INDEX "business_listings_rels_order_idx" ON "business_listings_rels" USING btree ("order");
  CREATE INDEX "business_listings_rels_parent_idx" ON "business_listings_rels" USING btree ("parent_id");
  CREATE INDEX "business_listings_rels_path_idx" ON "business_listings_rels" USING btree ("path");
  CREATE INDEX "business_listings_rels_source_records_id_idx" ON "business_listings_rels" USING btree ("source_records_id");
  ALTER TABLE "services" ADD CONSTRAINT "services_info_page_id_info_pages_id_fk" FOREIGN KEY ("info_page_id") REFERENCES "public"."info_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_info_page_id_info_pages_id_fk" FOREIGN KEY ("version_info_page_id") REFERENCES "public"."info_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_info_pages_fk" FOREIGN KEY ("info_pages_id") REFERENCES "public"."info_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bids_fk" FOREIGN KEY ("bids_id") REFERENCES "public"."bids"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_business_listings_fk" FOREIGN KEY ("business_listings_id") REFERENCES "public"."business_listings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "services_info_page_idx" ON "services" USING btree ("info_page_id");
  CREATE INDEX "_services_v_version_version_info_page_idx" ON "_services_v" USING btree ("version_info_page_id");
  CREATE INDEX "payload_locked_documents_rels_info_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("info_pages_id");
  CREATE INDEX "payload_locked_documents_rels_bids_id_idx" ON "payload_locked_documents_rels" USING btree ("bids_id");
  CREATE INDEX "payload_locked_documents_rels_business_listings_id_idx" ON "payload_locked_documents_rels" USING btree ("business_listings_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "info_pages_attachments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "info_pages_external_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "info_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "info_pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "info_pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_info_pages_v_version_attachments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_info_pages_v_version_external_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_info_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_info_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_info_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bids_attachments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bids" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bids_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_bids_v_version_attachments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_bids_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_bids_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "business_listings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "business_listings_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "info_pages_attachments" CASCADE;
  DROP TABLE "info_pages_external_links" CASCADE;
  DROP TABLE "info_pages" CASCADE;
  DROP TABLE "info_pages_locales" CASCADE;
  DROP TABLE "info_pages_rels" CASCADE;
  DROP TABLE "_info_pages_v_version_attachments" CASCADE;
  DROP TABLE "_info_pages_v_version_external_links" CASCADE;
  DROP TABLE "_info_pages_v" CASCADE;
  DROP TABLE "_info_pages_v_locales" CASCADE;
  DROP TABLE "_info_pages_v_rels" CASCADE;
  DROP TABLE "bids_attachments" CASCADE;
  DROP TABLE "bids" CASCADE;
  DROP TABLE "bids_rels" CASCADE;
  DROP TABLE "_bids_v_version_attachments" CASCADE;
  DROP TABLE "_bids_v" CASCADE;
  DROP TABLE "_bids_v_rels" CASCADE;
  DROP TABLE "business_listings" CASCADE;
  DROP TABLE "business_listings_rels" CASCADE;
  ALTER TABLE "services" DROP CONSTRAINT "services_info_page_id_info_pages_id_fk";
  
  ALTER TABLE "_services_v" DROP CONSTRAINT "_services_v_version_info_page_id_info_pages_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_info_pages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_bids_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_business_listings_fk";
  
  ALTER TABLE "officials" ALTER COLUMN "category" SET DATA TYPE text;
  ALTER TABLE "officials" ALTER COLUMN "category" SET DEFAULT 'council'::text;
  DROP TYPE "public"."enum_officials_category";
  CREATE TYPE "public"."enum_officials_category" AS ENUM('executive', 'council', 'clerk', 'department');
  ALTER TABLE "officials" ALTER COLUMN "category" SET DEFAULT 'council'::"public"."enum_officials_category";
  ALTER TABLE "officials" ALTER COLUMN "category" SET DATA TYPE "public"."enum_officials_category" USING "category"::"public"."enum_officials_category";
  DROP INDEX "services_info_page_idx";
  DROP INDEX "_services_v_version_version_info_page_idx";
  DROP INDEX "payload_locked_documents_rels_info_pages_id_idx";
  DROP INDEX "payload_locked_documents_rels_bids_id_idx";
  DROP INDEX "payload_locked_documents_rels_business_listings_id_idx";
  ALTER TABLE "services" DROP COLUMN "info_page_id";
  ALTER TABLE "_services_v" DROP COLUMN "version_info_page_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "info_pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "bids_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "business_listings_id";
  DROP TYPE "public"."enum_info_pages_section";
  DROP TYPE "public"."enum_info_pages_workflow_status";
  DROP TYPE "public"."enum_info_pages_verification_status";
  DROP TYPE "public"."enum__info_pages_v_version_section";
  DROP TYPE "public"."enum__info_pages_v_version_workflow_status";
  DROP TYPE "public"."enum__info_pages_v_version_verification_status";
  DROP TYPE "public"."enum_bids_bid_status";
  DROP TYPE "public"."enum_bids_workflow_status";
  DROP TYPE "public"."enum_bids_verification_status";
  DROP TYPE "public"."enum__bids_v_version_bid_status";
  DROP TYPE "public"."enum__bids_v_version_workflow_status";
  DROP TYPE "public"."enum__bids_v_version_verification_status";
  DROP TYPE "public"."enum_business_listings_verification_status";`)
}
