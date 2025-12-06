

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."role" AS ENUM (
    'admin',
    'staff',
    'usuario'
);


ALTER TYPE "public"."role" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'pastor',
    'staff',
    'supervisor',
    'server'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_discipleship_stats"("zone_filter" "text" DEFAULT NULL::"text", "date_from" "date" DEFAULT NULL::"date", "date_to" "date" DEFAULT NULL::"date") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSON;
  total_groups INTEGER;
  total_members INTEGER;
  total_attendance INTEGER;
  growth_rate DECIMAL;
  active_leaders INTEGER;
  multiplication_count INTEGER;
  average_spiritual_temp DECIMAL;
BEGIN
  -- Filtros de fecha por defecto
  IF date_from IS NULL THEN
    date_from := CURRENT_DATE - INTERVAL '30 days';
  END IF;
  
  IF date_to IS NULL THEN
    date_to := CURRENT_DATE;
  END IF;

  -- Total de grupos activos
  SELECT COUNT(*) INTO total_groups
  FROM discipleship_groups dg
  WHERE dg.status = 'active'
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Total de miembros
  SELECT COALESCE(SUM(member_count), 0) INTO total_members
  FROM discipleship_groups dg
  WHERE dg.status = 'active'
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Promedio de asistencia reciente
  SELECT COALESCE(AVG(attendance), 0) INTO total_attendance
  FROM discipleship_metrics dm
  JOIN discipleship_groups dg ON dm.group_id = dg.id
  WHERE dm.week_date BETWEEN date_from AND date_to
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Cálculo de tasa de crecimiento (últimos 30 vs 60 días)
  WITH recent_stats AS (
    SELECT AVG(attendance) as recent_avg
    FROM discipleship_metrics dm
    JOIN discipleship_groups dg ON dm.group_id = dg.id
    WHERE dm.week_date >= CURRENT_DATE - INTERVAL '30 days'
      AND (zone_filter IS NULL OR dg.zone_name = zone_filter)
  ),
  previous_stats AS (
    SELECT AVG(attendance) as previous_avg
    FROM discipleship_metrics dm
    JOIN discipleship_groups dg ON dm.group_id = dg.id
    WHERE dm.week_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days'
      AND (zone_filter IS NULL OR dg.zone_name = zone_filter)
  )
  SELECT 
    CASE 
      WHEN p.previous_avg > 0 THEN 
        ROUND(((r.recent_avg - p.previous_avg) / p.previous_avg * 100)::DECIMAL, 2)
      ELSE 0 
    END INTO growth_rate
  FROM recent_stats r, previous_stats p;

  -- Líderes activos únicos
  SELECT COUNT(DISTINCT leader_id) INTO active_leaders
  FROM discipleship_groups dg
  WHERE dg.status = 'active'
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Multiplicaciones en el período
  SELECT COUNT(*) INTO multiplication_count
  FROM cell_multiplication_tracking cmt
  JOIN discipleship_groups dg ON cmt.parent_group_id = dg.id
  WHERE cmt.multiplication_date BETWEEN date_from AND date_to
    AND cmt.success_status IN ('successful', 'planned')
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Temperatura espiritual promedio
  SELECT COALESCE(AVG(spiritual_temperature), 0) INTO average_spiritual_temp
  FROM discipleship_metrics dm
  JOIN discipleship_groups dg ON dm.group_id = dg.id
  WHERE dm.week_date BETWEEN date_from AND date_to
    AND (zone_filter IS NULL OR dg.zone_name = zone_filter);

  -- Construir resultado JSON
  result := json_build_object(
    'total_groups', total_groups,
    'total_members', total_members,
    'average_attendance', ROUND(total_attendance, 0),
    'growth_rate', COALESCE(growth_rate, 0),
    'active_leaders', active_leaders,
    'multiplications', multiplication_count,
    'spiritual_health', ROUND(average_spiritual_temp, 1),
    'date_range', json_build_object(
      'from', date_from,
      'to', date_to
    )
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."calculate_discipleship_stats"("zone_filter" "text", "date_from" "date", "date_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_user"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role FROM public.users WHERE id = auth.uid();
  
  -- If no current user role found, deny access
  IF current_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get target user role
  SELECT role INTO target_user_role FROM public.users WHERE id = target_user_id;
  
  -- User can always access their own data
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Pastor can access all
  IF current_user_role = 'pastor' THEN
    RETURN TRUE;
  END IF;
  
  -- Staff can access non-pastor users
  IF current_user_role = 'staff' AND target_user_role != 'pastor' THEN
    RETURN TRUE;
  END IF;
  
  -- Supervisor can access supervisor and server users
  IF current_user_role = 'supervisor' AND target_user_role IN ('supervisor', 'server') THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_access_user"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  EXECUTE sql;
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;


ALTER FUNCTION "public"."exec_sql"("sql" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."exec_sql"("sql" "text") IS 'Executes arbitrary SQL. This function has security implications and should only be callable by authenticated users with admin privileges.';



CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_uuid" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.users WHERE id = user_uuid;
$$;


ALTER FUNCTION "public"."get_user_role"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Try to insert the user into public.users
  -- Use COALESCE to provide safe defaults for all fields
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name,
    id_number,
    phone,
    address,
    role, 
    is_active, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Sin Apellido'),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'id_number', ''), 
      'TEMP-' || SUBSTRING(NEW.id::text, 1, 8)
    ),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'address', ''), ''),
    COALESCE(
      NULLIF((NEW.raw_user_meta_data->>'role')::text, ''),
      'server'
    ),
    true,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
    updated_at = NOW();
  
  -- Update invitation status to 'accepted' if there's a pending invitation for this email
  -- This is a simple, efficient update that only affects matching rows
  -- The WHERE clause ensures it only updates pending invitations for this email
  UPDATE public.user_invitations
  SET status = 'accepted',
      updated_at = NOW()
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth.users insert
    -- This allows the magic link to be generated even if there's an issue with public.users
    RAISE WARNING 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow the auth.users insert to succeed
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Trigger function to sync auth.users with public.users. Handles errors gracefully to prevent blocking user creation via magic links. Uses SECURITY DEFINER to bypass RLS.';



