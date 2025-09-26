export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
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
          created_at: string
          group_id: string
          id: string
          leader_notes: string | null
          new_visitors: number | null
          prayer_requests: number | null
          returning_visitors: number | null
          spiritual_temperature: number | null
          testimonies_count: number | null
          updated_at: string
          week_date: string
        }
        Insert: {
          attendance?: number | null
          created_at?: string
          group_id: string
          id?: string
          leader_notes?: string | null
          new_visitors?: number | null
          prayer_requests?: number | null
          returning_visitors?: number | null
          spiritual_temperature?: number | null
          testimonies_count?: number | null
          updated_at?: string
          week_date: string
        }
        Update: {
          attendance?: number | null
          created_at?: string
          group_id?: string
          id?: string
          leader_notes?: string | null
          new_visitors?: number | null
          prayer_requests?: number | null
          returning_visitors?: number | null
          spiritual_temperature?: number | null
          testimonies_count?: number | null
          updated_at?: string
          week_date?: string
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
          youtube_video_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      exec_sql: {
        Args: { sql: string }
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: string
      }
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
  public: {
    Enums: {
      role: ["admin", "staff", "usuario"],
      user_role: ["pastor", "staff", "supervisor", "server"],
    },
  },
} as const
