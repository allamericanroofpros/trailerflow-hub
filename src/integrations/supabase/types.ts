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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          add_ons: Json | null
          balance_due: number | null
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string
          deposit_amount: number | null
          deposit_paid: boolean | null
          end_time: string | null
          event_date: string
          event_name: string
          guest_count: number | null
          id: string
          location: string | null
          notes: string | null
          org_id: string | null
          service_package: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number | null
          trailer_id: string | null
          updated_at: string
        }
        Insert: {
          add_ons?: Json | null
          balance_due?: number | null
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          end_time?: string | null
          event_date: string
          event_name: string
          guest_count?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          org_id?: string | null
          service_package?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number | null
          trailer_id?: string | null
          updated_at?: string
        }
        Update: {
          add_ons?: Json | null
          balance_due?: number | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          end_time?: string | null
          event_date?: string
          event_name?: string
          guest_count?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          org_id?: string | null
          service_package?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number | null
          trailer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "trailers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklist_items: {
        Row: {
          completed: boolean
          completed_by: string | null
          created_at: string
          event_id: string
          id: string
          label: string
          org_id: string | null
          sort_order: number | null
        }
        Insert: {
          completed?: boolean
          completed_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          label: string
          org_id?: string | null
          sort_order?: number | null
        }
        Update: {
          completed?: boolean
          completed_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          label?: string
          org_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklist_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff: {
        Row: {
          created_at: string
          event_id: string
          hours_worked: number | null
          id: string
          org_id: string | null
          role: string | null
          staff_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          hours_worked?: number | null
          id?: string
          org_id?: string | null
          role?: string | null
          staff_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          hours_worked?: number | null
          id?: string
          org_id?: string | null
          role?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actual_revenue: number | null
          address: string | null
          attendance_estimate: number | null
          confidence: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_date: string | null
          event_end_date: string | null
          event_type: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          notes: string | null
          org_id: string | null
          revenue_forecast_high: number | null
          revenue_forecast_low: number | null
          risk_level: string | null
          source: string | null
          stage: Database["public"]["Enums"]["event_stage"]
          start_time: string | null
          trailer_id: string | null
          updated_at: string
          vendor_fee: number | null
        }
        Insert: {
          actual_revenue?: number | null
          address?: string | null
          attendance_estimate?: number | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_type?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          org_id?: string | null
          revenue_forecast_high?: number | null
          revenue_forecast_low?: number | null
          risk_level?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["event_stage"]
          start_time?: string | null
          trailer_id?: string | null
          updated_at?: string
          vendor_fee?: number | null
        }
        Update: {
          actual_revenue?: number | null
          address?: string | null
          attendance_estimate?: number | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_type?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          org_id?: string | null
          revenue_forecast_high?: number | null
          revenue_forecast_low?: number | null
          risk_level?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["event_stage"]
          start_time?: string | null
          trailer_id?: string | null
          updated_at?: string
          vendor_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "trailers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          name: string
          org_id: string | null
          par_level: number | null
          reorder_point: number | null
          serving_size: number | null
          serving_unit: string | null
          serving_unit_conversion: number | null
          shelf_life_days: number | null
          supplier: string | null
          trailer_id: string | null
          unit: Database["public"]["Enums"]["inventory_unit"]
          unit_size: number | null
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          name: string
          org_id?: string | null
          par_level?: number | null
          reorder_point?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          serving_unit_conversion?: number | null
          shelf_life_days?: number | null
          supplier?: string | null
          trailer_id?: string | null
          unit?: Database["public"]["Enums"]["inventory_unit"]
          unit_size?: number | null
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string | null
          par_level?: number | null
          reorder_point?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          serving_unit_conversion?: number | null
          shelf_life_days?: number | null
          supplier?: string | null
          trailer_id?: string | null
          unit?: Database["public"]["Enums"]["inventory_unit"]
          unit_size?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "trailers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          change_amount: number
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          org_id: string | null
          reason: string
        }
        Insert: {
          change_amount: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          org_id?: string | null
          reason?: string
        }
        Update: {
          change_amount?: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          org_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          completed_by: string | null
          completed_date: string | null
          cost: number | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          org_id: string | null
          status: string
          title: string
          trailer_id: string
          type: string
          updated_at: string
        }
        Insert: {
          completed_by?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          org_id?: string | null
          status?: string
          title: string
          trailer_id: string
          type: string
          updated_at?: string
        }
        Update: {
          completed_by?: string | null
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          org_id?: string | null
          status?: string
          title?: string
          trailer_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "trailers"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_ingredients: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          menu_item_id: string
          org_id: string | null
          quantity_used: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          menu_item_id: string
          org_id?: string | null
          quantity_used?: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          menu_item_id?: string
          org_id?: string | null
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: Database["public"]["Enums"]["menu_category"]
          cost: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          modifiers: Json | null
          name: string
          org_id: string | null
          price: number
          sort_order: number | null
          trailer_id: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["menu_category"]
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          modifiers?: Json | null
          name: string
          org_id?: string | null
          price?: number
          sort_order?: number | null
          trailer_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["menu_category"]
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          modifiers?: Json | null
          name?: string
          org_id?: string | null
          price?: number
          sort_order?: number | null
          trailer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "trailers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          modifiers: Json | null
          notes: string | null
          order_id: string
          org_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          modifiers?: Json | null
          notes?: string | null
          order_id: string
          org_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          modifiers?: Json | null
          notes?: string | null
          order_id?: string
          org_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          notes: string | null
          order_number: number
          org_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_received: boolean
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          tip: number | null
          total: number
          trailer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          org_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_received?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          tip?: number | null
          total?: number
          trailer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          org_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_received?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          tip?: number | null
          total?: number
          trailer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "trailers"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string
          plan: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id: string
          plan?: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          plan?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string
          currency: string | null
          full_name: string | null
          id: string
          phone: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          availability: Json | null
          created_at: string
          email: string | null
          hourly_rate: number | null
          id: string
          name: string
          org_id: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability?: Json | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          org_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability?: Json | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          org_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trailers: {
        Row: {
          avg_customers_per_hour: number | null
          avg_food_cost_percent: number | null
          avg_ticket: number | null
          created_at: string
          description: string | null
          fuel_cost_per_event: number | null
          hourly_cost: number | null
          id: string
          image_url: string | null
          menu_items: Json | null
          name: string
          org_id: string | null
          owner_id: string
          setup_cost_per_event: number | null
          setup_teardown_hours: number | null
          specialties: string | null
          staff_hourly_rate: number | null
          staff_required: number | null
          status: string
          target_margin: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          avg_customers_per_hour?: number | null
          avg_food_cost_percent?: number | null
          avg_ticket?: number | null
          created_at?: string
          description?: string | null
          fuel_cost_per_event?: number | null
          hourly_cost?: number | null
          id?: string
          image_url?: string | null
          menu_items?: Json | null
          name: string
          org_id?: string | null
          owner_id: string
          setup_cost_per_event?: number | null
          setup_teardown_hours?: number | null
          specialties?: string | null
          staff_hourly_rate?: number | null
          staff_required?: number | null
          status?: string
          target_margin?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          avg_customers_per_hour?: number | null
          avg_food_cost_percent?: number | null
          avg_ticket?: number | null
          created_at?: string
          description?: string | null
          fuel_cost_per_event?: number | null
          hourly_cost?: number | null
          id?: string
          image_url?: string | null
          menu_items?: Json | null
          name?: string
          org_id?: string | null
          owner_id?: string
          setup_cost_per_event?: number | null
          setup_teardown_hours?: number | null
          specialties?: string | null
          staff_hourly_rate?: number | null
          staff_required?: number | null
          status?: string
          target_margin?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trailers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string | null
          id: string
          org_id: string | null
          trailer_id: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          org_id?: string | null
          trailer_id?: string | null
          transaction_date?: string
          type: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          org_id?: string | null
          trailer_id?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "trailers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "manager" | "staff" | "super_admin"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      event_stage:
        | "lead"
        | "applied"
        | "tentative"
        | "confirmed"
        | "completed"
        | "closed"
      inventory_unit:
        | "oz"
        | "lb"
        | "g"
        | "kg"
        | "ml"
        | "l"
        | "gal"
        | "each"
        | "dozen"
        | "case"
      menu_category:
        | "appetizer"
        | "entree"
        | "side"
        | "dessert"
        | "drink"
        | "combo"
        | "other"
      order_status: "pending" | "preparing" | "ready" | "served" | "cancelled"
      payment_method: "cash" | "card" | "digital" | "other"
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
      app_role: ["owner", "manager", "staff", "super_admin"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      event_stage: [
        "lead",
        "applied",
        "tentative",
        "confirmed",
        "completed",
        "closed",
      ],
      inventory_unit: [
        "oz",
        "lb",
        "g",
        "kg",
        "ml",
        "l",
        "gal",
        "each",
        "dozen",
        "case",
      ],
      menu_category: [
        "appetizer",
        "entree",
        "side",
        "dessert",
        "drink",
        "combo",
        "other",
      ],
      order_status: ["pending", "preparing", "ready", "served", "cancelled"],
      payment_method: ["cash", "card", "digital", "other"],
    },
  },
} as const