CREATE OR REPLACE FUNCTION "public"."log_user_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, changed_by)
    VALUES ('users', OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES ('users', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_values, changed_by)
    VALUES ('users', NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_user_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_user_changes"() IS 'Logs user changes to audit_logs table. Handles service role context where auth.uid() may be NULL (e.g., magic link user creation).';



CREATE OR REPLACE FUNCTION "public"."update_expired_invitations"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."update_expired_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cell_multiplication_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_group_id" "uuid" NOT NULL,
    "new_group_id" "uuid",
    "multiplication_date" "date" NOT NULL,
    "new_leader_id" "uuid",
    "parent_leader_id" "uuid" NOT NULL,
    "initial_members" integer DEFAULT 0,
    "multiplication_type" "text" DEFAULT 'standard'::"text",
    "success_status" "text" DEFAULT 'planned'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cell_multiplication_tracking_multiplication_type_check" CHECK (("multiplication_type" = ANY (ARRAY['standard'::"text", 'planned'::"text", 'emergency'::"text"]))),
    CONSTRAINT "cell_multiplication_tracking_success_status_check" CHECK (("success_status" = ANY (ARRAY['planned'::"text", 'successful'::"text", 'struggling'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."cell_multiplication_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discipleship_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "related_group_id" "uuid",
    "related_user_id" "uuid",
    "zone_name" "text",
    "action_required" boolean DEFAULT false,
    "resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "priority" integer DEFAULT 3,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "discipleship_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['critical'::"text", 'warning'::"text", 'info'::"text", 'success'::"text"]))),
    CONSTRAINT "discipleship_alerts_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5)))
);


ALTER TABLE "public"."discipleship_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discipleship_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_type" "text" NOT NULL,
    "target_metric" "text" NOT NULL,
    "target_value" integer NOT NULL,
    "current_value" integer DEFAULT 0,
    "progress_percentage" numeric(5,2) DEFAULT 0,
    "deadline" "date" NOT NULL,
    "zone_name" "text",
    "supervisor_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "discipleship_goals_goal_type_check" CHECK (("goal_type" = ANY (ARRAY['annual'::"text", 'quarterly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "discipleship_goals_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'overdue'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."discipleship_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discipleship_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_name" "text" NOT NULL,
    "leader_id" "uuid" NOT NULL,
    "supervisor_id" "uuid",
    "meeting_location" "text",
    "meeting_day" "text",
    "meeting_time" time without time zone,
    "member_count" integer DEFAULT 0,
    "active_members" integer DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "zone_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "discipleship_groups_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'multiplying'::"text"])))
);


