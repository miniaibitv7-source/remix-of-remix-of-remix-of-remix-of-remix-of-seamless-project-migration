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
      game_saves: {
        Row: {
          character_slot: number
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          character_slot?: number
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          character_slot?: number
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lawl_characters: {
        Row: {
          data: Json
          slot: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          slot: number
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          slot?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lawl_chat_blocks: {
        Row: {
          blocked_id: string
          user_id: string
        }
        Insert: {
          blocked_id: string
          user_id: string
        }
        Update: {
          blocked_id?: string
          user_id?: string
        }
        Relationships: []
      }
      lawl_chat_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          guild_id: number | null
          id: number
          name: string
          recipient_id: string | null
          recipient_name: string | null
          recipient_slot: number | null
          slot: number
          user_id: string
          x: number
          y: number
          z: number
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          guild_id?: number | null
          id?: never
          name: string
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_slot?: number | null
          slot: number
          user_id: string
          x: number
          y: number
          z: number
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          guild_id?: number | null
          id?: never
          name?: string
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_slot?: number | null
          slot?: number
          user_id?: string
          x?: number
          y?: number
          z?: number
        }
        Relationships: []
      }
      lawl_chat_reports: {
        Row: {
          created_at: string
          id: number
          message_id: number
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          message_id: number
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: never
          message_id?: number
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawl_chat_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "lawl_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      lawl_gem_orders: {
        Row: {
          amount_cents: number
          capture_method: string | null
          character_name: string
          checkout_url: string | null
          created_at: string
          credited_at: string | null
          event_id: number | null
          gems: number
          id: string
          invoice_slug: string | null
          pack: number
          receipt_url: string | null
          slot: number
          status: string
          transaction_nsu: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          capture_method?: string | null
          character_name?: string
          checkout_url?: string | null
          created_at?: string
          credited_at?: string | null
          event_id?: number | null
          gems: number
          id?: string
          invoice_slug?: string | null
          pack: number
          receipt_url?: string | null
          slot: number
          status?: string
          transaction_nsu?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          capture_method?: string | null
          character_name?: string
          checkout_url?: string | null
          created_at?: string
          credited_at?: string | null
          event_id?: number | null
          gems?: number
          id?: string
          invoice_slug?: string | null
          pack?: number
          receipt_url?: string | null
          slot?: number
          status?: string
          transaction_nsu?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lawl_gem_sellable: {
        Row: {
          amount: number
          slot: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          slot: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          slot?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lawl_gm_events: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: number
          payload: Json
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: never
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: never
          payload?: Json
        }
        Relationships: []
      }
      lawl_gm_roles: {
        Row: {
          character_name: string
          role: string
          user_id: string
        }
        Insert: {
          character_name?: string
          role?: string
          user_id: string
        }
        Update: {
          character_name?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      lawl_ground_loot: {
        Row: {
          created_at: string
          id: number
          items: Json
          owner_id: string
          owner_name: string
          owner_slot: number
          public_drop: boolean
          x: number
          y: number
          z: number
        }
        Insert: {
          created_at?: string
          id?: never
          items: Json
          owner_id: string
          owner_name?: string
          owner_slot: number
          public_drop?: boolean
          x: number
          y: number
          z: number
        }
        Update: {
          created_at?: string
          id?: never
          items?: Json
          owner_id?: string
          owner_name?: string
          owner_slot?: number
          public_drop?: boolean
          x?: number
          y?: number
          z?: number
        }
        Relationships: []
      }
      lawl_guild_invites: {
        Row: {
          created_at: string
          guild_id: number
          invited_by: string
          slot: number
          user_id: string
        }
        Insert: {
          created_at?: string
          guild_id: number
          invited_by?: string
          slot: number
          user_id: string
        }
        Update: {
          created_at?: string
          guild_id?: number
          invited_by?: string
          slot?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawl_guild_invites_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "lawl_guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawl_guild_invites_user_id_slot_fkey"
            columns: ["user_id", "slot"]
            isOneToOne: false
            referencedRelation: "lawl_characters"
            referencedColumns: ["user_id", "slot"]
          },
        ]
      }
      lawl_guild_log: {
        Row: {
          body: string
          created_at: string
          guild_id: number
          id: number
        }
        Insert: {
          body: string
          created_at?: string
          guild_id: number
          id?: never
        }
        Update: {
          body?: string
          created_at?: string
          guild_id?: number
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "lawl_guild_log_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "lawl_guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      lawl_guild_members: {
        Row: {
          guild_id: number
          joined_at: string
          rank: string
          slot: number
          title: string
          user_id: string
        }
        Insert: {
          guild_id: number
          joined_at?: string
          rank?: string
          slot: number
          title?: string
          user_id: string
        }
        Update: {
          guild_id?: number
          joined_at?: string
          rank?: string
          slot?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawl_guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "lawl_guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawl_guild_members_user_id_slot_fkey"
            columns: ["user_id", "slot"]
            isOneToOne: true
            referencedRelation: "lawl_characters"
            referencedColumns: ["user_id", "slot"]
          },
        ]
      }
      lawl_guilds: {
        Row: {
          created_at: string
          id: number
          motd: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          motd?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: never
          motd?: string
          name?: string
        }
        Relationships: []
      }
      lawl_house_leases: {
        Row: {
          expires_at: string
          house_id: string
          slot: number
          user_id: string
        }
        Insert: {
          expires_at: string
          house_id: string
          slot: number
          user_id: string
        }
        Update: {
          expires_at?: string
          house_id?: string
          slot?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawl_house_leases_user_id_slot_fkey"
            columns: ["user_id", "slot"]
            isOneToOne: false
            referencedRelation: "lawl_characters"
            referencedColumns: ["user_id", "slot"]
          },
        ]
      }
      lawl_house_payments: {
        Row: {
          amount: number
          created_at: string
          days: number
          house_id: string
          id: number
          slot: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          days: number
          house_id: string
          id?: never
          slot: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          days?: number
          house_id?: string
          id?: never
          slot?: number
          user_id?: string
        }
        Relationships: []
      }
      lawl_market_purchases: {
        Row: {
          action: string
          cost: number
          created_at: string
          id: string
          result: Json
          seq: number
          slot: number
          user_id: string
        }
        Insert: {
          action: string
          cost: number
          created_at?: string
          id: string
          result?: Json
          seq?: never
          slot: number
          user_id: string
        }
        Update: {
          action?: string
          cost?: number
          created_at?: string
          id?: string
          result?: Json
          seq?: never
          slot?: number
          user_id?: string
        }
        Relationships: []
      }
      lawl_moderation: {
        Row: {
          muted_until: string | null
          reason: string
          suspended_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          muted_until?: string | null
          reason?: string
          suspended_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          muted_until?: string | null
          reason?: string
          suspended_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lawl_pvp_aggressions: {
        Row: {
          attacked_at: string
          attacker_id: string
          attacker_slot: number
          justified: boolean
          victim_id: string
          victim_slot: number
        }
        Insert: {
          attacked_at?: string
          attacker_id: string
          attacker_slot: number
          justified?: boolean
          victim_id: string
          victim_slot: number
        }
        Update: {
          attacked_at?: string
          attacker_id?: string
          attacker_slot?: number
          justified?: boolean
          victim_id?: string
          victim_slot?: number
        }
        Relationships: []
      }
      lawl_pvp_frags: {
        Row: {
          created_at: string
          id: number
          justified: boolean
          killer_id: string
          killer_name: string
          killer_slot: number
          victim_id: string
          victim_name: string
          victim_slot: number
        }
        Insert: {
          created_at?: string
          id?: never
          justified: boolean
          killer_id: string
          killer_name?: string
          killer_slot: number
          victim_id: string
          victim_name?: string
          victim_slot: number
        }
        Update: {
          created_at?: string
          id?: never
          justified?: boolean
          killer_id?: string
          killer_name?: string
          killer_slot?: number
          victim_id?: string
          victim_name?: string
          victim_slot?: number
        }
        Relationships: []
      }
      lawl_pvp_skulls: {
        Row: {
          black_until: string | null
          pz_until: string | null
          red_until: string | null
          slot: number
          updated_at: string
          user_id: string
          white_until: string | null
        }
        Insert: {
          black_until?: string | null
          pz_until?: string | null
          red_until?: string | null
          slot: number
          updated_at?: string
          user_id: string
          white_until?: string | null
        }
        Update: {
          black_until?: string | null
          pz_until?: string | null
          red_until?: string | null
          slot?: number
          updated_at?: string
          user_id?: string
          white_until?: string | null
        }
        Relationships: []
      }
      lawl_rank: {
        Row: {
          distance: number
          level: number
          magic: number
          name: string
          shielding: number
          sword: number
          updated_at: string
          user_id: string
          voc: string
          xp: number
        }
        Insert: {
          distance?: number
          level?: number
          magic?: number
          name?: string
          shielding?: number
          sword?: number
          updated_at?: string
          user_id: string
          voc?: string
          xp?: number
        }
        Update: {
          distance?: number
          level?: number
          magic?: number
          name?: string
          shielding?: number
          sword?: number
          updated_at?: string
          user_id?: string
          voc?: string
          xp?: number
        }
        Relationships: []
      }
      lawl_trades: {
        Row: {
          a_ack: boolean
          a_expect: Json | null
          a_held: number
          a_name: string | null
          a_offer: Json | null
          a_slot: number | null
          b_ack: boolean
          b_expect: Json | null
          b_held: number
          b_name: string | null
          b_offer: Json | null
          b_slot: number | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_a: string
          user_b: string | null
        }
        Insert: {
          a_ack?: boolean
          a_expect?: Json | null
          a_held?: number
          a_name?: string | null
          a_offer?: Json | null
          a_slot?: number | null
          b_ack?: boolean
          b_expect?: Json | null
          b_held?: number
          b_name?: string | null
          b_offer?: Json | null
          b_slot?: number | null
          created_at?: string
          id: string
          status?: string
          updated_at?: string
          user_a: string
          user_b?: string | null
        }
        Update: {
          a_ack?: boolean
          a_expect?: Json | null
          a_held?: number
          a_name?: string | null
          a_offer?: Json | null
          a_slot?: number | null
          b_ack?: boolean
          b_expect?: Json | null
          b_held?: number
          b_name?: string | null
          b_offer?: Json | null
          b_slot?: number | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_a?: string
          user_b?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      lawl_character_action: {
        Args: { p_action: string; p_data?: Json; p_slot: number }
        Returns: Json
      }
      lawl_chat_read: {
        Args: { p_after?: number; p_channel: string; p_slot: number }
        Returns: {
          body: string
          channel: string
          created_at: string
          guild_id: number | null
          id: number
          name: string
          recipient_id: string | null
          recipient_name: string | null
          recipient_slot: number | null
          slot: number
          user_id: string
          x: number
          y: number
          z: number
        }[]
        SetofOptions: {
          from: "*"
          to: "lawl_chat_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      lawl_chat_report: {
        Args: { p_message: number; p_reason: string; p_slot: number }
        Returns: undefined
      }
      lawl_chat_reports_read: { Args: never; Returns: Json[] }
      lawl_chat_send: {
        Args: {
          p_body: string
          p_channel: string
          p_slot: number
          p_target?: string
        }
        Returns: Json
      }
      lawl_gem_order_credit: {
        Args: {
          p_method: string
          p_nsu: string
          p_order: string
          p_paid_cents: number
          p_receipt: string
          p_slug: string
        }
        Returns: Json
      }
      lawl_gem_sellable: { Args: never; Returns: number }
      lawl_get_ranking: {
        Args: { p_cat: string }
        Returns: {
          is_me: boolean
          level: number
          name: string
          pos: number
          value: number
          voc: string
        }[]
      }
      lawl_gm_backlog: { Args: { p_after: number }; Returns: Json }
      lawl_gm_execute: {
        Args: { p_action: string; p_payload: Json }
        Returns: Json
      }
      lawl_gm_gems: {
        Args: { p_amount: number; p_target: string }
        Returns: Json
      }
      lawl_gm_poll: { Args: { p_after: number }; Returns: Json }
      lawl_gm_resolve: { Args: { p_target: string }; Returns: Json }
      lawl_gm_status: { Args: never; Returns: Json }
      lawl_gm_visible: {
        Args: {
          e: Database["public"]["Tables"]["lawl_gm_events"]["Row"]
          uid: string
        }
        Returns: boolean
      }
      lawl_guild_action: {
        Args: { p_action: string; p_data?: Json; p_slot: number }
        Returns: Json
      }
      lawl_guild_note: {
        Args: { p_body: string; p_guild: number }
        Returns: undefined
      }
      lawl_guild_state: {
        Args: { p_slot: number; p_uid: string }
        Returns: Json
      }
      lawl_house_action: {
        Args: {
          p_action: string
          p_days?: number
          p_house?: string
          p_slot: number
        }
        Returns: Json
      }
      lawl_house_catalog: {
        Args: never
        Returns: {
          ax: number
          ay: number
          dx: number
          dy: number
          h: number
          id: string
          sqm: number
          w: number
          x: number
          y: number
        }[]
      }
      lawl_is_gm: { Args: never; Returns: boolean }
      lawl_is_owner: { Args: { p_user: string }; Returns: boolean }
      lawl_jint: { Args: { hi: number; lo: number; v: Json }; Returns: boolean }
      lawl_jnum: { Args: { v: Json }; Returns: number }
      lawl_loot_drop: {
        Args: {
          p_items: Json
          p_slot: number
          p_x: number
          p_y: number
          p_z: number
        }
        Returns: Json
      }
      lawl_loot_items: { Args: { i: Json }; Returns: Json }
      lawl_loot_list: {
        Args: { p_slot: number; p_x: number; p_y: number; p_z: number }
        Returns: Json
      }
      lawl_loot_pick: {
        Args: {
          p_id: number
          p_slot: number
          p_x: number
          p_y: number
          p_z: number
        }
        Returns: Json
      }
      lawl_market_buy: {
        Args: {
          p_action: string
          p_name?: string
          p_request: string
          p_slot: number
        }
        Returns: Json
      }
      lawl_market_num: { Args: { v: Json }; Returns: number }
      lawl_offline_trainers: {
        Args: never
        Returns: {
          id: string
          left_s: number
          level: number
          name: string
          voc: string
          x: number
          y: number
        }[]
      }
      lawl_owner_email: { Args: never; Returns: string }
      lawl_pvp_attack: {
        Args: { p_slot: number; p_target: string }
        Returns: Json
      }
      lawl_pvp_death: {
        Args: { p_killers?: string[]; p_slot: number }
        Returns: Json
      }
      lawl_pvp_is_gm: { Args: { p_user: string }; Returns: boolean }
      lawl_pvp_mark: {
        Args: { p_at: string; p_slot: number; p_user: string }
        Returns: string
      }
      lawl_pvp_self: {
        Args: { p_at: string; p_slot: number; p_user: string }
        Returns: Json
      }
      lawl_pvp_status: {
        Args: { p_others?: string[]; p_slot: number }
        Returns: Json
      }
      lawl_sellable_add: {
        Args: { p_delta: number; p_slot: number; p_user: string }
        Returns: number
      }
      lawl_sellable_cap: { Args: { d: Json }; Returns: number }
      lawl_submit_rank: {
        Args: {
          p_distance: number
          p_level: number
          p_magic: number
          p_name: string
          p_shielding: number
          p_sword: number
          p_voc: string
          p_xp: number
        }
        Returns: undefined
      }
      lawl_sync_gm_owner: { Args: { p_user_id: string }; Returns: undefined }
      lawl_trade_ack: { Args: { p_id: string }; Returns: undefined }
      lawl_trade_cancel: {
        Args: { p_id: string; p_partner: string }
        Returns: Json
      }
      lawl_trade_confirm: {
        Args: {
          p_expect: Json
          p_id: string
          p_name: string
          p_offer: Json
          p_partner: string
        }
        Returns: Json
      }
      lawl_trade_gems: { Args: { o: Json }; Returns: number }
      lawl_trade_history: {
        Args: never
        Returns: {
          at: string
          gave: Json
          got: Json
          partner_name: string
          trade_status: string
        }[]
      }
      lawl_trade_pending: {
        Args: never
        Returns: {
          give: Json
          partner_name: string
          trade_id: string
          trade_status: string
        }[]
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
