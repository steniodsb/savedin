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
      categories: {
        Row: {
          color: string
          created_at: string | null
          deleted_at: string | null
          icon: string
          id: string
          is_system: boolean | null
          name: string
          sort_order: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string | null
          deleted_at?: string | null
          icon: string
          id?: string
          is_system?: boolean | null
          name: string
          sort_order?: number | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          deleted_at?: string | null
          icon?: string
          id?: string
          is_system?: boolean | null
          name?: string
          sort_order?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      duo_links: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          invite_email: string | null
          invite_status: string
          invite_token: string
          invited_at: string | null
          owner_user_id: string
          partner_user_id: string | null
          subscription_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          invite_email?: string | null
          invite_status?: string
          invite_token: string
          invited_at?: string | null
          owner_user_id: string
          partner_user_id?: string | null
          subscription_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          invite_email?: string | null
          invite_status?: string
          invite_token?: string
          invited_at?: string | null
          owner_user_id?: string
          partner_user_id?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duo_links_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "admin_subscription_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duo_links_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_groups: {
        Row: {
          color: string
          created_at: string
          deleted_at: string | null
          description: string | null
          icon: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_milestones: {
        Row: {
          completed_at: string | null
          goal_id: string
          id: string
          is_completed: boolean
          month: number | null
          notes: string | null
          quarter: number | null
          target_date: string | null
          title: string
        }
        Insert: {
          completed_at?: string | null
          goal_id: string
          id?: string
          is_completed?: boolean
          month?: number | null
          notes?: string | null
          quarter?: number | null
          target_date?: string | null
          title: string
        }
        Update: {
          completed_at?: string | null
          goal_id?: string
          id?: string
          is_completed?: boolean
          month?: number | null
          notes?: string | null
          quarter?: number | null
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress_history: {
        Row: {
          created_at: string
          difference: number
          goal_id: string
          id: string
          new_value: number
          notes: string | null
          previous_value: number
        }
        Insert: {
          created_at?: string
          difference: number
          goal_id: string
          id?: string
          new_value: number
          notes?: string | null
          previous_value: number
        }
        Update: {
          created_at?: string
          difference?: number
          goal_id?: string
          id?: string
          new_value?: number
          notes?: string | null
          previous_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved_at: string | null
          category: Database["public"]["Enums"]["goal_category"]
          category_id: string | null
          children_ids: string[] | null
          color: string | null
          created_at: string
          current_value: number | null
          deleted_at: string | null
          depth: number
          description: string | null
          end_date: string | null
          goal_type: string | null
          group_id: string | null
          icon: string
          id: string
          is_descending: boolean | null
          is_measurable: boolean
          linked_project_ids: string[] | null
          parent_id: string | null
          progress: number
          scope: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["goal_status"]
          target_value: number | null
          title: string
          unit: string | null
          user_id: string
          value_unit: string | null
        }
        Insert: {
          achieved_at?: string | null
          category?: Database["public"]["Enums"]["goal_category"]
          category_id?: string | null
          children_ids?: string[] | null
          color?: string | null
          created_at?: string
          current_value?: number | null
          deleted_at?: string | null
          depth?: number
          description?: string | null
          end_date?: string | null
          goal_type?: string | null
          group_id?: string | null
          icon?: string
          id?: string
          is_descending?: boolean | null
          is_measurable?: boolean
          linked_project_ids?: string[] | null
          parent_id?: string | null
          progress?: number
          scope?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          title: string
          unit?: string | null
          user_id: string
          value_unit?: string | null
        }
        Update: {
          achieved_at?: string | null
          category?: Database["public"]["Enums"]["goal_category"]
          category_id?: string | null
          children_ids?: string[] | null
          color?: string | null
          created_at?: string
          current_value?: number | null
          deleted_at?: string | null
          depth?: number
          description?: string | null
          end_date?: string | null
          goal_type?: string | null
          group_id?: string | null
          icon?: string
          id?: string
          is_descending?: boolean | null
          is_measurable?: boolean
          linked_project_ids?: string[] | null
          parent_id?: string | null
          progress?: number
          scope?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_value?: number | null
          title?: string
          unit?: string | null
          user_id?: string
          value_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "goal_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          completed_at: string
          count: number
          date: string
          habit_id: string
          id: string
          mood: number | null
          notes: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          count?: number
          date: string
          habit_id: string
          id?: string
          mood?: number | null
          notes?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          count?: number
          date?: string
          habit_id?: string
          id?: string
          mood?: number | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category_id: string | null
          checklist_items: string[] | null
          color: Database["public"]["Enums"]["habit_color"] | null
          contribution_type: string | null
          contribution_value: number | null
          created_at: string
          current_streak: number
          custom_unit: string | null
          days_of_week: number[] | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          estimated_minutes: number | null
          frequency: Database["public"]["Enums"]["habit_frequency"]
          goal_target: number | null
          goal_type: string | null
          icon: string
          id: string
          interval_days: number | null
          is_active: boolean
          linked_goal_id: string | null
          longest_streak: number
          order_in_routine: number | null
          reminder_time: string | null
          require_all_items: boolean | null
          routine_id: string | null
          specific_time: string | null
          start_date: string | null
          target_value: number | null
          time_of_day: Database["public"]["Enums"]["time_of_day"]
          timer_running: boolean | null
          timer_started_at: string | null
          times_per_day: number
          times_per_week: number | null
          title: string
          total_completions: number
          total_time_spent: number | null
          tracking_type: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          checklist_items?: string[] | null
          color?: Database["public"]["Enums"]["habit_color"] | null
          contribution_type?: string | null
          contribution_value?: number | null
          created_at?: string
          current_streak?: number
          custom_unit?: string | null
          days_of_week?: number[] | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          estimated_minutes?: number | null
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          goal_target?: number | null
          goal_type?: string | null
          icon?: string
          id?: string
          interval_days?: number | null
          is_active?: boolean
          linked_goal_id?: string | null
          longest_streak?: number
          order_in_routine?: number | null
          reminder_time?: string | null
          require_all_items?: boolean | null
          routine_id?: string | null
          specific_time?: string | null
          start_date?: string | null
          target_value?: number | null
          time_of_day?: Database["public"]["Enums"]["time_of_day"]
          timer_running?: boolean | null
          timer_started_at?: string | null
          times_per_day?: number
          times_per_week?: number | null
          title: string
          total_completions?: number
          total_time_spent?: number | null
          tracking_type?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          checklist_items?: string[] | null
          color?: Database["public"]["Enums"]["habit_color"] | null
          contribution_type?: string | null
          contribution_value?: number | null
          created_at?: string
          current_streak?: number
          custom_unit?: string | null
          days_of_week?: number[] | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          estimated_minutes?: number | null
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          goal_target?: number | null
          goal_type?: string | null
          icon?: string
          id?: string
          interval_days?: number | null
          is_active?: boolean
          linked_goal_id?: string | null
          longest_streak?: number
          order_in_routine?: number | null
          reminder_time?: string | null
          require_all_items?: boolean | null
          routine_id?: string | null
          specific_time?: string | null
          start_date?: string | null
          target_value?: number | null
          time_of_day?: Database["public"]["Enums"]["time_of_day"]
          timer_running?: boolean | null
          timer_started_at?: string | null
          times_per_day?: number
          times_per_week?: number | null
          title?: string
          total_completions?: number
          total_time_spent?: number | null
          tracking_type?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount_cents: number
          amount_display: string
          created_at: string | null
          currency: string | null
          id: string
          invoice_url: string | null
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          provider: string | null
          provider_payment_id: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          amount_display: string
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          status: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          amount_display?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "admin_subscription_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_cycle: string
          created_at: string | null
          currency: string
          display_order: number | null
          features: Json | null
          highlight: boolean | null
          id: string
          is_active: boolean | null
          mode: string
          name: string
          price_cents: number
          price_display: string
          savings_percentage: number | null
          slug: string
          trial_days: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle: string
          created_at?: string | null
          currency?: string
          display_order?: number | null
          features?: Json | null
          highlight?: boolean | null
          id?: string
          is_active?: boolean | null
          mode: string
          name: string
          price_cents: number
          price_display: string
          savings_percentage?: number | null
          slug: string
          trial_days?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string | null
          currency?: string
          display_order?: number | null
          features?: Json | null
          highlight?: boolean | null
          id?: string
          is_active?: boolean | null
          mode?: string
          name?: string
          price_cents?: number
          price_display?: string
          savings_percentage?: number | null
          slug?: string
          trial_days?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_gradient: string | null
          asaas_customer_id: string | null
          avatar_url: string | null
          cpf_cnpj: string | null
          created_at: string
          date_format: string | null
          first_day_of_week: number | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          theme_mode: string | null
          time_format: string | null
          updated_at: string
          user_id: string
          username: string
          username_updated_at: string | null
          visual_effects_enabled: boolean | null
        }
        Insert: {
          accent_gradient?: string | null
          asaas_customer_id?: string | null
          avatar_url?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          date_format?: string | null
          first_day_of_week?: number | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          theme_mode?: string | null
          time_format?: string | null
          updated_at?: string
          user_id: string
          username: string
          username_updated_at?: string | null
          visual_effects_enabled?: boolean | null
        }
        Update: {
          accent_gradient?: string | null
          asaas_customer_id?: string | null
          avatar_url?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          date_format?: string | null
          first_day_of_week?: number | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          theme_mode?: string | null
          time_format?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          username_updated_at?: string | null
          visual_effects_enabled?: boolean | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          assignees: string[] | null
          category_id: string | null
          color: string
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          icon: string | null
          id: string
          is_archived: boolean
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignees?: string[] | null
          category_id?: string | null
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignees?: string[] | null
          category_id?: string | null
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_completions: {
        Row: {
          completed_at: string | null
          id: string
          notes: string | null
          reminder_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          reminder_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          reminder_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_completions_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string | null
          current_streak: number | null
          custom_days: number[] | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          frequency: string
          icon: string | null
          id: string
          is_active: boolean | null
          last_completed_at: string | null
          linked_item_id: string | null
          longest_streak: number | null
          start_date: string
          time_of_day: string
          title: string
          total_completions: number | null
          total_days: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          custom_days?: number[] | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          last_completed_at?: string | null
          linked_item_id?: string | null
          longest_streak?: number | null
          start_date?: string
          time_of_day?: string
          title: string
          total_completions?: number | null
          total_days?: number | null
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          custom_days?: number[] | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          last_completed_at?: string | null
          linked_item_id?: string | null
          longest_streak?: number | null
          start_date?: string
          time_of_day?: string
          title?: string
          total_completions?: number | null
          total_days?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          allow_skip: boolean
          deleted_at: string | null
          description: string | null
          estimated_minutes: number
          habit_ids: string[] | null
          icon: string
          id: string
          is_active: boolean
          time_of_day: Database["public"]["Enums"]["time_of_day"]
          title: string
          user_id: string
        }
        Insert: {
          allow_skip?: boolean
          deleted_at?: string | null
          description?: string | null
          estimated_minutes?: number
          habit_ids?: string[] | null
          icon?: string
          id?: string
          is_active?: boolean
          time_of_day?: Database["public"]["Enums"]["time_of_day"]
          title: string
          user_id: string
        }
        Update: {
          allow_skip?: boolean
          deleted_at?: string | null
          description?: string | null
          estimated_minutes?: number
          habit_ids?: string[] | null
          icon?: string
          id?: string
          is_active?: boolean
          time_of_day?: Database["public"]["Enums"]["time_of_day"]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          owner_id: string
          permission: string
          shared_with_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          owner_id: string
          permission?: string
          shared_with_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          owner_id?: string
          permission?: string
          shared_with_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "shared_items_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          payment_provider: string | null
          plan_id: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          plan_id: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          plan_id?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          assignees: string[] | null
          blocked_by: string[] | null
          category_id: string | null
          children_count: number
          children_ids: string[] | null
          color: string | null
          completed_at: string | null
          completed_children_count: number
          created_at: string
          deleted_at: string | null
          dependencies: string[] | null
          dependents: string[] | null
          depth: number
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          goal_weight: number | null
          icon: string | null
          id: string
          is_archived: boolean
          last_updated_at: string | null
          last_updated_by: string | null
          level: Database["public"]["Enums"]["task_level"]
          level_label: string
          linked_goal_id: string | null
          notes: string | null
          parent_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence: string | null
          recurrence_days: number[] | null
          recurrence_interval: number | null
          recurrence_interval_unit: string | null
          scheduled_for: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          timer_running: boolean | null
          timer_started_at: string | null
          title: string
          total_time_spent: number | null
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          assignees?: string[] | null
          blocked_by?: string[] | null
          category_id?: string | null
          children_count?: number
          children_ids?: string[] | null
          color?: string | null
          completed_at?: string | null
          completed_children_count?: number
          created_at?: string
          deleted_at?: string | null
          dependencies?: string[] | null
          dependents?: string[] | null
          depth?: number
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          goal_weight?: number | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          last_updated_at?: string | null
          last_updated_by?: string | null
          level?: Database["public"]["Enums"]["task_level"]
          level_label?: string
          linked_goal_id?: string | null
          notes?: string | null
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: string | null
          recurrence_days?: number[] | null
          recurrence_interval?: number | null
          recurrence_interval_unit?: string | null
          scheduled_for?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          timer_running?: boolean | null
          timer_started_at?: string | null
          title: string
          total_time_spent?: number | null
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          assignees?: string[] | null
          blocked_by?: string[] | null
          category_id?: string | null
          children_count?: number
          children_ids?: string[] | null
          color?: string | null
          completed_at?: string | null
          completed_children_count?: number
          created_at?: string
          deleted_at?: string | null
          dependencies?: string[] | null
          dependents?: string[] | null
          depth?: number
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          goal_weight?: number | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          last_updated_at?: string | null
          last_updated_by?: string | null
          level?: Database["public"]["Enums"]["task_level"]
          level_label?: string
          linked_goal_id?: string | null
          notes?: string | null
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence?: string | null
          recurrence_days?: number[] | null
          recurrence_interval?: number | null
          recurrence_interval_unit?: string | null
          scheduled_for?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          timer_running?: boolean | null
          timer_started_at?: string | null
          title?: string
          total_time_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      timer_sessions: {
        Row: {
          actual_time: number
          created_at: string | null
          ended_at: string
          estimated_time: number | null
          id: string
          item_id: string
          item_name: string
          item_type: string
          notes: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          actual_time: number
          created_at?: string | null
          ended_at: string
          estimated_time?: number | null
          id?: string
          item_id: string
          item_name: string
          item_type: string
          notes?: string | null
          started_at: string
          user_id: string
        }
        Update: {
          actual_time?: number
          created_at?: string | null
          ended_at?: string
          estimated_time?: number | null
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          notes?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_subscription_metrics: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          full_name: string | null
          id: string | null
          plan_id: string | null
          plan_interval: string | null
          plan_name: string | null
          plan_price: number | null
          status: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      are_users_connected: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      check_username_exists: {
        Args: { username_to_check: string }
        Returns: boolean
      }
      cleanup_deleted_items: { Args: never; Returns: undefined }
      create_default_categories: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      generate_username_from_name: {
        Args: { full_name: string; user_id: string }
        Returns: string
      }
      get_task_hierarchy: { Args: { task_id: string }; Returns: string[] }
      has_goal_access: {
        Args: { goal_uuid: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_task_access: {
        Args: { task_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_premium: { Args: { user_uuid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      goal_category:
        | "career"
        | "health"
        | "finance"
        | "learning"
        | "personal"
        | "relationships"
      goal_status: "not_started" | "in_progress" | "achieved" | "abandoned"
      habit_color:
        | "red"
        | "orange"
        | "yellow"
        | "green"
        | "teal"
        | "blue"
        | "purple"
        | "pink"
      habit_frequency: "daily" | "weekly" | "specific_days" | "interval"
      task_level: "project" | "milestone" | "task" | "subtask"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "blocked" | "completed"
      time_of_day: "morning" | "afternoon" | "evening" | "anytime"
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
      app_role: ["admin", "moderator", "user"],
      goal_category: [
        "career",
        "health",
        "finance",
        "learning",
        "personal",
        "relationships",
      ],
      goal_status: ["not_started", "in_progress", "achieved", "abandoned"],
      habit_color: [
        "red",
        "orange",
        "yellow",
        "green",
        "teal",
        "blue",
        "purple",
        "pink",
      ],
      habit_frequency: ["daily", "weekly", "specific_days", "interval"],
      task_level: ["project", "milestone", "task", "subtask"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "blocked", "completed"],
      time_of_day: ["morning", "afternoon", "evening", "anytime"],
    },
  },
} as const