ALTER TABLE "public"."discipleship_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discipleship_hierarchy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "hierarchy_level" integer NOT NULL,
    "supervisor_id" "uuid",
    "zone_name" "text",
    "territory" "text",
    "active_groups_assigned" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "discipleship_hierarchy_hierarchy_level_check" CHECK ((("hierarchy_level" >= 1) AND ("hierarchy_level" <= 5)))
);


ALTER TABLE "public"."discipleship_hierarchy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discipleship_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "week_date" "date" NOT NULL,
    "attendance" integer DEFAULT 0,
    "new_visitors" integer DEFAULT 0,
    "returning_visitors" integer DEFAULT 0,
    "testimonies_count" integer DEFAULT 0,
    "prayer_requests" integer DEFAULT 0,
    "spiritual_temperature" integer DEFAULT 5,
    "leader_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "week_number" integer,
    "month_year" "text",
    "conversions" integer DEFAULT 0,
    "baptisms" integer DEFAULT 0,
    "first_time_visitors" integer DEFAULT 0,
    "cells_multiplied" integer DEFAULT 0,
    "leaders_trained" integer DEFAULT 0,
    "offering_amount" numeric(10,2) DEFAULT 0,
    "special_events" integer DEFAULT 0,
    CONSTRAINT "discipleship_metrics_spiritual_temperature_check" CHECK ((("spiritual_temperature" >= 1) AND ("spiritual_temperature" <= 10)))
);


ALTER TABLE "public"."discipleship_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discipleship_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "supervisor_id" "uuid",
    "report_level" integer NOT NULL,
    "report_type" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "report_data" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "discipleship_reports_report_level_check" CHECK ((("report_level" >= 1) AND ("report_level" <= 5))),
    CONSTRAINT "discipleship_reports_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'approved'::"text", 'needs_attention'::"text"])))
);


ALTER TABLE "public"."discipleship_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_streams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "youtube_video_id" "text",
    "title" "text" DEFAULT 'Servicio en Vivo'::"text" NOT NULL,
    "description" "text",
    "is_live" boolean DEFAULT false NOT NULL,
    "scheduled_start" timestamp with time zone,
    "actual_start" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_invitations" "text"
);


ALTER TABLE "public"."live_streams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."live_streams"."user_invitations" IS 'invitations for user';



CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "parameters" "jsonb",
    "generated_by" "uuid" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "file_url" "text",
    "status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "public"."role" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text",
    "id_number" "text",
    "assigned_role" "public"."user_role" DEFAULT 'server'::"public"."user_role" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid",
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "accepted_at" timestamp with time zone,
    "magic_link_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_name" "text" NOT NULL,
    "resource" "text" NOT NULL,
    "action" "text" NOT NULL,
    "granted" boolean DEFAULT true,
    "granted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "module_name" "text" NOT NULL,
    "profile_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_number" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "address" "text" NOT NULL,
    "email" "text" NOT NULL,
    "baptism_date" timestamp without time zone,
    "whatsapp" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "role" "public"."user_role" DEFAULT 'server'::"public"."user_role" NOT NULL,
    "baptized" boolean DEFAULT false,
    "birth_date" "date",
    "marital_status" "text",
    "occupation" "text",
    "education_level" "text",
    "how_found_church" "text",
    "ministry_interest" "text",
    "first_visit_date" "date",
    "is_active_member" boolean DEFAULT false,
    "membership_date" "date",
    "cell_group" "text",
    "cell_leader_id" "uuid",
    "pastoral_notes" "text",
    "is_active" boolean DEFAULT true,
    "discipleship_level" integer,
    "active_groups_count" integer DEFAULT 0,
    "zone_name" "text",
    "territory" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'User table with secure RLS policies - only authenticated users can access their own data';



COMMENT ON COLUMN "public"."users"."emergency_contact_name" IS 'name contact emergency';



COMMENT ON COLUMN "public"."users"."emergency_contact_phone" IS 'number contact emergency';



