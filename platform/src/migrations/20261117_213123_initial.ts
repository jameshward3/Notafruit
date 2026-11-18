import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum_services_category" AS ENUM('pay', 'permits', 'report', 'trash', 'meetings', 'records', 'health', 'other');
  CREATE TYPE "public"."enum_services_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_services_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__services_v_version_category" AS ENUM('pay', 'permits', 'report', 'trash', 'meetings', 'records', 'health', 'other');
  CREATE TYPE "public"."enum__services_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__services_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_notices_wards" AS ENUM('north', 'south', 'east', 'west');
  CREATE TYPE "public"."enum_notices_kind" AS ENUM('general', 'emergency', 'holiday', 'legal');
  CREATE TYPE "public"."enum_notices_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_notices_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__notices_v_version_wards" AS ENUM('north', 'south', 'east', 'west');
  CREATE TYPE "public"."enum__notices_v_version_kind" AS ENUM('general', 'emergency', 'holiday', 'legal');
  CREATE TYPE "public"."enum__notices_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__notices_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_events_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_events_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__events_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__events_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_seasonal_features_audience_wards" AS ENUM('north', 'south', 'east', 'west');
  CREATE TYPE "public"."enum_seasonal_features_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_seasonal_features_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__seasonal_features_v_version_audience_wards" AS ENUM('north', 'south', 'east', 'west');
  CREATE TYPE "public"."enum__seasonal_features_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__seasonal_features_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_media_approval_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_meetings_minutes_status" AS ENUM('draft', 'approved', 'corrected');
  CREATE TYPE "public"."enum_meetings_body" AS ENUM('city_council', 'planning_board', 'zoning_board', 'other');
  CREATE TYPE "public"."enum_meetings_meeting_type" AS ENUM('regular', 'special', 'work_session', 'public_hearing');
  CREATE TYPE "public"."enum_meetings_meeting_status" AS ENUM('scheduled', 'held', 'cancelled', 'rescheduled');
  CREATE TYPE "public"."enum_meetings_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_meetings_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__meetings_v_version_minutes_status" AS ENUM('draft', 'approved', 'corrected');
  CREATE TYPE "public"."enum__meetings_v_version_body" AS ENUM('city_council', 'planning_board', 'zoning_board', 'other');
  CREATE TYPE "public"."enum__meetings_v_version_meeting_type" AS ENUM('regular', 'special', 'work_session', 'public_hearing');
  CREATE TYPE "public"."enum__meetings_v_version_meeting_status" AS ENUM('scheduled', 'held', 'cancelled', 'rescheduled');
  CREATE TYPE "public"."enum__meetings_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__meetings_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_legislation_actions_action" AS ENUM('introduced', 'referred', 'public_hearing', 'amended', 'second_reading', 'adopted', 'defeated', 'tabled', 'deferred', 'withdrawn', 'vetoed', 'veto_overridden', 'effective');
  CREATE TYPE "public"."enum_legislation_type" AS ENUM('ordinance', 'resolution', 'bond_ordinance');
  CREATE TYPE "public"."enum_legislation_current_status" AS ENUM('pending', 'introduced', 'in_review', 'adopted', 'defeated', 'tabled', 'deferred', 'withdrawn', 'vetoed');
  CREATE TYPE "public"."enum_legislation_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_legislation_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__legislation_v_version_actions_action" AS ENUM('introduced', 'referred', 'public_hearing', 'amended', 'second_reading', 'adopted', 'defeated', 'tabled', 'deferred', 'withdrawn', 'vetoed', 'veto_overridden', 'effective');
  CREATE TYPE "public"."enum__legislation_v_version_type" AS ENUM('ordinance', 'resolution', 'bond_ordinance');
  CREATE TYPE "public"."enum__legislation_v_version_current_status" AS ENUM('pending', 'introduced', 'in_review', 'adopted', 'defeated', 'tabled', 'deferred', 'withdrawn', 'vetoed');
  CREATE TYPE "public"."enum__legislation_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__legislation_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_votes_entries_vote" AS ENUM('yes', 'no', 'abstain', 'absent', 'recused');
  CREATE TYPE "public"."enum_votes_result" AS ENUM('carried', 'failed', 'tie', 'no_action');
  CREATE TYPE "public"."enum_votes_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_votes_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__votes_v_version_entries_vote" AS ENUM('yes', 'no', 'abstain', 'absent', 'recused');
  CREATE TYPE "public"."enum__votes_v_version_result" AS ENUM('carried', 'failed', 'tie', 'no_action');
  CREATE TYPE "public"."enum__votes_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__votes_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_projects_wards" AS ENUM('north', 'south', 'east', 'west');
  CREATE TYPE "public"."enum_projects_funding_status" AS ENUM('applied', 'awarded', 'appropriated', 'received');
  CREATE TYPE "public"."enum_projects_milestones_kind" AS ENUM('approval', 'funding', 'scheduled', 'construction_start', 'substantial_completion', 'closeout', 'other');
  CREATE TYPE "public"."enum_projects_project_type" AS ENUM('paving', 'sidewalks', 'water_sewer', 'parks', 'facilities', 'traffic_safety', 'other');
  CREATE TYPE "public"."enum_projects_phase" AS ENUM('planned', 'design', 'bidding', 'awarded', 'construction', 'substantially_complete', 'closed_out', 'on_hold', 'cancelled');
  CREATE TYPE "public"."enum_projects_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_projects_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__projects_v_version_wards" AS ENUM('north', 'south', 'east', 'west');
  CREATE TYPE "public"."enum__projects_v_version_funding_status" AS ENUM('applied', 'awarded', 'appropriated', 'received');
  CREATE TYPE "public"."enum__projects_v_version_milestones_kind" AS ENUM('approval', 'funding', 'scheduled', 'construction_start', 'substantial_completion', 'closeout', 'other');
  CREATE TYPE "public"."enum__projects_v_version_project_type" AS ENUM('paving', 'sidewalks', 'water_sewer', 'parks', 'facilities', 'traffic_safety', 'other');
  CREATE TYPE "public"."enum__projects_v_version_phase" AS ENUM('planned', 'design', 'bidding', 'awarded', 'construction', 'substantially_complete', 'closed_out', 'on_hold', 'cancelled');
  CREATE TYPE "public"."enum__projects_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__projects_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_project_updates_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_project_updates_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__project_updates_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__project_updates_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_budget_datasets_basis" AS ENUM('adopted', 'amended', 'actual');
  CREATE TYPE "public"."enum_budget_datasets_kind" AS ENUM('operating', 'capital', 'appropriations', 'obligations', 'payments', 'revenues');
  CREATE TYPE "public"."enum_budget_datasets_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_budget_datasets_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__budget_datasets_v_version_basis" AS ENUM('adopted', 'amended', 'actual');
  CREATE TYPE "public"."enum__budget_datasets_v_version_kind" AS ENUM('operating', 'capital', 'appropriations', 'obligations', 'payments', 'revenues');
  CREATE TYPE "public"."enum__budget_datasets_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__budget_datasets_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_budget_lines_direction" AS ENUM('expenditure', 'revenue');
  CREATE TYPE "public"."enum_budget_lines_category" AS ENUM('public_safety', 'public_works', 'parks_recreation', 'general_government', 'other', 'property_taxes', 'local_revenues', 'state_aid', 'other_revenues');
  CREATE TYPE "public"."enum_import_batches_kind" AS ENUM('budget-lines');
  CREATE TYPE "public"."enum_import_batches_requested_action" AS ENUM('none', 'dry_run', 'commit', 'rollback');
  CREATE TYPE "public"."enum_import_batches_status" AS ENUM('uploaded', 'validated', 'invalid', 'committed', 'rolled_back', 'failed');
  CREATE TYPE "public"."enum_wards_slug" AS ENUM('north', 'south', 'east', 'west');
  CREATE TYPE "public"."enum_wards_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_places_kind" AS ENUM('facility', 'park', 'school', 'library', 'historic_site', 'transit');
  CREATE TYPE "public"."enum_places_jurisdiction" AS ENUM('municipal', 'county', 'state', 'school_district', 'other');
  CREATE TYPE "public"."enum_places_ward" AS ENUM('north', 'south', 'east', 'west');
  CREATE TYPE "public"."enum_places_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum_places_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum__places_v_version_kind" AS ENUM('facility', 'park', 'school', 'library', 'historic_site', 'transit');
  CREATE TYPE "public"."enum__places_v_version_jurisdiction" AS ENUM('municipal', 'county', 'state', 'school_district', 'other');
  CREATE TYPE "public"."enum__places_v_version_ward" AS ENUM('north', 'south', 'east', 'west');
  CREATE TYPE "public"."enum__places_v_version_workflow_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'archived');
  CREATE TYPE "public"."enum__places_v_version_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_departments_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_officials_ward" AS ENUM('north', 'south', 'east', 'west', 'at-large');
  CREATE TYPE "public"."enum_officials_verification_status" AS ENUM('unverified', 'verified', 'needs_review', 'demo');
  CREATE TYPE "public"."enum_service_requests_category" AS ENUM('pothole', 'streetlight', 'trash', 'sidewalk', 'tree', 'other');
  CREATE TYPE "public"."enum_service_requests_status" AS ENUM('received', 'routed', 'in_progress', 'resolved', 'closed');
  CREATE TYPE "public"."enum_subscriptions_topic_type" AS ENUM('notices', 'meetings', 'project');
  CREATE TYPE "public"."enum_subscriptions_status" AS ENUM('pending', 'confirmed', 'unsubscribed', 'suppressed');
  CREATE TYPE "public"."enum_outbox_status" AS ENUM('pending', 'sending', 'sent', 'failed', 'suppressed');
  CREATE TYPE "public"."enum_source_records_owner_type" AS ENUM('official', 'government', 'third_party', 'campaign');
  CREATE TYPE "public"."enum_source_records_status" AS ENUM('captured', 'verified', 'discrepancy', 'inaccessible', 'excluded');
  CREATE TYPE "public"."enum_redirects_status_code" AS ENUM('301', '302', '410');
  CREATE TYPE "public"."enum_users_roles" AS ENUM('contributor', 'department_reviewer', 'publisher', 'records_clerk', 'data_manager', 'administrator');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'publicationSweep', 'deliverOutbox', 'reconcileSearch', 'importBatch');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'publicationSweep', 'deliverOutbox', 'reconcileSearch', 'importBatch');
  CREATE TABLE "services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"category" "enum_services_category" NOT NULL,
  	"shortcut" boolean DEFAULT false,
  	"external_url" varchar,
  	"external_system_name" varchar,
  	"department_id" integer,
  	"workflow_status" "enum_services_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_services_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "services_locales" (
  	"title" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "services_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "_services_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar NOT NULL,
  	"version_category" "enum__services_v_version_category" NOT NULL,
  	"version_shortcut" boolean DEFAULT false,
  	"version_external_url" varchar,
  	"version_external_system_name" varchar,
  	"version_department_id" integer,
  	"version_workflow_status" "enum__services_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__services_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_services_v_locales" (
  	"version_title" varchar NOT NULL,
  	"version_summary" varchar NOT NULL,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "notices_wards" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_notices_wards",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "notices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "enum_notices_kind" DEFAULT 'general' NOT NULL,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"department_id" integer,
  	"workflow_status" "enum_notices_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_notices_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notices_locales" (
  	"title" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "notices_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "_notices_v_version_wards" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__notices_v_version_wards",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_notices_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar NOT NULL,
  	"version_kind" "enum__notices_v_version_kind" DEFAULT 'general' NOT NULL,
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_department_id" integer,
  	"version_workflow_status" "enum__notices_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__notices_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_notices_v_locales" (
  	"version_title" varchar NOT NULL,
  	"version_summary" varchar NOT NULL,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_notices_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone,
  	"location" varchar,
  	"department_id" integer,
  	"workflow_status" "enum_events_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_events_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_locales" (
  	"title" varchar NOT NULL,
  	"summary" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar NOT NULL,
  	"version_starts_at" timestamp(3) with time zone NOT NULL,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_location" varchar,
  	"version_department_id" integer,
  	"version_workflow_status" "enum__events_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__events_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_events_v_locales" (
  	"version_title" varchar NOT NULL,
  	"version_summary" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "seasonal_features_audience_wards" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_seasonal_features_audience_wards",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "seasonal_features" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_url" varchar,
  	"image_id" integer,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone NOT NULL,
  	"priority" numeric DEFAULT 0,
  	"approved_source" varchar NOT NULL,
  	"department_id" integer,
  	"workflow_status" "enum_seasonal_features_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_seasonal_features_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "seasonal_features_locales" (
  	"title" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_seasonal_features_v_version_audience_wards" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__seasonal_features_v_version_audience_wards",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_seasonal_features_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_link_url" varchar,
  	"version_image_id" integer,
  	"version_starts_at" timestamp(3) with time zone NOT NULL,
  	"version_ends_at" timestamp(3) with time zone NOT NULL,
  	"version_priority" numeric DEFAULT 0,
  	"version_approved_source" varchar NOT NULL,
  	"version_department_id" integer,
  	"version_workflow_status" "enum__seasonal_features_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__seasonal_features_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_seasonal_features_v_locales" (
  	"version_title" varchar NOT NULL,
  	"version_message" varchar NOT NULL,
  	"version_link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"credit" varchar,
  	"rights_holder" varchar NOT NULL,
  	"license" varchar NOT NULL,
  	"source_url" varchar,
  	"location" varchar,
  	"location_verified" boolean DEFAULT false,
  	"is_generated" boolean DEFAULT false,
  	"approval_status" "enum_media_approval_status" DEFAULT 'pending' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "meetings_agenda_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"video_seconds" numeric
  );
  
  CREATE TABLE "meetings_minutes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"version_label" varchar NOT NULL,
  	"status" "enum_meetings_minutes_status" DEFAULT 'draft' NOT NULL,
  	"approved_on" timestamp(3) with time zone,
  	"text" jsonb
  );
  
  CREATE TABLE "meetings_transcript" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"seconds" numeric NOT NULL,
  	"speaker" varchar,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "meetings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"body" "enum_meetings_body" DEFAULT 'city_council' NOT NULL,
  	"meeting_type" "enum_meetings_meeting_type" DEFAULT 'regular' NOT NULL,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"location" varchar NOT NULL,
  	"participation" varchar,
  	"meeting_status" "enum_meetings_meeting_status" DEFAULT 'scheduled',
  	"video_url" varchar,
  	"workflow_status" "enum_meetings_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_meetings_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "meetings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"legislation_id" integer,
  	"media_id" integer,
  	"source_records_id" integer
  );
  
  CREATE TABLE "_meetings_v_version_agenda_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"video_seconds" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_meetings_v_version_minutes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_label" varchar NOT NULL,
  	"status" "enum__meetings_v_version_minutes_status" DEFAULT 'draft' NOT NULL,
  	"approved_on" timestamp(3) with time zone,
  	"text" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_meetings_v_version_transcript" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"seconds" numeric NOT NULL,
  	"speaker" varchar,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_meetings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_body" "enum__meetings_v_version_body" DEFAULT 'city_council' NOT NULL,
  	"version_meeting_type" "enum__meetings_v_version_meeting_type" DEFAULT 'regular' NOT NULL,
  	"version_starts_at" timestamp(3) with time zone NOT NULL,
  	"version_location" varchar NOT NULL,
  	"version_participation" varchar,
  	"version_meeting_status" "enum__meetings_v_version_meeting_status" DEFAULT 'scheduled',
  	"version_video_url" varchar,
  	"version_workflow_status" "enum__meetings_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__meetings_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_meetings_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"legislation_id" integer,
  	"media_id" integer,
  	"source_records_id" integer
  );
  
  CREATE TABLE "legislation_sponsors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"verified" boolean DEFAULT false
  );
  
  CREATE TABLE "legislation_text_versions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"date" timestamp(3) with time zone,
  	"text" varchar NOT NULL,
  	"reviewed_against_original" boolean DEFAULT false,
  	"original_id" integer
  );
  
  CREATE TABLE "legislation_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"action" "enum_legislation_actions_action" NOT NULL,
  	"meeting_id" integer,
  	"vote_id" integer,
  	"note" varchar,
  	"evidence_url" varchar
  );
  
  CREATE TABLE "legislation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"identifier" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"type" "enum_legislation_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"summary" varchar,
  	"current_status" "enum_legislation_current_status",
  	"effective_date" timestamp(3) with time zone,
  	"workflow_status" "enum_legislation_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_legislation_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "legislation_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "_legislation_v_version_sponsors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"verified" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_legislation_v_version_text_versions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"date" timestamp(3) with time zone,
  	"text" varchar NOT NULL,
  	"reviewed_against_original" boolean DEFAULT false,
  	"original_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_legislation_v_version_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"action" "enum__legislation_v_version_actions_action" NOT NULL,
  	"meeting_id" integer,
  	"vote_id" integer,
  	"note" varchar,
  	"evidence_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_legislation_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_identifier" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_type" "enum__legislation_v_version_type" NOT NULL,
  	"version_title" varchar NOT NULL,
  	"version_summary" varchar,
  	"version_current_status" "enum__legislation_v_version_current_status",
  	"version_effective_date" timestamp(3) with time zone,
  	"version_workflow_status" "enum__legislation_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__legislation_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_legislation_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "votes_entries" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"member" varchar NOT NULL,
  	"official_id" integer,
  	"vote" "enum_votes_entries_vote" NOT NULL
  );
  
  CREATE TABLE "votes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"meeting_id" integer NOT NULL,
  	"legislation_id" integer,
  	"motion" varchar NOT NULL,
  	"result" "enum_votes_result" NOT NULL,
  	"yes_count" numeric,
  	"no_count" numeric,
  	"abstain_count" numeric,
  	"absent_count" numeric,
  	"workflow_status" "enum_votes_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_votes_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_votes_v_version_entries" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"member" varchar NOT NULL,
  	"official_id" integer,
  	"vote" "enum__votes_v_version_entries_vote" NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_votes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_meeting_id" integer NOT NULL,
  	"version_legislation_id" integer,
  	"version_motion" varchar NOT NULL,
  	"version_result" "enum__votes_v_version_result" NOT NULL,
  	"version_yes_count" numeric,
  	"version_no_count" numeric,
  	"version_abstain_count" numeric,
  	"version_absent_count" numeric,
  	"version_workflow_status" "enum__votes_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__votes_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "projects_wards" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_projects_wards",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "projects_streets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"limits" varchar
  );
  
  CREATE TABLE "projects_funding" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" varchar NOT NULL,
  	"amount_cents" numeric,
  	"status" "enum_projects_funding_status" NOT NULL,
  	"evidence_url" varchar
  );
  
  CREATE TABLE "projects_milestones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_projects_milestones_kind" NOT NULL,
  	"label" varchar,
  	"planned_date" timestamp(3) with time zone,
  	"actual_date" timestamp(3) with time zone,
  	"evidence_url" varchar
  );
  
  CREATE TABLE "projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"project_type" "enum_projects_project_type" NOT NULL,
  	"phase" "enum_projects_phase" DEFAULT 'planned' NOT NULL,
  	"program_year" numeric,
  	"scope" varchar NOT NULL,
  	"agency" varchar,
  	"contact" varchar,
  	"cost_estimated_cents" numeric,
  	"cost_awarded_cents" numeric,
  	"cost_actual_cents" numeric,
  	"cost_basis" varchar,
  	"impacts" varchar,
  	"geometry_note" varchar,
  	"workflow_status" "enum_projects_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_projects_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "projects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"source_records_id" integer
  );
  
  CREATE TABLE "_projects_v_version_wards" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__projects_v_version_wards",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_projects_v_version_streets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"limits" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_funding" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" varchar NOT NULL,
  	"amount_cents" numeric,
  	"status" "enum__projects_v_version_funding_status" NOT NULL,
  	"evidence_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v_version_milestones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__projects_v_version_milestones_kind" NOT NULL,
  	"label" varchar,
  	"planned_date" timestamp(3) with time zone,
  	"actual_date" timestamp(3) with time zone,
  	"evidence_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_projects_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_project_type" "enum__projects_v_version_project_type" NOT NULL,
  	"version_phase" "enum__projects_v_version_phase" DEFAULT 'planned' NOT NULL,
  	"version_program_year" numeric,
  	"version_scope" varchar NOT NULL,
  	"version_agency" varchar,
  	"version_contact" varchar,
  	"version_cost_estimated_cents" numeric,
  	"version_cost_awarded_cents" numeric,
  	"version_cost_actual_cents" numeric,
  	"version_cost_basis" varchar,
  	"version_impacts" varchar,
  	"version_geometry_note" varchar,
  	"version_workflow_status" "enum__projects_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__projects_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_projects_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"source_records_id" integer
  );
  
  CREATE TABLE "project_updates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"body" varchar NOT NULL,
  	"department_id" integer,
  	"workflow_status" "enum_project_updates_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_project_updates_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_project_updates_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_project_id" integer NOT NULL,
  	"version_title" varchar NOT NULL,
  	"version_date" timestamp(3) with time zone NOT NULL,
  	"version_body" varchar NOT NULL,
  	"version_department_id" integer,
  	"version_workflow_status" "enum__project_updates_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__project_updates_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "budget_datasets_corrections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"note" varchar NOT NULL
  );
  
  CREATE TABLE "budget_datasets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"fiscal_year" numeric NOT NULL,
  	"basis" "enum_budget_datasets_basis" NOT NULL,
  	"kind" "enum_budget_datasets_kind" NOT NULL,
  	"units" varchar DEFAULT 'US dollars (nominal)' NOT NULL,
  	"source_description" varchar NOT NULL,
  	"data_updated_at" timestamp(3) with time zone NOT NULL,
  	"definitions" varchar,
  	"workflow_status" "enum_budget_datasets_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_budget_datasets_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "budget_datasets_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "_budget_datasets_v_version_corrections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"note" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_budget_datasets_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_fiscal_year" numeric NOT NULL,
  	"version_basis" "enum__budget_datasets_v_version_basis" NOT NULL,
  	"version_kind" "enum__budget_datasets_v_version_kind" NOT NULL,
  	"version_units" varchar DEFAULT 'US dollars (nominal)' NOT NULL,
  	"version_source_description" varchar NOT NULL,
  	"version_data_updated_at" timestamp(3) with time zone NOT NULL,
  	"version_definitions" varchar,
  	"version_workflow_status" "enum__budget_datasets_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__budget_datasets_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_budget_datasets_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "budget_lines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dataset_id" integer NOT NULL,
  	"row_key" varchar NOT NULL,
  	"direction" "enum_budget_lines_direction" DEFAULT 'expenditure' NOT NULL,
  	"fund" varchar NOT NULL,
  	"department" varchar,
  	"category" "enum_budget_lines_category" NOT NULL,
  	"account" varchar,
  	"description" varchar NOT NULL,
  	"amount_cents" numeric,
  	"import_batch_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_batches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "enum_import_batches_kind" DEFAULT 'budget-lines' NOT NULL,
  	"dataset_id" integer NOT NULL,
  	"source_id" integer NOT NULL,
  	"mapping" jsonb DEFAULT '{"fund":"Fund","department":"Department","category":"Category","account":"Account","description":"Description","amount":"Amount","direction":"Direction"}'::jsonb NOT NULL,
  	"requested_action" "enum_import_batches_requested_action" DEFAULT 'none',
  	"status" "enum_import_batches_status" DEFAULT 'uploaded',
  	"report" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "wards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" "enum_wards_slug" NOT NULL,
  	"summary" varchar,
  	"verification_status" "enum_wards_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wards_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"officials_id" integer,
  	"source_records_id" integer
  );
  
  CREATE TABLE "places" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "enum_places_kind" NOT NULL,
  	"jurisdiction" "enum_places_jurisdiction" NOT NULL,
  	"address" varchar,
  	"summary" varchar,
  	"history" varchar,
  	"latitude" numeric,
  	"longitude" numeric,
  	"ward" "enum_places_ward",
  	"photo_id" integer,
  	"workflow_status" "enum_places_workflow_status" DEFAULT 'draft' NOT NULL,
  	"publish_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"emergency_publish" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"verification_status" "enum_places_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "places_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "_places_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar NOT NULL,
  	"version_slug" varchar NOT NULL,
  	"version_kind" "enum__places_v_version_kind" NOT NULL,
  	"version_jurisdiction" "enum__places_v_version_jurisdiction" NOT NULL,
  	"version_address" varchar,
  	"version_summary" varchar,
  	"version_history" varchar,
  	"version_latitude" numeric,
  	"version_longitude" numeric,
  	"version_ward" "enum__places_v_version_ward",
  	"version_photo_id" integer,
  	"version_workflow_status" "enum__places_v_version_workflow_status" DEFAULT 'draft' NOT NULL,
  	"version_publish_at" timestamp(3) with time zone,
  	"version_expires_at" timestamp(3) with time zone,
  	"version_emergency_publish" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_verification_status" "enum__places_v_version_verification_status" DEFAULT 'unverified' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_places_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "departments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"phone" varchar,
  	"email" varchar,
  	"address" varchar,
  	"hours" varchar,
  	"official_url" varchar,
  	"verification_status" "enum_departments_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "departments_locales" (
  	"name" varchar NOT NULL,
  	"summary" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "departments_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "officials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"office" varchar NOT NULL,
  	"ward" "enum_officials_ward",
  	"term_start" timestamp(3) with time zone,
  	"term_end" timestamp(3) with time zone,
  	"contact_url" varchar,
  	"verification_status" "enum_officials_verification_status" DEFAULT 'unverified' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "officials_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"source_records_id" integer
  );
  
  CREATE TABLE "service_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar NOT NULL,
  	"category" "enum_service_requests_category" NOT NULL,
  	"description" varchar NOT NULL,
  	"location_text" varchar NOT NULL,
  	"contact_name" varchar,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"status" "enum_service_requests_status" DEFAULT 'received',
  	"department_id" integer,
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"topic_type" "enum_subscriptions_topic_type" NOT NULL,
  	"topic_id" varchar DEFAULT '*' NOT NULL,
  	"status" "enum_subscriptions_status" DEFAULT 'pending' NOT NULL,
  	"confirmed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "outbox" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dedupe_key" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"subject" varchar NOT NULL,
  	"text" varchar NOT NULL,
  	"status" "enum_outbox_status" DEFAULT 'pending' NOT NULL,
  	"attempts" numeric DEFAULT 0,
  	"next_attempt_at" timestamp(3) with time zone,
  	"provider_message_id" varchar,
  	"last_error" varchar,
  	"sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "source_records" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"url" varchar,
  	"owner" varchar NOT NULL,
  	"owner_type" "enum_source_records_owner_type" NOT NULL,
  	"retrieved_at" timestamp(3) with time zone NOT NULL,
  	"checksum_sha256" varchar,
  	"status" "enum_source_records_status" DEFAULT 'captured' NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"status_code" "enum_redirects_status_code" DEFAULT '301',
  	"source_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" varchar NOT NULL,
  	"target_collection" varchar,
  	"target_id" varchar,
  	"actor_id" integer,
  	"actor_email" varchar,
  	"emergency" boolean,
  	"detail" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"can_emergency_publish" boolean DEFAULT false,
  	"identity_provider_subject" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"departments_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer,
  	"notices_id" integer,
  	"events_id" integer,
  	"seasonal_features_id" integer,
  	"media_id" integer,
  	"meetings_id" integer,
  	"legislation_id" integer,
  	"votes_id" integer,
  	"projects_id" integer,
  	"project_updates_id" integer,
  	"budget_datasets_id" integer,
  	"budget_lines_id" integer,
  	"import_batches_id" integer,
  	"wards_id" integer,
  	"places_id" integer,
  	"departments_id" integer,
  	"officials_id" integer,
  	"service_requests_id" integer,
  	"subscriptions_id" integer,
  	"outbox_id" integer,
  	"source_records_id" integer,
  	"redirects_id" integer,
  	"audit_events_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "services" ADD CONSTRAINT "services_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_parent_id_services_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_department_id_departments_id_fk" FOREIGN KEY ("version_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "notices_wards" ADD CONSTRAINT "notices_wards_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "notices" ADD CONSTRAINT "notices_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notices_locales" ADD CONSTRAINT "notices_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "notices_rels" ADD CONSTRAINT "notices_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "notices_rels" ADD CONSTRAINT "notices_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_notices_v_version_wards" ADD CONSTRAINT "_notices_v_version_wards_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_notices_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_notices_v" ADD CONSTRAINT "_notices_v_parent_id_notices_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."notices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_notices_v" ADD CONSTRAINT "_notices_v_version_department_id_departments_id_fk" FOREIGN KEY ("version_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_notices_v_locales" ADD CONSTRAINT "_notices_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_notices_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_notices_v_rels" ADD CONSTRAINT "_notices_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_notices_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_notices_v_rels" ADD CONSTRAINT "_notices_v_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_locales" ADD CONSTRAINT "events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_department_id_departments_id_fk" FOREIGN KEY ("version_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_locales" ADD CONSTRAINT "_events_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "seasonal_features_audience_wards" ADD CONSTRAINT "seasonal_features_audience_wards_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."seasonal_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "seasonal_features" ADD CONSTRAINT "seasonal_features_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "seasonal_features" ADD CONSTRAINT "seasonal_features_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "seasonal_features_locales" ADD CONSTRAINT "seasonal_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."seasonal_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_seasonal_features_v_version_audience_wards" ADD CONSTRAINT "_seasonal_features_v_version_audience_wards_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_seasonal_features_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_seasonal_features_v" ADD CONSTRAINT "_seasonal_features_v_parent_id_seasonal_features_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."seasonal_features"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_seasonal_features_v" ADD CONSTRAINT "_seasonal_features_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_seasonal_features_v" ADD CONSTRAINT "_seasonal_features_v_version_department_id_departments_id_fk" FOREIGN KEY ("version_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_seasonal_features_v_locales" ADD CONSTRAINT "_seasonal_features_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_seasonal_features_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meetings_agenda_items" ADD CONSTRAINT "meetings_agenda_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meetings_minutes" ADD CONSTRAINT "meetings_minutes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meetings_transcript" ADD CONSTRAINT "meetings_transcript_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meetings_rels" ADD CONSTRAINT "meetings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meetings_rels" ADD CONSTRAINT "meetings_rels_legislation_fk" FOREIGN KEY ("legislation_id") REFERENCES "public"."legislation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meetings_rels" ADD CONSTRAINT "meetings_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meetings_rels" ADD CONSTRAINT "meetings_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_meetings_v_version_agenda_items" ADD CONSTRAINT "_meetings_v_version_agenda_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_meetings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_meetings_v_version_minutes" ADD CONSTRAINT "_meetings_v_version_minutes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_meetings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_meetings_v_version_transcript" ADD CONSTRAINT "_meetings_v_version_transcript_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_meetings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_meetings_v" ADD CONSTRAINT "_meetings_v_parent_id_meetings_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_meetings_v_rels" ADD CONSTRAINT "_meetings_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_meetings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_meetings_v_rels" ADD CONSTRAINT "_meetings_v_rels_legislation_fk" FOREIGN KEY ("legislation_id") REFERENCES "public"."legislation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_meetings_v_rels" ADD CONSTRAINT "_meetings_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_meetings_v_rels" ADD CONSTRAINT "_meetings_v_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legislation_sponsors" ADD CONSTRAINT "legislation_sponsors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legislation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legislation_text_versions" ADD CONSTRAINT "legislation_text_versions_original_id_media_id_fk" FOREIGN KEY ("original_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "legislation_text_versions" ADD CONSTRAINT "legislation_text_versions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legislation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legislation_actions" ADD CONSTRAINT "legislation_actions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "legislation_actions" ADD CONSTRAINT "legislation_actions_vote_id_votes_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "legislation_actions" ADD CONSTRAINT "legislation_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legislation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legislation_rels" ADD CONSTRAINT "legislation_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."legislation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legislation_rels" ADD CONSTRAINT "legislation_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legislation_v_version_sponsors" ADD CONSTRAINT "_legislation_v_version_sponsors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_legislation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legislation_v_version_text_versions" ADD CONSTRAINT "_legislation_v_version_text_versions_original_id_media_id_fk" FOREIGN KEY ("original_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legislation_v_version_text_versions" ADD CONSTRAINT "_legislation_v_version_text_versions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_legislation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legislation_v_version_actions" ADD CONSTRAINT "_legislation_v_version_actions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legislation_v_version_actions" ADD CONSTRAINT "_legislation_v_version_actions_vote_id_votes_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legislation_v_version_actions" ADD CONSTRAINT "_legislation_v_version_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_legislation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legislation_v" ADD CONSTRAINT "_legislation_v_parent_id_legislation_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."legislation"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legislation_v_rels" ADD CONSTRAINT "_legislation_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_legislation_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legislation_v_rels" ADD CONSTRAINT "_legislation_v_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "votes_entries" ADD CONSTRAINT "votes_entries_official_id_officials_id_fk" FOREIGN KEY ("official_id") REFERENCES "public"."officials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "votes_entries" ADD CONSTRAINT "votes_entries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."votes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "votes" ADD CONSTRAINT "votes_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "votes" ADD CONSTRAINT "votes_legislation_id_legislation_id_fk" FOREIGN KEY ("legislation_id") REFERENCES "public"."legislation"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_votes_v_version_entries" ADD CONSTRAINT "_votes_v_version_entries_official_id_officials_id_fk" FOREIGN KEY ("official_id") REFERENCES "public"."officials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_votes_v_version_entries" ADD CONSTRAINT "_votes_v_version_entries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_votes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_votes_v" ADD CONSTRAINT "_votes_v_parent_id_votes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."votes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_votes_v" ADD CONSTRAINT "_votes_v_version_meeting_id_meetings_id_fk" FOREIGN KEY ("version_meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_votes_v" ADD CONSTRAINT "_votes_v_version_legislation_id_legislation_id_fk" FOREIGN KEY ("version_legislation_id") REFERENCES "public"."legislation"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_wards" ADD CONSTRAINT "projects_wards_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_streets" ADD CONSTRAINT "projects_streets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_funding" ADD CONSTRAINT "projects_funding_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_milestones" ADD CONSTRAINT "projects_milestones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_wards" ADD CONSTRAINT "_projects_v_version_wards_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_streets" ADD CONSTRAINT "_projects_v_version_streets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_funding" ADD CONSTRAINT "_projects_v_version_funding_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_version_milestones" ADD CONSTRAINT "_projects_v_version_milestones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_parent_id_projects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_project_updates_v" ADD CONSTRAINT "_project_updates_v_parent_id_project_updates_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."project_updates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_project_updates_v" ADD CONSTRAINT "_project_updates_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_project_updates_v" ADD CONSTRAINT "_project_updates_v_version_department_id_departments_id_fk" FOREIGN KEY ("version_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "budget_datasets_corrections" ADD CONSTRAINT "budget_datasets_corrections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."budget_datasets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "budget_datasets_rels" ADD CONSTRAINT "budget_datasets_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."budget_datasets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "budget_datasets_rels" ADD CONSTRAINT "budget_datasets_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_budget_datasets_v_version_corrections" ADD CONSTRAINT "_budget_datasets_v_version_corrections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_budget_datasets_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_budget_datasets_v" ADD CONSTRAINT "_budget_datasets_v_parent_id_budget_datasets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."budget_datasets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_budget_datasets_v_rels" ADD CONSTRAINT "_budget_datasets_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_budget_datasets_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_budget_datasets_v_rels" ADD CONSTRAINT "_budget_datasets_v_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_dataset_id_budget_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."budget_datasets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_dataset_id_budget_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."budget_datasets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_source_id_source_records_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source_records"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wards_rels" ADD CONSTRAINT "wards_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."wards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wards_rels" ADD CONSTRAINT "wards_rels_officials_fk" FOREIGN KEY ("officials_id") REFERENCES "public"."officials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wards_rels" ADD CONSTRAINT "wards_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places" ADD CONSTRAINT "places_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "places_rels" ADD CONSTRAINT "places_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places_rels" ADD CONSTRAINT "places_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v" ADD CONSTRAINT "_places_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_places_v_rels" ADD CONSTRAINT "_places_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_places_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_places_v_rels" ADD CONSTRAINT "_places_v_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departments_locales" ADD CONSTRAINT "departments_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departments_rels" ADD CONSTRAINT "departments_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departments_rels" ADD CONSTRAINT "departments_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "officials_rels" ADD CONSTRAINT "officials_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."officials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "officials_rels" ADD CONSTRAINT "officials_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_departments_fk" FOREIGN KEY ("departments_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notices_fk" FOREIGN KEY ("notices_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_seasonal_features_fk" FOREIGN KEY ("seasonal_features_id") REFERENCES "public"."seasonal_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_meetings_fk" FOREIGN KEY ("meetings_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legislation_fk" FOREIGN KEY ("legislation_id") REFERENCES "public"."legislation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_votes_fk" FOREIGN KEY ("votes_id") REFERENCES "public"."votes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_updates_fk" FOREIGN KEY ("project_updates_id") REFERENCES "public"."project_updates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_budget_datasets_fk" FOREIGN KEY ("budget_datasets_id") REFERENCES "public"."budget_datasets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_budget_lines_fk" FOREIGN KEY ("budget_lines_id") REFERENCES "public"."budget_lines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_batches_fk" FOREIGN KEY ("import_batches_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wards_fk" FOREIGN KEY ("wards_id") REFERENCES "public"."wards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_departments_fk" FOREIGN KEY ("departments_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_officials_fk" FOREIGN KEY ("officials_id") REFERENCES "public"."officials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_service_requests_fk" FOREIGN KEY ("service_requests_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscriptions_fk" FOREIGN KEY ("subscriptions_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_outbox_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."outbox"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_source_records_fk" FOREIGN KEY ("source_records_id") REFERENCES "public"."source_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_events_fk" FOREIGN KEY ("audit_events_id") REFERENCES "public"."audit_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "services_slug_idx" ON "services" USING btree ("slug");
  CREATE INDEX "services_department_idx" ON "services" USING btree ("department_id");
  CREATE INDEX "services_workflow_status_idx" ON "services" USING btree ("workflow_status");
  CREATE INDEX "services_expires_at_idx" ON "services" USING btree ("expires_at");
  CREATE INDEX "services_updated_at_idx" ON "services" USING btree ("updated_at");
  CREATE INDEX "services_created_at_idx" ON "services" USING btree ("created_at");
  CREATE UNIQUE INDEX "services_locales_locale_parent_id_unique" ON "services_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_locales_parent_id_idx" ON "services_locales" USING btree ("_parent_id");
  CREATE INDEX "services_rels_order_idx" ON "services_rels" USING btree ("order");
  CREATE INDEX "services_rels_parent_idx" ON "services_rels" USING btree ("parent_id");
  CREATE INDEX "services_rels_path_idx" ON "services_rels" USING btree ("path");
  CREATE INDEX "services_rels_source_records_id_idx" ON "services_rels" USING btree ("source_records_id");
  CREATE INDEX "_services_v_parent_idx" ON "_services_v" USING btree ("parent_id");
  CREATE INDEX "_services_v_version_version_slug_idx" ON "_services_v" USING btree ("version_slug");
  CREATE INDEX "_services_v_version_version_department_idx" ON "_services_v" USING btree ("version_department_id");
  CREATE INDEX "_services_v_version_version_workflow_status_idx" ON "_services_v" USING btree ("version_workflow_status");
  CREATE INDEX "_services_v_version_version_expires_at_idx" ON "_services_v" USING btree ("version_expires_at");
  CREATE INDEX "_services_v_version_version_updated_at_idx" ON "_services_v" USING btree ("version_updated_at");
  CREATE INDEX "_services_v_version_version_created_at_idx" ON "_services_v" USING btree ("version_created_at");
  CREATE INDEX "_services_v_created_at_idx" ON "_services_v" USING btree ("created_at");
  CREATE INDEX "_services_v_updated_at_idx" ON "_services_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_services_v_locales_locale_parent_id_unique" ON "_services_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_locales_parent_id_idx" ON "_services_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_services_v_rels_order_idx" ON "_services_v_rels" USING btree ("order");
  CREATE INDEX "_services_v_rels_parent_idx" ON "_services_v_rels" USING btree ("parent_id");
  CREATE INDEX "_services_v_rels_path_idx" ON "_services_v_rels" USING btree ("path");
  CREATE INDEX "_services_v_rels_source_records_id_idx" ON "_services_v_rels" USING btree ("source_records_id");
  CREATE INDEX "notices_wards_order_idx" ON "notices_wards" USING btree ("order");
  CREATE INDEX "notices_wards_parent_idx" ON "notices_wards" USING btree ("parent_id");
  CREATE UNIQUE INDEX "notices_slug_idx" ON "notices" USING btree ("slug");
  CREATE INDEX "notices_department_idx" ON "notices" USING btree ("department_id");
  CREATE INDEX "notices_workflow_status_idx" ON "notices" USING btree ("workflow_status");
  CREATE INDEX "notices_expires_at_idx" ON "notices" USING btree ("expires_at");
  CREATE INDEX "notices_updated_at_idx" ON "notices" USING btree ("updated_at");
  CREATE INDEX "notices_created_at_idx" ON "notices" USING btree ("created_at");
  CREATE UNIQUE INDEX "notices_locales_locale_parent_id_unique" ON "notices_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "notices_locales_parent_id_idx" ON "notices_locales" USING btree ("_parent_id");
  CREATE INDEX "notices_rels_order_idx" ON "notices_rels" USING btree ("order");
  CREATE INDEX "notices_rels_parent_idx" ON "notices_rels" USING btree ("parent_id");
  CREATE INDEX "notices_rels_path_idx" ON "notices_rels" USING btree ("path");
  CREATE INDEX "notices_rels_source_records_id_idx" ON "notices_rels" USING btree ("source_records_id");
  CREATE INDEX "_notices_v_version_wards_order_idx" ON "_notices_v_version_wards" USING btree ("order");
  CREATE INDEX "_notices_v_version_wards_parent_idx" ON "_notices_v_version_wards" USING btree ("parent_id");
  CREATE INDEX "_notices_v_parent_idx" ON "_notices_v" USING btree ("parent_id");
  CREATE INDEX "_notices_v_version_version_slug_idx" ON "_notices_v" USING btree ("version_slug");
  CREATE INDEX "_notices_v_version_version_department_idx" ON "_notices_v" USING btree ("version_department_id");
  CREATE INDEX "_notices_v_version_version_workflow_status_idx" ON "_notices_v" USING btree ("version_workflow_status");
  CREATE INDEX "_notices_v_version_version_expires_at_idx" ON "_notices_v" USING btree ("version_expires_at");
  CREATE INDEX "_notices_v_version_version_updated_at_idx" ON "_notices_v" USING btree ("version_updated_at");
  CREATE INDEX "_notices_v_version_version_created_at_idx" ON "_notices_v" USING btree ("version_created_at");
  CREATE INDEX "_notices_v_created_at_idx" ON "_notices_v" USING btree ("created_at");
  CREATE INDEX "_notices_v_updated_at_idx" ON "_notices_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_notices_v_locales_locale_parent_id_unique" ON "_notices_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_notices_v_locales_parent_id_idx" ON "_notices_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_notices_v_rels_order_idx" ON "_notices_v_rels" USING btree ("order");
  CREATE INDEX "_notices_v_rels_parent_idx" ON "_notices_v_rels" USING btree ("parent_id");
  CREATE INDEX "_notices_v_rels_path_idx" ON "_notices_v_rels" USING btree ("path");
  CREATE INDEX "_notices_v_rels_source_records_id_idx" ON "_notices_v_rels" USING btree ("source_records_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_department_idx" ON "events" USING btree ("department_id");
  CREATE INDEX "events_workflow_status_idx" ON "events" USING btree ("workflow_status");
  CREATE INDEX "events_expires_at_idx" ON "events" USING btree ("expires_at");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE UNIQUE INDEX "events_locales_locale_parent_id_unique" ON "events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_locales_parent_id_idx" ON "events_locales" USING btree ("_parent_id");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_department_idx" ON "_events_v" USING btree ("version_department_id");
  CREATE INDEX "_events_v_version_version_workflow_status_idx" ON "_events_v" USING btree ("version_workflow_status");
  CREATE INDEX "_events_v_version_version_expires_at_idx" ON "_events_v" USING btree ("version_expires_at");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_events_v_locales_locale_parent_id_unique" ON "_events_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_events_v_locales_parent_id_idx" ON "_events_v_locales" USING btree ("_parent_id");
  CREATE INDEX "seasonal_features_audience_wards_order_idx" ON "seasonal_features_audience_wards" USING btree ("order");
  CREATE INDEX "seasonal_features_audience_wards_parent_idx" ON "seasonal_features_audience_wards" USING btree ("parent_id");
  CREATE INDEX "seasonal_features_image_idx" ON "seasonal_features" USING btree ("image_id");
  CREATE INDEX "seasonal_features_department_idx" ON "seasonal_features" USING btree ("department_id");
  CREATE INDEX "seasonal_features_workflow_status_idx" ON "seasonal_features" USING btree ("workflow_status");
  CREATE INDEX "seasonal_features_expires_at_idx" ON "seasonal_features" USING btree ("expires_at");
  CREATE INDEX "seasonal_features_updated_at_idx" ON "seasonal_features" USING btree ("updated_at");
  CREATE INDEX "seasonal_features_created_at_idx" ON "seasonal_features" USING btree ("created_at");
  CREATE UNIQUE INDEX "seasonal_features_locales_locale_parent_id_unique" ON "seasonal_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "seasonal_features_locales_parent_id_idx" ON "seasonal_features_locales" USING btree ("_parent_id");
  CREATE INDEX "_seasonal_features_v_version_audience_wards_order_idx" ON "_seasonal_features_v_version_audience_wards" USING btree ("order");
  CREATE INDEX "_seasonal_features_v_version_audience_wards_parent_idx" ON "_seasonal_features_v_version_audience_wards" USING btree ("parent_id");
  CREATE INDEX "_seasonal_features_v_parent_idx" ON "_seasonal_features_v" USING btree ("parent_id");
  CREATE INDEX "_seasonal_features_v_version_version_image_idx" ON "_seasonal_features_v" USING btree ("version_image_id");
  CREATE INDEX "_seasonal_features_v_version_version_department_idx" ON "_seasonal_features_v" USING btree ("version_department_id");
  CREATE INDEX "_seasonal_features_v_version_version_workflow_status_idx" ON "_seasonal_features_v" USING btree ("version_workflow_status");
  CREATE INDEX "_seasonal_features_v_version_version_expires_at_idx" ON "_seasonal_features_v" USING btree ("version_expires_at");
  CREATE INDEX "_seasonal_features_v_version_version_updated_at_idx" ON "_seasonal_features_v" USING btree ("version_updated_at");
  CREATE INDEX "_seasonal_features_v_version_version_created_at_idx" ON "_seasonal_features_v" USING btree ("version_created_at");
  CREATE INDEX "_seasonal_features_v_created_at_idx" ON "_seasonal_features_v" USING btree ("created_at");
  CREATE INDEX "_seasonal_features_v_updated_at_idx" ON "_seasonal_features_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "_seasonal_features_v_locales_locale_parent_id_unique" ON "_seasonal_features_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_seasonal_features_v_locales_parent_id_idx" ON "_seasonal_features_v_locales" USING btree ("_parent_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "meetings_agenda_items_order_idx" ON "meetings_agenda_items" USING btree ("_order");
  CREATE INDEX "meetings_agenda_items_parent_id_idx" ON "meetings_agenda_items" USING btree ("_parent_id");
  CREATE INDEX "meetings_minutes_order_idx" ON "meetings_minutes" USING btree ("_order");
  CREATE INDEX "meetings_minutes_parent_id_idx" ON "meetings_minutes" USING btree ("_parent_id");
  CREATE INDEX "meetings_transcript_order_idx" ON "meetings_transcript" USING btree ("_order");
  CREATE INDEX "meetings_transcript_parent_id_idx" ON "meetings_transcript" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "meetings_slug_idx" ON "meetings" USING btree ("slug");
  CREATE INDEX "meetings_starts_at_idx" ON "meetings" USING btree ("starts_at");
  CREATE INDEX "meetings_workflow_status_idx" ON "meetings" USING btree ("workflow_status");
  CREATE INDEX "meetings_expires_at_idx" ON "meetings" USING btree ("expires_at");
  CREATE INDEX "meetings_updated_at_idx" ON "meetings" USING btree ("updated_at");
  CREATE INDEX "meetings_created_at_idx" ON "meetings" USING btree ("created_at");
  CREATE INDEX "meetings_rels_order_idx" ON "meetings_rels" USING btree ("order");
  CREATE INDEX "meetings_rels_parent_idx" ON "meetings_rels" USING btree ("parent_id");
  CREATE INDEX "meetings_rels_path_idx" ON "meetings_rels" USING btree ("path");
  CREATE INDEX "meetings_rels_legislation_id_idx" ON "meetings_rels" USING btree ("legislation_id");
  CREATE INDEX "meetings_rels_media_id_idx" ON "meetings_rels" USING btree ("media_id");
  CREATE INDEX "meetings_rels_source_records_id_idx" ON "meetings_rels" USING btree ("source_records_id");
  CREATE INDEX "_meetings_v_version_agenda_items_order_idx" ON "_meetings_v_version_agenda_items" USING btree ("_order");
  CREATE INDEX "_meetings_v_version_agenda_items_parent_id_idx" ON "_meetings_v_version_agenda_items" USING btree ("_parent_id");
  CREATE INDEX "_meetings_v_version_minutes_order_idx" ON "_meetings_v_version_minutes" USING btree ("_order");
  CREATE INDEX "_meetings_v_version_minutes_parent_id_idx" ON "_meetings_v_version_minutes" USING btree ("_parent_id");
  CREATE INDEX "_meetings_v_version_transcript_order_idx" ON "_meetings_v_version_transcript" USING btree ("_order");
  CREATE INDEX "_meetings_v_version_transcript_parent_id_idx" ON "_meetings_v_version_transcript" USING btree ("_parent_id");
  CREATE INDEX "_meetings_v_parent_idx" ON "_meetings_v" USING btree ("parent_id");
  CREATE INDEX "_meetings_v_version_version_slug_idx" ON "_meetings_v" USING btree ("version_slug");
  CREATE INDEX "_meetings_v_version_version_starts_at_idx" ON "_meetings_v" USING btree ("version_starts_at");
  CREATE INDEX "_meetings_v_version_version_workflow_status_idx" ON "_meetings_v" USING btree ("version_workflow_status");
  CREATE INDEX "_meetings_v_version_version_expires_at_idx" ON "_meetings_v" USING btree ("version_expires_at");
  CREATE INDEX "_meetings_v_version_version_updated_at_idx" ON "_meetings_v" USING btree ("version_updated_at");
  CREATE INDEX "_meetings_v_version_version_created_at_idx" ON "_meetings_v" USING btree ("version_created_at");
  CREATE INDEX "_meetings_v_created_at_idx" ON "_meetings_v" USING btree ("created_at");
  CREATE INDEX "_meetings_v_updated_at_idx" ON "_meetings_v" USING btree ("updated_at");
  CREATE INDEX "_meetings_v_rels_order_idx" ON "_meetings_v_rels" USING btree ("order");
  CREATE INDEX "_meetings_v_rels_parent_idx" ON "_meetings_v_rels" USING btree ("parent_id");
  CREATE INDEX "_meetings_v_rels_path_idx" ON "_meetings_v_rels" USING btree ("path");
  CREATE INDEX "_meetings_v_rels_legislation_id_idx" ON "_meetings_v_rels" USING btree ("legislation_id");
  CREATE INDEX "_meetings_v_rels_media_id_idx" ON "_meetings_v_rels" USING btree ("media_id");
  CREATE INDEX "_meetings_v_rels_source_records_id_idx" ON "_meetings_v_rels" USING btree ("source_records_id");
  CREATE INDEX "legislation_sponsors_order_idx" ON "legislation_sponsors" USING btree ("_order");
  CREATE INDEX "legislation_sponsors_parent_id_idx" ON "legislation_sponsors" USING btree ("_parent_id");
  CREATE INDEX "legislation_text_versions_order_idx" ON "legislation_text_versions" USING btree ("_order");
  CREATE INDEX "legislation_text_versions_parent_id_idx" ON "legislation_text_versions" USING btree ("_parent_id");
  CREATE INDEX "legislation_text_versions_original_idx" ON "legislation_text_versions" USING btree ("original_id");
  CREATE INDEX "legislation_actions_order_idx" ON "legislation_actions" USING btree ("_order");
  CREATE INDEX "legislation_actions_parent_id_idx" ON "legislation_actions" USING btree ("_parent_id");
  CREATE INDEX "legislation_actions_meeting_idx" ON "legislation_actions" USING btree ("meeting_id");
  CREATE INDEX "legislation_actions_vote_idx" ON "legislation_actions" USING btree ("vote_id");
  CREATE UNIQUE INDEX "legislation_identifier_idx" ON "legislation" USING btree ("identifier");
  CREATE UNIQUE INDEX "legislation_slug_idx" ON "legislation" USING btree ("slug");
  CREATE INDEX "legislation_current_status_idx" ON "legislation" USING btree ("current_status");
  CREATE INDEX "legislation_workflow_status_idx" ON "legislation" USING btree ("workflow_status");
  CREATE INDEX "legislation_expires_at_idx" ON "legislation" USING btree ("expires_at");
  CREATE INDEX "legislation_updated_at_idx" ON "legislation" USING btree ("updated_at");
  CREATE INDEX "legislation_created_at_idx" ON "legislation" USING btree ("created_at");
  CREATE INDEX "legislation_rels_order_idx" ON "legislation_rels" USING btree ("order");
  CREATE INDEX "legislation_rels_parent_idx" ON "legislation_rels" USING btree ("parent_id");
  CREATE INDEX "legislation_rels_path_idx" ON "legislation_rels" USING btree ("path");
  CREATE INDEX "legislation_rels_source_records_id_idx" ON "legislation_rels" USING btree ("source_records_id");
  CREATE INDEX "_legislation_v_version_sponsors_order_idx" ON "_legislation_v_version_sponsors" USING btree ("_order");
  CREATE INDEX "_legislation_v_version_sponsors_parent_id_idx" ON "_legislation_v_version_sponsors" USING btree ("_parent_id");
  CREATE INDEX "_legislation_v_version_text_versions_order_idx" ON "_legislation_v_version_text_versions" USING btree ("_order");
  CREATE INDEX "_legislation_v_version_text_versions_parent_id_idx" ON "_legislation_v_version_text_versions" USING btree ("_parent_id");
  CREATE INDEX "_legislation_v_version_text_versions_original_idx" ON "_legislation_v_version_text_versions" USING btree ("original_id");
  CREATE INDEX "_legislation_v_version_actions_order_idx" ON "_legislation_v_version_actions" USING btree ("_order");
  CREATE INDEX "_legislation_v_version_actions_parent_id_idx" ON "_legislation_v_version_actions" USING btree ("_parent_id");
  CREATE INDEX "_legislation_v_version_actions_meeting_idx" ON "_legislation_v_version_actions" USING btree ("meeting_id");
  CREATE INDEX "_legislation_v_version_actions_vote_idx" ON "_legislation_v_version_actions" USING btree ("vote_id");
  CREATE INDEX "_legislation_v_parent_idx" ON "_legislation_v" USING btree ("parent_id");
  CREATE INDEX "_legislation_v_version_version_identifier_idx" ON "_legislation_v" USING btree ("version_identifier");
  CREATE INDEX "_legislation_v_version_version_slug_idx" ON "_legislation_v" USING btree ("version_slug");
  CREATE INDEX "_legislation_v_version_version_current_status_idx" ON "_legislation_v" USING btree ("version_current_status");
  CREATE INDEX "_legislation_v_version_version_workflow_status_idx" ON "_legislation_v" USING btree ("version_workflow_status");
  CREATE INDEX "_legislation_v_version_version_expires_at_idx" ON "_legislation_v" USING btree ("version_expires_at");
  CREATE INDEX "_legislation_v_version_version_updated_at_idx" ON "_legislation_v" USING btree ("version_updated_at");
  CREATE INDEX "_legislation_v_version_version_created_at_idx" ON "_legislation_v" USING btree ("version_created_at");
  CREATE INDEX "_legislation_v_created_at_idx" ON "_legislation_v" USING btree ("created_at");
  CREATE INDEX "_legislation_v_updated_at_idx" ON "_legislation_v" USING btree ("updated_at");
  CREATE INDEX "_legislation_v_rels_order_idx" ON "_legislation_v_rels" USING btree ("order");
  CREATE INDEX "_legislation_v_rels_parent_idx" ON "_legislation_v_rels" USING btree ("parent_id");
  CREATE INDEX "_legislation_v_rels_path_idx" ON "_legislation_v_rels" USING btree ("path");
  CREATE INDEX "_legislation_v_rels_source_records_id_idx" ON "_legislation_v_rels" USING btree ("source_records_id");
  CREATE INDEX "votes_entries_order_idx" ON "votes_entries" USING btree ("_order");
  CREATE INDEX "votes_entries_parent_id_idx" ON "votes_entries" USING btree ("_parent_id");
  CREATE INDEX "votes_entries_official_idx" ON "votes_entries" USING btree ("official_id");
  CREATE INDEX "votes_meeting_idx" ON "votes" USING btree ("meeting_id");
  CREATE INDEX "votes_legislation_idx" ON "votes" USING btree ("legislation_id");
  CREATE INDEX "votes_workflow_status_idx" ON "votes" USING btree ("workflow_status");
  CREATE INDEX "votes_expires_at_idx" ON "votes" USING btree ("expires_at");
  CREATE INDEX "votes_updated_at_idx" ON "votes" USING btree ("updated_at");
  CREATE INDEX "votes_created_at_idx" ON "votes" USING btree ("created_at");
  CREATE INDEX "_votes_v_version_entries_order_idx" ON "_votes_v_version_entries" USING btree ("_order");
  CREATE INDEX "_votes_v_version_entries_parent_id_idx" ON "_votes_v_version_entries" USING btree ("_parent_id");
  CREATE INDEX "_votes_v_version_entries_official_idx" ON "_votes_v_version_entries" USING btree ("official_id");
  CREATE INDEX "_votes_v_parent_idx" ON "_votes_v" USING btree ("parent_id");
  CREATE INDEX "_votes_v_version_version_meeting_idx" ON "_votes_v" USING btree ("version_meeting_id");
  CREATE INDEX "_votes_v_version_version_legislation_idx" ON "_votes_v" USING btree ("version_legislation_id");
  CREATE INDEX "_votes_v_version_version_workflow_status_idx" ON "_votes_v" USING btree ("version_workflow_status");
  CREATE INDEX "_votes_v_version_version_expires_at_idx" ON "_votes_v" USING btree ("version_expires_at");
  CREATE INDEX "_votes_v_version_version_updated_at_idx" ON "_votes_v" USING btree ("version_updated_at");
  CREATE INDEX "_votes_v_version_version_created_at_idx" ON "_votes_v" USING btree ("version_created_at");
  CREATE INDEX "_votes_v_created_at_idx" ON "_votes_v" USING btree ("created_at");
  CREATE INDEX "_votes_v_updated_at_idx" ON "_votes_v" USING btree ("updated_at");
  CREATE INDEX "projects_wards_order_idx" ON "projects_wards" USING btree ("order");
  CREATE INDEX "projects_wards_parent_idx" ON "projects_wards" USING btree ("parent_id");
  CREATE INDEX "projects_streets_order_idx" ON "projects_streets" USING btree ("_order");
  CREATE INDEX "projects_streets_parent_id_idx" ON "projects_streets" USING btree ("_parent_id");
  CREATE INDEX "projects_funding_order_idx" ON "projects_funding" USING btree ("_order");
  CREATE INDEX "projects_funding_parent_id_idx" ON "projects_funding" USING btree ("_parent_id");
  CREATE INDEX "projects_milestones_order_idx" ON "projects_milestones" USING btree ("_order");
  CREATE INDEX "projects_milestones_parent_id_idx" ON "projects_milestones" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");
  CREATE INDEX "projects_phase_idx" ON "projects" USING btree ("phase");
  CREATE INDEX "projects_program_year_idx" ON "projects" USING btree ("program_year");
  CREATE INDEX "projects_workflow_status_idx" ON "projects" USING btree ("workflow_status");
  CREATE INDEX "projects_expires_at_idx" ON "projects" USING btree ("expires_at");
  CREATE INDEX "projects_updated_at_idx" ON "projects" USING btree ("updated_at");
  CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");
  CREATE INDEX "projects_rels_order_idx" ON "projects_rels" USING btree ("order");
  CREATE INDEX "projects_rels_parent_idx" ON "projects_rels" USING btree ("parent_id");
  CREATE INDEX "projects_rels_path_idx" ON "projects_rels" USING btree ("path");
  CREATE INDEX "projects_rels_media_id_idx" ON "projects_rels" USING btree ("media_id");
  CREATE INDEX "projects_rels_source_records_id_idx" ON "projects_rels" USING btree ("source_records_id");
  CREATE INDEX "_projects_v_version_wards_order_idx" ON "_projects_v_version_wards" USING btree ("order");
  CREATE INDEX "_projects_v_version_wards_parent_idx" ON "_projects_v_version_wards" USING btree ("parent_id");
  CREATE INDEX "_projects_v_version_streets_order_idx" ON "_projects_v_version_streets" USING btree ("_order");
  CREATE INDEX "_projects_v_version_streets_parent_id_idx" ON "_projects_v_version_streets" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_funding_order_idx" ON "_projects_v_version_funding" USING btree ("_order");
  CREATE INDEX "_projects_v_version_funding_parent_id_idx" ON "_projects_v_version_funding" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_version_milestones_order_idx" ON "_projects_v_version_milestones" USING btree ("_order");
  CREATE INDEX "_projects_v_version_milestones_parent_id_idx" ON "_projects_v_version_milestones" USING btree ("_parent_id");
  CREATE INDEX "_projects_v_parent_idx" ON "_projects_v" USING btree ("parent_id");
  CREATE INDEX "_projects_v_version_version_slug_idx" ON "_projects_v" USING btree ("version_slug");
  CREATE INDEX "_projects_v_version_version_phase_idx" ON "_projects_v" USING btree ("version_phase");
  CREATE INDEX "_projects_v_version_version_program_year_idx" ON "_projects_v" USING btree ("version_program_year");
  CREATE INDEX "_projects_v_version_version_workflow_status_idx" ON "_projects_v" USING btree ("version_workflow_status");
  CREATE INDEX "_projects_v_version_version_expires_at_idx" ON "_projects_v" USING btree ("version_expires_at");
  CREATE INDEX "_projects_v_version_version_updated_at_idx" ON "_projects_v" USING btree ("version_updated_at");
  CREATE INDEX "_projects_v_version_version_created_at_idx" ON "_projects_v" USING btree ("version_created_at");
  CREATE INDEX "_projects_v_created_at_idx" ON "_projects_v" USING btree ("created_at");
  CREATE INDEX "_projects_v_updated_at_idx" ON "_projects_v" USING btree ("updated_at");
  CREATE INDEX "_projects_v_rels_order_idx" ON "_projects_v_rels" USING btree ("order");
  CREATE INDEX "_projects_v_rels_parent_idx" ON "_projects_v_rels" USING btree ("parent_id");
  CREATE INDEX "_projects_v_rels_path_idx" ON "_projects_v_rels" USING btree ("path");
  CREATE INDEX "_projects_v_rels_media_id_idx" ON "_projects_v_rels" USING btree ("media_id");
  CREATE INDEX "_projects_v_rels_source_records_id_idx" ON "_projects_v_rels" USING btree ("source_records_id");
  CREATE INDEX "project_updates_project_idx" ON "project_updates" USING btree ("project_id");
  CREATE INDEX "project_updates_department_idx" ON "project_updates" USING btree ("department_id");
  CREATE INDEX "project_updates_workflow_status_idx" ON "project_updates" USING btree ("workflow_status");
  CREATE INDEX "project_updates_expires_at_idx" ON "project_updates" USING btree ("expires_at");
  CREATE INDEX "project_updates_updated_at_idx" ON "project_updates" USING btree ("updated_at");
  CREATE INDEX "project_updates_created_at_idx" ON "project_updates" USING btree ("created_at");
  CREATE INDEX "_project_updates_v_parent_idx" ON "_project_updates_v" USING btree ("parent_id");
  CREATE INDEX "_project_updates_v_version_version_project_idx" ON "_project_updates_v" USING btree ("version_project_id");
  CREATE INDEX "_project_updates_v_version_version_department_idx" ON "_project_updates_v" USING btree ("version_department_id");
  CREATE INDEX "_project_updates_v_version_version_workflow_status_idx" ON "_project_updates_v" USING btree ("version_workflow_status");
  CREATE INDEX "_project_updates_v_version_version_expires_at_idx" ON "_project_updates_v" USING btree ("version_expires_at");
  CREATE INDEX "_project_updates_v_version_version_updated_at_idx" ON "_project_updates_v" USING btree ("version_updated_at");
  CREATE INDEX "_project_updates_v_version_version_created_at_idx" ON "_project_updates_v" USING btree ("version_created_at");
  CREATE INDEX "_project_updates_v_created_at_idx" ON "_project_updates_v" USING btree ("created_at");
  CREATE INDEX "_project_updates_v_updated_at_idx" ON "_project_updates_v" USING btree ("updated_at");
  CREATE INDEX "budget_datasets_corrections_order_idx" ON "budget_datasets_corrections" USING btree ("_order");
  CREATE INDEX "budget_datasets_corrections_parent_id_idx" ON "budget_datasets_corrections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "budget_datasets_slug_idx" ON "budget_datasets" USING btree ("slug");
  CREATE INDEX "budget_datasets_fiscal_year_idx" ON "budget_datasets" USING btree ("fiscal_year");
  CREATE INDEX "budget_datasets_workflow_status_idx" ON "budget_datasets" USING btree ("workflow_status");
  CREATE INDEX "budget_datasets_expires_at_idx" ON "budget_datasets" USING btree ("expires_at");
  CREATE INDEX "budget_datasets_updated_at_idx" ON "budget_datasets" USING btree ("updated_at");
  CREATE INDEX "budget_datasets_created_at_idx" ON "budget_datasets" USING btree ("created_at");
  CREATE INDEX "budget_datasets_rels_order_idx" ON "budget_datasets_rels" USING btree ("order");
  CREATE INDEX "budget_datasets_rels_parent_idx" ON "budget_datasets_rels" USING btree ("parent_id");
  CREATE INDEX "budget_datasets_rels_path_idx" ON "budget_datasets_rels" USING btree ("path");
  CREATE INDEX "budget_datasets_rels_source_records_id_idx" ON "budget_datasets_rels" USING btree ("source_records_id");
  CREATE INDEX "_budget_datasets_v_version_corrections_order_idx" ON "_budget_datasets_v_version_corrections" USING btree ("_order");
  CREATE INDEX "_budget_datasets_v_version_corrections_parent_id_idx" ON "_budget_datasets_v_version_corrections" USING btree ("_parent_id");
  CREATE INDEX "_budget_datasets_v_parent_idx" ON "_budget_datasets_v" USING btree ("parent_id");
  CREATE INDEX "_budget_datasets_v_version_version_slug_idx" ON "_budget_datasets_v" USING btree ("version_slug");
  CREATE INDEX "_budget_datasets_v_version_version_fiscal_year_idx" ON "_budget_datasets_v" USING btree ("version_fiscal_year");
  CREATE INDEX "_budget_datasets_v_version_version_workflow_status_idx" ON "_budget_datasets_v" USING btree ("version_workflow_status");
  CREATE INDEX "_budget_datasets_v_version_version_expires_at_idx" ON "_budget_datasets_v" USING btree ("version_expires_at");
  CREATE INDEX "_budget_datasets_v_version_version_updated_at_idx" ON "_budget_datasets_v" USING btree ("version_updated_at");
  CREATE INDEX "_budget_datasets_v_version_version_created_at_idx" ON "_budget_datasets_v" USING btree ("version_created_at");
  CREATE INDEX "_budget_datasets_v_created_at_idx" ON "_budget_datasets_v" USING btree ("created_at");
  CREATE INDEX "_budget_datasets_v_updated_at_idx" ON "_budget_datasets_v" USING btree ("updated_at");
  CREATE INDEX "_budget_datasets_v_rels_order_idx" ON "_budget_datasets_v_rels" USING btree ("order");
  CREATE INDEX "_budget_datasets_v_rels_parent_idx" ON "_budget_datasets_v_rels" USING btree ("parent_id");
  CREATE INDEX "_budget_datasets_v_rels_path_idx" ON "_budget_datasets_v_rels" USING btree ("path");
  CREATE INDEX "_budget_datasets_v_rels_source_records_id_idx" ON "_budget_datasets_v_rels" USING btree ("source_records_id");
  CREATE INDEX "budget_lines_dataset_idx" ON "budget_lines" USING btree ("dataset_id");
  CREATE INDEX "budget_lines_import_batch_idx" ON "budget_lines" USING btree ("import_batch_id");
  CREATE INDEX "budget_lines_updated_at_idx" ON "budget_lines" USING btree ("updated_at");
  CREATE INDEX "budget_lines_created_at_idx" ON "budget_lines" USING btree ("created_at");
  CREATE UNIQUE INDEX "dataset_rowKey_idx" ON "budget_lines" USING btree ("dataset_id","row_key");
  CREATE INDEX "import_batches_dataset_idx" ON "import_batches" USING btree ("dataset_id");
  CREATE INDEX "import_batches_source_idx" ON "import_batches" USING btree ("source_id");
  CREATE INDEX "import_batches_updated_at_idx" ON "import_batches" USING btree ("updated_at");
  CREATE INDEX "import_batches_created_at_idx" ON "import_batches" USING btree ("created_at");
  CREATE UNIQUE INDEX "import_batches_filename_idx" ON "import_batches" USING btree ("filename");
  CREATE UNIQUE INDEX "wards_slug_idx" ON "wards" USING btree ("slug");
  CREATE INDEX "wards_updated_at_idx" ON "wards" USING btree ("updated_at");
  CREATE INDEX "wards_created_at_idx" ON "wards" USING btree ("created_at");
  CREATE INDEX "wards_rels_order_idx" ON "wards_rels" USING btree ("order");
  CREATE INDEX "wards_rels_parent_idx" ON "wards_rels" USING btree ("parent_id");
  CREATE INDEX "wards_rels_path_idx" ON "wards_rels" USING btree ("path");
  CREATE INDEX "wards_rels_officials_id_idx" ON "wards_rels" USING btree ("officials_id");
  CREATE INDEX "wards_rels_source_records_id_idx" ON "wards_rels" USING btree ("source_records_id");
  CREATE UNIQUE INDEX "places_slug_idx" ON "places" USING btree ("slug");
  CREATE INDEX "places_photo_idx" ON "places" USING btree ("photo_id");
  CREATE INDEX "places_workflow_status_idx" ON "places" USING btree ("workflow_status");
  CREATE INDEX "places_expires_at_idx" ON "places" USING btree ("expires_at");
  CREATE INDEX "places_updated_at_idx" ON "places" USING btree ("updated_at");
  CREATE INDEX "places_created_at_idx" ON "places" USING btree ("created_at");
  CREATE INDEX "places_rels_order_idx" ON "places_rels" USING btree ("order");
  CREATE INDEX "places_rels_parent_idx" ON "places_rels" USING btree ("parent_id");
  CREATE INDEX "places_rels_path_idx" ON "places_rels" USING btree ("path");
  CREATE INDEX "places_rels_source_records_id_idx" ON "places_rels" USING btree ("source_records_id");
  CREATE INDEX "_places_v_parent_idx" ON "_places_v" USING btree ("parent_id");
  CREATE INDEX "_places_v_version_version_slug_idx" ON "_places_v" USING btree ("version_slug");
  CREATE INDEX "_places_v_version_version_photo_idx" ON "_places_v" USING btree ("version_photo_id");
  CREATE INDEX "_places_v_version_version_workflow_status_idx" ON "_places_v" USING btree ("version_workflow_status");
  CREATE INDEX "_places_v_version_version_expires_at_idx" ON "_places_v" USING btree ("version_expires_at");
  CREATE INDEX "_places_v_version_version_updated_at_idx" ON "_places_v" USING btree ("version_updated_at");
  CREATE INDEX "_places_v_version_version_created_at_idx" ON "_places_v" USING btree ("version_created_at");
  CREATE INDEX "_places_v_created_at_idx" ON "_places_v" USING btree ("created_at");
  CREATE INDEX "_places_v_updated_at_idx" ON "_places_v" USING btree ("updated_at");
  CREATE INDEX "_places_v_rels_order_idx" ON "_places_v_rels" USING btree ("order");
  CREATE INDEX "_places_v_rels_parent_idx" ON "_places_v_rels" USING btree ("parent_id");
  CREATE INDEX "_places_v_rels_path_idx" ON "_places_v_rels" USING btree ("path");
  CREATE INDEX "_places_v_rels_source_records_id_idx" ON "_places_v_rels" USING btree ("source_records_id");
  CREATE UNIQUE INDEX "departments_slug_idx" ON "departments" USING btree ("slug");
  CREATE INDEX "departments_updated_at_idx" ON "departments" USING btree ("updated_at");
  CREATE INDEX "departments_created_at_idx" ON "departments" USING btree ("created_at");
  CREATE UNIQUE INDEX "departments_locales_locale_parent_id_unique" ON "departments_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "departments_locales_parent_id_idx" ON "departments_locales" USING btree ("_parent_id");
  CREATE INDEX "departments_rels_order_idx" ON "departments_rels" USING btree ("order");
  CREATE INDEX "departments_rels_parent_idx" ON "departments_rels" USING btree ("parent_id");
  CREATE INDEX "departments_rels_path_idx" ON "departments_rels" USING btree ("path");
  CREATE INDEX "departments_rels_source_records_id_idx" ON "departments_rels" USING btree ("source_records_id");
  CREATE INDEX "officials_updated_at_idx" ON "officials" USING btree ("updated_at");
  CREATE INDEX "officials_created_at_idx" ON "officials" USING btree ("created_at");
  CREATE INDEX "officials_rels_order_idx" ON "officials_rels" USING btree ("order");
  CREATE INDEX "officials_rels_parent_idx" ON "officials_rels" USING btree ("parent_id");
  CREATE INDEX "officials_rels_path_idx" ON "officials_rels" USING btree ("path");
  CREATE INDEX "officials_rels_source_records_id_idx" ON "officials_rels" USING btree ("source_records_id");
  CREATE UNIQUE INDEX "service_requests_reference_idx" ON "service_requests" USING btree ("reference");
  CREATE INDEX "service_requests_department_idx" ON "service_requests" USING btree ("department_id");
  CREATE INDEX "service_requests_updated_at_idx" ON "service_requests" USING btree ("updated_at");
  CREATE INDEX "service_requests_created_at_idx" ON "service_requests" USING btree ("created_at");
  CREATE INDEX "subscriptions_updated_at_idx" ON "subscriptions" USING btree ("updated_at");
  CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at");
  CREATE UNIQUE INDEX "email_topicType_topicId_idx" ON "subscriptions" USING btree ("email","topic_type","topic_id");
  CREATE UNIQUE INDEX "outbox_dedupe_key_idx" ON "outbox" USING btree ("dedupe_key");
  CREATE INDEX "outbox_status_idx" ON "outbox" USING btree ("status");
  CREATE INDEX "outbox_updated_at_idx" ON "outbox" USING btree ("updated_at");
  CREATE INDEX "outbox_created_at_idx" ON "outbox" USING btree ("created_at");
  CREATE INDEX "source_records_updated_at_idx" ON "source_records" USING btree ("updated_at");
  CREATE INDEX "source_records_created_at_idx" ON "source_records" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("action");
  CREATE INDEX "audit_events_target_collection_idx" ON "audit_events" USING btree ("target_collection");
  CREATE INDEX "audit_events_target_id_idx" ON "audit_events" USING btree ("target_id");
  CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");
  CREATE INDEX "audit_events_updated_at_idx" ON "audit_events" USING btree ("updated_at");
  CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_identity_provider_subject_idx" ON "users" USING btree ("identity_provider_subject");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_departments_id_idx" ON "users_rels" USING btree ("departments_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_services_id_idx" ON "payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX "payload_locked_documents_rels_notices_id_idx" ON "payload_locked_documents_rels" USING btree ("notices_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_seasonal_features_id_idx" ON "payload_locked_documents_rels" USING btree ("seasonal_features_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_meetings_id_idx" ON "payload_locked_documents_rels" USING btree ("meetings_id");
  CREATE INDEX "payload_locked_documents_rels_legislation_id_idx" ON "payload_locked_documents_rels" USING btree ("legislation_id");
  CREATE INDEX "payload_locked_documents_rels_votes_id_idx" ON "payload_locked_documents_rels" USING btree ("votes_id");
  CREATE INDEX "payload_locked_documents_rels_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("projects_id");
  CREATE INDEX "payload_locked_documents_rels_project_updates_id_idx" ON "payload_locked_documents_rels" USING btree ("project_updates_id");
  CREATE INDEX "payload_locked_documents_rels_budget_datasets_id_idx" ON "payload_locked_documents_rels" USING btree ("budget_datasets_id");
  CREATE INDEX "payload_locked_documents_rels_budget_lines_id_idx" ON "payload_locked_documents_rels" USING btree ("budget_lines_id");
  CREATE INDEX "payload_locked_documents_rels_import_batches_id_idx" ON "payload_locked_documents_rels" USING btree ("import_batches_id");
  CREATE INDEX "payload_locked_documents_rels_wards_id_idx" ON "payload_locked_documents_rels" USING btree ("wards_id");
  CREATE INDEX "payload_locked_documents_rels_places_id_idx" ON "payload_locked_documents_rels" USING btree ("places_id");
  CREATE INDEX "payload_locked_documents_rels_departments_id_idx" ON "payload_locked_documents_rels" USING btree ("departments_id");
  CREATE INDEX "payload_locked_documents_rels_officials_id_idx" ON "payload_locked_documents_rels" USING btree ("officials_id");
  CREATE INDEX "payload_locked_documents_rels_service_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("service_requests_id");
  CREATE INDEX "payload_locked_documents_rels_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_outbox_id_idx" ON "payload_locked_documents_rels" USING btree ("outbox_id");
  CREATE INDEX "payload_locked_documents_rels_source_records_id_idx" ON "payload_locked_documents_rels" USING btree ("source_records_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_audit_events_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_events_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "services" CASCADE;
  DROP TABLE "services_locales" CASCADE;
  DROP TABLE "services_rels" CASCADE;
  DROP TABLE "_services_v" CASCADE;
  DROP TABLE "_services_v_locales" CASCADE;
  DROP TABLE "_services_v_rels" CASCADE;
  DROP TABLE "notices_wards" CASCADE;
  DROP TABLE "notices" CASCADE;
  DROP TABLE "notices_locales" CASCADE;
  DROP TABLE "notices_rels" CASCADE;
  DROP TABLE "_notices_v_version_wards" CASCADE;
  DROP TABLE "_notices_v" CASCADE;
  DROP TABLE "_notices_v_locales" CASCADE;
  DROP TABLE "_notices_v_rels" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_locales" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "_events_v_locales" CASCADE;
  DROP TABLE "seasonal_features_audience_wards" CASCADE;
  DROP TABLE "seasonal_features" CASCADE;
  DROP TABLE "seasonal_features_locales" CASCADE;
  DROP TABLE "_seasonal_features_v_version_audience_wards" CASCADE;
  DROP TABLE "_seasonal_features_v" CASCADE;
  DROP TABLE "_seasonal_features_v_locales" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "meetings_agenda_items" CASCADE;
  DROP TABLE "meetings_minutes" CASCADE;
  DROP TABLE "meetings_transcript" CASCADE;
  DROP TABLE "meetings" CASCADE;
  DROP TABLE "meetings_rels" CASCADE;
  DROP TABLE "_meetings_v_version_agenda_items" CASCADE;
  DROP TABLE "_meetings_v_version_minutes" CASCADE;
  DROP TABLE "_meetings_v_version_transcript" CASCADE;
  DROP TABLE "_meetings_v" CASCADE;
  DROP TABLE "_meetings_v_rels" CASCADE;
  DROP TABLE "legislation_sponsors" CASCADE;
  DROP TABLE "legislation_text_versions" CASCADE;
  DROP TABLE "legislation_actions" CASCADE;
  DROP TABLE "legislation" CASCADE;
  DROP TABLE "legislation_rels" CASCADE;
  DROP TABLE "_legislation_v_version_sponsors" CASCADE;
  DROP TABLE "_legislation_v_version_text_versions" CASCADE;
  DROP TABLE "_legislation_v_version_actions" CASCADE;
  DROP TABLE "_legislation_v" CASCADE;
  DROP TABLE "_legislation_v_rels" CASCADE;
  DROP TABLE "votes_entries" CASCADE;
  DROP TABLE "votes" CASCADE;
  DROP TABLE "_votes_v_version_entries" CASCADE;
  DROP TABLE "_votes_v" CASCADE;
  DROP TABLE "projects_wards" CASCADE;
  DROP TABLE "projects_streets" CASCADE;
  DROP TABLE "projects_funding" CASCADE;
  DROP TABLE "projects_milestones" CASCADE;
  DROP TABLE "projects" CASCADE;
  DROP TABLE "projects_rels" CASCADE;
  DROP TABLE "_projects_v_version_wards" CASCADE;
  DROP TABLE "_projects_v_version_streets" CASCADE;
  DROP TABLE "_projects_v_version_funding" CASCADE;
  DROP TABLE "_projects_v_version_milestones" CASCADE;
  DROP TABLE "_projects_v" CASCADE;
  DROP TABLE "_projects_v_rels" CASCADE;
  DROP TABLE "project_updates" CASCADE;
  DROP TABLE "_project_updates_v" CASCADE;
  DROP TABLE "budget_datasets_corrections" CASCADE;
  DROP TABLE "budget_datasets" CASCADE;
  DROP TABLE "budget_datasets_rels" CASCADE;
  DROP TABLE "_budget_datasets_v_version_corrections" CASCADE;
  DROP TABLE "_budget_datasets_v" CASCADE;
  DROP TABLE "_budget_datasets_v_rels" CASCADE;
  DROP TABLE "budget_lines" CASCADE;
  DROP TABLE "import_batches" CASCADE;
  DROP TABLE "wards" CASCADE;
  DROP TABLE "wards_rels" CASCADE;
  DROP TABLE "places" CASCADE;
  DROP TABLE "places_rels" CASCADE;
  DROP TABLE "_places_v" CASCADE;
  DROP TABLE "_places_v_rels" CASCADE;
  DROP TABLE "departments" CASCADE;
  DROP TABLE "departments_locales" CASCADE;
  DROP TABLE "departments_rels" CASCADE;
  DROP TABLE "officials" CASCADE;
  DROP TABLE "officials_rels" CASCADE;
  DROP TABLE "service_requests" CASCADE;
  DROP TABLE "subscriptions" CASCADE;
  DROP TABLE "outbox" CASCADE;
  DROP TABLE "source_records" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "audit_events" CASCADE;
  DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_services_category";
  DROP TYPE "public"."enum_services_workflow_status";
  DROP TYPE "public"."enum_services_verification_status";
  DROP TYPE "public"."enum__services_v_version_category";
  DROP TYPE "public"."enum__services_v_version_workflow_status";
  DROP TYPE "public"."enum__services_v_version_verification_status";
  DROP TYPE "public"."enum_notices_wards";
  DROP TYPE "public"."enum_notices_kind";
  DROP TYPE "public"."enum_notices_workflow_status";
  DROP TYPE "public"."enum_notices_verification_status";
  DROP TYPE "public"."enum__notices_v_version_wards";
  DROP TYPE "public"."enum__notices_v_version_kind";
  DROP TYPE "public"."enum__notices_v_version_workflow_status";
  DROP TYPE "public"."enum__notices_v_version_verification_status";
  DROP TYPE "public"."enum_events_workflow_status";
  DROP TYPE "public"."enum_events_verification_status";
  DROP TYPE "public"."enum__events_v_version_workflow_status";
  DROP TYPE "public"."enum__events_v_version_verification_status";
  DROP TYPE "public"."enum_seasonal_features_audience_wards";
  DROP TYPE "public"."enum_seasonal_features_workflow_status";
  DROP TYPE "public"."enum_seasonal_features_verification_status";
  DROP TYPE "public"."enum__seasonal_features_v_version_audience_wards";
  DROP TYPE "public"."enum__seasonal_features_v_version_workflow_status";
  DROP TYPE "public"."enum__seasonal_features_v_version_verification_status";
  DROP TYPE "public"."enum_media_approval_status";
  DROP TYPE "public"."enum_meetings_minutes_status";
  DROP TYPE "public"."enum_meetings_body";
  DROP TYPE "public"."enum_meetings_meeting_type";
  DROP TYPE "public"."enum_meetings_meeting_status";
  DROP TYPE "public"."enum_meetings_workflow_status";
  DROP TYPE "public"."enum_meetings_verification_status";
  DROP TYPE "public"."enum__meetings_v_version_minutes_status";
  DROP TYPE "public"."enum__meetings_v_version_body";
  DROP TYPE "public"."enum__meetings_v_version_meeting_type";
  DROP TYPE "public"."enum__meetings_v_version_meeting_status";
  DROP TYPE "public"."enum__meetings_v_version_workflow_status";
  DROP TYPE "public"."enum__meetings_v_version_verification_status";
  DROP TYPE "public"."enum_legislation_actions_action";
  DROP TYPE "public"."enum_legislation_type";
  DROP TYPE "public"."enum_legislation_current_status";
  DROP TYPE "public"."enum_legislation_workflow_status";
  DROP TYPE "public"."enum_legislation_verification_status";
  DROP TYPE "public"."enum__legislation_v_version_actions_action";
  DROP TYPE "public"."enum__legislation_v_version_type";
  DROP TYPE "public"."enum__legislation_v_version_current_status";
  DROP TYPE "public"."enum__legislation_v_version_workflow_status";
  DROP TYPE "public"."enum__legislation_v_version_verification_status";
  DROP TYPE "public"."enum_votes_entries_vote";
  DROP TYPE "public"."enum_votes_result";
  DROP TYPE "public"."enum_votes_workflow_status";
  DROP TYPE "public"."enum_votes_verification_status";
  DROP TYPE "public"."enum__votes_v_version_entries_vote";
  DROP TYPE "public"."enum__votes_v_version_result";
  DROP TYPE "public"."enum__votes_v_version_workflow_status";
  DROP TYPE "public"."enum__votes_v_version_verification_status";
  DROP TYPE "public"."enum_projects_wards";
  DROP TYPE "public"."enum_projects_funding_status";
  DROP TYPE "public"."enum_projects_milestones_kind";
  DROP TYPE "public"."enum_projects_project_type";
  DROP TYPE "public"."enum_projects_phase";
  DROP TYPE "public"."enum_projects_workflow_status";
  DROP TYPE "public"."enum_projects_verification_status";
  DROP TYPE "public"."enum__projects_v_version_wards";
  DROP TYPE "public"."enum__projects_v_version_funding_status";
  DROP TYPE "public"."enum__projects_v_version_milestones_kind";
  DROP TYPE "public"."enum__projects_v_version_project_type";
  DROP TYPE "public"."enum__projects_v_version_phase";
  DROP TYPE "public"."enum__projects_v_version_workflow_status";
  DROP TYPE "public"."enum__projects_v_version_verification_status";
  DROP TYPE "public"."enum_project_updates_workflow_status";
  DROP TYPE "public"."enum_project_updates_verification_status";
  DROP TYPE "public"."enum__project_updates_v_version_workflow_status";
  DROP TYPE "public"."enum__project_updates_v_version_verification_status";
  DROP TYPE "public"."enum_budget_datasets_basis";
  DROP TYPE "public"."enum_budget_datasets_kind";
  DROP TYPE "public"."enum_budget_datasets_workflow_status";
  DROP TYPE "public"."enum_budget_datasets_verification_status";
  DROP TYPE "public"."enum__budget_datasets_v_version_basis";
  DROP TYPE "public"."enum__budget_datasets_v_version_kind";
  DROP TYPE "public"."enum__budget_datasets_v_version_workflow_status";
  DROP TYPE "public"."enum__budget_datasets_v_version_verification_status";
  DROP TYPE "public"."enum_budget_lines_direction";
  DROP TYPE "public"."enum_budget_lines_category";
  DROP TYPE "public"."enum_import_batches_kind";
  DROP TYPE "public"."enum_import_batches_requested_action";
  DROP TYPE "public"."enum_import_batches_status";
  DROP TYPE "public"."enum_wards_slug";
  DROP TYPE "public"."enum_wards_verification_status";
  DROP TYPE "public"."enum_places_kind";
  DROP TYPE "public"."enum_places_jurisdiction";
  DROP TYPE "public"."enum_places_ward";
  DROP TYPE "public"."enum_places_workflow_status";
  DROP TYPE "public"."enum_places_verification_status";
  DROP TYPE "public"."enum__places_v_version_kind";
  DROP TYPE "public"."enum__places_v_version_jurisdiction";
  DROP TYPE "public"."enum__places_v_version_ward";
  DROP TYPE "public"."enum__places_v_version_workflow_status";
  DROP TYPE "public"."enum__places_v_version_verification_status";
  DROP TYPE "public"."enum_departments_verification_status";
  DROP TYPE "public"."enum_officials_ward";
  DROP TYPE "public"."enum_officials_verification_status";
  DROP TYPE "public"."enum_service_requests_category";
  DROP TYPE "public"."enum_service_requests_status";
  DROP TYPE "public"."enum_subscriptions_topic_type";
  DROP TYPE "public"."enum_subscriptions_status";
  DROP TYPE "public"."enum_outbox_status";
  DROP TYPE "public"."enum_source_records_owner_type";
  DROP TYPE "public"."enum_source_records_status";
  DROP TYPE "public"."enum_redirects_status_code";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
