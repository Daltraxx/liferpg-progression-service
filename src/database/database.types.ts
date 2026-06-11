export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      attributes: {
        Row: {
          created_at: string;
          experience: number;
          id: number;
          level: number;
          name: string;
          position: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          experience?: number;
          id?: number;
          level?: number;
          name: string;
          position: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          experience?: number;
          id?: number;
          level?: number;
          name?: string;
          position?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_attributes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_progress';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'user_attributes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_progression_batches: {
        Row: {
          activity_date: string;
          created_at: string;
          id: number;
          processed_at: string;
          user_id: string;
          user_timezone: string;
        };
        Insert: {
          activity_date: string;
          created_at?: string;
          id?: number;
          processed_at: string;
          user_id: string;
          user_timezone: string;
        };
        Update: {
          activity_date?: string;
          created_at?: string;
          id?: number;
          processed_at?: string;
          user_id?: string;
          user_timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_progression_batches_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_progress';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'daily_progression_batches_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      progression_log: {
        Row: {
          attribute_id: number | null;
          attribute_name: string | null;
          created_at: string;
          daily_batch_id: number;
          id: number;
          points: number;
          quest_id: number | null;
          quest_name: string | null;
          reason: string;
          target: string;
          user_id: string;
        };
        Insert: {
          attribute_id?: number | null;
          attribute_name?: string | null;
          created_at?: string;
          daily_batch_id: number;
          id?: number;
          points: number;
          quest_id?: number | null;
          quest_name?: string | null;
          reason: string;
          target: string;
          user_id: string;
        };
        Update: {
          attribute_id?: number | null;
          attribute_name?: string | null;
          created_at?: string;
          daily_batch_id?: number;
          id?: number;
          points?: number;
          quest_id?: number | null;
          quest_name?: string | null;
          reason?: string;
          target?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'progression_log_attribute_id_fkey';
            columns: ['attribute_id'];
            isOneToOne: false;
            referencedRelation: 'attributes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'progression_log_daily_batch_id_fkey';
            columns: ['daily_batch_id'];
            isOneToOne: false;
            referencedRelation: 'daily_progression_batches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'progression_log_quest_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'progression_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_progress';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'progression_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      quest_completions: {
        Row: {
          completed_at: string;
          experience_earned: number;
          id: number;
          processed_at: string | null;
          quest_id: number;
          streak: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          experience_earned?: number;
          id?: number;
          processed_at?: string | null;
          quest_id: number;
          streak?: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          experience_earned?: number;
          id?: number;
          processed_at?: string | null;
          quest_id?: number;
          streak?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quest_completions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_progress';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'quest_completions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_completions_task_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quests';
            referencedColumns: ['id'];
          },
        ];
      };
      quests: {
        Row: {
          created_at: string;
          description: string | null;
          experience_share: number;
          frequency: number;
          id: number;
          last_completed_date: string | null;
          name: string;
          position: number;
          rest_frequency: number;
          rest_progress: number;
          streak: number;
          strength_level: Database['public']['Enums']['strength_rank'];
          strength_points: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          experience_share: number;
          frequency?: number;
          id?: number;
          last_completed_date?: string | null;
          name: string;
          position: number;
          rest_frequency?: number;
          rest_progress?: number;
          streak?: number;
          strength_level?: Database['public']['Enums']['strength_rank'];
          strength_points?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          experience_share?: number;
          frequency?: number;
          id?: number;
          last_completed_date?: string | null;
          name?: string;
          position?: number;
          rest_frequency?: number;
          rest_progress?: number;
          streak?: number;
          strength_level?: Database['public']['Enums']['strength_rank'];
          strength_points?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_strength_level_fkey';
            columns: ['strength_level'];
            isOneToOne: false;
            referencedRelation: 'strength_levels';
            referencedColumns: ['level'];
          },
          {
            foreignKeyName: 'tasks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_progress';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'tasks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      quests_attributes: {
        Row: {
          attribute_id: number;
          attribute_power: number;
          id: number;
          quest_id: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attribute_id: number;
          attribute_power?: number;
          id?: number;
          quest_id: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attribute_id?: number;
          attribute_power?: number;
          id?: number;
          quest_id?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_attributes_attribute_id_fkey';
            columns: ['attribute_id'];
            isOneToOne: false;
            referencedRelation: 'attributes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_attributes_task_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_attributes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_progress';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'tasks_attributes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      strength_levels: {
        Row: {
          level: Database['public']['Enums']['strength_rank'];
          max_points: number | null;
          min_points: number;
          multiplier: number;
          updated_at: string | null;
        };
        Insert: {
          level: Database['public']['Enums']['strength_rank'];
          max_points?: number | null;
          min_points: number;
          multiplier: number;
          updated_at?: string | null;
        };
        Update: {
          level?: Database['public']['Enums']['strength_rank'];
          max_points?: number | null;
          min_points?: number;
          multiplier?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          experience: number;
          id: string;
          last_login: string | null;
          level: number;
          profile_complete: boolean;
          purpose: string | null;
          timezone: string;
          updated_at: string;
          username: string;
          usertag: string;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          email: string;
          experience?: number;
          id: string;
          last_login?: string | null;
          level?: number;
          profile_complete?: boolean;
          purpose?: string | null;
          timezone?: string;
          updated_at?: string;
          username: string;
          usertag: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          email?: string;
          experience?: number;
          id?: string;
          last_login?: string | null;
          level?: number;
          profile_complete?: boolean;
          purpose?: string | null;
          timezone?: string;
          updated_at?: string;
          username?: string;
          usertag?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      user_progress: {
        Row: {
          experience: number | null;
          level: number | null;
          total_strength: number | null;
          total_tasks: number | null;
          user_id: string | null;
          username: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      before_user_created_check_usertag: {
        Args: { event: Json };
        Returns: Json;
      };
      create_profile_transaction: {
        Args: {
          p_attributes: Json;
          p_quests: Json;
          p_quests_attributes: Json;
          p_user_id: string;
        };
        Returns: Json;
      };
      get_settlement_users_data: {
        Args: { p_timezones: string[] };
        Returns: Json;
      };
    };
    Enums: {
      strength_rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      strength_rank: ['E', 'D', 'C', 'B', 'A', 'S'],
    },
  },
} as const;