CREATE TABLE IF NOT EXISTS "public"."users_new" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cedula" "text" NOT NULL,
    "nombres" "text" NOT NULL,
    "apellidos" "text" NOT NULL,
    "telefono" "text" NOT NULL,
    "direccion" "text" NOT NULL,
    "correo" "text" NOT NULL,
    "fecha_bautizo" timestamp without time zone,
    "whatsapp" boolean DEFAULT false,
    "password_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."users_new" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users_old" (
    "id" "uuid",
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "id_number" "text",
    "phone" "text",
    "address" "text",
    "role" "public"."user_role",
    "birth_date" "date",
    "baptized" boolean,
    "baptism_date" timestamp without time zone,
    "zone_name" "text",
    "cell_leader_id" "uuid",
    "is_active" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "marital_status" "text",
    "occupation" "text",
    "education_level" "text",
    "how_found_church" "text",
    "ministry_interest" "text",
    "first_visit_date" "date",
    "is_active_member" boolean,
    "membership_date" "date",
    "cell_group" "text",
    "pastoral_notes" "text",
    "whatsapp" boolean,
    "territory" "text",
    "discipleship_level" integer,
    "active_groups_count" integer
);


ALTER TABLE "public"."users_old" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cell_multiplication_tracking"
    ADD CONSTRAINT "cell_multiplication_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discipleship_alerts"
    ADD CONSTRAINT "discipleship_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discipleship_goals"
    ADD CONSTRAINT "discipleship_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discipleship_groups"
    ADD CONSTRAINT "discipleship_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discipleship_hierarchy"
    ADD CONSTRAINT "discipleship_hierarchy_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discipleship_hierarchy"
    ADD CONSTRAINT "discipleship_hierarchy_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."discipleship_metrics"
    ADD CONSTRAINT "discipleship_metrics_group_id_week_date_key" UNIQUE ("group_id", "week_date");



ALTER TABLE ONLY "public"."discipleship_metrics"
    ADD CONSTRAINT "discipleship_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discipleship_reports"
    ADD CONSTRAINT "discipleship_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_streams"
    ADD CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_permission_name_resource_action_key" UNIQUE ("user_id", "permission_name", "resource", "action");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_module_name_key" UNIQUE ("user_id", "module_name");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_cedula_key" UNIQUE ("id_number");



ALTER TABLE ONLY "public"."users_new"
    ADD CONSTRAINT "users_cedula_key1" UNIQUE ("cedula");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_correo_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users_new"
    ADD CONSTRAINT "users_correo_key1" UNIQUE ("correo");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users_new"
    ADD CONSTRAINT "users_pkey1" PRIMARY KEY ("id");



CREATE INDEX "idx_discipleship_metrics_group_id_date" ON "public"."discipleship_metrics" USING "btree" ("group_id", "week_date");



CREATE INDEX "idx_discipleship_metrics_month_year" ON "public"."discipleship_metrics" USING "btree" ("month_year");



CREATE INDEX "idx_discipleship_metrics_week_date" ON "public"."discipleship_metrics" USING "btree" ("week_date");



CREATE INDEX "idx_users_active" ON "public"."users" USING "btree" ("is_active");



CREATE INDEX "idx_users_birth_date" ON "public"."users" USING "btree" ("birth_date");



CREATE INDEX "idx_users_cell_leader" ON "public"."users" USING "btree" ("cell_leader_id");



CREATE OR REPLACE TRIGGER "audit_discipleship_groups" AFTER INSERT OR DELETE OR UPDATE ON "public"."discipleship_groups" FOR EACH ROW EXECUTE FUNCTION "public"."log_user_changes"();



CREATE OR REPLACE TRIGGER "audit_discipleship_metrics" AFTER INSERT OR DELETE OR UPDATE ON "public"."discipleship_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."log_user_changes"();



CREATE OR REPLACE TRIGGER "update_cell_multiplication_tracking_updated_at" BEFORE UPDATE ON "public"."cell_multiplication_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discipleship_alerts_updated_at" BEFORE UPDATE ON "public"."discipleship_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discipleship_goals_updated_at" BEFORE UPDATE ON "public"."discipleship_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discipleship_groups_updated_at" BEFORE UPDATE ON "public"."discipleship_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discipleship_hierarchy_updated_at" BEFORE UPDATE ON "public"."discipleship_hierarchy" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discipleship_metrics_updated_at" BEFORE UPDATE ON "public"."discipleship_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discipleship_reports_updated_at" BEFORE UPDATE ON "public"."discipleship_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_live_streams_updated_at" BEFORE UPDATE ON "public"."live_streams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_audit_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."log_user_changes"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_cell_leader_id_fkey" FOREIGN KEY ("cell_leader_id") REFERENCES "public"."users"("id");



