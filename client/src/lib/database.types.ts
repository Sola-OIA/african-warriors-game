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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      game_history: {
        Row: {
          created_at: string | null
          elo_change_player1: number | null
          elo_change_player2: number | null
          game_duration_seconds: number | null
          game_id: string | null
          game_type: Database["public"]["Enums"]["game_type"] | null
          id: string
          player1_character_id: number | null
          player1_id: string | null
          player1_round_wins: number | null
          player2_character_id: number | null
          player2_id: string | null
          player2_round_wins: number | null
          rounds_played: number | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          elo_change_player1?: number | null
          elo_change_player2?: number | null
          game_duration_seconds?: number | null
          game_id?: string | null
          game_type?: Database["public"]["Enums"]["game_type"] | null
          id?: string
          player1_character_id?: number | null
          player1_id?: string | null
          player1_round_wins?: number | null
          player2_character_id?: number | null
          player2_id?: string | null
          player2_round_wins?: number | null
          rounds_played?: number | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          elo_change_player1?: number | null
          elo_change_player2?: number | null
          game_duration_seconds?: number | null
          game_id?: string | null
          game_type?: Database["public"]["Enums"]["game_type"] | null
          id?: string
          player1_character_id?: number | null
          player1_id?: string | null
          player1_round_wins?: number | null
          player2_character_id?: number | null
          player2_id?: string | null
          player2_round_wins?: number | null
          rounds_played?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rounds: {
        Row: {
          auto_selected: boolean | null
          battle_events: Json | null
          completed_at: string | null
          created_at: string | null
          game_id: string
          id: string
          player1_action: string | null
          player1_action_commit: string | null
          player1_committed_at: string | null
          player1_damage_dealt: number | null
          player1_heal_amount: number | null
          player1_health_after: number | null
          player1_health_before: number | null
          player1_ready_for_next_round: boolean | null
          player1_revealed_at: string | null
          player1_salt: string | null
          player2_action: string | null
          player2_action_commit: string | null
          player2_committed_at: string | null
          player2_damage_dealt: number | null
          player2_heal_amount: number | null
          player2_health_after: number | null
          player2_health_before: number | null
          player2_ready_for_next_round: boolean | null
          player2_revealed_at: string | null
          player2_salt: string | null
          round_number: number
          round_winner_id: string | null
          timer_started_at: string | null
        }
        Insert: {
          auto_selected?: boolean | null
          battle_events?: Json | null
          completed_at?: string | null
          created_at?: string | null
          game_id: string
          id?: string
          player1_action?: string | null
          player1_action_commit?: string | null
          player1_committed_at?: string | null
          player1_damage_dealt?: number | null
          player1_heal_amount?: number | null
          player1_health_after?: number | null
          player1_health_before?: number | null
          player1_ready_for_next_round?: boolean | null
          player1_revealed_at?: string | null
          player1_salt?: string | null
          player2_action?: string | null
          player2_action_commit?: string | null
          player2_committed_at?: string | null
          player2_damage_dealt?: number | null
          player2_heal_amount?: number | null
          player2_health_after?: number | null
          player2_health_before?: number | null
          player2_ready_for_next_round?: boolean | null
          player2_revealed_at?: string | null
          player2_salt?: string | null
          round_number: number
          round_winner_id?: string | null
          timer_started_at?: string | null
        }
        Update: {
          auto_selected?: boolean | null
          battle_events?: Json | null
          completed_at?: string | null
          created_at?: string | null
          game_id?: string
          id?: string
          player1_action?: string | null
          player1_action_commit?: string | null
          player1_committed_at?: string | null
          player1_damage_dealt?: number | null
          player1_heal_amount?: number | null
          player1_health_after?: number | null
          player1_health_before?: number | null
          player1_ready_for_next_round?: boolean | null
          player1_revealed_at?: string | null
          player1_salt?: string | null
          player2_action?: string | null
          player2_action_commit?: string | null
          player2_committed_at?: string | null
          player2_damage_dealt?: number | null
          player2_heal_amount?: number | null
          player2_health_after?: number | null
          player2_health_before?: number | null
          player2_ready_for_next_round?: boolean | null
          player2_revealed_at?: string | null
          player2_salt?: string | null
          round_number?: number
          round_winner_id?: string | null
          timer_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rounds_round_winner_id_fkey"
            columns: ["round_winner_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rounds_round_winner_id_fkey"
            columns: ["round_winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_round: number | null
          difficulty: string | null
          game_type: Database["public"]["Enums"]["game_type"]
          id: string
          max_rounds: number | null
          player1_character_id: number
          player1_damage: number | null
          player1_health: number | null
          player1_id: string | null
          player1_max_health: number | null
          player1_round_wins: number | null
          player2_character_id: number | null
          player2_damage: number | null
          player2_health: number | null
          player2_id: string | null
          player2_max_health: number | null
          player2_round_wins: number | null
          private_link: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["game_status"] | null
          winner_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_round?: number | null
          difficulty?: string | null
          game_type: Database["public"]["Enums"]["game_type"]
          id?: string
          max_rounds?: number | null
          player1_character_id: number
          player1_damage?: number | null
          player1_health?: number | null
          player1_id?: string | null
          player1_max_health?: number | null
          player1_round_wins?: number | null
          player2_character_id?: number | null
          player2_damage?: number | null
          player2_health?: number | null
          player2_id?: string | null
          player2_max_health?: number | null
          player2_round_wins?: number | null
          private_link?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"] | null
          winner_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_round?: number | null
          difficulty?: string | null
          game_type?: Database["public"]["Enums"]["game_type"]
          id?: string
          max_rounds?: number | null
          player1_character_id?: number
          player1_damage?: number | null
          player1_health?: number | null
          player1_id?: string | null
          player1_max_health?: number | null
          player1_round_wins?: number | null
          player2_character_id?: number | null
          player2_damage?: number | null
          player2_health?: number | null
          player2_id?: string | null
          player2_max_health?: number | null
          player2_round_wins?: number | null
          private_link?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"] | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_queue: {
        Row: {
          character_id: number
          created_at: string | null
          elo_rating: number | null
          expires_at: string | null
          id: string
          player_id: string
        }
        Insert: {
          character_id: number
          created_at?: string | null
          elo_rating?: number | null
          expires_at?: string | null
          id?: string
          player_id: string
        }
        Update: {
          character_id?: number
          created_at?: string | null
          elo_rating?: number | null
          expires_at?: string | null
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaking_queue_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matchups: {
        Row: {
          created_at: string | null
          id: string
          last_played_at: string | null
          player1_id: string | null
          player1_wins: number | null
          player2_id: string | null
          player2_wins: number | null
          total_games: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_played_at?: string | null
          player1_id?: string | null
          player1_wins?: number | null
          player2_id?: string | null
          player2_wins?: number | null
          total_games?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_played_at?: string | null
          player1_id?: string | null
          player1_wins?: number | null
          player2_id?: string | null
          player2_wins?: number | null
          total_games?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matchups_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchups_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchups_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchups_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_streak: number | null
          created_at: string | null
          display_name: string | null
          elo_rating: number | null
          id: string
          is_anonymous: boolean | null
          total_games: number | null
          total_losses: number | null
          total_wins: number | null
          updated_at: string | null
          username: string | null
          win_streak: number | null
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number | null
          created_at?: string | null
          display_name?: string | null
          elo_rating?: number | null
          id: string
          is_anonymous?: boolean | null
          total_games?: number | null
          total_losses?: number | null
          total_wins?: number | null
          updated_at?: string | null
          username?: string | null
          win_streak?: number | null
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number | null
          created_at?: string | null
          display_name?: string | null
          elo_rating?: number | null
          id?: string
          is_anonymous?: boolean | null
          total_games?: number | null
          total_losses?: number | null
          total_wins?: number | null
          updated_at?: string | null
          username?: string | null
          win_streak?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          avatar_url: string | null
          best_streak: number | null
          display_name: string | null
          elo_rating: number | null
          id: string | null
          rank: number | null
          total_games: number | null
          total_losses: number | null
          total_wins: number | null
          username: string | null
          win_rate: number | null
          win_streak: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_elo_change: {
        Args: { k_factor?: number; loser_elo: number; winner_elo: number }
        Returns: {
          loser_change: number
          winner_change: number
        }[]
      }
      cleanup_expired_matchmaking: { Args: never; Returns: undefined }
      finalize_game: { Args: { p_game_id: string }; Returns: undefined }
    }
    Enums: {
      game_status: "waiting" | "in_progress" | "completed" | "abandoned"
      game_type: "private" | "matchmaking"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      game_status: ["waiting", "in_progress", "completed", "abandoned"],
      game_type: ["private", "matchmaking"],
    },
  },
} as const
