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
          created_at?: string;
          updated_at?: string;
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
      profiles: {
        Row: {
          active_organization_id: string | null;
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_profile_role: { Args: never; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
