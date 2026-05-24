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
      category: {
        Row: {
          category_id: number
          created_at: string
          description: string | null
          name: string
        }
        Insert: {
          category_id?: number
          created_at?: string
          description?: string | null
          name: string
        }
        Update: {
          category_id?: number
          created_at?: string
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      combo: {
        Row: {
          combo_id: number
          description: string | null
          name: string
          price: number
        }
        Insert: {
          combo_id?: never
          description?: string | null
          name: string
          price?: number
        }
        Update: {
          combo_id?: never
          description?: string | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      combo_has_product: {
        Row: {
          combo_id: number
          combo_product_id: number
          product_id: number
        }
        Insert: {
          combo_id: number
          combo_product_id?: never
          product_id: number
        }
        Update: {
          combo_id?: number
          combo_product_id?: never
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_has_product_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combo"
            referencedColumns: ["combo_id"]
          },
          {
            foreignKeyName: "combo_has_product_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      direction: {
        Row: {
          additional_info: string | null
          address_line: string
          city: string | null
          country: string | null
          created_at: string
          direction_id: string
          label: string | null
          latitude: number | null
          longitude: number | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          address_line: string
          city?: string | null
          country?: string | null
          created_at?: string
          direction_id?: string
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          address_line?: string
          city?: string | null
          country?: string | null
          created_at?: string
          direction_id?: string
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_info: {
        Row: {
          banco: string | null
          ciudad: string | null
          created_at: string
          employee_info_id: string
          metodo_pago: string | null
          numero_cuenta: string | null
          profile_id: string
          tipo_contrato: string | null
          tipo_cuenta: string | null
          tipo_trabajador: string | null
        }
        Insert: {
          banco?: string | null
          ciudad?: string | null
          created_at?: string
          employee_info_id?: string
          metodo_pago?: string | null
          numero_cuenta?: string | null
          profile_id: string
          tipo_contrato?: string | null
          tipo_cuenta?: string | null
          tipo_trabajador?: string | null
        }
        Update: {
          banco?: string | null
          ciudad?: string | null
          created_at?: string
          employee_info_id?: string
          metodo_pago?: string | null
          numero_cuenta?: string | null
          profile_id?: string
          tipo_contrato?: string | null
          tipo_cuenta?: string | null
          tipo_trabajador?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_info_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_truck: {
        Row: {
          color: string | null
          estatus: boolean | null
          food_truck_id: number
          name: string
          registration: string
        }
        Insert: {
          color?: string | null
          estatus?: boolean | null
          food_truck_id?: never
          name: string
          registration: string
        }
        Update: {
          color?: string | null
          estatus?: boolean | null
          food_truck_id?: never
          name?: string
          registration?: string
        }
        Relationships: []
      }
      ingredient: {
        Row: {
          created_at: string
          description: string | null
          ingredient_id: number
          name: string
          stock: number
          unit: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ingredient_id?: number
          name: string
          stock?: number
          unit?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ingredient_id?: number
          name?: string
          stock?: number
          unit?: string
        }
        Relationships: []
      }
      liquidacion: {
        Row: {
          created_at: string
          dias_trabajados: number
          liquidacion_id: string
          mes_reportado: string
          neto_pagado: number
          profile_id: string
          salario_basico: number
          total_deducciones: number
          total_devengado: number
        }
        Insert: {
          created_at?: string
          dias_trabajados?: number
          liquidacion_id?: string
          mes_reportado: string
          neto_pagado?: number
          profile_id: string
          salario_basico?: number
          total_deducciones?: number
          total_devengado?: number
        }
        Update: {
          created_at?: string
          dias_trabajados?: number
          liquidacion_id?: string
          mes_reportado?: string
          neto_pagado?: number
          profile_id?: string
          salario_basico?: number
          total_deducciones?: number
          total_devengado?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidacion_concepto: {
        Row: {
          base: number | null
          cantidad: number | null
          concepto: string
          concepto_id: string
          liquidacion_id: string
          orden: number
          porcentaje: number | null
          tipo: string
          unidad: string | null
          valor: number
        }
        Insert: {
          base?: number | null
          cantidad?: number | null
          concepto: string
          concepto_id?: string
          liquidacion_id: string
          orden?: number
          porcentaje?: number | null
          tipo: string
          unidad?: string | null
          valor?: number
        }
        Update: {
          base?: number | null
          cantidad?: number | null
          concepto?: string
          concepto_id?: string
          liquidacion_id?: string
          orden?: number
          porcentaje?: number | null
          tipo?: string
          unidad?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_concepto_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidacion"
            referencedColumns: ["liquidacion_id"]
          },
        ]
      }
      location: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          estatus: boolean | null
          food_truck_id: number
          latitude: number | null
          location_id: number
          longitude: number | null
          name: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          estatus?: boolean | null
          food_truck_id: number
          latitude?: number | null
          location_id?: never
          longitude?: number | null
          name: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          estatus?: boolean | null
          food_truck_id?: number
          latitude?: number | null
          location_id?: never
          longitude?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_truck"
            referencedColumns: ["food_truck_id"]
          },
        ]
      }
      location_has_menu: {
        Row: {
          location_id: number
          location_menu_id: number
          menu_id: number
        }
        Insert: {
          location_id: number
          location_menu_id?: never
          menu_id: number
        }
        Update: {
          location_id?: number
          location_menu_id?: never
          menu_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "location_has_menu_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "location_has_menu_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu"
            referencedColumns: ["menu_id"]
          },
        ]
      }
      menu: {
        Row: {
          description: string | null
          food_truck_id: number
          menu_id: number
          name: string
        }
        Insert: {
          description?: string | null
          food_truck_id: number
          menu_id?: never
          name: string
        }
        Update: {
          description?: string | null
          food_truck_id?: number
          menu_id?: never
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_truck"
            referencedColumns: ["food_truck_id"]
          },
        ]
      }
      menu_has_combo: {
        Row: {
          combo_id: number
          menu_combo_id: number
          menu_id: number
        }
        Insert: {
          combo_id: number
          menu_combo_id?: never
          menu_id: number
        }
        Update: {
          combo_id?: number
          menu_combo_id?: never
          menu_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_has_combo_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combo"
            referencedColumns: ["combo_id"]
          },
          {
            foreignKeyName: "menu_has_combo_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu"
            referencedColumns: ["menu_id"]
          },
        ]
      }
      menu_has_product: {
        Row: {
          menu_id: number
          menu_product_id: number
          product_id: number
        }
        Insert: {
          menu_id: number
          menu_product_id?: never
          product_id: number
        }
        Update: {
          menu_id?: number
          menu_product_id?: never
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_has_product_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "menu_has_product_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      order_detail: {
        Row: {
          combo_id: number | null
          created_at: string
          line_total: number
          notes: string | null
          order_detail_id: string
          product_id: number | null
          profile_order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          combo_id?: number | null
          created_at?: string
          line_total?: number
          notes?: string | null
          order_detail_id?: string
          product_id?: number | null
          profile_order_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          combo_id?: number | null
          created_at?: string
          line_total?: number
          notes?: string | null
          order_detail_id?: string
          product_id?: number | null
          profile_order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_detail_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combo"
            referencedColumns: ["combo_id"]
          },
          {
            foreignKeyName: "order_detail_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_detail_profile_order_id_fkey"
            columns: ["profile_order_id"]
            isOneToOne: false
            referencedRelation: "profile_has_order"
            referencedColumns: ["profile_order_id"]
          },
        ]
      }
      order_has_status: {
        Row: {
          changed_at: string
          changed_by: string | null
          notes: string | null
          order_has_status_id: string
          profile_order_id: string
          status_order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          notes?: string | null
          order_has_status_id?: string
          profile_order_id: string
          status_order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          notes?: string | null
          order_has_status_id?: string
          profile_order_id?: string
          status_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_has_status_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_has_status_profile_order_id_fkey"
            columns: ["profile_order_id"]
            isOneToOne: false
            referencedRelation: "profile_has_order"
            referencedColumns: ["profile_order_id"]
          },
          {
            foreignKeyName: "order_has_status_status_order_id_fkey"
            columns: ["status_order_id"]
            isOneToOne: false
            referencedRelation: "status_order"
            referencedColumns: ["status_order_id"]
          },
        ]
      }
      product: {
        Row: {
          category_id: number | null
          description: string | null
          name: string
          price: number
          product_id: number
        }
        Insert: {
          category_id?: number | null
          description?: string | null
          name: string
          price?: number
          product_id?: never
        }
        Update: {
          category_id?: number | null
          description?: string | null
          name?: string
          price?: number
          product_id?: never
        }
        Relationships: [
          {
            foreignKeyName: "product_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["category_id"]
          },
        ]
      }
      product_has_image: {
        Row: {
          image_url: string
          product_id: number
          product_image_id: number
        }
        Insert: {
          image_url: string
          product_id: number
          product_image_id?: never
        }
        Update: {
          image_url?: string
          product_id?: number
          product_image_id?: never
        }
        Relationships: [
          {
            foreignKeyName: "product_has_image_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_has_ingredient: {
        Row: {
          ingredient_id: number
          product_id: number
          product_ingredient_id: number
          quantity: number
        }
        Insert: {
          ingredient_id: number
          product_id: number
          product_ingredient_id?: number
          quantity: number
        }
        Update: {
          ingredient_id?: number
          product_id?: number
          product_ingredient_id?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_has_ingredient_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "product_has_ingredient_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_has_type: {
        Row: {
          product_id: number
          product_type_id: number
          type: string
        }
        Insert: {
          product_id: number
          product_type_id?: never
          type: string
        }
        Update: {
          product_id?: number
          product_type_id?: never
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_has_type_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["product_id"]
          },
        ]
      }
      profile_has_direction: {
        Row: {
          created_at: string
          direction_id: string
          is_default: boolean
          profile_direction_id: number
          profile_id: string
        }
        Insert: {
          created_at?: string
          direction_id: string
          is_default?: boolean
          profile_direction_id?: never
          profile_id: string
        }
        Update: {
          created_at?: string
          direction_id?: string
          is_default?: boolean
          profile_direction_id?: never
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_has_direction_direction_id_fkey"
            columns: ["direction_id"]
            isOneToOne: false
            referencedRelation: "direction"
            referencedColumns: ["direction_id"]
          },
          {
            foreignKeyName: "profile_has_direction_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_has_order: {
        Row: {
          created_at: string
          delivery_fee: number
          discount_total: number
          notes: string | null
          order_number: number
          profile_id: string
          profile_order_id: string
          status_order_id: string | null
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          discount_total?: number
          notes?: string | null
          order_number?: never
          profile_id: string
          profile_order_id?: string
          status_order_id?: string | null
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          discount_total?: number
          notes?: string | null
          order_number?: never
          profile_id?: string
          profile_order_id?: string
          status_order_id?: string | null
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_has_order_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_has_order_status_order_id_fkey"
            columns: ["status_order_id"]
            isOneToOne: false
            referencedRelation: "status_order"
            referencedColumns: ["status_order_id"]
          },
        ]
      }
      profile_has_role: {
        Row: {
          created_at: string
          profile_id: string
          profile_role_id: number
          role_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          profile_role_id?: never
          role_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          profile_role_id?: never
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_has_role_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_has_role_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          document_number: string | null
          document_type: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          name: string
          role_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          name: string
          role_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          name?: string
          role_id?: string
        }
        Relationships: []
      }
      status_order: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          name: string
          sort_order: number
          status_order_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          status_order_id?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          status_order_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_status: "pending" | "active" | "inactive" | "suspended"
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
      user_status: ["pending", "active", "inactive", "suspended"],
    },
  },
} as const
