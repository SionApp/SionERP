export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_multiplication_tracking: {
        Row: {
          created_at: string
          id: string
          initial_members: number | null
          multiplication_date: string
          multiplication_type: string | null
          new_group_id: string | null
          new_leader_id: string | null
          notes: string | null
          parent_group_id: string
          parent_leader_id: string
          success_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          initial_members?: number | null
          multiplication_date: string
          multiplication_type?: string | null
          new_group_id?: string | null
          new_leader_id?: string | null
          notes?: string | null
          parent_group_id: string
          parent_leader_id: string
          success_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          initial_members?: number | null
          multiplication_date?: string
          multiplication_type?: string | null
          new_group_id?: string | null
          new_leader_id?: string | null
          notes?: string | null
          parent_group_id?: string
          parent_leader_id?: string
          success_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      church_info: {
        Row: {
          address: string | null
          banner_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          mission: string | null
          name: string
          pastor_name: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          service_times: Json | null
          social_facebook: string | null
          social_instagram: string | null
          social_twitter: string | null
          social_youtube: string | null
          updated_at: string | null
          vision: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          mission?: string | null
          name?: string
          pastor_name?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          service_times?: Json | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          updated_at?: string | null
          vision?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          mission?: string | null
          name?: string
          pastor_name?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          service_times?: Json | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          updated_at?: string | null
          vision?: string | null
          website?: string | null
        }
        Relationships: []
      }
      discipleship_alerts: {
        Row: {
          action_required: boolean | null
          alert_type: string
          created_at: string
          expires_at: string | null
          id: string
          message: string
          priority: number | null
          related_group_id: string | null
          related_user_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          title: string
          updated_at: string
          zone_name: string | null
        }
        Insert: {
          action_required?: boolean | null
          alert_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          priority?: number | null
          related_group_id?: string | null
          related_user_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          title: string
          updated_at?: string
          zone_name?: string | null
        }
        Update: {
          action_required?: boolean | null
          alert_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          priority?: number | null
          related_group_id?: string | null
          related_user_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          title?: string
          updated_at?: string
          zone_name?: string | null
        }
        Relationships: []
      }
      discipleship_goals: {
        Row: {
          created_at: string
          current_value: number | null
          deadline: string
          description: string | null
          goal_type: string
          id: string
          progress_percentage: number | null
          status: string | null
          supervisor_id: string | null
          target_metric: string
          target_value: number
          updated_at: string
          zone_name: string | null
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          deadline: string
          description?: string | null
          goal_type: string
          id?: string
          progress_percentage?: number | null
          status?: string | null
          supervisor_id?: string | null
          target_metric: string
          target_value: number
          updated_at?: string
          zone_name?: string | null
        }
        Update: {
          created_at?: string
          current_value?: number | null
          deadline?: string
          description?: string | null
          goal_type?: string
          id?: string
          progress_percentage?: number | null
          status?: string | null
          supervisor_id?: string | null
          target_metric?: string
          target_value?: number
          updated_at?: string
          zone_name?: string | null
        }
        Relationships: []
      }
      discipleship_groups: {
        Row: {
          active_members: number | null
          created_at: string
          group_name: string
          id: string
          leader_id: string
          meeting_day: string | null
          meeting_location: string | null
          meeting_time: string | null
          member_count: number | null
          status: string | null
          supervisor_id: string | null
          updated_at: string
          zone_name: string | null
        }
        Insert: {
          active_members?: number | null
          created_at?: string
          group_name: string
          id?: string
          leader_id: string
          meeting_day?: string | null
          meeting_location?: string | null
          meeting_time?: string | null
          member_count?: number | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string
          zone_name?: string | null
        }
        Update: {
          active_members?: number | null
          created_at?: string
          group_name?: string
          id?: string
          leader_id?: string
          meeting_day?: string | null
          meeting_location?: string | null
          meeting_time?: string | null
          member_count?: number | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string
          zone_name?: string | null
        }
        Relationships: []
      }
      discipleship_hierarchy: {
        Row: {
          active_groups_assigned: number | null
          created_at: string
          hierarchy_level: number
          id: string
          supervisor_id: string | null
          territory: string | null
          updated_at: string
          user_id: string
          zone_name: string | null
        }
        Insert: {
          active_groups_assigned?: number | null
          created_at?: string
          hierarchy_level: number
          id?: string
          supervisor_id?: string | null
          territory?: string | null
          updated_at?: string
          user_id: string
          zone_name?: string | null
        }
        Update: {
          active_groups_assigned?: number | null
          created_at?: string
          hierarchy_level?: number
          id?: string
          supervisor_id?: string | null
          territory?: string | null
          updated_at?: string
          user_id?: string
          zone_name?: string | null
        }
        Relationships: []
      }
      discipleship_metrics: {
        Row: {
          attendance: number | null
          baptisms: number | null
          cells_multiplied: number | null
          conversions: number | null
          created_at: string
          first_time_visitors: number | null
          group_id: string
          id: string
          leader_notes: string | null
          leaders_trained: number | null
          month_year: string | null
          new_visitors: number | null
          offering_amount: number | null
          prayer_requests: number | null
          returning_visitors: number | null
          special_events: number | null
          spiritual_temperature: number | null
          testimonies_count: number | null
          updated_at: string
          week_date: string
          week_number: number | null
        }
        Insert: {
          attendance?: number | null
          baptisms?: number | null
          cells_multiplied?: number | null
          conversions?: number | null
          created_at?: string
          first_time_visitors?: number | null
          group_id: string
          id?: string
          leader_notes?: string | null
          leaders_trained?: number | null
          month_year?: string | null
          new_visitors?: number | null
          offering_amount?: number | null
          prayer_requests?: number | null
          returning_visitors?: number | null
          special_events?: number | null
          spiritual_temperature?: number | null
          testimonies_count?: number | null
          updated_at?: string
          week_date: string
          week_number?: number | null
        }
        Update: {
          attendance?: number | null
          baptisms?: number | null
          cells_multiplied?: number | null
          conversions?: number | null
          created_at?: string
          first_time_visitors?: number | null
          group_id?: string
          id?: string
          leader_notes?: string | null
          leaders_trained?: number | null
          month_year?: string | null
          new_visitors?: number | null
          offering_amount?: number | null
          prayer_requests?: number | null
          returning_visitors?: number | null
          special_events?: number | null
          spiritual_temperature?: number | null
          testimonies_count?: number | null
          updated_at?: string
          week_date?: string
          week_number?: number | null
        }
        Relationships: []
      }
      discipleship_reports: {
        Row: {
          approved_at: string | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          report_data: Json | null
          report_level: number
          report_type: string
          reporter_id: string
          status: string | null
          submitted_at: string | null
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          report_data?: Json | null
          report_level: number
          report_type: string
          reporter_id: string
          status?: string | null
          submitted_at?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          report_data?: Json | null
          report_level?: number
          report_type?: string
          reporter_id?: string
          status?: string | null
          submitted_at?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          actual_start: string | null
          created_at: string
          description: string | null
          id: string
          is_live: boolean
          scheduled_start: string | null
          title: string
          updated_at: string
          user_invitations: string | null
          youtube_video_id: string | null
        }
        Insert: {
          actual_start?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_live?: boolean
          scheduled_start?: string | null
          title?: string
          updated_at?: string
          user_invitations?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          actual_start?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_live?: boolean
          scheduled_start?: string | null
          title?: string
          updated_at?: string
          user_invitations?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      notification_config: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          event_reminders: boolean | null
          id: string
          important_messages: boolean | null
          new_user_notifications: boolean | null
          push_enabled: boolean | null
          role_change_notifications: boolean | null
          sms_enabled: boolean | null
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string | null
          weekly_reports: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          event_reminders?: boolean | null
          id?: string
          important_messages?: boolean | null
          new_user_notifications?: boolean | null
          push_enabled?: boolean | null
          role_change_notifications?: boolean | null
          sms_enabled?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
          weekly_reports?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          event_reminders?: boolean | null
          id?: string
          important_messages?: boolean | null
          new_user_notifications?: boolean | null
          push_enabled?: boolean | null
          role_change_notifications?: boolean | null
          sms_enabled?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
          weekly_reports?: boolean | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          file_url: string | null
          generated_at: string | null
          generated_by: string
          id: string
          parameters: Json | null
          status: string | null
          title: string
          type: string
        }
        Insert: {
          file_url?: string | null
          generated_at?: string | null
          generated_by: string
          id?: string
          parameters?: Json | null
          status?: string | null
          title: string
          type: string
        }
        Update: {
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string
          id?: string
          parameters?: Json | null
          status?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          table_name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          allow_registrations: boolean | null
          animations_enabled: boolean | null
          created_at: string | null
          default_language: string | null
          default_theme: string | null
          id: string
          maintenance_mode: boolean | null
          max_users_per_group: number | null
          session_timeout_minutes: number | null
          sidebar_collapsed: boolean | null
          site_name: string
          site_version: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          allow_registrations?: boolean | null
          animations_enabled?: boolean | null
          created_at?: string | null
          default_language?: string | null
          default_theme?: string | null
          id?: string
          maintenance_mode?: boolean | null
          max_users_per_group?: number | null
          session_timeout_minutes?: number | null
          sidebar_collapsed?: boolean | null
          site_name?: string
          site_version?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_registrations?: boolean | null
          animations_enabled?: boolean | null
          created_at?: string | null
          default_language?: string | null
          default_theme?: string | null
          id?: string
          maintenance_mode?: boolean | null
          max_users_per_group?: number | null
          session_timeout_minutes?: number | null
          sidebar_collapsed?: boolean | null
          site_name?: string
          site_version?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          assigned_role: Database["public"]["Enums"]["user_role"]
          created_at: string | null
          email: string
          expires_at: string | null
          first_name: string
          id: string
          id_number: string | null
          invited_at: string | null
          invited_by: string | null
          last_name: string
          magic_link_hash: string | null
          phone: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_role?: Database["public"]["Enums"]["user_role"]
          created_at?: string | null
          email: string
          expires_at?: string | null
          first_name: string
          id?: string
          id_number?: string | null
          invited_at?: string | null
          invited_by?: string | null
          last_name: string
          magic_link_hash?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_role?: Database["public"]["Enums"]["user_role"]
          created_at?: string | null
          email?: string
          expires_at?: string | null
          first_name?: string
          id?: string
          id_number?: string | null
          invited_at?: string | null
          invited_by?: string | null
          last_name?: string
          magic_link_hash?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          action: string
          created_at: string | null
          granted: boolean | null
          granted_by: string | null
          id: string
          permission_name: string
          resource: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          granted?: boolean | null
          granted_by?: string | null
          id?: string
          permission_name: string
          resource: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          granted?: boolean | null
          granted_by?: string | null
          id?: string
          permission_name?: string
          resource?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          event_reminders: boolean | null
          id: string
          language: string | null
          profile_visibility: string | null
          push_notifications: boolean | null
          show_email: boolean | null
          show_phone: boolean | null
          sms_notifications: boolean | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          weekly_newsletter: boolean | null
          whatsapp_notifications: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          event_reminders?: boolean | null
          id?: string
          language?: string | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          weekly_newsletter?: boolean | null
          whatsapp_notifications?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          event_reminders?: boolean | null
          id?: string
          language?: string | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_newsletter?: boolean | null
          whatsapp_notifications?: boolean | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          id: string
          module_name: string
          profile_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_name: string
          profile_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_name?: string
          profile_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          active_groups_count: number | null
          address: string
          baptism_date: string | null
          baptized: boolean | null
          birth_date: string | null
          cell_group: string | null
          cell_leader_id: string | null
          created_at: string | null
          discipleship_level: number | null
          education_level: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          first_visit_date: string | null
          how_found_church: string | null
          id: string
          id_number: string
          is_active: boolean | null
          is_active_member: boolean | null
          last_name: string
          marital_status: string | null
          membership_date: string | null
          ministry_interest: string | null
          occupation: string | null
          pastoral_notes: string | null
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          territory: string | null
          updated_at: string | null
          whatsapp: boolean | null
          zone_name: string | null
        }
        Insert: {
          active_groups_count?: number | null
          address: string
          baptism_date?: string | null
          baptized?: boolean | null
          birth_date?: string | null
          cell_group?: string | null
          cell_leader_id?: string | null
          created_at?: string | null
          discipleship_level?: number | null
          education_level?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          first_visit_date?: string | null
          how_found_church?: string | null
          id?: string
          id_number: string
          is_active?: boolean | null
          is_active_member?: boolean | null
          last_name: string
          marital_status?: string | null
          membership_date?: string | null
          ministry_interest?: string | null
          occupation?: string | null
          pastoral_notes?: string | null
          phone: string
          role?: Database["public"]["Enums"]["user_role"]
          territory?: string | null
          updated_at?: string | null
          whatsapp?: boolean | null
          zone_name?: string | null
        }
        Update: {
          active_groups_count?: number | null
          address?: string
          baptism_date?: string | null
          baptized?: boolean | null
          birth_date?: string | null
          cell_group?: string | null
          cell_leader_id?: string | null
          created_at?: string | null
          discipleship_level?: number | null
          education_level?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          first_visit_date?: string | null
          how_found_church?: string | null
          id?: string
          id_number?: string
          is_active?: boolean | null
          is_active_member?: boolean | null
          last_name?: string
          marital_status?: string | null
          membership_date?: string | null
          ministry_interest?: string | null
          occupation?: string | null
          pastoral_notes?: string | null
          phone?: string
          role?: Database["public"]["Enums"]["user_role"]
          territory?: string | null
          updated_at?: string | null
          whatsapp?: boolean | null
          zone_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_cell_leader_id_fkey"
            columns: ["cell_leader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users_new: {
        Row: {
          apellidos: string
          cedula: string
          correo: string
          created_at: string | null
          direccion: string
          fecha_bautizo: string | null
          id: string
          nombres: string
          password_hash: string
          telefono: string
          updated_at: string | null
          whatsapp: boolean | null
        }
        Insert: {
          apellidos: string
          cedula: string
          correo: string
          created_at?: string | null
          direccion: string
          fecha_bautizo?: string | null
          id?: string
          nombres: string
          password_hash: string
          telefono: string
          updated_at?: string | null
          whatsapp?: boolean | null
        }
        Update: {
          apellidos?: string
          cedula?: string
          correo?: string
          created_at?: string | null
          direccion?: string
          fecha_bautizo?: string | null
          id?: string
          nombres?: string
          password_hash?: string
          telefono?: string
          updated_at?: string | null
          whatsapp?: boolean | null
        }
        Relationships: []
      }
      users_old: {
        Row: {
          active_groups_count: number | null
          address: string | null
          baptism_date: string | null
          baptized: boolean | null
          birth_date: string | null
          cell_group: string | null
          cell_leader_id: string | null
          created_at: string | null
          discipleship_level: number | null
          education_level: string | null
          email: string | null
          first_name: string | null
          first_visit_date: string | null
          how_found_church: string | null
          id: string | null
          id_number: string | null
          is_active: boolean | null
          is_active_member: boolean | null
          last_name: string | null
          marital_status: string | null
          membership_date: string | null
          ministry_interest: string | null
          occupation: string | null
          pastoral_notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          territory: string | null
          updated_at: string | null
          whatsapp: boolean | null
          zone_name: string | null
        }
        Insert: {
          active_groups_count?: number | null
          address?: string | null
          baptism_date?: string | null
          baptized?: boolean | null
          birth_date?: string | null
          cell_group?: string | null
          cell_leader_id?: string | null
          created_at?: string | null
          discipleship_level?: number | null
          education_level?: string | null
          email?: string | null
          first_name?: string | null
          first_visit_date?: string | null
          how_found_church?: string | null
          id?: string | null
          id_number?: string | null
          is_active?: boolean | null
          is_active_member?: boolean | null
          last_name?: string | null
          marital_status?: string | null
          membership_date?: string | null
          ministry_interest?: string | null
          occupation?: string | null
          pastoral_notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          territory?: string | null
          updated_at?: string | null
          whatsapp?: boolean | null
          zone_name?: string | null
        }
        Update: {
          active_groups_count?: number | null
          address?: string | null
          baptism_date?: string | null
          baptized?: boolean | null
          birth_date?: string | null
          cell_group?: string | null
          cell_leader_id?: string | null
          created_at?: string | null
          discipleship_level?: number | null
          education_level?: string | null
          email?: string | null
          first_name?: string | null
          first_visit_date?: string | null
          how_found_church?: string | null
          id?: string | null
          id_number?: string | null
          is_active?: boolean | null
          is_active_member?: boolean | null
          last_name?: string | null
          marital_status?: string | null
          membership_date?: string | null
          ministry_interest?: string | null
          occupation?: string | null
          pastoral_notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          territory?: string | null
          updated_at?: string | null
          whatsapp?: boolean | null
          zone_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_discipleship_stats: {
        Args: { date_from?: string; date_to?: string; zone_filter?: string }
        Returns: Json
      }
      can_access_user: { Args: { target_user_id: string }; Returns: boolean }
      exec_sql: { Args: { sql: string }; Returns: Json }
      get_current_user_role: { Args: never; Returns: string }
      get_user_role: { Args: { user_uuid: string }; Returns: string }
      update_expired_invitations: { Args: never; Returns: undefined }
    }
    Enums: {
      role: "admin" | "staff" | "usuario"
      user_role: "pastor" | "staff" | "supervisor" | "server"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      role: ["admin", "staff", "usuario"],
      user_role: ["pastor", "staff", "supervisor", "server"],
    },
  },
} as const