CREATE POLICY "Allow CRUD to pastors and staff" ON "public"."permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Allow CRUD to pastors and staff" ON "public"."role_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Allow user registration and service role operations" ON "public"."users" FOR INSERT WITH CHECK ((("auth"."uid"() = "id") OR ("auth"."role"() = 'service_role'::"text") OR ("auth"."uid"() IS NULL)));



COMMENT ON POLICY "Allow user registration and service role operations" ON "public"."users" IS 'Allows users to register themselves OR service role operations (like trigger-based inserts from handle_new_user).';



CREATE POLICY "Higher roles can delete profiles" ON "public"."user_profiles" FOR DELETE USING ("public"."can_access_user"("user_id"));



CREATE POLICY "Higher roles can delete subordinates" ON "public"."users" FOR DELETE USING ((("role" <> 'pastor'::"public"."user_role") AND "public"."can_access_user"("id") AND ("auth"."uid"() <> "id")));



CREATE POLICY "Leaders can insert metrics for their groups" ON "public"."discipleship_metrics" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."discipleship_groups" "dg"
  WHERE (("dg"."id" = "discipleship_metrics"."group_id") AND (("dg"."leader_id" = "auth"."uid"()) OR "public"."can_access_user"("dg"."leader_id"))))));



CREATE POLICY "Leaders can update metrics for their groups" ON "public"."discipleship_metrics" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."discipleship_groups" "dg"
  WHERE (("dg"."id" = "discipleship_metrics"."group_id") AND (("dg"."leader_id" = "auth"."uid"()) OR "public"."can_access_user"("dg"."leader_id"))))));



CREATE POLICY "Live streams are viewable by everyone" ON "public"."live_streams" FOR SELECT USING (true);



CREATE POLICY "Only pastor and staff can manage live streams" ON "public"."live_streams" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Only pastors and staff can generate and view reports" ON "public"."reports" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Only pastors and staff can view audit logs" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastor and staff can delete discipleship groups" ON "public"."discipleship_groups" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastor and staff can manage alerts" ON "public"."discipleship_alerts" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastor and staff can manage discipleship groups" ON "public"."discipleship_groups" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastor and staff can manage goals" ON "public"."discipleship_goals" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastor and staff can manage multiplication tracking" ON "public"."cell_multiplication_tracking" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastor and staff can update discipleship groups" ON "public"."discipleship_groups" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastor y Staff pueden actualizar invitaciones" ON "public"."user_invitations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastor y Staff pueden crear invitaciones" ON "public"."user_invitations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastor y Staff pueden ver invitaciones" ON "public"."user_invitations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Pastors and staff can manage all permissions" ON "public"."user_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Permitir lectura a usuarios autenticados" ON "public"."permissions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Permitir lectura a usuarios autenticados" ON "public"."role_permissions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Policy with security definer functions" ON "public"."permissions" TO "anon" USING (true);



CREATE POLICY "Policy with security definer functions" ON "public"."role_permissions" TO "anon" USING (true);



CREATE POLICY "Servicio puede insertar usuarios" ON "public"."users" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Servicio puede insertar usuarios" ON "public"."users_new" FOR INSERT WITH CHECK (((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text") OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Supervisors can delete metrics" ON "public"."discipleship_metrics" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."discipleship_groups" "dg"
  WHERE (("dg"."id" = "discipleship_metrics"."group_id") AND "public"."can_access_user"("dg"."leader_id")))));



CREATE POLICY "Supervisors can manage hierarchy" ON "public"."discipleship_hierarchy" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"]))))));



CREATE POLICY "Supervisors can view subordinate reports" ON "public"."discipleship_reports" FOR SELECT USING ("public"."can_access_user"("reporter_id"));



CREATE POLICY "Users can insert profiles" ON "public"."user_profiles" FOR INSERT WITH CHECK ("public"."can_access_user"("user_id"));



CREATE POLICY "Users can manage their own reports" ON "public"."discipleship_reports" USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can update accessible profiles" ON "public"."user_profiles" FOR UPDATE USING ("public"."can_access_user"("user_id"));



CREATE POLICY "Users can update accessible records" ON "public"."users" FOR UPDATE USING ("public"."can_access_user"("id"));



