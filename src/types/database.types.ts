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
          active: boolean | null
          combo_id: number
          description: string | null
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          active?: boolean | null
          combo_id?: never
          description?: string | null
          image_url?: string | null
          name: string
          price?: number
        }
        Update: {
          active?: boolean | null
          combo_id?: never
          description?: string | null
          image_url?: string | null
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
      expense: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          expense_id: number
          normalized_at: string | null
          paid_at: string | null
          receipt_url: string
          status: string
          visible: boolean
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_id?: number
          normalized_at?: string | null
          paid_at?: string | null
          receipt_url: string
          status?: string
          visible?: boolean
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_id?: number
          normalized_at?: string | null
          paid_at?: string | null
          receipt_url?: string
          status?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "expense_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_payment: {
        Row: {
          admin_id: string
          amount: number
          expense_id: number
          paid_at: string | null
          payment_id: number
          payment_receipt_url: string | null
          status: string
        }
        Insert: {
          admin_id: string
          amount: number
          expense_id: number
          paid_at?: string | null
          payment_id?: number
          payment_receipt_url?: string | null
          status?: string
        }
        Update: {
          admin_id?: string
          amount?: number
          expense_id?: number
          paid_at?: string | null
          payment_id?: number
          payment_receipt_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_payment_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payment_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense"
            referencedColumns: ["expense_id"]
          },
          {
            foreignKeyName: "expense_payment_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "v_expenses_with_creator"
            referencedColumns: ["expense_id"]
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
      foodtruck_has_ingredient: {
        Row: {
          foodtruck_id: number
          foodtruck_ingredient_id: number
          ingredient_id: number
          stock: number
        }
        Insert: {
          foodtruck_id: number
          foodtruck_ingredient_id?: number
          ingredient_id: number
          stock?: number
        }
        Update: {
          foodtruck_id?: number
          foodtruck_ingredient_id?: number
          ingredient_id?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "foodtruck_has_ingredient_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "food_truck"
            referencedColumns: ["food_truck_id"]
          },
          {
            foreignKeyName: "foodtruck_has_ingredient_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["ingredient_id"]
          },
        ]
      }
      ingredient: {
        Row: {
          created_at: string
          description: string | null
          ingredient_id: number
          name: string
          unit: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ingredient_id?: number
          name: string
          unit?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ingredient_id?: number
          name?: string
          unit?: string
        }
        Relationships: []
      }
      ingredient_stock_movement: {
        Row: {
          created_at: string
          foodtruck_id: number
          ingredient_id: number
          movement_id: number
          notes: string | null
          profile_id: string | null
          profile_order_id: string | null
          quantity: number
          stock_after: number
          stock_before: number
          type: string
        }
        Insert: {
          created_at?: string
          foodtruck_id?: number
          ingredient_id: number
          movement_id?: never
          notes?: string | null
          profile_id?: string | null
          profile_order_id?: string | null
          quantity: number
          stock_after: number
          stock_before: number
          type: string
        }
        Update: {
          created_at?: string
          foodtruck_id?: number
          ingredient_id?: number
          movement_id?: never
          notes?: string | null
          profile_id?: string | null
          profile_order_id?: string | null
          quantity?: number
          stock_after?: number
          stock_before?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_stock_movement_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "food_truck"
            referencedColumns: ["food_truck_id"]
          },
          {
            foreignKeyName: "ingredient_stock_movement_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "ingredient_stock_movement_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_stock_movement_profile_order_id_fkey"
            columns: ["profile_order_id"]
            isOneToOne: false
            referencedRelation: "profile_has_order"
            referencedColumns: ["profile_order_id"]
          },
        ]
      }
      insumo: {
        Row: {
          created_at: string
          insumo_id: number
          nombre: string
          stock_actual: number
          stock_minimo: number
          tipo_insumo_id: number
          unidad_medida: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          insumo_id?: number
          nombre: string
          stock_actual?: number
          stock_minimo?: number
          tipo_insumo_id: number
          unidad_medida: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          insumo_id?: number
          nombre?: string
          stock_actual?: number
          stock_minimo?: number
          tipo_insumo_id?: number
          unidad_medida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumo_tipo_insumo_id_fkey"
            columns: ["tipo_insumo_id"]
            isOneToOne: false
            referencedRelation: "tipo_insumo"
            referencedColumns: ["tipo_insumo_id"]
          },
        ]
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
      modules: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          route: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          route?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          route?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_permissions"
            referencedColumns: ["module_id"]
          },
        ]
      }
      movimiento_inventario: {
        Row: {
          cantidad: number
          created_at: string
          insumo_id: number
          movimiento_id: string
          order_detail_id: string | null
          profile_id: string | null
          tipo: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          insumo_id: number
          movimiento_id?: string
          order_detail_id?: string | null
          profile_id?: string | null
          tipo: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          insumo_id?: number
          movimiento_id?: string
          order_detail_id?: string | null
          profile_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_inventario_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumo"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "movimiento_inventario_order_detail_id_fkey"
            columns: ["order_detail_id"]
            isOneToOne: false
            referencedRelation: "order_detail"
            referencedColumns: ["order_detail_id"]
          },
          {
            foreignKeyName: "movimiento_inventario_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          action_label: string | null
          category: string | null
          created_at: string | null
          expires_at: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          link_url: string | null
          message: string | null
          metadata: Json | null
          profile_id: string
          read_at: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          action_label?: string | null
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          link_url?: string | null
          message?: string | null
          metadata?: Json | null
          profile_id: string
          read_at?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          action_label?: string | null
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          link_url?: string | null
          message?: string | null
          metadata?: Json | null
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      permissions: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product: {
        Row: {
          category_id: number | null
          description: string | null
          name: string
          partner_price: number | null
          price: number
          product_id: number
        }
        Insert: {
          category_id?: number | null
          description?: string | null
          name: string
          partner_price?: number | null
          price?: number
          product_id?: never
        }
        Update: {
          category_id?: number | null
          description?: string | null
          name?: string
          partner_price?: number | null
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
      production_batch: {
        Row: {
          created_at: string
          description: string | null
          name: string
          production_batch_id: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          name: string
          production_batch_id?: never
        }
        Update: {
          created_at?: string
          description?: string | null
          name?: string
          production_batch_id?: never
        }
        Relationships: []
      }
      production_batch_item: {
        Row: {
          ingredient_id: number
          production_batch_id: number
          production_batch_item_id: number
          quantity: number
        }
        Insert: {
          ingredient_id: number
          production_batch_id: number
          production_batch_item_id?: never
          quantity: number
        }
        Update: {
          ingredient_id?: number
          production_batch_id?: number
          production_batch_item_id?: never
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batch_item_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "production_batch_item_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batch"
            referencedColumns: ["production_batch_id"]
          },
        ]
      }
      producto_has_insumo: {
        Row: {
          cantidad_requerida: number
          insumo_id: number
          product_id: number
          producto_insumo_id: number
        }
        Insert: {
          cantidad_requerida: number
          insumo_id: number
          product_id: number
          producto_insumo_id?: number
        }
        Update: {
          cantidad_requerida?: number
          insumo_id?: number
          product_id?: number
          producto_insumo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "producto_has_insumo_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumo"
            referencedColumns: ["insumo_id"]
          },
          {
            foreignKeyName: "producto_has_insumo_product_id_fkey"
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
      profile_has_food_truck: {
        Row: {
          created_at: string | null
          food_truck_id: number
          profile_food_truck_id: number
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          food_truck_id: number
          profile_food_truck_id?: number
          profile_id: string
        }
        Update: {
          created_at?: string | null
          food_truck_id?: number
          profile_food_truck_id?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_has_food_truck_food_truck_id_fkey"
            columns: ["food_truck_id"]
            isOneToOne: false
            referencedRelation: "food_truck"
            referencedColumns: ["food_truck_id"]
          },
          {
            foreignKeyName: "profile_has_food_truck_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_has_order: {
        Row: {
          courtesy_by: string | null
          courtesy_reason: string | null
          created_at: string
          customer_alias: string | null
          delivery_fee: number
          discount_total: number
          is_courtesy: boolean
          location_id: number | null
          notes: string | null
          order_number: number
          payment_method: string | null
          profile_id: string | null
          profile_order_id: string
          status_order_id: string | null
          stock_deducted: boolean
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          courtesy_by?: string | null
          courtesy_reason?: string | null
          created_at?: string
          customer_alias?: string | null
          delivery_fee?: number
          discount_total?: number
          is_courtesy?: boolean
          location_id?: number | null
          notes?: string | null
          order_number?: never
          payment_method?: string | null
          profile_id?: string | null
          profile_order_id?: string
          status_order_id?: string | null
          stock_deducted?: boolean
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          courtesy_by?: string | null
          courtesy_reason?: string | null
          created_at?: string
          customer_alias?: string | null
          delivery_fee?: number
          discount_total?: number
          is_courtesy?: boolean
          location_id?: number | null
          notes?: string | null
          order_number?: never
          payment_method?: string | null
          profile_id?: string | null
          profile_order_id?: string
          status_order_id?: string | null
          stock_deducted?: boolean
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_has_order_courtesy_by_fkey"
            columns: ["courtesy_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_has_order_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
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
      role_permission: {
        Row: {
          conditions: Json | null
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          module_id: string
          permission_id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          permission_id: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          permission_id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permission_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permission_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permission_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_permissions"
            referencedColumns: ["module_id"]
          },
          {
            foreignKeyName: "role_permission_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permission_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "v_user_effective_permissions"
            referencedColumns: ["permission_id"]
          },
          {
            foreignKeyName: "role_permission_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          name: string
          role_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          name: string
          role_id?: string
        }
        Update: {
          code?: string
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
      tipo_insumo: {
        Row: {
          created_at: string
          descripcion: string | null
          is_active: boolean
          nombre: string
          tipo_insumo_id: number
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          is_active?: boolean
          nombre: string
          tipo_insumo_id?: number
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          is_active?: boolean
          nombre?: string
          tipo_insumo_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      v_admin_expense_summary: {
        Row: {
          admin_id: string | null
          admin_name: string | null
          paid_amount: number | null
          paid_count: number | null
          pending_amount: number | null
          pending_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_payment_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_expense_payments_with_admin: {
        Row: {
          admin_email: string | null
          admin_id: string | null
          admin_name: string | null
          amount: number | null
          expense_id: number | null
          paid_at: string | null
          payment_id: number | null
          payment_receipt_url: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_payment_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payment_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense"
            referencedColumns: ["expense_id"]
          },
          {
            foreignKeyName: "expense_payment_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "v_expenses_with_creator"
            referencedColumns: ["expense_id"]
          },
        ]
      }
      v_expenses_with_creator: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          description: string | null
          expense_id: number | null
          normalized_at: string | null
          paid_at: string | null
          receipt_url: string | null
          status: string | null
          visible: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_module_hierarchy: {
        Row: {
          code: string | null
          display_order: number | null
          full_name_path: string | null
          full_path: string | null
          icon: string | null
          id: string | null
          is_active: boolean | null
          level: number | null
          name: string | null
          parent_id: string | null
          path_ids: string[] | null
          route: string | null
        }
        Relationships: []
      }
      v_unread_notifications: {
        Row: {
          action_label: string | null
          category: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          first_name: string | null
          icon: string | null
          id: string | null
          is_archived: boolean | null
          is_read: boolean | null
          last_name: string | null
          link_url: string | null
          message: string | null
          metadata: Json | null
          profile_id: string | null
          read_at: string | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_effective_permissions: {
        Row: {
          module_code: string | null
          module_id: string | null
          module_name: string | null
          permission_code: string | null
          permission_id: string | null
          permission_name: string | null
          profile_id: string | null
          source: string | null
          source_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_has_role_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_notification: {
        Args: { notification_id: string; user_id: string }
        Returns: boolean
      }
      can_access_order: {
        Args: { p_profile_id?: string; p_profile_order_id: string }
        Returns: boolean
      }
      can_access_order_location: {
        Args: { p_location_id: number; p_profile_id?: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_category?: string
          p_expires_at?: string
          p_link_url?: string
          p_message: string
          p_metadata?: Json
          p_profile_id: string
          p_title: string
          p_type?: string
        }
        Returns: string
      }
      deduct_order_stock: {
        Args: { p_profile_order_id: string }
        Returns: undefined
      }
      delete_expired_notifications: { Args: never; Returns: number }
      has_permission: {
        Args: {
          p_module_code: string
          p_permission_code: string
          p_profile_id: string
        }
        Returns: boolean
      }
      has_permission_inherited: {
        Args: {
          p_module_code: string
          p_permission_code: string
          p_profile_id: string
        }
        Returns: boolean
      }
      has_truck_access: {
        Args: { p_food_truck_id: number; p_profile_id?: string }
        Returns: boolean
      }
      is_admin: { Args: { p_profile_id?: string }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      mark_all_notifications_as_read: {
        Args: { user_id: string }
        Returns: number
      }
      mark_notification_as_read: {
        Args: { notification_id: string; user_id: string }
        Returns: boolean
      }
      normalize_pending_expenses: {
        Args: never
        Returns: Record<string, unknown>
      }
      normalize_selected_expenses: {
        Args: { expense_ids: number[] }
        Returns: Record<string, unknown>
      }
      notify_low_stock: {
        Args: {
          p_food_truck_id: number
          p_items: Json
          p_order_number: number
          p_truck_name: string
        }
        Returns: undefined
      }
      notify_low_stock_batch: {
        Args: {
          p_batch_name: string
          p_food_truck_id: number
          p_items: Json
          p_truck_name: string
        }
        Returns: undefined
      }
      producir_lote: {
        Args: {
          p_foodtruck_id: number
          p_notes?: string
          p_production_batch_id: number
          p_profile_id?: string
        }
        Returns: Json
      }
      replace_order_detail: {
        Args: { p_items: Json; p_profile_order_id: string }
        Returns: undefined
      }
      restock_order_stock: {
        Args: { p_profile_order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      unidad_medida_enum:
        | "gramos"
        | "mililitros"
        | "unidad"
        | "kilogramo"
        | "litro"
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
      unidad_medida_enum: [
        "gramos",
        "mililitros",
        "unidad",
        "kilogramo",
        "litro",
      ],
      user_status: ["pending", "active", "inactive", "suspended"],
    },
  },
} as const
