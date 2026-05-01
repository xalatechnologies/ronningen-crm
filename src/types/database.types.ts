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
      assets: {
        Row: {
          condition: string | null;
          created_at: string;
          id: string;
          insurance_status: string | null;
          name: string;
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
          event_type: string;
          fest_type: string | null;
          guest_count: number;
          id: string;
          notes: string | null;
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
          event_type: string;
          fest_type?: string | null;
          guest_count?: number;
          id?: string;
          notes?: string | null;
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
          event_type?: string;
          fest_type?: string | null;
          guest_count?: number;
          id?: string;
          notes?: string | null;
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
      customers: {
        Row: {
          address: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
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
          price: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          price?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
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
          type: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          type?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
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
          price: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          price?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
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