CREATE POLICY "Users can view accessible goals" ON "public"."discipleship_goals" FOR SELECT USING ((("supervisor_id" IS NULL) OR "public"."can_access_user"("supervisor_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"])))))));



CREATE POLICY "Users can view accessible groups" ON "public"."discipleship_groups" FOR SELECT USING (("public"."can_access_user"("leader_id") OR "public"."can_access_user"("supervisor_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"])))))));



CREATE POLICY "Users can view accessible hierarchy" ON "public"."discipleship_hierarchy" FOR SELECT USING ("public"."can_access_user"("user_id"));



CREATE POLICY "Users can view accessible metrics" ON "public"."discipleship_metrics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."discipleship_groups" "dg"
  WHERE (("dg"."id" = "discipleship_metrics"."group_id") AND ("public"."can_access_user"("dg"."leader_id") OR "public"."can_access_user"("dg"."supervisor_id"))))));



CREATE POLICY "Users can view accessible multiplication records" ON "public"."cell_multiplication_tracking" FOR SELECT USING (("public"."can_access_user"("parent_leader_id") OR "public"."can_access_user"("new_leader_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"])))))));



CREATE POLICY "Users can view accessible profiles" ON "public"."user_profiles" FOR SELECT USING ("public"."can_access_user"("user_id"));



CREATE POLICY "Users can view accessible records" ON "public"."users" FOR SELECT USING ("public"."can_access_user"("id"));



CREATE POLICY "Users can view their alerts" ON "public"."discipleship_alerts" FOR SELECT USING ((("related_user_id" = "auth"."uid"()) OR "public"."can_access_user"("related_user_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"])))))));



CREATE POLICY "Users can view their own permissions" ON "public"."user_permissions" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['pastor'::"public"."user_role", 'staff'::"public"."user_role"])))))));



CREATE POLICY "Usuarios pueden actualizar su propia información" ON "public"."users_new" FOR UPDATE USING (((("auth"."uid"())::"text" = ("id")::"text") OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Usuarios pueden ver su propia información" ON "public"."users_new" FOR SELECT USING (((("auth"."uid"())::"text" = ("id")::"text") OR (("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text")));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cell_multiplication_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discipleship_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discipleship_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discipleship_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discipleship_hierarchy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discipleship_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discipleship_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_streams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users_new" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users_old" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."calculate_discipleship_stats"("zone_filter" "text", "date_from" "date", "date_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_discipleship_stats"("zone_filter" "text", "date_from" "date", "date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_discipleship_stats"("zone_filter" "text", "date_from" "date", "date_to" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_user"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_user"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."exec_sql"("sql" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_user_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_user_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_user_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_expired_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_expired_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_expired_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



























GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cell_multiplication_tracking" TO "anon";
GRANT ALL ON TABLE "public"."cell_multiplication_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."cell_multiplication_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."discipleship_alerts" TO "anon";
GRANT ALL ON TABLE "public"."discipleship_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."discipleship_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."discipleship_goals" TO "anon";
GRANT ALL ON TABLE "public"."discipleship_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."discipleship_goals" TO "service_role";



GRANT ALL ON TABLE "public"."discipleship_groups" TO "anon";
GRANT ALL ON TABLE "public"."discipleship_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."discipleship_groups" TO "service_role";



GRANT ALL ON TABLE "public"."discipleship_hierarchy" TO "anon";
GRANT ALL ON TABLE "public"."discipleship_hierarchy" TO "authenticated";
GRANT ALL ON TABLE "public"."discipleship_hierarchy" TO "service_role";



GRANT ALL ON TABLE "public"."discipleship_metrics" TO "anon";
GRANT ALL ON TABLE "public"."discipleship_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."discipleship_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."discipleship_reports" TO "anon";
GRANT ALL ON TABLE "public"."discipleship_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."discipleship_reports" TO "service_role";



GRANT ALL ON TABLE "public"."live_streams" TO "anon";
GRANT ALL ON TABLE "public"."live_streams" TO "authenticated";
GRANT ALL ON TABLE "public"."live_streams" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."users_new" TO "anon";
GRANT ALL ON TABLE "public"."users_new" TO "authenticated";
GRANT ALL ON TABLE "public"."users_new" TO "service_role";



GRANT ALL ON TABLE "public"."users_old" TO "anon";
GRANT ALL ON TABLE "public"."users_old" TO "authenticated";
GRANT ALL ON TABLE "public"."users_old" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























