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
      bookmarks: {
        Row: {
          chapter_id: string | null
          created_at: string
          id: string
          note: string | null
          page_number: number
          user_id: string
          volume_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          page_number: number
          user_id: string
          volume_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          page_number?: number
          user_id?: string
          volume_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_characters: {
        Row: {
          chapter_id: string
          character_id: string
          mention_count: number
        }
        Insert: {
          chapter_id: string
          character_id: string
          mention_count?: number
        }
        Update: {
          chapter_id?: string
          character_id?: string
          mention_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapter_characters_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_chunks: {
        Row: {
          chapter_id: string
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          token_count: number | null
        }
        Insert: {
          chapter_id: string
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_count?: number | null
        }
        Update: {
          chapter_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_chunks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_pages: {
        Row: {
          chapter_id: string
          content: string
          created_at: string
          extraction_confidence: number | null
          id: string
          layout: Json
          ocr_used: boolean
          page_number: number
          source_pdf_page: number | null
        }
        Insert: {
          chapter_id: string
          content?: string
          created_at?: string
          extraction_confidence?: number | null
          id?: string
          layout?: Json
          ocr_used?: boolean
          page_number: number
          source_pdf_page?: number | null
        }
        Update: {
          chapter_id?: string
          content?: string
          created_at?: string
          extraction_confidence?: number | null
          id?: string
          layout?: Json
          ocr_used?: boolean
          page_number?: number
          source_pdf_page?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_pages_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_number: number
          content_format: string
          created_at: string
          end_page: number | null
          id: string
          publication_status: Database["public"]["Enums"]["publication_status"]
          slug: string
          spoiler_safe_summary: string | null
          start_page: number | null
          summary: string | null
          title: string
          updated_at: string
          volume_id: string
          word_count: number | null
        }
        Insert: {
          chapter_number: number
          content_format?: string
          created_at?: string
          end_page?: number | null
          id?: string
          publication_status?: Database["public"]["Enums"]["publication_status"]
          slug: string
          spoiler_safe_summary?: string | null
          start_page?: number | null
          summary?: string | null
          title: string
          updated_at?: string
          volume_id: string
          word_count?: number | null
        }
        Update: {
          chapter_number?: number
          content_format?: string
          created_at?: string
          end_page?: number | null
          id?: string
          publication_status?: Database["public"]["Enums"]["publication_status"]
          slug?: string
          spoiler_safe_summary?: string | null
          start_page?: number | null
          summary?: string | null
          title?: string
          updated_at?: string
          volume_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          aliases: string[]
          canonical_name: string
          created_at: string
          first_appearance_chapter: number | null
          first_appearance_volume: number | null
          id: string
          metadata: Json
          novel_id: string
          short_description: string | null
          spoiler_safe_description: string | null
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          canonical_name: string
          created_at?: string
          first_appearance_chapter?: number | null
          first_appearance_volume?: number | null
          id?: string
          metadata?: Json
          novel_id: string
          short_description?: string | null
          spoiler_safe_description?: string | null
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          canonical_name?: string
          created_at?: string
          first_appearance_chapter?: number | null
          first_appearance_volume?: number | null
          id?: string
          metadata?: Json
          novel_id?: string
          short_description?: string | null
          spoiler_safe_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_spoiler: boolean
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_spoiler?: boolean
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_spoiler?: boolean
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_spoiler: boolean
          novel_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_spoiler?: boolean
          novel_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_spoiler?: boolean
          novel_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      glossary_terms: {
        Row: {
          created_at: string
          definition: string
          first_appearance_chapter: number | null
          first_appearance_volume: number | null
          id: string
          metadata: Json
          novel_id: string
          spoiler_safe_definition: string | null
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition: string
          first_appearance_chapter?: number | null
          first_appearance_volume?: number | null
          id?: string
          metadata?: Json
          novel_id: string
          spoiler_safe_definition?: string | null
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition?: string
          first_appearance_chapter?: number | null
          first_appearance_volume?: number | null
          id?: string
          metadata?: Json
          novel_id?: string
          spoiler_safe_definition?: string | null
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "glossary_terms_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      novels: {
        Row: {
          alternate_title: string | null
          author: string | null
          cover_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          featured: boolean
          genres: string[]
          id: string
          language: string
          publication_status: Database["public"]["Enums"]["publication_status"]
          rating_avg: number | null
          rating_count: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          alternate_title?: string | null
          author?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          featured?: boolean
          genres?: string[]
          id?: string
          language?: string
          publication_status?: Database["public"]["Enums"]["publication_status"]
          rating_avg?: number | null
          rating_count?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          alternate_title?: string | null
          author?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          featured?: boolean
          genres?: string[]
          id?: string
          language?: string
          publication_status?: Database["public"]["Enums"]["publication_status"]
          rating_avg?: number | null
          rating_count?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      processing_job_logs: {
        Row: {
          created_at: string
          id: number
          job_id: string
          level: string
          message: string
          metadata: Json
        }
        Insert: {
          created_at?: string
          id?: never
          job_id: string
          level?: string
          message: string
          metadata?: Json
        }
        Update: {
          created_at?: string
          id?: never
          job_id?: string
          level?: string
          message?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "processing_job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_job_stages: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          job_id: string
          metadata: Json
          progress_percent: number
          stage_key: string
          stage_order: number
          started_at: string | null
          status: Database["public"]["Enums"]["processing_stage_status"]
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_id: string
          metadata?: Json
          progress_percent?: number
          stage_key: string
          stage_order: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["processing_stage_status"]
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string
          metadata?: Json
          progress_percent?: number
          stage_key?: string
          stage_order?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["processing_stage_status"]
        }
        Relationships: [
          {
            foreignKeyName: "processing_job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          current_stage: string | null
          error_message: string | null
          file_size_bytes: number | null
          finished_at: string | null
          id: string
          input_path: string
          progress_percent: number
          started_at: string | null
          status: Database["public"]["Enums"]["processing_status"]
          updated_at: string
          volume_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          finished_at?: string | null
          id?: string
          input_path: string
          progress_percent?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["processing_status"]
          updated_at?: string
          volume_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_stage?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          finished_at?: string | null
          id?: string
          input_path?: string
          progress_percent?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["processing_status"]
          updated_at?: string
          volume_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          reader_preferences: Json
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          reader_preferences?: Json
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          reader_preferences?: Json
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          chapter_id: string | null
          created_at: string
          last_read_at: string
          page_number: number
          progress_percent: number
          updated_at: string
          user_id: string
          volume_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          last_read_at?: string
          page_number?: number
          progress_percent?: number
          updated_at?: string
          user_id: string
          volume_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          last_read_at?: string
          page_number?: number
          progress_percent?: number
          updated_at?: string
          user_id?: string
          volume_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      volumes: {
        Row: {
          attribution_text: string | null
          rating_avg: number | null
          rating_count: number
          created_at: string
          description: string | null
          id: string
          metadata: Json
          novel_id: string
          page_count: number | null
          pdf_path: string | null
          pdf_sha256: string | null
          publication_status: Database["public"]["Enums"]["publication_status"]
          published_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
          volume_number: number
        }
        Insert: {
          attribution_text?: string | null
          rating_avg?: number | null
          rating_count?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          novel_id: string
          page_count?: number | null
          pdf_path?: string | null
          pdf_sha256?: string | null
          publication_status?: Database["public"]["Enums"]["publication_status"]
          published_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
          volume_number: number
        }
        Update: {
          attribution_text?: string | null
          rating_avg?: number | null
          rating_count?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          novel_id?: string
          page_count?: number | null
          pdf_path?: string | null
          pdf_sha256?: string | null
          publication_status?: Database["public"]["Enums"]["publication_status"]
          published_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          volume_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "volumes_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_lumen_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chapter_id: string
          chapter_number: number
          chapter_title: string
          chunk_id: string
          content: string
          metadata: Json
          novel_id: string
          novel_slug: string
          novel_title: string
          similarity: number
          volume_id: string
          volume_number: number
          volume_title: string
        }[]
      }
    }
    Enums: {
      processing_stage_status:
        | "waiting"
        | "running"
        | "completed"
        | "failed"
        | "skipped"
      processing_status:
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "review"
      publication_status:
        | "draft"
        | "processing"
        | "review"
        | "published"
        | "archived"
      user_role: "reader" | "editor" | "admin"
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
      processing_stage_status: [
        "waiting",
        "running",
        "completed",
        "failed",
        "skipped",
      ],
      processing_status: [
        "queued",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "review",
      ],
      publication_status: [
        "draft",
        "processing",
        "review",
        "published",
        "archived",
      ],
      user_role: ["reader", "editor", "admin"],
    },
  },
} as const

