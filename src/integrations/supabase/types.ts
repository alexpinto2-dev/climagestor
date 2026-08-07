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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_interactions: {
        Row: {
          client_id: string | null
          company_id: string
          conversation_id: string | null
          created_at: string
          execution_id: string | null
          id: string
          input: Json | null
          intent: string | null
          model: string | null
          output: Json | null
          tokens_input: number | null
          tokens_output: number | null
          tool_input: Json | null
          tool_name: string | null
          tool_output: Json | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          conversation_id?: string | null
          created_at?: string
          execution_id?: string | null
          id?: string
          input?: Json | null
          intent?: string | null
          model?: string | null
          output?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          conversation_id?: string | null
          created_at?: string
          execution_id?: string | null
          id?: string
          input?: Json | null
          intent?: string | null
          model?: string | null
          output?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_interactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          phone_e164: string | null
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_e164?: string | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_e164?: string | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          city: string
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          client_id: string | null
          company_id: string
          context: Json
          created_at: string
          id: string
          intent: string | null
          last_message_at: string | null
          phone_e164: string
          status: string
          updated_at: string
          whatsapp_instance_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel?: string
          client_id?: string | null
          company_id: string
          context?: Json
          created_at?: string
          id?: string
          intent?: string | null
          last_message_at?: string | null
          phone_e164: string
          status?: string
          updated_at?: string
          whatsapp_instance_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          client_id?: string | null
          company_id?: string
          context?: Json
          created_at?: string
          id?: string
          intent?: string | null
          last_message_at?: string | null
          phone_e164?: string
          status?: string
          updated_at?: string
          whatsapp_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_instance_id_fkey"
            columns: ["whatsapp_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_type: string
          client_id: string | null
          company_id: string
          content: string | null
          conversation_id: string | null
          created_at: string
          direction: string
          external_message_id: string | null
          id: string
          message_type: string
          metadata: Json
          whatsapp_instance_id: string | null
        }
        Insert: {
          author_type: string
          client_id?: string | null
          company_id: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction: string
          external_message_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          whatsapp_instance_id?: string | null
        }
        Update: {
          author_type?: string
          client_id?: string | null
          company_id?: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          external_message_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json
          whatsapp_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_whatsapp_instance_id_fkey"
            columns: ["whatsapp_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          items: Json
          notes: string | null
          number: string
          status: Database["public"]["Enums"]["quote_status"]
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          number: string
          status?: Database["public"]["Enums"]["quote_status"]
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          number?: string
          status?: Database["public"]["Enums"]["quote_status"]
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          address: string | null
          amount: number | null
          btus: number | null
          client_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          equipment: string | null
          external_ref: string | null
          id: string
          internal_notes: string | null
          neighborhood: string | null
          origin: Database["public"]["Enums"]["order_origin"]
          reported_problem: string | null
          scheduled_at: string
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          amount?: number | null
          btus?: number | null
          client_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          equipment?: string | null
          external_ref?: string | null
          id?: string
          internal_notes?: string | null
          neighborhood?: string | null
          origin?: Database["public"]["Enums"]["order_origin"]
          reported_problem?: string | null
          scheduled_at?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          amount?: number | null
          btus?: number | null
          client_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          equipment?: string | null
          external_ref?: string | null
          id?: string
          internal_notes?: string | null
          neighborhood?: string | null
          origin?: Database["public"]["Enums"]["order_origin"]
          reported_problem?: string | null
          scheduled_at?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technicians: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          name: string
          phone: string | null
          profile_id: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          profile_id?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          profile_id?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technicians_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technicians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      whatsapp_instances: {
        Row: {
          company_id: string
          created_at: string
          id: string
          instance_name: string
          phone: string | null
          provider: string
          settings: Json
          status: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          instance_name: string
          phone?: string | null
          provider?: string
          settings?: Json
          status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          instance_name?: string
          phone?: string | null
          provider?: string
          settings?: Json
          status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_technician_id: { Args: never; Returns: string }
      get_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      wa_create_order: {
        Args: {
          p_address?: string
          p_amount?: number
          p_btus?: number
          p_client_id: string
          p_company_id: string
          p_conversation_id?: string
          p_description?: string
          p_equipment?: string
          p_external_ref?: string
          p_neighborhood?: string
          p_reported_problem?: string
          p_scheduled_at?: string
          p_service_type: Database["public"]["Enums"]["service_type"]
          p_status?: Database["public"]["Enums"]["order_status"]
        }
        Returns: {
          address: string | null
          amount: number | null
          btus: number | null
          client_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          equipment: string | null
          external_ref: string | null
          id: string
          internal_notes: string | null
          neighborhood: string | null
          origin: Database["public"]["Enums"]["order_origin"]
          reported_problem: string | null
          scheduled_at: string
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          technician_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wa_upsert_client: {
        Args: { p_company_id: string; p_name?: string; p_phone_e164: string }
        Returns: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          phone_e164: string | null
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "tecnico"
      client_type: "residencial" | "comercial"
      order_origin: "manual" | "whatsapp" | "ia"
      order_status: "agendada" | "em_andamento" | "concluida" | "cancelada"
      quote_status:
        | "rascunho"
        | "enviado"
        | "aprovado"
        | "recusado"
        | "expirado"
      service_type:
        | "instalacao"
        | "manutencao_preventiva"
        | "manutencao_corretiva"
        | "limpeza"
        | "recarga_gas"
        | "outro"
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
      app_role: ["admin", "tecnico"],
      client_type: ["residencial", "comercial"],
      order_origin: ["manual", "whatsapp", "ia"],
      order_status: ["agendada", "em_andamento", "concluida", "cancelada"],
      quote_status: ["rascunho", "enviado", "aprovado", "recusado", "expirado"],
      service_type: [
        "instalacao",
        "manutencao_preventiva",
        "manutencao_corretiva",
        "limpeza",
        "recarga_gas",
        "outro",
      ],
    },
  },
} as const
