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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          created_at: string
          id: string
          metadata: Json
          resource: string
          resource_id: string | null
          result: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource: string
          resource_id?: string | null
          result?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource?: string
          resource_id?: string | null
          result?: string
          user_id?: string | null
        }
        Relationships: []
      }
      evidence_conflicts: {
        Row: {
          detected_at: string
          evidence_a: string
          evidence_b: string
          facility_id: string
          id: string
          note: string | null
          resolved: boolean
          service_id: string
        }
        Insert: {
          detected_at?: string
          evidence_a: string
          evidence_b: string
          facility_id: string
          id?: string
          note?: string | null
          resolved?: boolean
          service_id: string
        }
        Update: {
          detected_at?: string
          evidence_a?: string
          evidence_b?: string
          facility_id?: string
          id?: string
          note?: string | null
          resolved?: boolean
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_conflicts_evidence_a_fkey"
            columns: ["evidence_a"]
            isOneToOne: false
            referencedRelation: "evidence_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_conflicts_evidence_b_fkey"
            columns: ["evidence_b"]
            isOneToOne: false
            referencedRelation: "evidence_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_conflicts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_conflicts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_events: {
        Row: {
          created_at: string
          created_by: string | null
          duplicate_of: string | null
          facility_id: string
          id: string
          is_duplicate: boolean
          notes: string | null
          observation: string
          observed_at: string
          referral_id: string | null
          service_id: string
          source: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duplicate_of?: string | null
          facility_id: string
          id?: string
          is_duplicate?: boolean
          notes?: string | null
          observation: string
          observed_at?: string
          referral_id?: string | null
          service_id: string
          source: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duplicate_of?: string | null
          facility_id?: string
          id?: string
          is_duplicate?: boolean
          notes?: string | null
          observation?: string
          observed_at?: string
          referral_id?: string | null
          service_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_events_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "evidence_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_events_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_events_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          code: string
          contact: string | null
          created_at: string
          created_by: string | null
          district: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          district: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          district?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      facility_services: {
        Row: {
          blocked_reason: string | null
          facility_id: string
          id: string
          is_blocked: boolean
          is_registered: boolean
          service_id: string
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          facility_id: string
          id?: string
          is_blocked?: boolean
          is_registered?: boolean
          service_id: string
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          facility_id?: string
          id?: string
          is_blocked?: boolean
          is_registered?: boolean
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_services_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          referral_id: string | null
          role_scope: Database["public"]["Enums"]["app_role"] | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          referral_id?: string | null
          role_scope?: Database["public"]["Enums"]["app_role"] | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          referral_id?: string | null
          role_scope?: Database["public"]["Enums"]["app_role"] | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          district: string | null
          email: string
          facility_id: string | null
          full_name: string
          id: string
          last_login: string | null
        }
        Insert: {
          created_at?: string
          district?: string | null
          email: string
          facility_id?: string | null
          full_name?: string
          id: string
          last_login?: string | null
        }
        Update: {
          created_at?: string
          district?: string | null
          email?: string
          facility_id?: string | null
          full_name?: string
          id?: string
          last_login?: string | null
        }
        Relationships: []
      }
      referral_outcomes: {
        Row: {
          id: string
          notes: string | null
          outcome: string
          recorded_at: string
          recorded_by: string | null
          referral_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          outcome: string
          recorded_at?: string
          recorded_by?: string | null
          referral_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          outcome?: string
          recorded_at?: string
          recorded_by?: string | null
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_outcomes_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: true
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          note: string | null
          referral_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          referral_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          referral_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_status_history_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          created_by: string | null
          destination_facility_id: string
          evidence_snapshot: Json
          id: string
          max_distance_km: number | null
          notes: string | null
          origin_facility_id: string
          patient_ref: string
          referral_code: string
          selected_distance_km: number | null
          selected_eri: number | null
          service_id: string
          status: string
          token: string
          updated_at: string
          urgency: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination_facility_id: string
          evidence_snapshot?: Json
          id?: string
          max_distance_km?: number | null
          notes?: string | null
          origin_facility_id: string
          patient_ref: string
          referral_code: string
          selected_distance_km?: number | null
          selected_eri?: number | null
          service_id: string
          status?: string
          token: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination_facility_id?: string
          evidence_snapshot?: Json
          id?: string
          max_distance_km?: number | null
          notes?: string | null
          origin_facility_id?: string
          patient_ref?: string
          referral_code?: string
          selected_distance_km?: number | null
          selected_eri?: number | null
          service_id?: string
          status?: string
          token?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_destination_facility_id_fkey"
            columns: ["destination_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_origin_facility_id_fkey"
            columns: ["origin_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "ADMIN"
        | "DISTRICT_SUPERVISOR"
        | "FACILITY_STAFF"
        | "REFERRAL_WORKER"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "ADMIN",
        "DISTRICT_SUPERVISOR",
        "FACILITY_STAFF",
        "REFERRAL_WORKER",
      ],
    },
  },
} as const
