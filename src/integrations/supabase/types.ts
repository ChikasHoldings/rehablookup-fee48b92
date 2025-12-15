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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_activity_log: {
        Row: {
          created_at: string
          event_description: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_description: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_description?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_user_notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          force_password_change: boolean | null
          id: string
          last_login_at: string | null
          status: string
          temp_password_expires_at: string | null
          temp_password_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          force_password_change?: boolean | null
          id?: string
          last_login_at?: string | null
          status?: string
          temp_password_expires_at?: string | null
          temp_password_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          force_password_change?: boolean | null
          id?: string
          last_login_at?: string | null
          status?: string
          temp_password_expires_at?: string | null
          temp_password_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string
          admin_notes: string | null
          bed_count: string | null
          city: string
          created_at: string
          description: string | null
          email: string | null
          facility_type: string
          featured: boolean
          featured_pinned: boolean | null
          gallery_urls: string[] | null
          gender_served: string | null
          id: string
          last_featured_shown_at: string | null
          lead_limit_override: number | null
          logo_url: string | null
          name: string
          phone: string
          profile_completion_celebrated: boolean | null
          profile_reminder_count: number | null
          profile_reminder_sent_at: string | null
          slug: string | null
          state: string
          status: string
          suspended: boolean | null
          updated_at: string
          user_id: string
          verified: boolean | null
          website: string | null
          zip_code: string
        }
        Insert: {
          address: string
          admin_notes?: string | null
          bed_count?: string | null
          city: string
          created_at?: string
          description?: string | null
          email?: string | null
          facility_type: string
          featured?: boolean
          featured_pinned?: boolean | null
          gallery_urls?: string[] | null
          gender_served?: string | null
          id?: string
          last_featured_shown_at?: string | null
          lead_limit_override?: number | null
          logo_url?: string | null
          name: string
          phone: string
          profile_completion_celebrated?: boolean | null
          profile_reminder_count?: number | null
          profile_reminder_sent_at?: string | null
          slug?: string | null
          state: string
          status?: string
          suspended?: boolean | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          website?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          admin_notes?: string | null
          bed_count?: string | null
          city?: string
          created_at?: string
          description?: string | null
          email?: string | null
          facility_type?: string
          featured?: boolean
          featured_pinned?: boolean | null
          gallery_urls?: string[] | null
          gender_served?: string | null
          id?: string
          last_featured_shown_at?: string | null
          lead_limit_override?: number | null
          logo_url?: string | null
          name?: string
          phone?: string
          profile_completion_celebrated?: boolean | null
          profile_reminder_count?: number | null
          profile_reminder_sent_at?: string | null
          slug?: string | null
          state?: string
          status?: string
          suspended?: boolean | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          website?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      facility_age_groups: {
        Row: {
          age_group: string
          created_at: string
          facility_id: string
          id: string
        }
        Insert: {
          age_group: string
          created_at?: string
          facility_id: string
          id?: string
        }
        Update: {
          age_group?: string
          created_at?: string
          facility_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_age_groups_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_credentials: {
        Row: {
          accreditations: string | null
          created_at: string
          facility_id: string
          id: string
          licensing_info: string | null
        }
        Insert: {
          accreditations?: string | null
          created_at?: string
          facility_id: string
          id?: string
          licensing_info?: string | null
        }
        Update: {
          accreditations?: string | null
          created_at?: string
          facility_id?: string
          id?: string
          licensing_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_credentials_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_insurance: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          insurance_name: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          insurance_name: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          insurance_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_insurance_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_interactions: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          interaction_count: number
          interaction_date: string
          interaction_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          interaction_count?: number
          interaction_date?: string
          interaction_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          interaction_count?: number
          interaction_date?: string
          interaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_interactions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_services: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          service_name: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          service_name: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_services_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_views: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          updated_at: string
          view_count: number
          view_date: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          updated_at?: string
          view_count?: number
          view_date?: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          updated_at?: string
          view_count?: number
          view_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_views_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      flagged_images: {
        Row: {
          facility_id: string
          flagged_at: string
          flagged_by: string
          id: string
          image_type: string
          image_url: string
          reason: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          facility_id: string
          flagged_at?: string
          flagged_by: string
          id?: string
          image_type: string
          image_url: string
          reason?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          facility_id?: string
          flagged_at?: string
          flagged_by?: string
          id?: string
          image_type?: string
          image_url?: string
          reason?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flagged_images_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_emails: {
        Row: {
          created_at: string
          custom_note: string | null
          facility_id: string
          id: string
          lead_id: string
          recipient_email: string
          resend_id: string | null
          sender_name: string
          sender_user_id: string
          status: string
          template_id: string
          template_name: string
        }
        Insert: {
          created_at?: string
          custom_note?: string | null
          facility_id: string
          id?: string
          lead_id: string
          recipient_email: string
          resend_id?: string | null
          sender_name: string
          sender_user_id: string
          status?: string
          template_id: string
          template_name: string
        }
        Update: {
          created_at?: string
          custom_note?: string | null
          facility_id?: string
          id?: string
          lead_id?: string
          recipient_email?: string
          resend_id?: string | null
          sender_name?: string
          sender_user_id?: string
          status?: string
          template_id?: string
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_emails_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          note: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          note: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_at: string | null
          assignment_reason: string | null
          assignment_status: string | null
          budget_preference: string | null
          created_at: string
          dual_diagnosis: string | null
          email: string
          email_verified: boolean | null
          facility_id: string | null
          follow_up_reminder_sent_at: string | null
          id: string
          insurance_provider: string | null
          insurance_type: string | null
          ip_hash: string | null
          level_of_care: string | null
          location_city_state: string | null
          location_zip: string | null
          message: string | null
          name: string
          phone: string
          preferred_contact: string
          primary_substance: string[] | null
          qualification_reason: string | null
          qualified: boolean | null
          quality_flag: string | null
          snooze_until: string | null
          source: string | null
          status: string
          urgency: string | null
          validation_status: string | null
          who_seeking_help: string | null
        }
        Insert: {
          assigned_at?: string | null
          assignment_reason?: string | null
          assignment_status?: string | null
          budget_preference?: string | null
          created_at?: string
          dual_diagnosis?: string | null
          email: string
          email_verified?: boolean | null
          facility_id?: string | null
          follow_up_reminder_sent_at?: string | null
          id?: string
          insurance_provider?: string | null
          insurance_type?: string | null
          ip_hash?: string | null
          level_of_care?: string | null
          location_city_state?: string | null
          location_zip?: string | null
          message?: string | null
          name: string
          phone: string
          preferred_contact?: string
          primary_substance?: string[] | null
          qualification_reason?: string | null
          qualified?: boolean | null
          quality_flag?: string | null
          snooze_until?: string | null
          source?: string | null
          status?: string
          urgency?: string | null
          validation_status?: string | null
          who_seeking_help?: string | null
        }
        Update: {
          assigned_at?: string | null
          assignment_reason?: string | null
          assignment_status?: string | null
          budget_preference?: string | null
          created_at?: string
          dual_diagnosis?: string | null
          email?: string
          email_verified?: boolean | null
          facility_id?: string | null
          follow_up_reminder_sent_at?: string | null
          id?: string
          insurance_provider?: string | null
          insurance_type?: string | null
          ip_hash?: string | null
          level_of_care?: string | null
          location_city_state?: string | null
          location_zip?: string | null
          message?: string | null
          name?: string
          phone?: string
          preferred_contact?: string
          primary_substance?: string[] | null
          qualification_reason?: string | null
          qualified?: boolean | null
          quality_flag?: string | null
          snooze_until?: string | null
          source?: string | null
          status?: string
          urgency?: string | null
          validation_status?: string | null
          who_seeking_help?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          browser_notifications: boolean
          created_at: string
          default_snooze_duration: string | null
          digest_time: string | null
          email_lead_alerts: boolean
          email_product_updates: boolean
          email_weekly_digest: boolean
          followup_reminders_enabled: boolean | null
          id: string
          last_digest_sent_at: string | null
          lead_notification_frequency: string | null
          notify_facility_views: boolean | null
          notify_lead_limit_warnings: boolean | null
          notify_lead_status_changes: boolean | null
          notify_new_leads: boolean | null
          sms_lead_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_notifications?: boolean
          created_at?: string
          default_snooze_duration?: string | null
          digest_time?: string | null
          email_lead_alerts?: boolean
          email_product_updates?: boolean
          email_weekly_digest?: boolean
          followup_reminders_enabled?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          lead_notification_frequency?: string | null
          notify_facility_views?: boolean | null
          notify_lead_limit_warnings?: boolean | null
          notify_lead_status_changes?: boolean | null
          notify_new_leads?: boolean | null
          sms_lead_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_notifications?: boolean
          created_at?: string
          default_snooze_duration?: string | null
          digest_time?: string | null
          email_lead_alerts?: boolean
          email_product_updates?: boolean
          email_weekly_digest?: boolean
          followup_reminders_enabled?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          lead_notification_frequency?: string | null
          notify_facility_views?: boolean | null
          notify_lead_limit_warnings?: boolean | null
          notify_lead_status_changes?: boolean | null
          notify_new_leads?: boolean | null
          sms_lead_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          phone: string | null
          primary_contact_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          phone?: string | null
          primary_contact_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          phone?: string | null
          primary_contact_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_notifications: {
        Row: {
          created_at: string
          facility_id: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_notifications_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      request_help_analytics: {
        Row: {
          created_at: string
          event_type: string
          facility_id: string | null
          id: string
          metadata: Json | null
          source: string
          step_number: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          facility_id?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          step_number?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          facility_id?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          step_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "request_help_analytics_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_alerts: {
        Row: {
          alert_key: string
          alert_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          alert_key: string
          alert_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          alert_key?: string
          alert_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      template_tags: {
        Row: {
          created_at: string
          example_value: string
          fallback: string | null
          id: string
          is_required: boolean
          key: string
          label: string
          path: string
          source: string
        }
        Insert: {
          created_at?: string
          example_value: string
          fallback?: string | null
          id?: string
          is_required?: boolean
          key: string
          label: string
          path: string
          source: string
        }
        Update: {
          created_at?: string
          example_value?: string
          fallback?: string | null
          id?: string
          is_required?: boolean
          key?: string
          label?: string
          path?: string
          source?: string
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
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string | null
          device_name: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_current: boolean | null
          last_active_at: string | null
          location: string | null
          os: string | null
          revoked_at: string | null
          session_token: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string | null
          location?: string | null
          os?: string | null
          revoked_at?: string | null
          session_token: string
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string | null
          location?: string | null
          os?: string | null
          revoked_at?: string | null
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_admin_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator"
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
      app_role: ["admin", "moderator"],
    },
  },
} as const
