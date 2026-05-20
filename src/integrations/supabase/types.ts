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
      addon_waitlist: {
        Row: {
          addon_type: string
          auto_invite_opt_out: boolean
          closed_at: string | null
          expires_at: string | null
          facility_id: string
          geo_city: string | null
          geo_state: string | null
          id: string
          invited_at: string | null
          level_of_care: string[] | null
          notes: string | null
          requested_at: string
          requested_by: string
          scope_type: string | null
          scope_value: string | null
          status: string
        }
        Insert: {
          addon_type: string
          auto_invite_opt_out?: boolean
          closed_at?: string | null
          expires_at?: string | null
          facility_id: string
          geo_city?: string | null
          geo_state?: string | null
          id?: string
          invited_at?: string | null
          level_of_care?: string[] | null
          notes?: string | null
          requested_at?: string
          requested_by: string
          scope_type?: string | null
          scope_value?: string | null
          status?: string
        }
        Update: {
          addon_type?: string
          auto_invite_opt_out?: boolean
          closed_at?: string | null
          expires_at?: string | null
          facility_id?: string
          geo_city?: string | null
          geo_state?: string | null
          id?: string
          invited_at?: string | null
          level_of_care?: string[] | null
          notes?: string | null
          requested_at?: string
          requested_by?: string
          scope_type?: string | null
          scope_value?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_waitlist_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_waitlist_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
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
      admin_escalations: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["escalation_priority"]
          related_id: string | null
          related_type: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["escalation_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["escalation_priority"]
          related_id?: string | null
          related_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["escalation_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["escalation_priority"]
          related_id?: string | null
          related_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["escalation_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_impersonation_log: {
        Row: {
          admin_user_id: string
          ended_at: string | null
          id: string
          started_at: string
          target_role: string
          target_user_id: string
        }
        Insert: {
          admin_user_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_role: string
          target_user_id: string
        }
        Update: {
          admin_user_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          target_role?: string
          target_user_id?: string
        }
        Relationships: []
      }
      admin_mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
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
      admin_trusted_devices: {
        Row: {
          browser: string | null
          created_at: string
          device_label: string | null
          device_token_hash: string
          expires_at: string
          id: string
          ip_address: string | null
          ip_range: string | null
          is_active: boolean
          last_used_at: string
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_label?: string | null
          device_token_hash: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          ip_range?: string | null
          is_active?: boolean
          last_used_at?: string
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_label?: string | null
          device_token_hash?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          ip_range?: string | null
          is_active?: boolean
          last_used_at?: string
          os?: string | null
          user_id?: string
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
          admin_role: Database["public"]["Enums"]["admin_role_type"] | null
          avatar_url: string | null
          commission_rate: number | null
          created_at: string
          created_by: string | null
          display_name: string | null
          email_digest_frequency: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          first_name: string | null
          force_password_change: boolean | null
          hire_date: string | null
          id: string
          idle_timeout_minutes: number | null
          last_active_at: string | null
          last_login_at: string | null
          last_name: string | null
          mfa_enabled: boolean | null
          mfa_skip: boolean | null
          notify_new_leads: boolean | null
          notify_new_providers: boolean | null
          notify_security_events: boolean | null
          notify_subscription_changes: boolean | null
          notify_system_alerts: boolean | null
          phone: string | null
          status: string
          temp_password_expires_at: string | null
          temp_password_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_role?: Database["public"]["Enums"]["admin_role_type"] | null
          avatar_url?: string | null
          commission_rate?: number | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email_digest_frequency?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          first_name?: string | null
          force_password_change?: boolean | null
          hire_date?: string | null
          id?: string
          idle_timeout_minutes?: number | null
          last_active_at?: string | null
          last_login_at?: string | null
          last_name?: string | null
          mfa_enabled?: boolean | null
          mfa_skip?: boolean | null
          notify_new_leads?: boolean | null
          notify_new_providers?: boolean | null
          notify_security_events?: boolean | null
          notify_subscription_changes?: boolean | null
          notify_system_alerts?: boolean | null
          phone?: string | null
          status?: string
          temp_password_expires_at?: string | null
          temp_password_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_role?: Database["public"]["Enums"]["admin_role_type"] | null
          avatar_url?: string | null
          commission_rate?: number | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email_digest_frequency?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          first_name?: string | null
          force_password_change?: boolean | null
          hire_date?: string | null
          id?: string
          idle_timeout_minutes?: number | null
          last_active_at?: string | null
          last_login_at?: string | null
          last_name?: string | null
          mfa_enabled?: boolean | null
          mfa_skip?: boolean | null
          notify_new_leads?: boolean | null
          notify_new_providers?: boolean | null
          notify_security_events?: boolean | null
          notify_subscription_changes?: boolean | null
          notify_system_alerts?: boolean | null
          phone?: string | null
          status?: string
          temp_password_expires_at?: string | null
          temp_password_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      advisor_earnings: {
        Row: {
          advisor_id: string
          commission_cents: number
          commission_rate: number
          created_at: string
          id: string
          inquiry_id: string | null
          paid_at: string | null
          placement_fee_cents: number
          status: Database["public"]["Enums"]["earning_status"]
        }
        Insert: {
          advisor_id: string
          commission_cents?: number
          commission_rate?: number
          created_at?: string
          id?: string
          inquiry_id?: string | null
          paid_at?: string | null
          placement_fee_cents?: number
          status?: Database["public"]["Enums"]["earning_status"]
        }
        Update: {
          advisor_id?: string
          commission_cents?: number
          commission_rate?: number
          created_at?: string
          id?: string
          inquiry_id?: string | null
          paid_at?: string | null
          placement_fee_cents?: number
          status?: Database["public"]["Enums"]["earning_status"]
        }
        Relationships: [
          {
            foreignKeyName: "advisor_earnings_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "concierge_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          category: string | null
          created_at: string
          event_name: string
          id: number
          params: Json
          path: string | null
          referrer: string | null
          session_id: string | null
          user_id: string | null
          viewport: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          event_name: string
          id?: number
          params?: Json
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          event_name?: string
          id?: number
          params?: Json
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Relationships: []
      }
      area_waitlist: {
        Row: {
          area_label: string | null
          area_slug: string
          city: string | null
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          is_notified: boolean
          notified_at: string | null
          source_path: string | null
          state: string | null
          treatment_type: string | null
          user_agent: string | null
        }
        Insert: {
          area_label?: string | null
          area_slug: string
          city?: string | null
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          is_notified?: boolean
          notified_at?: string | null
          source_path?: string | null
          state?: string | null
          treatment_type?: string | null
          user_agent?: string | null
        }
        Update: {
          area_label?: string | null
          area_slug?: string
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          is_notified?: boolean
          notified_at?: string | null
          source_path?: string | null
          state?: string | null
          treatment_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      badge_impressions: {
        Row: {
          badge_size: string
          badge_type: string
          created_at: string
          facility_id: string
          id: string
          referrer_domain: string | null
        }
        Insert: {
          badge_size?: string
          badge_type?: string
          created_at?: string
          facility_id: string
          id?: string
          referrer_domain?: string | null
        }
        Update: {
          badge_size?: string
          badge_type?: string
          created_at?: string
          facility_id?: string
          id?: string
          referrer_domain?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_impressions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_impressions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_identifiers: {
        Row: {
          blocked_at: string
          blocked_by: string
          expires_at: string | null
          id: string
          identifier: string
          identifier_type: string
          is_active: boolean
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by: string
          expires_at?: string | null
          id?: string
          identifier: string
          identifier_type: string
          is_active?: boolean
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string
          expires_at?: string | null
          id?: string
          identifier?: string
          identifier_type?: string
          is_active?: boolean
          reason?: string | null
        }
        Relationships: []
      }
      blog_articles: {
        Row: {
          author: string
          author_date: string | null
          author_id: string | null
          category: string
          category_label: string
          content: Json
          created_at: string | null
          created_by: string | null
          excerpt: string
          featured: boolean | null
          featured_placement_bucket: string | null
          id: string
          image_url: string | null
          last_medically_reviewed_at: string | null
          medical_reviewer_id: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          read_time: string
          seo_keywords: string[] | null
          slug: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author: string
          author_date?: string | null
          author_id?: string | null
          category: string
          category_label: string
          content?: Json
          created_at?: string | null
          created_by?: string | null
          excerpt: string
          featured?: boolean | null
          featured_placement_bucket?: string | null
          id?: string
          image_url?: string | null
          last_medically_reviewed_at?: string | null
          medical_reviewer_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_time?: string
          seo_keywords?: string[] | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          author_date?: string | null
          author_id?: string | null
          category?: string
          category_label?: string
          content?: Json
          created_at?: string | null
          created_by?: string | null
          excerpt?: string
          featured?: boolean | null
          featured_placement_bucket?: string | null
          id?: string
          image_url?: string | null
          last_medically_reviewed_at?: string | null
          medical_reviewer_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_time?: string
          seo_keywords?: string[] | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_medical_reviewer_id_fkey"
            columns: ["medical_reviewer_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_authors: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          credentials: string | null
          display_order: number
          email: string | null
          id: string
          license_number: string | null
          license_state: string | null
          linkedin_url: string | null
          name: string
          photo_url: string | null
          role: string
          slug: string
          specialties: string[]
          title: string | null
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          credentials?: string | null
          display_order?: number
          email?: string | null
          id?: string
          license_number?: string | null
          license_state?: string | null
          linkedin_url?: string | null
          name: string
          photo_url?: string | null
          role?: string
          slug: string
          specialties?: string[]
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          credentials?: string | null
          display_order?: number
          email?: string | null
          id?: string
          license_number?: string | null
          license_state?: string | null
          linkedin_url?: string | null
          name?: string
          photo_url?: string | null
          role?: string
          slug?: string
          specialties?: string[]
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      concierge_case_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          inquiry_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          inquiry_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          inquiry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_case_events_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "concierge_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_geo_caps: {
        Row: {
          geo_city: string
          geo_state: string
          max_slots: number
          notes: string | null
        }
        Insert: {
          geo_city?: string
          geo_state: string
          max_slots: number
          notes?: string | null
        }
        Update: {
          geo_city?: string
          geo_state?: string
          max_slots?: number
          notes?: string | null
        }
        Relationships: []
      }
      concierge_inquiries: {
        Row: {
          admin_matched_facility_ids: string[] | null
          admin_notes: string | null
          admission_notes: string | null
          admission_status: string
          admission_substatus: string
          age_range: string | null
          alternative_contact_name: string | null
          alternative_contact_phone: string | null
          amenity_preferences: Json | null
          assessment_preference: string | null
          assigned_advisor_id: string | null
          benefits_verified: boolean | null
          best_time_to_call: string | null
          budget_range: string | null
          checkout_session_id: string | null
          closed_at: string | null
          co_occurring_concerns: Json | null
          contact_channel: string
          created_at: string
          current_living_situation: string | null
          current_medications: string | null
          decision_maker_name: string | null
          decision_maker_phone: string | null
          desired_location_city: string | null
          desired_location_state: string | null
          desired_radius_miles: number | null
          detox_needed: string | null
          draft_id: string | null
          email_verified_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employer_name: string | null
          faith_based_preference: string | null
          form_completed_at: string | null
          gender: string | null
          hipaa_consent: boolean | null
          holistic_interest: boolean | null
          id: string
          idempotency_key: string | null
          insurance_carrier: string | null
          insurance_group_number: string | null
          insurance_member_id: string | null
          intake_data: Json
          intake_submitted_at: string | null
          introductions_sent_at: string | null
          introductions_sent_count: number | null
          level_of_care: string | null
          match_count: number | null
          match_scores: Json | null
          matched_at: string | null
          matched_facility_ids: string[] | null
          mobility_needs: string | null
          move_in_date: string | null
          needs_transport_help: boolean | null
          notes: string | null
          originating_facility_id: string | null
          payment_amount_cents: number
          payment_reminder_count: number | null
          payment_status: string
          payment_type: string | null
          phone_verified_at: string | null
          placed_facility_id: string | null
          placement_confirmed: boolean | null
          placement_confirmed_at: string | null
          preferred_city: string | null
          preferred_environment: string | null
          preferred_language: string | null
          preferred_state: string | null
          primary_concern: string | null
          prior_treatment_history: boolean | null
          prior_treatment_notes: string | null
          referral_source: string | null
          relationship_to_decision_maker: string | null
          relationship_to_seeker: string | null
          routing_mode: string | null
          scholarship_interest: boolean | null
          seeker_confirmed: boolean | null
          seeker_confirmed_at: string | null
          seeker_feedback: string | null
          seeker_rating: number | null
          sms_callback_requested_at: string | null
          sms_consent: boolean
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          substance_use_duration: string | null
          substance_use_frequency: string | null
          suicide_history: string | null
          timeline_urgency: string | null
          tour_coordination_status: string
          updated_at: string
          user_email: string
          user_id: string | null
          user_name: string
          user_phone: string
          willing_to_travel: boolean | null
        }
        Insert: {
          admin_matched_facility_ids?: string[] | null
          admin_notes?: string | null
          admission_notes?: string | null
          admission_status?: string
          admission_substatus?: string
          age_range?: string | null
          alternative_contact_name?: string | null
          alternative_contact_phone?: string | null
          amenity_preferences?: Json | null
          assessment_preference?: string | null
          assigned_advisor_id?: string | null
          benefits_verified?: boolean | null
          best_time_to_call?: string | null
          budget_range?: string | null
          checkout_session_id?: string | null
          closed_at?: string | null
          co_occurring_concerns?: Json | null
          contact_channel?: string
          created_at?: string
          current_living_situation?: string | null
          current_medications?: string | null
          decision_maker_name?: string | null
          decision_maker_phone?: string | null
          desired_location_city?: string | null
          desired_location_state?: string | null
          desired_radius_miles?: number | null
          detox_needed?: string | null
          draft_id?: string | null
          email_verified_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_name?: string | null
          faith_based_preference?: string | null
          form_completed_at?: string | null
          gender?: string | null
          hipaa_consent?: boolean | null
          holistic_interest?: boolean | null
          id?: string
          idempotency_key?: string | null
          insurance_carrier?: string | null
          insurance_group_number?: string | null
          insurance_member_id?: string | null
          intake_data?: Json
          intake_submitted_at?: string | null
          introductions_sent_at?: string | null
          introductions_sent_count?: number | null
          level_of_care?: string | null
          match_count?: number | null
          match_scores?: Json | null
          matched_at?: string | null
          matched_facility_ids?: string[] | null
          mobility_needs?: string | null
          move_in_date?: string | null
          needs_transport_help?: boolean | null
          notes?: string | null
          originating_facility_id?: string | null
          payment_amount_cents?: number
          payment_reminder_count?: number | null
          payment_status?: string
          payment_type?: string | null
          phone_verified_at?: string | null
          placed_facility_id?: string | null
          placement_confirmed?: boolean | null
          placement_confirmed_at?: string | null
          preferred_city?: string | null
          preferred_environment?: string | null
          preferred_language?: string | null
          preferred_state?: string | null
          primary_concern?: string | null
          prior_treatment_history?: boolean | null
          prior_treatment_notes?: string | null
          referral_source?: string | null
          relationship_to_decision_maker?: string | null
          relationship_to_seeker?: string | null
          routing_mode?: string | null
          scholarship_interest?: boolean | null
          seeker_confirmed?: boolean | null
          seeker_confirmed_at?: string | null
          seeker_feedback?: string | null
          seeker_rating?: number | null
          sms_callback_requested_at?: string | null
          sms_consent?: boolean
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          substance_use_duration?: string | null
          substance_use_frequency?: string | null
          suicide_history?: string | null
          timeline_urgency?: string | null
          tour_coordination_status?: string
          updated_at?: string
          user_email: string
          user_id?: string | null
          user_name: string
          user_phone: string
          willing_to_travel?: boolean | null
        }
        Update: {
          admin_matched_facility_ids?: string[] | null
          admin_notes?: string | null
          admission_notes?: string | null
          admission_status?: string
          admission_substatus?: string
          age_range?: string | null
          alternative_contact_name?: string | null
          alternative_contact_phone?: string | null
          amenity_preferences?: Json | null
          assessment_preference?: string | null
          assigned_advisor_id?: string | null
          benefits_verified?: boolean | null
          best_time_to_call?: string | null
          budget_range?: string | null
          checkout_session_id?: string | null
          closed_at?: string | null
          co_occurring_concerns?: Json | null
          contact_channel?: string
          created_at?: string
          current_living_situation?: string | null
          current_medications?: string | null
          decision_maker_name?: string | null
          decision_maker_phone?: string | null
          desired_location_city?: string | null
          desired_location_state?: string | null
          desired_radius_miles?: number | null
          detox_needed?: string | null
          draft_id?: string | null
          email_verified_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_name?: string | null
          faith_based_preference?: string | null
          form_completed_at?: string | null
          gender?: string | null
          hipaa_consent?: boolean | null
          holistic_interest?: boolean | null
          id?: string
          idempotency_key?: string | null
          insurance_carrier?: string | null
          insurance_group_number?: string | null
          insurance_member_id?: string | null
          intake_data?: Json
          intake_submitted_at?: string | null
          introductions_sent_at?: string | null
          introductions_sent_count?: number | null
          level_of_care?: string | null
          match_count?: number | null
          match_scores?: Json | null
          matched_at?: string | null
          matched_facility_ids?: string[] | null
          mobility_needs?: string | null
          move_in_date?: string | null
          needs_transport_help?: boolean | null
          notes?: string | null
          originating_facility_id?: string | null
          payment_amount_cents?: number
          payment_reminder_count?: number | null
          payment_status?: string
          payment_type?: string | null
          phone_verified_at?: string | null
          placed_facility_id?: string | null
          placement_confirmed?: boolean | null
          placement_confirmed_at?: string | null
          preferred_city?: string | null
          preferred_environment?: string | null
          preferred_language?: string | null
          preferred_state?: string | null
          primary_concern?: string | null
          prior_treatment_history?: boolean | null
          prior_treatment_notes?: string | null
          referral_source?: string | null
          relationship_to_decision_maker?: string | null
          relationship_to_seeker?: string | null
          routing_mode?: string | null
          scholarship_interest?: boolean | null
          seeker_confirmed?: boolean | null
          seeker_confirmed_at?: string | null
          seeker_feedback?: string | null
          seeker_rating?: number | null
          sms_callback_requested_at?: string | null
          sms_consent?: boolean
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          substance_use_duration?: string | null
          substance_use_frequency?: string | null
          suicide_history?: string | null
          timeline_urgency?: string | null
          tour_coordination_status?: string
          updated_at?: string
          user_email?: string
          user_id?: string | null
          user_name?: string
          user_phone?: string
          willing_to_travel?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_inquiries_assigned_advisor_id_fkey"
            columns: ["assigned_advisor_id"]
            isOneToOne: false
            referencedRelation: "admin_user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "concierge_inquiries_originating_facility_id_fkey"
            columns: ["originating_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_inquiries_originating_facility_id_fkey"
            columns: ["originating_facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_inquiries_placed_facility_id_fkey"
            columns: ["placed_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_inquiries_placed_facility_id_fkey"
            columns: ["placed_facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_introduction_audit: {
        Row: {
          advisor_confirmed_no_non_partner_candidates: boolean
          advisor_confirmed_non_partner_consideration: boolean
          advisor_id: string
          clinical_criteria_snapshot: Json
          flagged_for_admin_review: boolean
          flagged_reason: string | null
          id: string
          inquiry_id: string
          introduced_facility_ids: string[]
          originating_facility_auto_pinned: boolean
          originating_facility_id: string | null
          partner_facility_ids: string[]
          rejected_non_partner_candidates: Json | null
          review_note: string | null
          review_outcome: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sent_at: string
          surfaced_candidate_ids: string[]
        }
        Insert: {
          advisor_confirmed_no_non_partner_candidates?: boolean
          advisor_confirmed_non_partner_consideration: boolean
          advisor_id: string
          clinical_criteria_snapshot?: Json
          flagged_for_admin_review?: boolean
          flagged_reason?: string | null
          id?: string
          inquiry_id: string
          introduced_facility_ids: string[]
          originating_facility_auto_pinned?: boolean
          originating_facility_id?: string | null
          partner_facility_ids?: string[]
          rejected_non_partner_candidates?: Json | null
          review_note?: string | null
          review_outcome?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_at?: string
          surfaced_candidate_ids?: string[]
        }
        Update: {
          advisor_confirmed_no_non_partner_candidates?: boolean
          advisor_confirmed_non_partner_consideration?: boolean
          advisor_id?: string
          clinical_criteria_snapshot?: Json
          flagged_for_admin_review?: boolean
          flagged_reason?: string | null
          id?: string
          inquiry_id?: string
          introduced_facility_ids?: string[]
          originating_facility_auto_pinned?: boolean
          originating_facility_id?: string | null
          partner_facility_ids?: string[]
          rejected_non_partner_candidates?: Json | null
          review_note?: string | null
          review_outcome?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_at?: string
          surfaced_candidate_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "concierge_introduction_audit_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "concierge_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_introduction_audit_originating_facility_id_fkey"
            columns: ["originating_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_introduction_audit_originating_facility_id_fkey"
            columns: ["originating_facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_introductions: {
        Row: {
          admin_disclosed_pii_at: string | null
          created_at: string | null
          disclosed_by_admin_id: string | null
          facility_id: string
          id: string
          inquiry_id: string
          provider_notes: string | null
          provider_responded_at: string | null
          provider_response: string | null
          seeker_contacted: boolean | null
          seeker_contacted_at: string | null
          sent_at: string | null
          sent_by: string | null
        }
        Insert: {
          admin_disclosed_pii_at?: string | null
          created_at?: string | null
          disclosed_by_admin_id?: string | null
          facility_id: string
          id?: string
          inquiry_id: string
          provider_notes?: string | null
          provider_responded_at?: string | null
          provider_response?: string | null
          seeker_contacted?: boolean | null
          seeker_contacted_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
        }
        Update: {
          admin_disclosed_pii_at?: string | null
          created_at?: string | null
          disclosed_by_admin_id?: string | null
          facility_id?: string
          id?: string
          inquiry_id?: string
          provider_notes?: string | null
          provider_responded_at?: string | null
          provider_response?: string | null
          seeker_contacted?: boolean | null
          seeker_contacted_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_introductions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_introductions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_introductions_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "concierge_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
          sender_type: string
          thread_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
          sender_type: string
          thread_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "concierge_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_partner_facilities: {
        Row: {
          activated_at: string
          active: boolean
          deactivated_at: string | null
          facility_id: string
          geo_city: string | null
          geo_state: string
          id: string
          level_of_care: string[]
          subscription_id: string
        }
        Insert: {
          activated_at?: string
          active?: boolean
          deactivated_at?: string | null
          facility_id: string
          geo_city?: string | null
          geo_state: string
          id?: string
          level_of_care: string[]
          subscription_id: string
        }
        Update: {
          activated_at?: string
          active?: boolean
          deactivated_at?: string | null
          facility_id?: string
          geo_city?: string | null
          geo_state?: string
          id?: string
          level_of_care?: string[]
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_partner_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_partner_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_partner_facilities_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "facility_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_rejected_facilities: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          inquiry_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          inquiry_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          inquiry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_rejected_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_rejected_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_rejected_facilities_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "concierge_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_threads: {
        Row: {
          admin_last_read_at: string | null
          created_at: string | null
          facility_id: string | null
          facility_last_read_at: string | null
          id: string
          inquiry_id: string
          last_message_at: string | null
          thread_type: string
          user_id: string
          user_last_read_at: string | null
        }
        Insert: {
          admin_last_read_at?: string | null
          created_at?: string | null
          facility_id?: string | null
          facility_last_read_at?: string | null
          id?: string
          inquiry_id: string
          last_message_at?: string | null
          thread_type: string
          user_id: string
          user_last_read_at?: string | null
        }
        Update: {
          admin_last_read_at?: string | null
          created_at?: string | null
          facility_id?: string | null
          facility_last_read_at?: string | null
          id?: string
          inquiry_id?: string
          last_message_at?: string | null
          thread_type?: string
          user_id?: string
          user_last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_threads_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_threads_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_threads_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "concierge_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_tour_requests: {
        Row: {
          confirmed_datetime: string | null
          contact_preference: string | null
          created_at: string | null
          facility_id: string
          facility_responded_at: string | null
          facility_response_notes: string | null
          id: string
          inquiry_id: string
          notes: string | null
          preferred_dates: Json | null
          proposed_datetime: string | null
          status: string
          tour_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confirmed_datetime?: string | null
          contact_preference?: string | null
          created_at?: string | null
          facility_id: string
          facility_responded_at?: string | null
          facility_response_notes?: string | null
          id?: string
          inquiry_id: string
          notes?: string | null
          preferred_dates?: Json | null
          proposed_datetime?: string | null
          status?: string
          tour_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confirmed_datetime?: string | null
          contact_preference?: string | null
          created_at?: string | null
          facility_id?: string
          facility_responded_at?: string | null
          facility_response_notes?: string | null
          id?: string
          inquiry_id?: string
          notes?: string | null
          preferred_dates?: Json | null
          proposed_datetime?: string | null
          status?: string
          tour_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_tour_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_tour_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_tour_requests_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "concierge_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_failures: {
        Row: {
          attempts: number
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          recipient_email: string
          resolved_at: string | null
          resolved_by: string | null
          subject: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          recipient_email: string
          resolved_at?: string | null
          resolved_by?: string | null
          subject?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          recipient_email?: string
          resolved_at?: string | null
          resolved_by?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      email_tracking_events: {
        Row: {
          created_at: string
          email_id: string
          email_type: string
          event_data: Json | null
          event_type: string
          id: string
          recipient_email: string
        }
        Insert: {
          created_at?: string
          email_id: string
          email_type?: string
          event_data?: Json | null
          event_type: string
          id?: string
          recipient_email: string
        }
        Update: {
          created_at?: string
          email_id?: string
          email_type?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          recipient_email?: string
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          attempts: number | null
          claim_request_id: string | null
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          purpose: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          claim_request_id?: string | null
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          purpose?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          claim_request_id?: string | null
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_verification_codes_claim_request_id_fkey"
            columns: ["claim_request_id"]
            isOneToOne: false
            referencedRelation: "facility_claim_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      emails_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          metadata: Json
          scheduled_for: string
          sent_at: string | null
          sequence: string
          skipped_reason: string | null
          status: string
          step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          scheduled_for: string
          sent_at?: string | null
          sequence: string
          skipped_reason?: string | null
          status?: string
          step: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          scheduled_for?: string
          sent_at?: string | null
          sequence?: string
          skipped_reason?: string | null
          status?: string
          step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          accepts_international_patients: boolean | null
          address: string
          admin_notes: string | null
          bed_count: string | null
          calculated_ranking_score: number | null
          city: string
          claim_owner_id: string | null
          claim_status: string | null
          claimed_at: string | null
          concierge_accepted_care_types: Json | null
          concierge_accepted_insurance: Json | null
          concierge_admissions_contact: string | null
          concierge_admissions_email: string | null
          concierge_admissions_phone: string | null
          concierge_agreement_preference: string | null
          concierge_availability_status: string | null
          concierge_network_opted_in: boolean | null
          concierge_notes: string | null
          concierge_opted_in_at: string | null
          concierge_terms_accepted_at: string | null
          concierge_terms_accepted_by: string | null
          concierge_terms_version: string | null
          created_at: string
          data_source: string
          description: string | null
          email: string | null
          facility_type: string
          featured: boolean
          featured_display_order: number | null
          featured_pinned: boolean | null
          gallery_urls: string[] | null
          gender_served: string | null
          has_facility_verified_contact: boolean
          id: string
          last_activity_at: string | null
          last_featured_shown_at: string | null
          leads_reset_at: string | null
          listing_completeness_score: number | null
          logo_url: string | null
          name: string
          phone: string | null
          profile_completion_celebrated: boolean | null
          profile_reminder_count: number | null
          profile_reminder_sent_at: string | null
          reply_email: string | null
          reply_email_verified: boolean | null
          reply_email_verified_at: string | null
          response_rate_score: number | null
          samhsa_facility_id: string | null
          slug: string | null
          sponsored_tagline: string | null
          state: string
          status: string
          suspended: boolean | null
          updated_at: string
          user_id: string | null
          verified: boolean | null
          verified_phone: string | null
          verified_phone_set_at: string | null
          website: string | null
          year_established: number | null
          zip_code: string
        }
        Insert: {
          accepts_international_patients?: boolean | null
          address: string
          admin_notes?: string | null
          bed_count?: string | null
          calculated_ranking_score?: number | null
          city: string
          claim_owner_id?: string | null
          claim_status?: string | null
          claimed_at?: string | null
          concierge_accepted_care_types?: Json | null
          concierge_accepted_insurance?: Json | null
          concierge_admissions_contact?: string | null
          concierge_admissions_email?: string | null
          concierge_admissions_phone?: string | null
          concierge_agreement_preference?: string | null
          concierge_availability_status?: string | null
          concierge_network_opted_in?: boolean | null
          concierge_notes?: string | null
          concierge_opted_in_at?: string | null
          concierge_terms_accepted_at?: string | null
          concierge_terms_accepted_by?: string | null
          concierge_terms_version?: string | null
          created_at?: string
          data_source?: string
          description?: string | null
          email?: string | null
          facility_type: string
          featured?: boolean
          featured_display_order?: number | null
          featured_pinned?: boolean | null
          gallery_urls?: string[] | null
          gender_served?: string | null
          has_facility_verified_contact?: boolean
          id?: string
          last_activity_at?: string | null
          last_featured_shown_at?: string | null
          leads_reset_at?: string | null
          listing_completeness_score?: number | null
          logo_url?: string | null
          name: string
          phone?: string | null
          profile_completion_celebrated?: boolean | null
          profile_reminder_count?: number | null
          profile_reminder_sent_at?: string | null
          reply_email?: string | null
          reply_email_verified?: boolean | null
          reply_email_verified_at?: string | null
          response_rate_score?: number | null
          samhsa_facility_id?: string | null
          slug?: string | null
          sponsored_tagline?: string | null
          state: string
          status?: string
          suspended?: boolean | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean | null
          verified_phone?: string | null
          verified_phone_set_at?: string | null
          website?: string | null
          year_established?: number | null
          zip_code: string
        }
        Update: {
          accepts_international_patients?: boolean | null
          address?: string
          admin_notes?: string | null
          bed_count?: string | null
          calculated_ranking_score?: number | null
          city?: string
          claim_owner_id?: string | null
          claim_status?: string | null
          claimed_at?: string | null
          concierge_accepted_care_types?: Json | null
          concierge_accepted_insurance?: Json | null
          concierge_admissions_contact?: string | null
          concierge_admissions_email?: string | null
          concierge_admissions_phone?: string | null
          concierge_agreement_preference?: string | null
          concierge_availability_status?: string | null
          concierge_network_opted_in?: boolean | null
          concierge_notes?: string | null
          concierge_opted_in_at?: string | null
          concierge_terms_accepted_at?: string | null
          concierge_terms_accepted_by?: string | null
          concierge_terms_version?: string | null
          created_at?: string
          data_source?: string
          description?: string | null
          email?: string | null
          facility_type?: string
          featured?: boolean
          featured_display_order?: number | null
          featured_pinned?: boolean | null
          gallery_urls?: string[] | null
          gender_served?: string | null
          has_facility_verified_contact?: boolean
          id?: string
          last_activity_at?: string | null
          last_featured_shown_at?: string | null
          leads_reset_at?: string | null
          listing_completeness_score?: number | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          profile_completion_celebrated?: boolean | null
          profile_reminder_count?: number | null
          profile_reminder_sent_at?: string | null
          reply_email?: string | null
          reply_email_verified?: boolean | null
          reply_email_verified_at?: string | null
          response_rate_score?: number | null
          samhsa_facility_id?: string | null
          slug?: string | null
          sponsored_tagline?: string | null
          state?: string
          status?: string
          suspended?: boolean | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean | null
          verified_phone?: string | null
          verified_phone_set_at?: string | null
          website?: string | null
          year_established?: number | null
          zip_code?: string
        }
        Relationships: []
      }
      facility_accreditations: {
        Row: {
          accreditation_type: string
          created_at: string | null
          document_name: string | null
          document_url: string | null
          expiry_date: string | null
          facility_id: string
          id: string
          issuing_authority: string | null
          notes: string | null
          rejection_reason: string | null
          verification_number: string | null
          verification_url: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          accreditation_type: string
          created_at?: string | null
          document_name?: string | null
          document_url?: string | null
          expiry_date?: string | null
          facility_id: string
          id?: string
          issuing_authority?: string | null
          notes?: string | null
          rejection_reason?: string | null
          verification_number?: string | null
          verification_url?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          accreditation_type?: string
          created_at?: string | null
          document_name?: string | null
          document_url?: string | null
          expiry_date?: string | null
          facility_id?: string
          id?: string
          issuing_authority?: string | null
          notes?: string | null
          rejection_reason?: string | null
          verification_number?: string | null
          verification_url?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_accreditations_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_accreditations_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "facility_age_groups_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_claim_requests: {
        Row: {
          claimant_email: string
          claimant_name: string
          claimant_phone: string | null
          claimant_role: string | null
          claimant_user_id: string
          created_at: string
          decision_notes: string | null
          evidence_notes: string | null
          evidence_url: string | null
          facility_id: string
          id: string
          pending_enrichments: Json
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          verification_email: string | null
          verification_method: string | null
          verification_phone: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          claimant_email: string
          claimant_name: string
          claimant_phone?: string | null
          claimant_role?: string | null
          claimant_user_id: string
          created_at?: string
          decision_notes?: string | null
          evidence_notes?: string | null
          evidence_url?: string | null
          facility_id: string
          id?: string
          pending_enrichments?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          verification_email?: string | null
          verification_method?: string | null
          verification_phone?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          claimant_email?: string
          claimant_name?: string
          claimant_phone?: string | null
          claimant_role?: string | null
          claimant_user_id?: string
          created_at?: string
          decision_notes?: string | null
          evidence_notes?: string | null
          evidence_url?: string | null
          facility_id?: string
          id?: string
          pending_enrichments?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          verification_email?: string | null
          verification_method?: string | null
          verification_phone?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_claim_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_claim_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_credential_documents: {
        Row: {
          document_name: string
          document_type: string
          document_url: string
          facility_id: string
          id: string
          rejection_reason: string | null
          status: string
          storage_path: string | null
          uploaded_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_name: string
          document_type: string
          document_url: string
          facility_id: string
          id?: string
          rejection_reason?: string | null
          status?: string
          storage_path?: string | null
          uploaded_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_name?: string
          document_type?: string
          document_url?: string
          facility_id?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          storage_path?: string | null
          uploaded_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_credential_documents_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_credential_documents_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
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
          {
            foreignKeyName: "facility_credentials_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
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
          {
            foreignKeyName: "facility_insurance_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
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
          {
            foreignKeyName: "facility_interactions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_match_clusters: {
        Row: {
          cluster_key: string
          conflicts: Json
          created_at: string
          directory_count: number
          id: string
          leads_count: number
          match_confidence: number | null
          match_signals: Json
          promoted_at: string | null
          promoted_to_facility_id: string | null
          promotion_decision: string | null
          rejected_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          samhsa_count: number
          total_sources: number | null
          updated_at: string
          winning_city: string | null
          winning_email: string | null
          winning_name: string | null
          winning_phone: string | null
          winning_state: string | null
          winning_street: string | null
          winning_website: string | null
          winning_zip: string | null
        }
        Insert: {
          cluster_key: string
          conflicts?: Json
          created_at?: string
          directory_count?: number
          id?: string
          leads_count?: number
          match_confidence?: number | null
          match_signals?: Json
          promoted_at?: string | null
          promoted_to_facility_id?: string | null
          promotion_decision?: string | null
          rejected_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          samhsa_count?: number
          total_sources?: number | null
          updated_at?: string
          winning_city?: string | null
          winning_email?: string | null
          winning_name?: string | null
          winning_phone?: string | null
          winning_state?: string | null
          winning_street?: string | null
          winning_website?: string | null
          winning_zip?: string | null
        }
        Update: {
          cluster_key?: string
          conflicts?: Json
          created_at?: string
          directory_count?: number
          id?: string
          leads_count?: number
          match_confidence?: number | null
          match_signals?: Json
          promoted_at?: string | null
          promoted_to_facility_id?: string | null
          promotion_decision?: string | null
          rejected_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          samhsa_count?: number
          total_sources?: number | null
          updated_at?: string
          winning_city?: string | null
          winning_email?: string | null
          winning_name?: string | null
          winning_phone?: string | null
          winning_state?: string | null
          winning_street?: string | null
          winning_website?: string | null
          winning_zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_match_clusters_promoted_to_facility_id_fkey"
            columns: ["promoted_to_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_match_clusters_promoted_to_facility_id_fkey"
            columns: ["promoted_to_facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_pending_changes: {
        Row: {
          changed_fields: string[]
          created_at: string
          facility_id: string
          id: string
          pending_payload: Json
          pending_status: string
          provider_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          changed_fields?: string[]
          created_at?: string
          facility_id: string
          id?: string
          pending_payload?: Json
          pending_status?: string
          provider_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          changed_fields?: string[]
          created_at?: string
          facility_id?: string
          id?: string
          pending_payload?: Json
          pending_status?: string
          provider_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_pending_changes_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_pending_changes_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_reviews: {
        Row: {
          admin_notes: string | null
          created_at: string
          disputed: boolean | null
          facility_id: string
          helpful_count: number
          id: string
          rating: number
          review_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_display_name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          disputed?: boolean | null
          facility_id: string
          helpful_count?: number
          id?: string
          rating: number
          review_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_display_name?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          disputed?: boolean | null
          facility_id?: string
          helpful_count?: number
          id?: string
          rating?: number
          review_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_display_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_reviews_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_reviews_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_reviews_config: {
        Row: {
          created_at: string | null
          facility_id: string
          google_place_id: string | null
          google_place_url: string | null
          google_rating: number | null
          google_review_count: number | null
          id: string
          last_updated_at: string | null
          show_on_profile: boolean | null
        }
        Insert: {
          created_at?: string | null
          facility_id: string
          google_place_id?: string | null
          google_place_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          last_updated_at?: string | null
          show_on_profile?: boolean | null
        }
        Update: {
          created_at?: string | null
          facility_id?: string
          google_place_id?: string | null
          google_place_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          last_updated_at?: string | null
          show_on_profile?: boolean | null
        }
        Relationships: []
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
          {
            foreignKeyName: "facility_services_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_staff: {
        Row: {
          bio: string | null
          created_at: string | null
          display_order: number | null
          email: string | null
          facility_id: string
          id: string
          is_visible: boolean | null
          job_title: string
          name: string
          phone: string | null
          photo_url: string
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_order?: number | null
          email?: string | null
          facility_id: string
          id?: string
          is_visible?: boolean | null
          job_title: string
          name: string
          phone?: string | null
          photo_url: string
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_order?: number | null
          email?: string | null
          facility_id?: string
          id?: string
          is_visible?: boolean | null
          job_title?: string
          name?: string
          phone?: string | null
          photo_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_staff_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_staff_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_subscriptions: {
        Row: {
          billing_period: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          concierge_stripe_subscription_id: string | null
          created_at: string
          current_monthly_period_start: string | null
          current_period_end: string | null
          discount_applied_cents: number | null
          dunning_milestones_sent: string[]
          facility_id: string
          featured_stripe_subscription_id: string | null
          has_concierge_partner: boolean
          has_featured: boolean
          id: string
          original_annual_cents: number | null
          paid_amount_cents: number | null
          past_due_since: string | null
          payment_method_warning_sent_at: string | null
          period_start: string | null
          price_cents: number
          provider_id: string
          renewal_reminder_14d_sent_at: string | null
          renewal_reminder_30d_sent_at: string | null
          renewal_reminder_60d_sent_at: string | null
          renewal_reminder_7d_sent_at: string | null
          started_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          switch_to_monthly_at_renewal: boolean
          tier: string
          updated_at: string
        }
        Insert: {
          billing_period?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          concierge_stripe_subscription_id?: string | null
          created_at?: string
          current_monthly_period_start?: string | null
          current_period_end?: string | null
          discount_applied_cents?: number | null
          dunning_milestones_sent?: string[]
          facility_id: string
          featured_stripe_subscription_id?: string | null
          has_concierge_partner?: boolean
          has_featured?: boolean
          id?: string
          original_annual_cents?: number | null
          paid_amount_cents?: number | null
          past_due_since?: string | null
          payment_method_warning_sent_at?: string | null
          period_start?: string | null
          price_cents?: number
          provider_id: string
          renewal_reminder_14d_sent_at?: string | null
          renewal_reminder_30d_sent_at?: string | null
          renewal_reminder_60d_sent_at?: string | null
          renewal_reminder_7d_sent_at?: string | null
          started_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          switch_to_monthly_at_renewal?: boolean
          tier?: string
          updated_at?: string
        }
        Update: {
          billing_period?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          concierge_stripe_subscription_id?: string | null
          created_at?: string
          current_monthly_period_start?: string | null
          current_period_end?: string | null
          discount_applied_cents?: number | null
          dunning_milestones_sent?: string[]
          facility_id?: string
          featured_stripe_subscription_id?: string | null
          has_concierge_partner?: boolean
          has_featured?: boolean
          id?: string
          original_annual_cents?: number | null
          paid_amount_cents?: number | null
          past_due_since?: string | null
          payment_method_warning_sent_at?: string | null
          period_start?: string | null
          price_cents?: number
          provider_id?: string
          renewal_reminder_14d_sent_at?: string | null
          renewal_reminder_30d_sent_at?: string | null
          renewal_reminder_60d_sent_at?: string | null
          renewal_reminder_7d_sent_at?: string | null
          started_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          switch_to_monthly_at_renewal?: boolean
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_subscriptions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_subscriptions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "public_facilities"
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
          {
            foreignKeyName: "facility_views_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_impressions: {
        Row: {
          facility_id: string
          id: string
          ip_hash: string | null
          occurred_at: string
          page_path: string
          placement_type: string
          placement_value: string
          position_in_rail: number
          surface: string | null
          user_agent: string | null
          visitor_seed: number
        }
        Insert: {
          facility_id: string
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          page_path: string
          placement_type: string
          placement_value: string
          position_in_rail: number
          surface?: string | null
          user_agent?: string | null
          visitor_seed: number
        }
        Update: {
          facility_id?: string
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          page_path?: string
          placement_type?: string
          placement_value?: string
          position_in_rail?: number
          surface?: string | null
          user_agent?: string | null
          visitor_seed?: number
        }
        Relationships: [
          {
            foreignKeyName: "featured_impressions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_impressions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_phone_clicks: {
        Row: {
          clicked_at: string
          facility_id: string
          id: string
          ip_hash: string | null
          page_path: string
          placement_type: string
          placement_value: string
          user_agent: string | null
          visitor_seed: number | null
        }
        Insert: {
          clicked_at?: string
          facility_id: string
          id?: string
          ip_hash?: string | null
          page_path: string
          placement_type: string
          placement_value: string
          user_agent?: string | null
          visitor_seed?: number | null
        }
        Update: {
          clicked_at?: string
          facility_id?: string
          id?: string
          ip_hash?: string | null
          page_path?: string
          placement_type?: string
          placement_value?: string
          user_agent?: string | null
          visitor_seed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_phone_clicks_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_phone_clicks_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_placement_analytics: {
        Row: {
          created_at: string
          event_count: number
          event_date: string
          event_type: string
          facility_id: string
          id: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_count?: number
          event_date?: string
          event_type: string
          facility_id: string
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_count?: number
          event_date?: string
          event_type?: string
          facility_id?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_placement_analytics_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_placement_analytics_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_placements: {
        Row: {
          activated_at: string
          active: boolean
          deactivated_at: string | null
          facility_id: string
          id: string
          placement_type: string
          placement_value: string
          subscription_id: string
        }
        Insert: {
          activated_at?: string
          active?: boolean
          deactivated_at?: string | null
          facility_id: string
          id?: string
          placement_type: string
          placement_value: string
          subscription_id: string
        }
        Update: {
          activated_at?: string
          active?: boolean
          deactivated_at?: string | null
          facility_id?: string
          id?: string
          placement_type?: string
          placement_value?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_placements_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_placements_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_placements_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "facility_subscriptions"
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
          {
            foreignKeyName: "flagged_images_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_verification_requests: {
        Row: {
          admin_notes: string | null
          assigned_admin_id: string | null
          carrier: string
          coverage_summary: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          estimated_out_of_pocket_cents: number | null
          first_name: string
          group_number: string | null
          id: string
          ip_hash: string | null
          landing_page: string | null
          last_name: string
          level_of_care: string | null
          linked_user_id: string | null
          member_id: string | null
          notes: string | null
          phone: string
          policy_holder_name: string | null
          policy_holder_relationship: string | null
          preferred_city: string | null
          preferred_contact: string
          preferred_state: string | null
          primary_substance: string | null
          referrer: string | null
          source: string
          status: string
          updated_at: string
          urgency: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          carrier: string
          coverage_summary?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          estimated_out_of_pocket_cents?: number | null
          first_name: string
          group_number?: string | null
          id?: string
          ip_hash?: string | null
          landing_page?: string | null
          last_name: string
          level_of_care?: string | null
          linked_user_id?: string | null
          member_id?: string | null
          notes?: string | null
          phone: string
          policy_holder_name?: string | null
          policy_holder_relationship?: string | null
          preferred_city?: string | null
          preferred_contact?: string
          preferred_state?: string | null
          primary_substance?: string | null
          referrer?: string | null
          source?: string
          status?: string
          updated_at?: string
          urgency?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          carrier?: string
          coverage_summary?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          estimated_out_of_pocket_cents?: number | null
          first_name?: string
          group_number?: string | null
          id?: string
          ip_hash?: string | null
          landing_page?: string | null
          last_name?: string
          level_of_care?: string | null
          linked_user_id?: string | null
          member_id?: string | null
          notes?: string | null
          phone?: string
          policy_holder_name?: string | null
          policy_holder_relationship?: string | null
          preferred_city?: string | null
          preferred_contact?: string
          preferred_state?: string | null
          primary_substance?: string | null
          referrer?: string | null
          source?: string
          status?: string
          updated_at?: string
          urgency?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      lead_contact_events: {
        Row: {
          contact_type: string
          created_at: string
          facility_id: string
          id: string
          lead_id: string
          provider_id: string
        }
        Insert: {
          contact_type: string
          created_at?: string
          facility_id: string
          id?: string
          lead_id: string
          provider_id: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          facility_id?: string
          id?: string
          lead_id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_contact_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contact_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contact_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_contact_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_provider_view"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_distributions: {
        Row: {
          created_at: string
          distributed_at: string
          facility_id: string
          id: string
          is_original: boolean
          lead_id: string
          notification_sent: boolean
          notification_sent_at: string | null
          unlocked_at: string | null
        }
        Insert: {
          created_at?: string
          distributed_at?: string
          facility_id: string
          id?: string
          is_original?: boolean
          lead_id: string
          notification_sent?: boolean
          notification_sent_at?: string | null
          unlocked_at?: string | null
        }
        Update: {
          created_at?: string
          distributed_at?: string
          facility_id?: string
          id?: string
          is_original?: boolean
          lead_id?: string
          notification_sent?: boolean
          notification_sent_at?: string | null
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_distributions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_distributions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_distributions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_distributions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_provider_view"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_email_resend_attempts: {
        Row: {
          count: number
          created_at: string
          email: string
          last_sent_at: string
          lead_id: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          count?: number
          created_at?: string
          email: string
          last_sent_at?: string
          lead_id: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          count?: number
          created_at?: string
          email?: string
          last_sent_at?: string
          lead_id?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_email_resend_attempts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_email_resend_attempts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_provider_view"
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
            foreignKeyName: "lead_emails_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_provider_view"
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
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_provider_view"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_routing_logs: {
        Row: {
          assigned_provider_id: string | null
          assignment_reason: string
          created_at: string
          eligibility_check_result: Json | null
          exclusivity: string | null
          id: string
          lead_id: string | null
          plan_tier: string | null
          provider_routing_order: number | null
          requested_facility_id: string | null
          routing_source: string
          subscription_status: string | null
        }
        Insert: {
          assigned_provider_id?: string | null
          assignment_reason: string
          created_at?: string
          eligibility_check_result?: Json | null
          exclusivity?: string | null
          id?: string
          lead_id?: string | null
          plan_tier?: string | null
          provider_routing_order?: number | null
          requested_facility_id?: string | null
          routing_source?: string
          subscription_status?: string | null
        }
        Update: {
          assigned_provider_id?: string | null
          assignment_reason?: string
          created_at?: string
          eligibility_check_result?: Json | null
          exclusivity?: string | null
          id?: string
          lead_id?: string | null
          plan_tier?: string | null
          provider_routing_order?: number | null
          requested_facility_id?: string | null
          routing_source?: string
          subscription_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_routing_logs_assigned_provider_id_fkey"
            columns: ["assigned_provider_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_routing_logs_assigned_provider_id_fkey"
            columns: ["assigned_provider_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_routing_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_routing_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_provider_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_routing_logs_requested_facility_id_fkey"
            columns: ["requested_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_routing_logs_requested_facility_id_fkey"
            columns: ["requested_facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          age_range: string | null
          assigned_at: string | null
          assignment_reason: string | null
          assignment_status: string | null
          best_time_to_call: string | null
          budget_preference: string | null
          co_occurring_conditions: string[] | null
          created_at: string
          dual_diagnosis: string | null
          email: string
          email_verified: boolean | null
          employment_status: string | null
          exclusive_until: string | null
          exclusivity: string | null
          extended_until: string | null
          facility_id: string | null
          follow_up_reminder_sent_at: string | null
          gender: string | null
          high_intent: boolean | null
          id: string
          idempotency_key: string | null
          inquiry_type: string | null
          insurance_provider: string | null
          insurance_type: string | null
          ip_hash: string | null
          lead_expired_at: string | null
          legal_involvement: string | null
          level_of_care: string | null
          location_city_state: string | null
          location_zip: string | null
          message: string | null
          name: string
          original_facility_id: string | null
          phone: string
          preferred_contact: string
          previous_treatment: string | null
          previous_treatment_details: string | null
          primary_substance: string[] | null
          provider_responded_at: string | null
          provider_response_notes: string | null
          provider_response_status: string | null
          qualification_reason: string | null
          qualified: boolean | null
          quality_flag: string | null
          readiness_level: string | null
          redistribution_status: string | null
          relationship_to_patient: string | null
          reminder_12h_sent_at: string | null
          reminder_1h_sent_at: string | null
          reminder_20h_sent_at: string | null
          reminder_24h_sent_at: string | null
          reminder_2h_sent_at: string | null
          reminder_6h_sent_at: string | null
          routing_order: number | null
          shared_with: string[] | null
          snooze_until: string | null
          source: string | null
          special_needs: string[] | null
          status: string
          urgency: string | null
          validation_status: string | null
          veteran_status: string | null
          who_seeking_help: string | null
        }
        Insert: {
          age_range?: string | null
          assigned_at?: string | null
          assignment_reason?: string | null
          assignment_status?: string | null
          best_time_to_call?: string | null
          budget_preference?: string | null
          co_occurring_conditions?: string[] | null
          created_at?: string
          dual_diagnosis?: string | null
          email: string
          email_verified?: boolean | null
          employment_status?: string | null
          exclusive_until?: string | null
          exclusivity?: string | null
          extended_until?: string | null
          facility_id?: string | null
          follow_up_reminder_sent_at?: string | null
          gender?: string | null
          high_intent?: boolean | null
          id?: string
          idempotency_key?: string | null
          inquiry_type?: string | null
          insurance_provider?: string | null
          insurance_type?: string | null
          ip_hash?: string | null
          lead_expired_at?: string | null
          legal_involvement?: string | null
          level_of_care?: string | null
          location_city_state?: string | null
          location_zip?: string | null
          message?: string | null
          name: string
          original_facility_id?: string | null
          phone: string
          preferred_contact?: string
          previous_treatment?: string | null
          previous_treatment_details?: string | null
          primary_substance?: string[] | null
          provider_responded_at?: string | null
          provider_response_notes?: string | null
          provider_response_status?: string | null
          qualification_reason?: string | null
          qualified?: boolean | null
          quality_flag?: string | null
          readiness_level?: string | null
          redistribution_status?: string | null
          relationship_to_patient?: string | null
          reminder_12h_sent_at?: string | null
          reminder_1h_sent_at?: string | null
          reminder_20h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent_at?: string | null
          reminder_6h_sent_at?: string | null
          routing_order?: number | null
          shared_with?: string[] | null
          snooze_until?: string | null
          source?: string | null
          special_needs?: string[] | null
          status?: string
          urgency?: string | null
          validation_status?: string | null
          veteran_status?: string | null
          who_seeking_help?: string | null
        }
        Update: {
          age_range?: string | null
          assigned_at?: string | null
          assignment_reason?: string | null
          assignment_status?: string | null
          best_time_to_call?: string | null
          budget_preference?: string | null
          co_occurring_conditions?: string[] | null
          created_at?: string
          dual_diagnosis?: string | null
          email?: string
          email_verified?: boolean | null
          employment_status?: string | null
          exclusive_until?: string | null
          exclusivity?: string | null
          extended_until?: string | null
          facility_id?: string | null
          follow_up_reminder_sent_at?: string | null
          gender?: string | null
          high_intent?: boolean | null
          id?: string
          idempotency_key?: string | null
          inquiry_type?: string | null
          insurance_provider?: string | null
          insurance_type?: string | null
          ip_hash?: string | null
          lead_expired_at?: string | null
          legal_involvement?: string | null
          level_of_care?: string | null
          location_city_state?: string | null
          location_zip?: string | null
          message?: string | null
          name?: string
          original_facility_id?: string | null
          phone?: string
          preferred_contact?: string
          previous_treatment?: string | null
          previous_treatment_details?: string | null
          primary_substance?: string[] | null
          provider_responded_at?: string | null
          provider_response_notes?: string | null
          provider_response_status?: string | null
          qualification_reason?: string | null
          qualified?: boolean | null
          quality_flag?: string | null
          readiness_level?: string | null
          redistribution_status?: string | null
          relationship_to_patient?: string | null
          reminder_12h_sent_at?: string | null
          reminder_1h_sent_at?: string | null
          reminder_20h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent_at?: string | null
          reminder_6h_sent_at?: string | null
          routing_order?: number | null
          shared_with?: string[] | null
          snooze_until?: string | null
          source?: string | null
          special_needs?: string[] | null
          status?: string
          urgency?: string | null
          validation_status?: string | null
          veteran_status?: string | null
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
          {
            foreignKeyName: "leads_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_original_facility_id_fkey"
            columns: ["original_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_original_facility_id_fkey"
            columns: ["original_facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_leads: {
        Row: {
          admin_notes: string | null
          age_range: string | null
          co_occurring_conditions: string[] | null
          converted_at: string | null
          converted_to_concierge: boolean | null
          created_at: string
          dual_diagnosis: string | null
          email: string
          employment_status: string | null
          facilities_requested: string[] | null
          first_name: string
          followup_email_sent: boolean | null
          followup_email_sent_at: string | null
          gender: string | null
          id: string
          insurance_provider: string | null
          insurance_type: string | null
          ip_hash: string | null
          landing_page: string | null
          last_name: string
          level_of_care: string | null
          location_city_state: string | null
          location_zip: string | null
          matched_facility_ids: string[] | null
          message: string | null
          phone: string
          preferred_contact: string | null
          previous_treatment: string | null
          primary_substance: string[] | null
          source: string
          status: string | null
          updated_at: string
          urgency: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          who_seeking_help: string | null
        }
        Insert: {
          admin_notes?: string | null
          age_range?: string | null
          co_occurring_conditions?: string[] | null
          converted_at?: string | null
          converted_to_concierge?: boolean | null
          created_at?: string
          dual_diagnosis?: string | null
          email: string
          employment_status?: string | null
          facilities_requested?: string[] | null
          first_name: string
          followup_email_sent?: boolean | null
          followup_email_sent_at?: string | null
          gender?: string | null
          id?: string
          insurance_provider?: string | null
          insurance_type?: string | null
          ip_hash?: string | null
          landing_page?: string | null
          last_name: string
          level_of_care?: string | null
          location_city_state?: string | null
          location_zip?: string | null
          matched_facility_ids?: string[] | null
          message?: string | null
          phone: string
          preferred_contact?: string | null
          previous_treatment?: string | null
          primary_substance?: string[] | null
          source?: string
          status?: string | null
          updated_at?: string
          urgency?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          who_seeking_help?: string | null
        }
        Update: {
          admin_notes?: string | null
          age_range?: string | null
          co_occurring_conditions?: string[] | null
          converted_at?: string | null
          converted_to_concierge?: boolean | null
          created_at?: string
          dual_diagnosis?: string | null
          email?: string
          employment_status?: string | null
          facilities_requested?: string[] | null
          first_name?: string
          followup_email_sent?: boolean | null
          followup_email_sent_at?: string | null
          gender?: string | null
          id?: string
          insurance_provider?: string | null
          insurance_type?: string | null
          ip_hash?: string | null
          landing_page?: string | null
          last_name?: string
          level_of_care?: string | null
          location_city_state?: string | null
          location_zip?: string | null
          matched_facility_ids?: string[] | null
          message?: string | null
          phone?: string
          preferred_contact?: string | null
          previous_treatment?: string | null
          primary_substance?: string[] | null
          source?: string
          status?: string | null
          updated_at?: string
          urgency?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          who_seeking_help?: string | null
        }
        Relationships: []
      }
      not_found_events: {
        Row: {
          asset_extension: string | null
          created_at: string
          full_url: string | null
          hash: string | null
          http_method: string | null
          id: string
          path: string
          query_string: string | null
          referrer: string | null
          request_kind: string | null
          search: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          viewport: string | null
        }
        Insert: {
          asset_extension?: string | null
          created_at?: string
          full_url?: string | null
          hash?: string | null
          http_method?: string | null
          id?: string
          path: string
          query_string?: string | null
          referrer?: string | null
          request_kind?: string | null
          search?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Update: {
          asset_extension?: string | null
          created_at?: string
          full_url?: string | null
          hash?: string | null
          http_method?: string | null
          id?: string
          path?: string
          query_string?: string | null
          referrer?: string | null
          request_kind?: string | null
          search?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Relationships: []
      }
      not_found_searches: {
        Row: {
          created_at: string
          event_kind: string
          id: string
          insurance: string | null
          location: string | null
          referrer: string | null
          results_count: number | null
          session_id: string | null
          source_path: string | null
          treatment: string | null
          user_agent: string | null
          user_id: string | null
          viewport: string | null
        }
        Insert: {
          created_at?: string
          event_kind: string
          id?: string
          insurance?: string | null
          location?: string | null
          referrer?: string | null
          results_count?: number | null
          session_id?: string | null
          source_path?: string | null
          treatment?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Update: {
          created_at?: string
          event_kind?: string
          id?: string
          insurance?: string | null
          location?: string | null
          referrer?: string | null
          results_count?: number | null
          session_id?: string | null
          source_path?: string | null
          treatment?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          channel: string
          created_at: string
          event_type: string
          facility_id: string
          id: string
          lead_id: string
          metadata: Json | null
          notification_stage: string
          notification_type: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          event_type: string
          facility_id: string
          id?: string
          lead_id: string
          metadata?: Json | null
          notification_stage: string
          notification_type: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          event_type?: string
          facility_id?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          notification_stage?: string
          notification_type?: string
          user_id?: string
        }
        Relationships: []
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
          engagement_tier: string | null
          followup_reminders_enabled: boolean | null
          id: string
          last_digest_sent_at: string | null
          last_unlock_at: string | null
          lead_notification_frequency: string | null
          notify_facility_views: boolean | null
          notify_lead_status_changes: boolean | null
          notify_new_leads: boolean | null
          sms_escalation_enabled: boolean | null
          sms_lead_alerts: boolean
          total_unlocks_30d: number | null
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
          engagement_tier?: string | null
          followup_reminders_enabled?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          last_unlock_at?: string | null
          lead_notification_frequency?: string | null
          notify_facility_views?: boolean | null
          notify_lead_status_changes?: boolean | null
          notify_new_leads?: boolean | null
          sms_escalation_enabled?: boolean | null
          sms_lead_alerts?: boolean
          total_unlocks_30d?: number | null
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
          engagement_tier?: string | null
          followup_reminders_enabled?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          last_unlock_at?: string | null
          lead_notification_frequency?: string | null
          notify_facility_views?: boolean | null
          notify_lead_status_changes?: boolean | null
          notify_new_leads?: boolean | null
          sms_escalation_enabled?: boolean | null
          sms_lead_alerts?: boolean
          total_unlocks_30d?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phi_access_log: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          changed_fields: Json | null
          full_row_snapshot: Json | null
          id: string
          occurred_at: string
          request_metadata: Json | null
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_type: string
          actor_user_id?: string | null
          changed_fields?: Json | null
          full_row_snapshot?: Json | null
          id?: string
          occurred_at?: string
          request_metadata?: Json | null
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          changed_fields?: Json | null
          full_row_snapshot?: Json | null
          id?: string
          occurred_at?: string
          request_metadata?: Json | null
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      phone_verification_codes: {
        Row: {
          attempts: number | null
          claim_request_id: string | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          purpose: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          claim_request_id?: string | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
          purpose?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          claim_request_id?: string | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          purpose?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_verification_codes_claim_request_id_fkey"
            columns: ["claim_request_id"]
            isOneToOne: false
            referencedRelation: "facility_claim_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pii_disclosure_log: {
        Row: {
          admin_user_id: string
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          disclosed_at: string
          disclosure_type: string
          facility_id: string | null
          facility_name: string | null
          id: string
          metadata: Json | null
          reason: string | null
          reference_id: string
        }
        Insert: {
          admin_user_id: string
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          disclosed_at?: string
          disclosure_type: string
          facility_id?: string | null
          facility_name?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          reference_id: string
        }
        Update: {
          admin_user_id?: string
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          disclosed_at?: string
          disclosure_type?: string
          facility_id?: string | null
          facility_name?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          reference_id?: string
        }
        Relationships: []
      }
      placement_caps: {
        Row: {
          max_slots: number
          notes: string | null
          placement_type: string
          placement_value: string
        }
        Insert: {
          max_slots: number
          notes?: string | null
          placement_type: string
          placement_value: string
        }
        Update: {
          max_slots?: number
          notes?: string | null
          placement_type?: string
          placement_value?: string
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
      prerender_cache: {
        Row: {
          cached_at: string
          created_at: string
          html: string
          id: string
          path: string
          status_code: number
        }
        Insert: {
          cached_at?: string
          created_at?: string
          html: string
          id?: string
          path: string
          status_code?: number
        }
        Update: {
          cached_at?: string
          created_at?: string
          html?: string
          id?: string
          path?: string
          status_code?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          email_verified_at: string | null
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          onboarding_completed_at: string | null
          phone: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          plan: string | null
          primary_contact_name: string | null
          sms_opted_in_at: string | null
          sms_opted_out_at: string | null
          timezone: string | null
          unsubscribed_provider_emails_at: string | null
          updated_at: string
          user_id: string
          welcomed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_verified_at?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          onboarding_completed_at?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          plan?: string | null
          primary_contact_name?: string | null
          sms_opted_in_at?: string | null
          sms_opted_out_at?: string | null
          timezone?: string | null
          unsubscribed_provider_emails_at?: string | null
          updated_at?: string
          user_id: string
          welcomed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_verified_at?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          plan?: string | null
          primary_contact_name?: string | null
          sms_opted_in_at?: string | null
          sms_opted_out_at?: string | null
          timezone?: string | null
          unsubscribed_provider_emails_at?: string | null
          updated_at?: string
          user_id?: string
          welcomed_at?: string | null
        }
        Relationships: []
      }
      provider_events: {
        Row: {
          created_at: string
          event_type: string
          facility_id: string
          id: string
          page_context: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          facility_id: string
          id?: string
          page_context?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          facility_id?: string
          id?: string
          page_context?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_interest: {
        Row: {
          admin_notes: string | null
          admin_notified: boolean
          admin_notified_at: string | null
          admission_volume: string
          billing_interval: string | null
          city: string
          contact_name: string
          contact_title: string
          created_at: string
          email: string
          facility_name: string
          followed_up: boolean
          followed_up_at: string | null
          id: string
          landing_page: string | null
          phone: string | null
          pricing_frustration: string | null
          source: string
          state: string
          status: string
          tier_interest: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_notified?: boolean
          admin_notified_at?: string | null
          admission_volume: string
          billing_interval?: string | null
          city: string
          contact_name: string
          contact_title: string
          created_at?: string
          email: string
          facility_name: string
          followed_up?: boolean
          followed_up_at?: string | null
          id?: string
          landing_page?: string | null
          phone?: string | null
          pricing_frustration?: string | null
          source?: string
          state: string
          status?: string
          tier_interest: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_notified?: boolean
          admin_notified_at?: string | null
          admission_volume?: string
          billing_interval?: string | null
          city?: string
          contact_name?: string
          contact_title?: string
          created_at?: string
          email?: string
          facility_name?: string
          followed_up?: boolean
          followed_up_at?: string | null
          id?: string
          landing_page?: string | null
          phone?: string | null
          pricing_frustration?: string | null
          source?: string
          state?: string
          status?: string
          tier_interest?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
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
          {
            foreignKeyName: "provider_notifications_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_onboarding_drip: {
        Row: {
          completed: boolean
          created_at: string
          day_number: number
          facility_id: string | null
          id: string
          last_sent_day: number
          next_send_at: string
          provider_email: string
          provider_name: string
          unsubscribed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          day_number?: number
          facility_id?: string | null
          id?: string
          last_sent_day?: number
          next_send_at?: string
          provider_email: string
          provider_name?: string
          unsubscribed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          day_number?: number
          facility_id?: string | null
          id?: string
          last_sent_day?: number
          next_send_at?: string
          provider_email?: string
          provider_name?: string
          unsubscribed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_onboarding_drip_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_onboarding_drip_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_onboarding_state: {
        Row: {
          created_at: string
          current_step: string
          draft_facility_data: Json | null
          id: string
          initial_facility_name: string | null
          mode: string | null
          plan: string | null
          selected_facility_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: string
          draft_facility_data?: Json | null
          id?: string
          initial_facility_name?: string | null
          mode?: string | null
          plan?: string | null
          selected_facility_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: string
          draft_facility_data?: Json | null
          id?: string
          initial_facility_name?: string | null
          mode?: string | null
          plan?: string | null
          selected_facility_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_onboarding_state_selected_facility_id_fkey"
            columns: ["selected_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_onboarding_state_selected_facility_id_fkey"
            columns: ["selected_facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_payment_methods: {
        Row: {
          bank_name: string | null
          card_brand: string | null
          created_at: string | null
          exp_month: number | null
          exp_year: number | null
          facility_id: string
          id: string
          is_default: boolean | null
          is_verified: boolean | null
          last_four: string
          stripe_customer_id: string | null
          stripe_payment_method_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          bank_name?: string | null
          card_brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          facility_id: string
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          last_four: string
          stripe_customer_id?: string | null
          stripe_payment_method_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          bank_name?: string | null
          card_brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          facility_id?: string
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          last_four?: string
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_payment_methods_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_payment_methods_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          identifier: string
          metadata: Json | null
          success: boolean | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          id?: string
          identifier: string
          metadata?: Json | null
          success?: boolean | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          identifier?: string
          metadata?: Json | null
          success?: boolean | null
        }
        Relationships: []
      }
      reply_email_verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          email: string
          expires_at: string
          facility_id: string
          id: string
          status: string | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          facility_id: string
          id?: string
          status?: string | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          facility_id?: string
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reply_email_verification_codes_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_email_verification_codes_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
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
          {
            foreignKeyName: "request_help_analytics_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      review_disputes: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          details: string | null
          disputed_by: string
          facility_id: string
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          review_id: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          disputed_by: string
          facility_id: string
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          disputed_by?: string
          facility_id?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_disputes_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_disputes_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_disputes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "facility_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_disputes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "public_facility_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "facility_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "public_facility_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          clicked_at: string | null
          created_at: string
          facility_id: string
          id: string
          opened_at: string | null
          recipient_email: string
          recipient_name: string
          resend_id: string | null
          review_submitted_at: string | null
          sender_user_id: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          facility_id: string
          id?: string
          opened_at?: string | null
          recipient_email: string
          recipient_name: string
          resend_id?: string | null
          review_submitted_at?: string | null
          sender_user_id: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          facility_id?: string
          id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string
          resend_id?: string | null
          review_submitted_at?: string | null
          sender_user_id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      review_responses: {
        Row: {
          created_at: string | null
          facility_id: string
          id: string
          responder_user_id: string
          response_text: string
          review_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          facility_id: string
          id?: string
          responder_user_id: string
          response_text: string
          review_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          facility_id?: string
          id?: string
          responder_user_id?: string
          response_text?: string
          review_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_responses_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "facility_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "public_facility_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_frequency: string
          created_at: string
          criteria: Json
          id: string
          last_alert_sent_at: string | null
          last_match_count: number
          name: string
          search_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_frequency?: string
          created_at?: string
          criteria?: Json
          id?: string
          last_alert_sent_at?: string | null
          last_match_count?: number
          name: string
          search_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_frequency?: string
          created_at?: string
          criteria?: Json
          id?: string
          last_alert_sent_at?: string | null
          last_match_count?: number
          name?: string
          search_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seeker_facility_alerts: {
        Row: {
          facility_id: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          facility_id: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          facility_id?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seeker_facility_alerts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_facility_alerts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_notifications: {
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
          type?: string
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
      seeker_onboarding_drip: {
        Row: {
          completed: boolean
          created_at: string
          current_step: number
          email: string
          id: string
          last_email_sent_at: string | null
          opted_out: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          current_step?: number
          email: string
          id?: string
          last_email_sent_at?: string | null
          opted_out?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          current_step?: number
          email?: string
          id?: string
          last_email_sent_at?: string | null
          opted_out?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seeker_profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          deletion_purge_after: string | null
          deletion_scheduled_at: string | null
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          state: string | null
          updated_at: string
          user_id: string
          zipcode: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          deletion_purge_after?: string | null
          deletion_scheduled_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zipcode?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          deletion_purge_after?: string | null
          deletion_scheduled_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      sms_inbound_log: {
        Row: {
          action: string | null
          body: string
          from_phone: string
          id: string
          keyword: string | null
          matched_user_id: string | null
          raw_payload: Json | null
          received_at: string
          to_phone: string
          twilio_message_sid: string | null
        }
        Insert: {
          action?: string | null
          body: string
          from_phone: string
          id?: string
          keyword?: string | null
          matched_user_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          to_phone: string
          twilio_message_sid?: string | null
        }
        Update: {
          action?: string | null
          body?: string
          from_phone?: string
          id?: string
          keyword?: string | null
          matched_user_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          to_phone?: string
          twilio_message_sid?: string | null
        }
        Relationships: []
      }
      staged_directory: {
        Row: {
          accreditation_number: string | null
          accreditation_status: string | null
          accreditation_type: string | null
          city: string | null
          cluster_id: string | null
          created_at: string
          expiry_date: string | null
          facility_name: string | null
          id: string
          issued_date: string | null
          match_key: string | null
          normalized_name: string | null
          normalized_phone: string | null
          normalized_street: string | null
          normalized_zip: string | null
          phone: string | null
          raw_payload: Json
          rejection_reason: string | null
          scraped_at: string
          source: string
          source_id: string
          state: string | null
          status: string
          street: string | null
          updated_at: string
          verification_url: string | null
          website: string | null
          website_domain: string | null
          zip: string | null
        }
        Insert: {
          accreditation_number?: string | null
          accreditation_status?: string | null
          accreditation_type?: string | null
          city?: string | null
          cluster_id?: string | null
          created_at?: string
          expiry_date?: string | null
          facility_name?: string | null
          id?: string
          issued_date?: string | null
          match_key?: string | null
          normalized_name?: string | null
          normalized_phone?: string | null
          normalized_street?: string | null
          normalized_zip?: string | null
          phone?: string | null
          raw_payload: Json
          rejection_reason?: string | null
          scraped_at?: string
          source: string
          source_id: string
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          verification_url?: string | null
          website?: string | null
          website_domain?: string | null
          zip?: string | null
        }
        Update: {
          accreditation_number?: string | null
          accreditation_status?: string | null
          accreditation_type?: string | null
          city?: string | null
          cluster_id?: string | null
          created_at?: string
          expiry_date?: string | null
          facility_name?: string | null
          id?: string
          issued_date?: string | null
          match_key?: string | null
          normalized_name?: string | null
          normalized_phone?: string | null
          normalized_street?: string | null
          normalized_zip?: string | null
          phone?: string | null
          raw_payload?: Json
          rejection_reason?: string | null
          scraped_at?: string
          source?: string
          source_id?: string
          state?: string | null
          status?: string
          street?: string | null
          updated_at?: string
          verification_url?: string | null
          website?: string | null
          website_domain?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staged_directory_cluster_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "facility_match_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      staged_leads: {
        Row: {
          bounced_at: string | null
          city: string | null
          cluster_id: string | null
          contact_first_name: string | null
          contact_last_name: string | null
          contact_title: string | null
          created_at: string
          do_not_email: boolean
          email: string | null
          email_domain: string | null
          email_validated_at: string | null
          email_validation_result: string | null
          facility_name: string | null
          id: string
          import_batch: string
          linkedin_url: string | null
          match_key: string | null
          normalized_name: string | null
          normalized_phone: string | null
          normalized_street: string | null
          normalized_zip: string | null
          notes: string | null
          phone: string | null
          raw_payload: Json
          rejection_reason: string | null
          source_id: string
          state: string | null
          status: string
          street: string | null
          unsubscribed_at: string | null
          updated_at: string
          uploaded_at: string
          website: string | null
          website_domain: string | null
          zip: string | null
        }
        Insert: {
          bounced_at?: string | null
          city?: string | null
          cluster_id?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_title?: string | null
          created_at?: string
          do_not_email?: boolean
          email?: string | null
          email_domain?: string | null
          email_validated_at?: string | null
          email_validation_result?: string | null
          facility_name?: string | null
          id?: string
          import_batch: string
          linkedin_url?: string | null
          match_key?: string | null
          normalized_name?: string | null
          normalized_phone?: string | null
          normalized_street?: string | null
          normalized_zip?: string | null
          notes?: string | null
          phone?: string | null
          raw_payload: Json
          rejection_reason?: string | null
          source_id: string
          state?: string | null
          status?: string
          street?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          uploaded_at?: string
          website?: string | null
          website_domain?: string | null
          zip?: string | null
        }
        Update: {
          bounced_at?: string | null
          city?: string | null
          cluster_id?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_title?: string | null
          created_at?: string
          do_not_email?: boolean
          email?: string | null
          email_domain?: string | null
          email_validated_at?: string | null
          email_validation_result?: string | null
          facility_name?: string | null
          id?: string
          import_batch?: string
          linkedin_url?: string | null
          match_key?: string | null
          normalized_name?: string | null
          normalized_phone?: string | null
          normalized_street?: string | null
          normalized_zip?: string | null
          notes?: string | null
          phone?: string | null
          raw_payload?: Json
          rejection_reason?: string | null
          source_id?: string
          state?: string | null
          status?: string
          street?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          uploaded_at?: string
          website?: string | null
          website_domain?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staged_leads_cluster_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "facility_match_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      staged_samhsa: {
        Row: {
          city: string | null
          cluster_id: string | null
          created_at: string
          hotline_phone: string | null
          id: string
          insurance: Json | null
          intake_phone: string | null
          latitude: number | null
          longitude: number | null
          match_key: string | null
          name: string
          name_alt: string | null
          normalized_intake_phone: string | null
          normalized_name: string | null
          normalized_phone: string | null
          normalized_street: string | null
          normalized_zip: string | null
          phone: string | null
          raw_payload: Json
          rejection_reason: string | null
          scraped_at: string
          services: Json | null
          source_id: string
          state: string | null
          status: string
          street: string | null
          type_facility: string | null
          updated_at: string
          website: string | null
          website_domain: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          cluster_id?: string | null
          created_at?: string
          hotline_phone?: string | null
          id?: string
          insurance?: Json | null
          intake_phone?: string | null
          latitude?: number | null
          longitude?: number | null
          match_key?: string | null
          name: string
          name_alt?: string | null
          normalized_intake_phone?: string | null
          normalized_name?: string | null
          normalized_phone?: string | null
          normalized_street?: string | null
          normalized_zip?: string | null
          phone?: string | null
          raw_payload: Json
          rejection_reason?: string | null
          scraped_at?: string
          services?: Json | null
          source_id: string
          state?: string | null
          status?: string
          street?: string | null
          type_facility?: string | null
          updated_at?: string
          website?: string | null
          website_domain?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          cluster_id?: string | null
          created_at?: string
          hotline_phone?: string | null
          id?: string
          insurance?: Json | null
          intake_phone?: string | null
          latitude?: number | null
          longitude?: number | null
          match_key?: string | null
          name?: string
          name_alt?: string | null
          normalized_intake_phone?: string | null
          normalized_name?: string | null
          normalized_phone?: string | null
          normalized_street?: string | null
          normalized_zip?: string | null
          phone?: string | null
          raw_payload?: Json
          rejection_reason?: string | null
          scraped_at?: string
          services?: Json | null
          source_id?: string
          state?: string | null
          status?: string
          street?: string | null
          type_facility?: string | null
          updated_at?: string
          website?: string | null
          website_domain?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staged_samhsa_cluster_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "facility_match_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          payload_summary: Json | null
          processed_at: string | null
          received_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          payload_summary?: Json | null
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          payload_summary?: Json | null
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      subscription_alerts: {
        Row: {
          alert_key: string
          alert_type: string
          created_at: string
          id: string
          resend_id: string | null
          user_id: string
        }
        Insert: {
          alert_key: string
          alert_type: string
          created_at?: string
          id?: string
          resend_id?: string | null
          user_id: string
        }
        Update: {
          alert_key?: string
          alert_type?: string
          created_at?: string
          id?: string
          resend_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_cancellations: {
        Row: {
          canceled_at: string
          canceled_by: string | null
          charged_for_use_cents: number
          full_monthly_rate_cents: number
          id: string
          months_used: number
          paid_amount_cents: number
          reason: string | null
          refund_amount_cents: number
          stripe_refund_id: string | null
          subscription_id: string
        }
        Insert: {
          canceled_at?: string
          canceled_by?: string | null
          charged_for_use_cents: number
          full_monthly_rate_cents: number
          id?: string
          months_used: number
          paid_amount_cents: number
          reason?: string | null
          refund_amount_cents: number
          stripe_refund_id?: string | null
          subscription_id: string
        }
        Update: {
          canceled_at?: string
          canceled_by?: string | null
          charged_for_use_cents?: number
          full_monthly_rate_cents?: number
          id?: string
          months_used?: number
          paid_amount_cents?: number
          reason?: string | null
          refund_amount_cents?: number
          stripe_refund_id?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cancellations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "facility_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          event_type: string
          facility_id: string | null
          id: string
          metadata: Json | null
          plan_name: string | null
          plan_tier: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_event_id: string | null
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_type: string
          facility_id?: string | null
          id?: string
          metadata?: Json | null
          plan_name?: string | null
          plan_tier?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          event_type?: string
          facility_id?: string | null
          id?: string
          metadata?: Json | null
          plan_name?: string | null
          plan_tier?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          sender_email: string
          sender_name: string
          sender_user_id: string | null
          source: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_email: string
          sender_name: string
          sender_user_id?: string | null
          source: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_email?: string
          sender_name?: string
          sender_user_id?: string | null
          source?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
          reason: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          reason: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          reason?: string
          source?: string | null
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
      user_compare_list: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_compare_list_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_compare_list_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
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
      leads_provider_view: {
        Row: {
          age_range: string | null
          assigned_at: string | null
          assignment_reason: string | null
          assignment_status: string | null
          best_time_to_call: string | null
          budget_preference: string | null
          co_occurring_conditions: string[] | null
          created_at: string | null
          dual_diagnosis: string | null
          email: string | null
          employment_status: string | null
          exclusive_until: string | null
          exclusivity: string | null
          extended_until: string | null
          facility_id: string | null
          gender: string | null
          id: string | null
          inquiry_type: string | null
          insurance_provider: string | null
          insurance_type: string | null
          lead_expired_at: string | null
          legal_involvement: string | null
          level_of_care: string | null
          location_city_state: string | null
          location_zip: string | null
          message: string | null
          name: string | null
          original_facility_id: string | null
          phone: string | null
          preferred_contact: string | null
          previous_treatment: string | null
          previous_treatment_details: string | null
          primary_substance: string[] | null
          provider_responded_at: string | null
          provider_response_notes: string | null
          provider_response_status: string | null
          quality_flag: string | null
          readiness_level: string | null
          redistribution_status: string | null
          relationship_to_patient: string | null
          shared_with: string[] | null
          snooze_until: string | null
          source: string | null
          special_needs: string[] | null
          status: string | null
          urgency: string | null
          veteran_status: string | null
          who_seeking_help: string | null
        }
        Insert: {
          age_range?: string | null
          assigned_at?: string | null
          assignment_reason?: string | null
          assignment_status?: string | null
          best_time_to_call?: string | null
          budget_preference?: string | null
          co_occurring_conditions?: string[] | null
          created_at?: string | null
          dual_diagnosis?: string | null
          email?: string | null
          employment_status?: string | null
          exclusive_until?: string | null
          exclusivity?: string | null
          extended_until?: string | null
          facility_id?: string | null
          gender?: string | null
          id?: string | null
          inquiry_type?: string | null
          insurance_provider?: string | null
          insurance_type?: string | null
          lead_expired_at?: string | null
          legal_involvement?: string | null
          level_of_care?: string | null
          location_city_state?: string | null
          location_zip?: string | null
          message?: string | null
          name?: string | null
          original_facility_id?: string | null
          phone?: string | null
          preferred_contact?: string | null
          previous_treatment?: string | null
          previous_treatment_details?: string | null
          primary_substance?: string[] | null
          provider_responded_at?: string | null
          provider_response_notes?: string | null
          provider_response_status?: string | null
          quality_flag?: string | null
          readiness_level?: string | null
          redistribution_status?: string | null
          relationship_to_patient?: string | null
          shared_with?: string[] | null
          snooze_until?: string | null
          source?: string | null
          special_needs?: string[] | null
          status?: string | null
          urgency?: string | null
          veteran_status?: string | null
          who_seeking_help?: string | null
        }
        Update: {
          age_range?: string | null
          assigned_at?: string | null
          assignment_reason?: string | null
          assignment_status?: string | null
          best_time_to_call?: string | null
          budget_preference?: string | null
          co_occurring_conditions?: string[] | null
          created_at?: string | null
          dual_diagnosis?: string | null
          email?: string | null
          employment_status?: string | null
          exclusive_until?: string | null
          exclusivity?: string | null
          extended_until?: string | null
          facility_id?: string | null
          gender?: string | null
          id?: string | null
          inquiry_type?: string | null
          insurance_provider?: string | null
          insurance_type?: string | null
          lead_expired_at?: string | null
          legal_involvement?: string | null
          level_of_care?: string | null
          location_city_state?: string | null
          location_zip?: string | null
          message?: string | null
          name?: string | null
          original_facility_id?: string | null
          phone?: string | null
          preferred_contact?: string | null
          previous_treatment?: string | null
          previous_treatment_details?: string | null
          primary_substance?: string[] | null
          provider_responded_at?: string | null
          provider_response_notes?: string | null
          provider_response_status?: string | null
          quality_flag?: string | null
          readiness_level?: string | null
          redistribution_status?: string | null
          relationship_to_patient?: string | null
          shared_with?: string[] | null
          snooze_until?: string | null
          source?: string | null
          special_needs?: string[] | null
          status?: string | null
          urgency?: string | null
          veteran_status?: string | null
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
          {
            foreignKeyName: "leads_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_original_facility_id_fkey"
            columns: ["original_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_original_facility_id_fkey"
            columns: ["original_facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      public_facilities: {
        Row: {
          accepts_international_patients: boolean | null
          address: string | null
          bed_count: string | null
          calculated_ranking_score: number | null
          city: string | null
          created_at: string | null
          data_source: string | null
          description: string | null
          email: string | null
          facility_type: string | null
          featured: boolean | null
          featured_display_order: number | null
          featured_pinned: boolean | null
          gallery_urls: string[] | null
          gender_served: string | null
          id: string | null
          is_claimed: boolean | null
          is_premium_visible: boolean | null
          is_pro: boolean | null
          listing_completeness_score: number | null
          logo_url: string | null
          name: string | null
          phone: string | null
          response_rate_score: number | null
          slug: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          verified: boolean | null
          website: string | null
          year_established: number | null
          zip_code: string | null
        }
        Relationships: []
      }
      public_facility_reviews: {
        Row: {
          created_at: string | null
          disputed: boolean | null
          facility_id: string | null
          helpful_count: number | null
          id: string | null
          rating: number | null
          review_text: string | null
          reviewer_display_name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disputed?: boolean | null
          facility_id?: string | null
          helpful_count?: number | null
          id?: string | null
          rating?: number | null
          review_text?: string | null
          reviewer_display_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disputed?: boolean | null
          facility_id?: string | null
          helpful_count?: number | null
          id?: string | null
          rating?: number | null
          review_text?: string | null
          reviewer_display_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_reviews_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_reviews_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      public_facility_staff: {
        Row: {
          bio: string | null
          created_at: string | null
          display_order: number | null
          facility_id: string | null
          id: string | null
          is_visible: boolean | null
          job_title: string | null
          name: string | null
          photo_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_staff_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_staff_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "public_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_can_manage_invoices: {
        Args: { _user_id: string }
        Returns: boolean
      }
      admin_force_concierge_status: {
        Args: { p_inquiry_id: string; p_new_status: string; p_reason?: string }
        Returns: undefined
      }
      assess_login_risk: {
        Args: {
          p_browser?: string
          p_device_token_hash?: string
          p_ip_address?: string
          p_os?: string
          p_user_id: string
        }
        Returns: Json
      }
      backfill_samhsa_descriptions: { Args: never; Returns: number }
      backfill_samhsa_enrichment: {
        Args: never
        Returns: {
          age_groups_inserted: number
          descriptions_generated: number
          facilities_processed: number
          gender_updated: number
          insurance_inserted: number
          services_inserted: number
        }[]
      }
      build_match_clusters: {
        Args: never
        Returns: {
          admin_review: number
          auto_eligible: number
          by_tier_address: number
          by_tier_phone_state: number
          by_tier_phone_state_zip: number
          clusters_created: number
          records_linked: number
        }[]
      }
      can_access_lead: {
        Args: { p_lead_id: string; p_user_id: string }
        Returns: boolean
      }
      can_moderate_users: { Args: { p_user_id: string }; Returns: boolean }
      check_lead_access: {
        Args: { p_facility_id: string; p_lead_id: string }
        Returns: {
          distributed_at: string
          has_access: boolean
          is_original: boolean
          is_redistributed: boolean
          redistribution_status: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_action_type?: string
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      check_renewal_reminder_setup: { Args: never; Returns: Json }
      claim_stripe_webhook_event: {
        Args: { p_event_id: string; p_event_type: string }
        Returns: boolean
      }
      complete_admin_mfa_setup: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      complete_admin_password_setup: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      complete_provider_onboarding: { Args: never; Returns: Json }
      complete_provider_onboarding_with_plan: {
        Args: { p_plan: string }
        Returns: Json
      }
      compute_cancellation_refund: {
        Args: { p_cancel_at?: string; p_subscription_id: string }
        Returns: {
          charged_for_use_cents: number
          full_monthly_rate_cents: number
          months_used: number
          paid_amount_cents: number
          refund_amount_cents: number
        }[]
      }
      current_auth_uid: { Args: never; Returns: string }
      current_user_email: { Args: never; Returns: string }
      enqueue_renewal_reminder: {
        Args: { p_milestone: string; p_subscription_id: string }
        Returns: undefined
      }
      extract_email_domain: { Args: { input: string }; Returns: string }
      extract_website_domain: { Args: { input: string }; Returns: string }
      generate_facility_slug: {
        Args: { p_city: string; p_name: string; p_state: string }
        Returns: string
      }
      get_addon_waitlist_position: {
        Args: { p_waitlist_id: string }
        Returns: {
          queue_position: number
          queue_total: number
        }[]
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_profile: {
        Args: { p_user_id: string }
        Returns: {
          admin_role: Database["public"]["Enums"]["admin_role_type"]
          avatar_url: string
          display_name: string
          first_name: string
          force_password_change: boolean
          last_name: string
          mfa_enabled: boolean
          mfa_skip: boolean
          status: string
          user_id: string
        }[]
      }
      get_admin_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["admin_role_type"]
      }
      get_admin_users_list: {
        Args: never
        Returns: {
          admin_role: string
          avatar_url: string
          commission_rate: number
          created_at: string
          display_name: string
          email: string
          employment_type: string
          first_name: string
          force_password_change: boolean
          last_login_at: string
          last_name: string
          mfa_enabled: boolean
          mfa_skip: boolean
          phone: string
          status: string
          user_id: string
        }[]
      }
      get_concierge_availability: {
        Args: { p_city?: string; p_state: string }
        Returns: {
          cap: number
          remaining: number
          used: number
        }[]
      }
      get_facility_leads_count: {
        Args: { p_facility_id: string }
        Returns: {
          monthly_qualified_count: number
          total_count: number
        }[]
      }
      get_facility_rating: {
        Args: { p_facility_id: string }
        Returns: {
          average_rating: number
          review_count: number
        }[]
      }
      get_facility_ratings_batch: {
        Args: { p_facility_ids: string[] }
        Returns: {
          average_rating: number
          facility_id: string
          review_count: number
        }[]
      }
      get_owner_facility_data: {
        Args: { p_user_id: string }
        Returns: {
          address: string
          bed_count: string
          bonus_leads: number
          city: string
          created_at: string
          description: string
          email: string
          facility_type: string
          featured: boolean
          featured_pinned: boolean
          gallery_urls: string[]
          gender_served: string
          id: string
          last_featured_shown_at: string
          lead_limit_override: number
          leads_reset_at: string
          logo_url: string
          name: string
          phone: string
          profile_completion_celebrated: boolean
          profile_reminder_count: number
          profile_reminder_sent_at: string
          reply_email: string
          reply_email_verified: boolean
          reply_email_verified_at: string
          slug: string
          state: string
          status: string
          suspended: boolean
          updated_at: string
          verified: boolean
          website: string
          year_established: number
          zip_code: string
        }[]
      }
      get_pending_leads_count: { Args: { p_user_id: string }; Returns: number }
      get_placement_availability: {
        Args: { p_type: string; p_value: string }
        Returns: {
          cap: number
          remaining: number
          used: number
        }[]
      }
      get_pro_discount: { Args: { p_facility_id: string }; Returns: number }
      get_provider_engagement_summary: {
        Args: { p_facility_ids: string[]; p_from: string; p_to: string }
        Returns: Json
      }
      get_provider_facility_placements: {
        Args: { p_facility_id: string }
        Returns: {
          case_kind: string
          created_at: string
          id: string
          level_of_care: string
          placed_facility_id: string
          placement_confirmed: boolean
          placement_confirmed_at: string
          provider_fee_cents: number
          provider_fee_status: string
          provider_fee_type: string
          status: string
          updated_at: string
          user_name: string
        }[]
      }
      get_provider_safe_inquiries: {
        Args: { p_facility_id: string }
        Returns: {
          age_range: string
          budget_range: string
          co_occurring_concerns: Json
          detox_needed: string
          gender: string
          id: string
          insurance_carrier: string
          level_of_care: string
          payment_type: string
          placed_facility_id: string
          placement_confirmed: boolean
          placement_confirmed_at: string
          preferred_city: string
          preferred_state: string
          primary_concern: string
          seeker_confirmed: boolean
          seeker_confirmed_at: string
          status: string
          substance_use_duration: string
          timeline_urgency: string
          user_name: string
        }[]
      }
      get_public_facility_data: {
        Args: { facility_id: string }
        Returns: {
          address: string
          bed_count: string
          city: string
          created_at: string
          description: string
          email: string
          facility_type: string
          featured: boolean
          featured_pinned: boolean
          gallery_urls: string[]
          gender_served: string
          id: string
          last_featured_shown_at: string
          logo_url: string
          name: string
          phone: string
          reply_email: string
          reply_email_verified: boolean
          reply_email_verified_at: string
          slug: string
          state: string
          status: string
          updated_at: string
          verified: boolean
          website: string
          zip_code: string
        }[]
      }
      get_seeker_emails_for_admin: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_seeker_lead_detail: {
        Args: { p_lead_id: string }
        Returns: {
          age_range: string
          created_at: string
          email: string
          facility_id: string
          gender: string
          id: string
          insurance_type: string
          level_of_care: string
          location_city_state: string
          location_zip: string
          message: string
          name: string
          phone: string
          preferred_contact: string
          primary_substance: string[]
          provider_responded_at: string
          provider_response_status: string
          source: string
          status: string
          urgency: string
          who_seeking_help: string
        }[]
      }
      get_seeker_lead_notes: {
        Args: { p_lead_id: string }
        Returns: {
          created_at: string
          note: string
        }[]
      }
      get_seeker_phones_for_admin: {
        Args: never
        Returns: {
          phone: string
          source: string
          user_id: string
        }[]
      }
      get_seeker_submitted_leads: {
        Args: never
        Returns: {
          created_at: string
          facility_id: string
          id: string
          preferred_contact: string
          provider_responded_at: string
          provider_response_status: string
          status: string
          urgency: string
        }[]
      }
      get_user_sessions_safe: {
        Args: { p_user_id: string }
        Returns: {
          browser: string
          created_at: string
          device_name: string
          id: string
          ip_address: string
          is_current: boolean
          last_active_at: string
          location: string
          os: string
        }[]
      }
      get_waitlist_demand_summary: {
        Args: { p_limit?: number }
        Returns: {
          addon_type: string
          cap: number
          geo_city: string
          geo_state: string
          invited_count: number
          oldest_request: string
          scope_key: string
          scope_label: string
          scope_type: string
          scope_value: string
          used: number
          waiting_count: number
        }[]
      }
      has_active_pro: { Args: { p_facility_id: string }; Returns: boolean }
      has_admin_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_admin_role: {
        Args: {
          _admin_role: Database["public"]["Enums"]["admin_role_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_admin_session_active: { Args: { p_user_id: string }; Returns: boolean }
      is_approved_facility: { Args: { _facility_id: string }; Returns: boolean }
      is_email_admin: { Args: { p_email: string }; Returns: boolean }
      is_email_provider: { Args: { p_email: string }; Returns: boolean }
      is_email_seeker: { Args: { p_email: string }; Returns: boolean }
      is_email_verified: { Args: { p_email: string }; Returns: boolean }
      is_identifier_blocked: {
        Args: { p_identifier: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_rate_limit_event: {
        Args: {
          p_action_type?: string
          p_identifier: string
          p_metadata?: Json
          p_success?: boolean
        }
        Returns: undefined
      }
      mark_stripe_webhook_event_processed: {
        Args: { p_error?: string; p_event_id: string; p_status?: string }
        Returns: undefined
      }
      match_key_strict: {
        Args: {
          p_address: string
          p_city: string
          p_phone: string
          p_state: string
          p_zip: string
        }
        Returns: string
      }
      normalize_facility_name: { Args: { input: string }; Returns: string }
      normalize_phone: { Args: { input: string }; Returns: string }
      normalize_street_address: { Args: { input: string }; Returns: string }
      normalize_text_basic: { Args: { input: string }; Returns: string }
      normalize_zip: { Args: { input: string }; Returns: string }
      phi_audit_resolve_actor: {
        Args: never
        Returns: {
          actor_type: string
          actor_user_id: string
        }[]
      }
      promote_eligible_clusters: {
        Args: { p_dry_run?: boolean }
        Returns: {
          action: string
          out_city: string
          out_cluster_id: string
          out_existing_facility_id: string
          out_facility_name: string
          out_generated_slug: string
          out_phone: string
          out_source_count: number
          out_state: string
        }[]
      }
      promote_quality_two_source_clusters: {
        Args: { p_dry_run?: boolean }
        Returns: {
          action: string
          out_city: string
          out_cluster_id: string
          out_facility_id: string
          out_facility_name: string
          out_phone: string
          out_sources: string
          out_state: string
          out_website: string
        }[]
      }
      provider_has_introduction: {
        Args: { _inquiry_id: string; _user_id: string }
        Returns: boolean
      }
      purge_provider_data: {
        Args: { p_delete_user?: boolean; p_facility_id: string }
        Returns: Json
      }
      purge_seeker_data: {
        Args: { p_user_email: string; p_user_id: string }
        Returns: undefined
      }
      regenerate_facility_descriptions_canonical: {
        Args: never
        Returns: number
      }
      register_trusted_device: {
        Args: {
          p_browser?: string
          p_device_label?: string
          p_device_token_hash: string
          p_ip_address?: string
          p_os?: string
          p_user_id: string
        }
        Returns: string
      }
      search_provider_facilities: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          city: string
          id: string
          is_claimed: boolean
          logo_url: string
          match_score: number
          name: string
          slug: string
          state: string
          total_matches: number
        }[]
      }
      seeker_confirm_placement: {
        Args: { p_facility_id: string; p_inquiry_id: string }
        Returns: undefined
      }
      send_subscription_renewal_reminders: { Args: never; Returns: Json }
      staged_directory_merge_upsert: {
        Args: { records: Json }
        Returns: {
          out_source_id: string
          was_insert: boolean
        }[]
      }
      staged_samhsa_merge_upsert: {
        Args: { records: Json }
        Returns: {
          out_source_id: string
          was_insert: boolean
        }[]
      }
      state_code_to_name: { Args: { code: string }; Returns: string }
      test_leads_provider_view_masks_non_owner: { Args: never; Returns: Json }
      title_case_with_acronyms: { Args: { input: string }; Returns: string }
      touch_admin_activity: { Args: { p_user_id: string }; Returns: undefined }
      try_acquire_auto_reload_lock: {
        Args: { p_provider_id: string }
        Returns: boolean
      }
      user_has_provider_profile: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      user_has_seeker_profile: { Args: { p_user_id: string }; Returns: boolean }
      user_is_admin: { Args: { p_user_id: string }; Returns: boolean }
      user_owns_facility: {
        Args: { _facility_id: string; _user_id: string }
        Returns: boolean
      }
      verify_leads_provider_view_rls: { Args: never; Returns: Json }
    }
    Enums: {
      admin_role_type: "super_admin" | "manager" | "customer_rep" | "advisor"
      app_role: "admin" | "moderator" | "seeker"
      earning_status: "pending" | "approved" | "paid"
      employment_type: "employee" | "contractor" | "va"
      escalation_priority: "low" | "medium" | "high" | "critical"
      escalation_status: "open" | "in_progress" | "resolved" | "closed"
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
      admin_role_type: ["super_admin", "manager", "customer_rep", "advisor"],
      app_role: ["admin", "moderator", "seeker"],
      earning_status: ["pending", "approved", "paid"],
      employment_type: ["employee", "contractor", "va"],
      escalation_priority: ["low", "medium", "high", "critical"],
      escalation_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const

