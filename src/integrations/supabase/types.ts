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
      alerts: {
        Row: {
          created_at: string
          id: string
          keyword_id: string | null
          message: string
          project_id: string
          read: boolean
          severity: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          keyword_id?: string | null
          message: string
          project_id: string
          read?: boolean
          severity?: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          created_at?: string
          id?: string
          keyword_id?: string | null
          message?: string
          project_id?: string
          read?: boolean
          severity?: Database["public"]["Enums"]["alert_severity"]
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_pieces: {
        Row: {
          created_at: string
          draft: string | null
          final_content: string | null
          id: string
          keyword_id: string
          outline: Json | null
          seo_score: number | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft?: string | null
          final_content?: string | null
          id?: string
          keyword_id: string
          outline?: Json | null
          seo_score?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft?: string | null
          final_content?: string | null
          id?: string
          keyword_id?: string
          outline?: Json | null
          seo_score?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_pieces_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_clusters: {
        Row: {
          created_at: string
          id: string
          intent: string | null
          keyword_ids: Json
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent?: string | null
          keyword_ids?: Json
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intent?: string | null
          keyword_ids?: Json
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_clusters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      keywords: {
        Row: {
          competition_level: string | null
          cpc: number | null
          created_at: string
          id: string
          keyword: string
          keyword_difficulty: number | null
          monitored: boolean
          parent_keyword_id: string | null
          project_id: string
          search_intent: string | null
          search_volume: number | null
          source_type: Database["public"]["Enums"]["keyword_source_type"]
          status: Database["public"]["Enums"]["keyword_status"]
        }
        Insert: {
          competition_level?: string | null
          cpc?: number | null
          created_at?: string
          id?: string
          keyword: string
          keyword_difficulty?: number | null
          monitored?: boolean
          parent_keyword_id?: string | null
          project_id: string
          search_intent?: string | null
          search_volume?: number | null
          source_type?: Database["public"]["Enums"]["keyword_source_type"]
          status?: Database["public"]["Enums"]["keyword_status"]
        }
        Update: {
          competition_level?: string | null
          cpc?: number | null
          created_at?: string
          id?: string
          keyword?: string
          keyword_difficulty?: number | null
          monitored?: boolean
          parent_keyword_id?: string | null
          project_id?: string
          search_intent?: string | null
          search_volume?: number | null
          source_type?: Database["public"]["Enums"]["keyword_source_type"]
          status?: Database["public"]["Enums"]["keyword_status"]
        }
        Relationships: [
          {
            foreignKeyName: "keywords_parent_keyword_id_fkey"
            columns: ["parent_keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keywords_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          target_language: string
          target_location: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          target_language?: string
          target_location?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          target_language?: string
          target_location?: string
          user_id?: string
        }
        Relationships: []
      }
      rank_history: {
        Row: {
          checked_at: string
          domain: string | null
          id: string
          keyword_id: string
          position: number | null
          url: string | null
        }
        Insert: {
          checked_at?: string
          domain?: string | null
          id?: string
          keyword_id: string
          position?: number | null
          url?: string | null
        }
        Update: {
          checked_at?: string
          domain?: string | null
          id?: string
          keyword_id?: string
          position?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rank_history_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      research_history: {
        Row: {
          api_endpoint: string | null
          cost_credits: number | null
          executed_at: string
          id: string
          keyword_id: string | null
          project_id: string
          raw_response: Json | null
        }
        Insert: {
          api_endpoint?: string | null
          cost_credits?: number | null
          executed_at?: string
          id?: string
          keyword_id?: string | null
          project_id: string
          raw_response?: Json | null
        }
        Update: {
          api_endpoint?: string | null
          cost_credits?: number | null
          executed_at?: string
          id?: string
          keyword_id?: string | null
          project_id?: string
          raw_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "research_history_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      serp_results: {
        Row: {
          description: string | null
          domain: string | null
          fetched_at: string
          id: string
          keyword_id: string
          paa_answer: string | null
          position: number
          result_type: Database["public"]["Enums"]["serp_result_type"]
          title: string | null
          url: string | null
        }
        Insert: {
          description?: string | null
          domain?: string | null
          fetched_at?: string
          id?: string
          keyword_id: string
          paa_answer?: string | null
          position: number
          result_type?: Database["public"]["Enums"]["serp_result_type"]
          title?: string | null
          url?: string | null
        }
        Update: {
          description?: string | null
          domain?: string | null
          fetched_at?: string
          id?: string
          keyword_id?: string
          paa_answer?: string | null
          position?: number
          result_type?: Database["public"]["Enums"]["serp_result_type"]
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serp_results_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_severity: "low" | "medium" | "high" | "critical"
      alert_type:
        | "rank_drop"
        | "rank_improvement"
        | "new_competitor"
        | "keyword_trend"
      content_status: "outline" | "draft" | "review" | "final" | "published"
      keyword_source_type:
        | "main"
        | "related"
        | "suggestion"
        | "idea"
        | "autocomplete"
        | "subtopic"
        | "paa"
      keyword_status: "pending" | "analyzed" | "content_created" | "published"
      serp_result_type:
        | "organic"
        | "featured_snippet"
        | "people_also_ask"
        | "video"
        | "local"
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
      alert_severity: ["low", "medium", "high", "critical"],
      alert_type: [
        "rank_drop",
        "rank_improvement",
        "new_competitor",
        "keyword_trend",
      ],
      content_status: ["outline", "draft", "review", "final", "published"],
      keyword_source_type: [
        "main",
        "related",
        "suggestion",
        "idea",
        "autocomplete",
        "subtopic",
        "paa",
      ],
      keyword_status: ["pending", "analyzed", "content_created", "published"],
      serp_result_type: [
        "organic",
        "featured_snippet",
        "people_also_ask",
        "video",
        "local",
      ],
    },
  },
} as const
