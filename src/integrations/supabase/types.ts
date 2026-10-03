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
      bookings: {
        Row: {
          clinic_id: string
          code: string
          created_at: string
          day_label: string
          id: string
          patient_name: string
          patient_phone: string
          queue_number: number
          slot: string
          status: string
          visit_type: string
        }
        Insert: {
          clinic_id: string
          code: string
          created_at?: string
          day_label?: string
          id?: string
          patient_name: string
          patient_phone?: string
          queue_number?: number
          slot?: string
          status?: string
          visit_type?: string
        }
        Update: {
          clinic_id?: string
          code?: string
          created_at?: string
          day_label?: string
          id?: string
          patient_name?: string
          patient_phone?: string
          queue_number?: number
          slot?: string
          status?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_conversations: {
        Row: {
          allow_images: boolean
          clinic_id: string
          created_at: string
          id: string
          last_message: string
          last_message_at: string
          patient_id: string
          patient_name: string
        }
        Insert: {
          allow_images?: boolean
          clinic_id: string
          created_at?: string
          id?: string
          last_message?: string
          last_message_at?: string
          patient_id: string
          patient_name?: string
        }
        Update: {
          allow_images?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          last_message?: string
          last_message_at?: string
          patient_id?: string
          patient_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_followers: {
        Row: {
          clinic_id: string
          created_at: string
          follower_key: string
          id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          follower_key: string
          id?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          follower_key?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_followers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_highlights: {
        Row: {
          clinic_id: string
          created_at: string
          emoji: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          emoji?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          emoji?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_highlights_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_messages: {
        Row: {
          attachment_path: string
          body: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          payload: Json | null
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          attachment_path?: string
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          read_at?: string | null
          sender_id: string
          sender_role?: string
        }
        Update: {
          attachment_path?: string
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "clinic_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_post_comments: {
        Row: {
          author_key: string
          author_name: string
          body: string
          clinic_id: string
          created_at: string
          id: string
          is_clinic_reply: boolean
          post_id: string
          updated_at: string
        }
        Insert: {
          author_key: string
          author_name?: string
          body: string
          clinic_id: string
          created_at?: string
          id?: string
          is_clinic_reply?: boolean
          post_id: string
          updated_at?: string
        }
        Update: {
          author_key?: string
          author_name?: string
          body?: string
          clinic_id?: string
          created_at?: string
          id?: string
          is_clinic_reply?: boolean
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_post_comments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "clinic_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_post_likes: {
        Row: {
          created_at: string
          id: string
          liker_key: string
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liker_key: string
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liker_key?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "clinic_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_posts: {
        Row: {
          caption: string
          clinic_id: string
          created_at: string
          id: string
          media_type: string
          media_url: string
        }
        Insert: {
          caption?: string
          clinic_id: string
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
        }
        Update: {
          caption?: string
          clinic_id?: string
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_posts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_reviews: {
        Row: {
          booking_id: string | null
          clinic_id: string
          comment: string
          created_at: string
          id: string
          patient_name: string
          rating: number
          visited: boolean
        }
        Insert: {
          booking_id?: string | null
          clinic_id: string
          comment?: string
          created_at?: string
          id?: string
          patient_name?: string
          rating: number
          visited?: boolean
        }
        Update: {
          booking_id?: string | null
          clinic_id?: string
          comment?: string
          created_at?: string
          id?: string
          patient_name?: string
          rating?: number
          visited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "clinic_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_reviews_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_staff: {
        Row: {
          clinic_id: string
          created_at: string
          full_name: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_stories: {
        Row: {
          caption: string
          clinic_id: string
          created_at: string
          expires_at: string
          highlight_id: string | null
          id: string
          is_pinned: boolean
          kind: string
          media_type: string
          media_url: string
        }
        Insert: {
          caption?: string
          clinic_id: string
          created_at?: string
          expires_at?: string
          highlight_id?: string | null
          id?: string
          is_pinned?: boolean
          kind?: string
          media_type?: string
          media_url?: string
        }
        Update: {
          caption?: string
          clinic_id?: string
          created_at?: string
          expires_at?: string
          highlight_id?: string | null
          id?: string
          is_pinned?: boolean
          kind?: string
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_stories_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_stories_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "clinic_highlights"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string
          area: string
          available_now: boolean
          avatar_url: string
          bio: string
          bookings_closed: boolean
          clinic_status: string
          cover_url: string
          created_at: string
          delay_minutes: number
          distance_km: number
          doctor: string
          id: string
          is_disabled: boolean
          is_verified: boolean
          lat: number
          lng: number
          now_serving: number
          owner_id: string | null
          phone: string
          price: number
          rating: number
          reviews: number
          specialty_id: string
          submitted_at: string
          updated_at: string
          waiting_count: number
          your_number: number
        }
        Insert: {
          address?: string
          area?: string
          available_now?: boolean
          avatar_url?: string
          bio?: string
          bookings_closed?: boolean
          clinic_status?: string
          cover_url?: string
          created_at?: string
          delay_minutes?: number
          distance_km?: number
          doctor: string
          id?: string
          is_disabled?: boolean
          is_verified?: boolean
          lat?: number
          lng?: number
          now_serving?: number
          owner_id?: string | null
          phone?: string
          price?: number
          rating?: number
          reviews?: number
          specialty_id: string
          submitted_at?: string
          updated_at?: string
          waiting_count?: number
          your_number?: number
        }
        Update: {
          address?: string
          area?: string
          available_now?: boolean
          avatar_url?: string
          bio?: string
          bookings_closed?: boolean
          clinic_status?: string
          cover_url?: string
          created_at?: string
          delay_minutes?: number
          distance_km?: number
          doctor?: string
          id?: string
          is_disabled?: boolean
          is_verified?: boolean
          lat?: number
          lng?: number
          now_serving?: number
          owner_id?: string | null
          phone?: string
          price?: number
          rating?: number
          reviews?: number
          specialty_id?: string
          submitted_at?: string
          updated_at?: string
          waiting_count?: number
          your_number?: number
        }
        Relationships: []
      }
      emergency_facilities: {
        Row: {
          address: string
          area: string
          created_at: string
          distance_km: number
          id: string
          lat: number
          lng: number
          name: string
          open_24h: boolean
          open_now: boolean
          phone: string
          type: string
        }
        Insert: {
          address?: string
          area?: string
          created_at?: string
          distance_km?: number
          id?: string
          lat?: number
          lng?: number
          name: string
          open_24h?: boolean
          open_now?: boolean
          phone?: string
          type: string
        }
        Update: {
          address?: string
          area?: string
          created_at?: string
          distance_km?: number
          id?: string
          lat?: number
          lng?: number
          name?: string
          open_24h?: boolean
          open_now?: boolean
          phone?: string
          type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          audience: string
          body: string
          clinic_id: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          recipient_key: string
          title: string
          url: string
        }
        Insert: {
          audience?: string
          body?: string
          clinic_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          recipient_key?: string
          title: string
          url?: string
        }
        Update: {
          audience?: string
          body?: string
          clinic_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          recipient_key?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string
          phone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_conversation: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      can_send_kind: {
        Args: { _conv: string; _kind: string; _user: string }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
