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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      adaptation_runs: {
        Row: {
          cost: number | null
          created_at: string
          gates_json: Json | null
          id: string
          latency_ms: number | null
          retries: number
          version_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          gates_json?: Json | null
          id?: string
          latency_ms?: number | null
          retries?: number
          version_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          gates_json?: Json | null
          id?: string
          latency_ms?: number | null
          retries?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptation_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "story_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          learner_visible: boolean
          value: Json
        }
        Insert: {
          key: string
          learner_visible?: boolean
          value: Json
        }
        Update: {
          key?: string
          learner_visible?: boolean
          value?: Json
        }
        Relationships: []
      }
      card_progress: {
        Row: {
          box: number
          card_id: string
          due: string | null
          lapses: number
          last_rating: string | null
          learner_id: string
          mastered_at: string | null
          origin: string
          updated_at: string
        }
        Insert: {
          box?: number
          card_id: string
          due?: string | null
          lapses?: number
          last_rating?: string | null
          learner_id?: string
          mastered_at?: string | null
          origin?: string
          updated_at?: string
        }
        Update: {
          box?: number
          card_id?: string
          due?: string | null
          lapses?: number
          last_rating?: string | null
          learner_id?: string
          mastered_at?: string | null
          origin?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_progress_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_translations: {
        Row: {
          card_id: string
          lang: string
          text: string
        }
        Insert: {
          card_id: string
          lang: string
          text: string
        }
        Update: {
          card_id?: string
          lang?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_translations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          confidence: number | null
          definition: string
          example: string | null
          id: string
          lemma: string
          section_id: string
          sense: string | null
          translation: string | null
          translation_lang: string | null
        }
        Insert: {
          confidence?: number | null
          definition: string
          example?: string | null
          id: string
          lemma: string
          section_id: string
          sense?: string | null
          translation?: string | null
          translation_lang?: string | null
        }
        Update: {
          confidence?: number | null
          definition?: string
          example?: string | null
          id?: string
          lemma?: string
          section_id?: string
          sense?: string | null
          translation?: string | null
          translation_lang?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          entity: string | null
          id: string
          learner_id: string
          payload: Json
          ts: string
          type: string
        }
        Insert: {
          entity?: string | null
          id?: string
          learner_id?: string
          payload?: Json
          ts?: string
          type: string
        }
        Update: {
          entity?: string | null
          id?: string
          learner_id?: string
          payload?: Json
          ts?: string
          type?: string
        }
        Relationships: []
      }
      gate_assignments: {
        Row: {
          gate_enabled: boolean
          learner_id: string
          section_id: string
        }
        Insert: {
          gate_enabled?: boolean
          learner_id: string
          section_id: string
        }
        Update: {
          gate_enabled?: boolean
          learner_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      learners: {
        Row: {
          age_confirmed: boolean
          consent_at: string | null
          created_at: string
          first_language: string | null
          goal: string | null
          id: string
          placement_level: string | null
          show_translation: boolean
        }
        Insert: {
          age_confirmed?: boolean
          consent_at?: string | null
          created_at?: string
          first_language?: string | null
          goal?: string | null
          id: string
          placement_level?: string | null
          show_translation?: boolean
        }
        Update: {
          age_confirmed?: boolean
          consent_at?: string | null
          created_at?: string
          first_language?: string | null
          goal?: string | null
          id?: string
          placement_level?: string | null
          show_translation?: boolean
        }
        Relationships: []
      }
      lookups: {
        Row: {
          id: string
          learner_id: string
          lemma: string
          section_id: string | null
          ts: string
        }
        Insert: {
          id?: string
          learner_id?: string
          lemma: string
          section_id?: string | null
          ts?: string
        }
        Update: {
          id?: string
          learner_id?: string
          lemma?: string
          section_id?: string | null
          ts?: string
        }
        Relationships: []
      }
      placement_results: {
        Row: {
          assigned_level: string | null
          bank_version: string | null
          composite: number | null
          confidence: number | null
          created_at: string
          duration_seconds: number | null
          false_alarm_rate: number | null
          flags: Json | null
          grammar_errors: Json | null
          grammar_score: number | null
          id: string
          learner_id: string
          level: string | null
          range_flag: string | null
          raw_result: Json | null
          self_band: string | null
          vocab_score: number | null
        }
        Insert: {
          assigned_level?: string | null
          bank_version?: string | null
          composite?: number | null
          confidence?: number | null
          created_at?: string
          duration_seconds?: number | null
          false_alarm_rate?: number | null
          flags?: Json | null
          grammar_errors?: Json | null
          grammar_score?: number | null
          id?: string
          learner_id?: string
          level?: string | null
          range_flag?: string | null
          raw_result?: Json | null
          self_band?: string | null
          vocab_score?: number | null
        }
        Update: {
          assigned_level?: string | null
          bank_version?: string | null
          composite?: number | null
          confidence?: number | null
          created_at?: string
          duration_seconds?: number | null
          false_alarm_rate?: number | null
          flags?: Json | null
          grammar_errors?: Json | null
          grammar_score?: number | null
          id?: string
          learner_id?: string
          level?: string | null
          range_flag?: string | null
          raw_result?: Json | null
          self_band?: string | null
          vocab_score?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          card_id: string
          due: string | null
          id: string
          learner_id: string
          rating: number
          ts: string
        }
        Insert: {
          card_id: string
          due?: string | null
          id?: string
          learner_id?: string
          rating: number
          ts?: string
        }
        Update: {
          card_id?: string
          due?: string | null
          id?: string
          learner_id?: string
          rating?: number
          ts?: string
        }
        Relationships: []
      }
      section_attempts: {
        Row: {
          attempt_no: number | null
          duration_seconds: number | null
          id: string
          learner_id: string
          missed_card_ids: Json | null
          override: boolean
          passed: boolean | null
          recognition_rate: number
          section_id: string
          threshold: number | null
          unlocked_at: string | null
        }
        Insert: {
          attempt_no?: number | null
          duration_seconds?: number | null
          id?: string
          learner_id?: string
          missed_card_ids?: Json | null
          override?: boolean
          passed?: boolean | null
          recognition_rate: number
          section_id: string
          threshold?: number | null
          unlocked_at?: string | null
        }
        Update: {
          attempt_no?: number | null
          duration_seconds?: number | null
          id?: string
          learner_id?: string
          missed_card_ids?: Json | null
          override?: boolean
          passed?: boolean | null
          recognition_rate?: number
          section_id?: string
          threshold?: number | null
          unlocked_at?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          grammar_tags: string[]
          id: string
          position: number
          text: string
          title: string
          version_id: string
        }
        Insert: {
          grammar_tags?: string[]
          id: string
          position: number
          text: string
          title?: string
          version_id: string
        }
        Update: {
          grammar_tags?: string[]
          id?: string
          position?: number
          text?: string
          title?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "story_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          author: string
          blurb: string | null
          content_note: string | null
          genre: string
          id: string
          license: string | null
          minutes: number | null
          owner_id: string | null
          pd_mx: boolean
          pd_us: boolean
          source: string | null
          title: string
          verified_by: string | null
        }
        Insert: {
          author: string
          blurb?: string | null
          content_note?: string | null
          genre: string
          id: string
          license?: string | null
          minutes?: number | null
          owner_id?: string | null
          pd_mx?: boolean
          pd_us?: boolean
          source?: string | null
          title: string
          verified_by?: string | null
        }
        Update: {
          author?: string
          blurb?: string | null
          content_note?: string | null
          genre?: string
          id?: string
          license?: string | null
          minutes?: number | null
          owner_id?: string | null
          pd_mx?: boolean
          pd_us?: boolean
          source?: string | null
          title?: string
          verified_by?: string | null
        }
        Relationships: []
      }
      story_versions: {
        Row: {
          change_log: string | null
          created_at: string
          id: string
          level: string
          prompt_version: string | null
          reviewer: string | null
          status: Database["public"]["Enums"]["version_status"]
          story_id: string
        }
        Insert: {
          change_log?: string | null
          created_at?: string
          id: string
          level: string
          prompt_version?: string | null
          reviewer?: string | null
          status?: Database["public"]["Enums"]["version_status"]
          story_id: string
        }
        Update: {
          change_log?: string | null
          created_at?: string
          id?: string
          level?: string
          prompt_version?: string | null
          reviewer?: string | null
          status?: Database["public"]["Enums"]["version_status"]
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_versions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_section: { Args: { _section_id: string }; Returns: boolean }
      owns_story: { Args: { _story_id: string }; Returns: boolean }
      owns_version: { Args: { _version_id: string }; Returns: boolean }
      version_approved: { Args: { _version_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "learner" | "reviewer" | "admin"
      version_status: "draft" | "approved" | "auto"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["learner", "reviewer", "admin"],
      version_status: ["draft", "approved", "auto"],
    },
  },
} as const
