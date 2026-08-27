/**
 * Supabase Postgres types (aligned with live project via Cursor Supabase MCP).
 * Regenerate when schema changes: MCP `generate_typescript_types` or
 * `npx supabase login && npx supabase gen types typescript --linked`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      accommodation_reservations: {
        Row: {
          id: string;
          unit_id: string;
          customer_id: string;
          organization_id: string;
          check_in_date: string;
          check_out_date: string;
          check_in_time: string | null;
          check_out_time: string | null;
          status: string;
          guest_count: number;
          notes: string | null;
          total_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          customer_id: string;
          organization_id: string;
          check_in_date: string;
          check_out_date: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          status?: string;
          guest_count?: number;
          notes?: string | null;
          total_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          unit_id?: string;
          customer_id?: string;
          organization_id?: string;
          check_in_date?: string;
          check_out_date?: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          status?: string;
          guest_count?: number;
          notes?: string | null;
          total_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accommodation_reservations_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "accommodation_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accommodation_reservations_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      accommodation_units: {
        Row: {
          id: string;
          name: string;
          property_id: string | null;
          organization_id: string;
          max_guests: number;
          notes: string | null;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          property_id?: string | null;
          organization_id: string;
          max_guests?: number;
          notes?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          property_id?: string | null;
          organization_id?: string;
          max_guests?: number;
          notes?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accommodation_units_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      assets: {
        Row: {
          condition: string | null;
          created_at: string;
          id: string;
          insurance_status: string | null;
          name: string;
          organization_id: string;
          property_id: string;
          quantity: number;
          updated_at: string;
          value: number;
        };
        Insert: {
          condition?: string | null;
          created_at?: string;
          id?: string;
          insurance_status?: string | null;
          name: string;
          organization_id: string;
          property_id: string;
          quantity?: number;
          updated_at?: string;
          value?: number;
        };
        Update: {
          condition?: string | null;
          created_at?: string;
          id?: string;
          insurance_status?: string | null;
          name?: string;
          organization_id?: string;
          property_id?: string;
          quantity?: number;
          updated_at?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "assets_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          booking_reference: string | null;
          collection_notice_sent_at: string | null;
          created_at: string;
          customer_id: string;
          event_date: string;
          event_end_date: string | null;
          event_start_time: string | null;
          event_end_time: string | null;
          event_type: string;
          fest_type: string | null;
          guest_count: number;
          id: string;
          notes: string | null;
          organization_id: string;
          paid_amount: number;
          payment_due_date: string | null;
          payment_status: string | null;
          property_id: string | null;
          remaining_amount: number;
          status: string;
          total_price: number;
          updated_at: string;
        };
        Insert: {
          booking_reference?: string | null;
          collection_notice_sent_at?: string | null;
          created_at?: string;
          customer_id: string;
          event_date: string;
          event_end_date?: string | null;
          event_start_time?: string | null;
          event_end_time?: string | null;
          event_type: string;
          fest_type?: string | null;
          guest_count?: number;
          id?: string;
          notes?: string | null;
          organization_id: string;
          paid_amount?: number;
          payment_due_date?: string | null;
          payment_status?: string | null;
          property_id?: string | null;
          remaining_amount?: number;
          status: string;
          total_price?: number;
          updated_at?: string;
        };
        Update: {
          booking_reference?: string | null;
          collection_notice_sent_at?: string | null;
          created_at?: string;
          customer_id?: string;
          event_date?: string;
          event_end_date?: string | null;
          event_start_time?: string | null;
          event_end_time?: string | null;
          event_type?: string;
          fest_type?: string | null;
          guest_count?: number;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          paid_amount?: number;
          payment_due_date?: string | null;
          payment_status?: string | null;
          property_id?: string | null;
          remaining_amount?: number;
          status?: string;
          total_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_inquiries: {
        Row: {
          id: string;
          customer_id: string;
          property_id: string | null;
          organization_id: string;
          event_type: string;
          fest_type: string | null;
          preferred_event_date: string | null;
          preferred_event_end_date: string | null;
          guest_count: number;
          estimated_total: number | null;
          status: string;
          next_follow_up_at: string | null;
          internal_notes: string | null;
          converted_booking_id: string | null;
          converted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          property_id?: string | null;
          organization_id: string;
          event_type?: string;
          fest_type?: string | null;
          preferred_event_date?: string | null;
          preferred_event_end_date?: string | null;
          guest_count?: number;
          estimated_total?: number | null;
          status?: string;
          next_follow_up_at?: string | null;
          internal_notes?: string | null;
          converted_booking_id?: string | null;
          converted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          property_id?: string | null;
          organization_id?: string;
          event_type?: string;
          fest_type?: string | null;
          preferred_event_date?: string | null;
          preferred_event_end_date?: string | null;
          guest_count?: number;
          estimated_total?: number | null;
          status?: string;
          next_follow_up_at?: string | null;
          internal_notes?: string | null;
          converted_booking_id?: string | null;
          converted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_inquiries_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_inquiries_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_inquiries_converted_booking_id_fkey";
            columns: ["converted_booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          subscription_status: string;
          subscription_plan: string;
          legal_name: string | null;
          tagline: string | null;
          org_number: string | null;
          address_line1: string | null;
          address_line2: string | null;
          postal_code: string | null;
          city: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          bank_account: string | null;
          payment_instructions: string | null;
          is_suspended: boolean;
          suspended_at: string | null;
          suspended_reason: string | null;
          admin_notes: string | null;
          billing_email: string | null;
          billing_exempt: boolean;
          last_activity_at: string | null;
          trial_ends_at: string | null;
          tenant_setup_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          subscription_status?: string;
          subscription_plan?: string;
          legal_name?: string | null;
          tagline?: string | null;
          org_number?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          postal_code?: string | null;
          city?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          bank_account?: string | null;
          payment_instructions?: string | null;
          is_suspended?: boolean;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          admin_notes?: string | null;
          billing_email?: string | null;
          billing_exempt?: boolean;
          last_activity_at?: string | null;
          trial_ends_at?: string | null;
          tenant_setup_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          subscription_status?: string;
          subscription_plan?: string;
          legal_name?: string | null;
          tagline?: string | null;
          org_number?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          postal_code?: string | null;
          city?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          bank_account?: string | null;
          payment_instructions?: string | null;
          is_suspended?: boolean;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          admin_notes?: string | null;
          billing_email?: string | null;
          billing_exempt?: boolean;
          last_activity_at?: string | null;
          trial_ends_at?: string | null;
          tenant_setup_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_calendar_feeds: {
        Row: {
          id: string;
          organization_id: string;
          token: string;
          created_at: string;
          updated_at: string;
          last_accessed_at: string | null;
          created_by_user_id: string | null;
          rotated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          token: string;
          created_at?: string;
          updated_at?: string;
          last_accessed_at?: string | null;
          created_by_user_id?: string | null;
          rotated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          token?: string;
          created_at?: string;
          updated_at?: string;
          last_accessed_at?: string | null;
          created_by_user_id?: string | null;
          rotated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_calendar_feeds_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_email_templates: {
        Row: {
          id: string;
          key: string;
          subject: string;
          body_html: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          subject: string;
          body_html: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          subject?: string;
          body_html?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_feature_flags: {
        Row: {
          key: string;
          description: string;
          enabled_global: boolean;
          rollout_percentage: number;
          organization_overrides: Json;
          enabled_at: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          description?: string;
          enabled_global?: boolean;
          rollout_percentage?: number;
          organization_overrides?: Json;
          enabled_at?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          description?: string;
          enabled_global?: boolean;
          rollout_percentage?: number;
          organization_overrides?: Json;
          enabled_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_impersonation_sessions: {
        Row: {
          id: string;
          admin_user_id: string;
          organization_id: string;
          reason: string;
          started_at: string;
          ended_at: string | null;
          ip_address: string | null;
        };
        Insert: {
          id?: string;
          admin_user_id: string;
          organization_id: string;
          reason: string;
          started_at?: string;
          ended_at?: string | null;
          ip_address?: string | null;
        };
        Update: {
          id?: string;
          admin_user_id?: string;
          organization_id?: string;
          reason?: string;
          started_at?: string;
          ended_at?: string | null;
          ip_address?: string | null;
        };
        Relationships: [];
      };
      platform_job_runs: {
        Row: {
          id: string;
          job_name: string;
          status: string;
          metadata: Json;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          job_name: string;
          status?: string;
          metadata?: Json;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          job_name?: string;
          status?: string;
          metadata?: Json;
          started_at?: string;
          finished_at?: string | null;
        };
        Relationships: [];
      };
      platform_login_events: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_notification_campaigns: {
        Row: {
          id: string;
          name: string;
          template_key: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          template_key?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          template_key?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_notification_deliveries: {
        Row: {
          id: string;
          campaign_id: string | null;
          recipient_email: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          recipient_email: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          recipient_email?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_notification_send_log: {
        Row: {
          id: string;
          template_key: string;
          recipient_email: string;
          context_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_key: string;
          recipient_email: string;
          context_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_key?: string;
          recipient_email?: string;
          context_key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_support_notes: {
        Row: {
          id: string;
          ticket_id: string;
          author_user_id: string;
          body: string;
          tags: string[];
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          author_user_id: string;
          body: string;
          tags?: string[];
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          author_user_id?: string;
          body?: string;
          tags?: string[];
          is_internal?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_support_tickets: {
        Row: {
          id: string;
          organization_id: string;
          status: string;
          subject: string;
          category: string;
          assigned_to: string | null;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          status?: string;
          subject: string;
          category?: string;
          assigned_to?: string | null;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          status?: string;
          subject?: string;
          category?: string;
          assigned_to?: string | null;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: {
          event_id: string;
          event_type: string;
          processed_at: string | null;
          payload: Json | null;
        };
        Insert: {
          event_id: string;
          event_type: string;
          processed_at?: string | null;
          payload?: Json | null;
        };
        Update: {
          event_id?: string;
          event_type?: string;
          processed_at?: string | null;
          payload?: Json | null;
        };
        Relationships: [];
      };
      booking_inquiry_activities: {
        Row: {
          id: string;
          inquiry_id: string;
          body: string;
          kind: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          inquiry_id: string;
          body: string;
          kind?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          inquiry_id?: string;
          body?: string;
          kind?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_inquiry_activities_inquiry_id_fkey";
            columns: ["inquiry_id"];
            isOneToOne: false;
            referencedRelation: "booking_inquiries";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          address: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          organization_id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          organization_id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          organization_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      partners: {
        Row: {
          id: string;
          category: string;
          name: string;
          organization_id: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          name: string;
          organization_id: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          name?: string;
          organization_id?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          price: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          price?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_audit_log: {
        Row: {
          action: string;
          actor_user_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_user_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          active_organization_id: string | null;
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          is_platform_admin: boolean;
          role: string;
          updated_at: string;
        };
        Insert: {
          active_organization_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_platform_admin?: boolean;
          role?: string;
          updated_at?: string;
        };
        Update: {
          active_organization_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_platform_admin?: boolean;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address: string | null;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          organization_id: string;
          type: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          organization_id: string;
          type?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          organization_id?: string;
          type?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          price: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          price?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          provider: string | null;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          plan: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          provider_price_id: string | null;
          provider_product_id: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          metadata: Json;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          plan?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          provider_price_id?: string | null;
          provider_product_id?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          metadata?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          plan?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          provider_price_id?: string | null;
          provider_product_id?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          metadata?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          organization_id: string;
          property_id: string;
          transaction_date: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          category: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          organization_id: string;
          property_id: string;
          transaction_date: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          organization_id?: string;
          property_id?: string;
          transaction_date?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      user_notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          template_key: string | null;
          campaign_id: string | null;
          context_key: string;
          read_at: string | null;
          created_at: string;
          category: string;
          priority: string;
          organization_id: string | null;
          event_key: string | null;
          action_url: string | null;
          action_label: string | null;
          acknowledged_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          template_key?: string | null;
          campaign_id?: string | null;
          context_key: string;
          read_at?: string | null;
          created_at?: string;
          category?: string;
          priority?: string;
          organization_id?: string | null;
          event_key?: string | null;
          action_url?: string | null;
          action_label?: string | null;
          acknowledged_at?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          template_key?: string | null;
          campaign_id?: string | null;
          context_key?: string;
          read_at?: string | null;
          created_at?: string;
          category?: string;
          priority?: string;
          organization_id?: string | null;
          event_key?: string | null;
          action_url?: string | null;
          action_label?: string | null;
          acknowledged_at?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      audit_action_counts: {
        Args: Record<PropertyKey, never>;
        Returns: { action: string; count: number }[];
      };
      audit_unique_actors_since: {
        Args: { since_at: string };
        Returns: number;
      };
      current_profile_role: { Args: never; Returns: string };
      find_user_id_by_email: {
        Args: { lookup_email: string };
        Returns: string | null;
      };
      is_current_user_platform_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
