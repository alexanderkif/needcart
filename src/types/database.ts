/**
 * Database types.
 *
 * These types mirror `docs/schema.sql`. The app lives in the `needcart`
 * schema, not in `public`. In a linked Supabase project they should be
 * regenerated with:
 *
 *   npx supabase gen types typescript --project-id <id> --schema needcart > src/types/database.ts
 *
 * The handwritten version is intentionally kept close to the SQL schema so
 * the app type-checks and runs before a project is linked.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Locale = 'en' | 'ru' | 'es' | 'de' | 'pt-BR' | 'fr' | 'sr-Latn' | 'it';
export type ThemeMode = 'light' | 'dark' | 'system';
export type GroupRole = 'owner' | 'admin' | 'member';
export type BudgetPeriod = 'none' | 'week' | 'month';

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  locale: Locale;
  theme_mode: ThemeMode;
  accent_color: string;
  created_at: string;
  updated_at: string;
}

export type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  invite_code: string;
  currency: string;
  budget_cents: number | null;
  budget_period: BudgetPeriod;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export type GroupOverviewRow = GroupRow & {
  member_count: number;
  active_items_count: number;
  planned_cents: number;
  spent_cents: number;
  period_start: string | null;
}

export type GroupMemberRow = {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
}

export type CategoryRow = {
  id: string;
  group_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ItemRow = {
  id: string;
  group_id: string;
  category_id: string | null;
  name: string;
  quantity: string;
  description: string | null;
  price_cents: number | null;
  is_checked: boolean;
  created_by: string | null;
  checked_by: string | null;
  checked_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ItemPurchaseRow = {
  id: string;
  item_id: string | null;
  group_id: string;
  category_id: string | null;
  item_name: string;
  category_name: string | null;
  quantity: string;
  price_cents: number | null;
  ordered_by: string | null;
  ordered_by_name: string | null;
  purchased_by: string | null;
  purchased_by_name: string | null;
  ordered_at: string;
  purchased_at: string;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/* App-facing composite types                                                 */
/* -------------------------------------------------------------------------- */

export type Profile = ProfileRow;
export type Group = GroupRow;
export type GroupOverview = GroupOverviewRow;
export type Category = CategoryRow;
export type Item = ItemRow;
export type ItemPurchase = ItemPurchaseRow;
export type GroupMember = GroupMemberRow;

export type CategorySummary = Pick<Category, 'id' | 'name' | 'color' | 'icon'>;

export type ItemWithCategory = Item & {
  category: CategorySummary | null;
};

export type GroupMemberWithProfile = GroupMember & {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
};

export type CreateGroupCategory = {
  name: string;
  color: string;
  icon: string;
  sort_order?: number;
};

export type CreateGroupInput = {
  name: string;
  description?: string | null;
  currency?: string;
  budget_cents?: number | null;
  budget_period?: BudgetPeriod;
  timezone?: string;
  categories?: CreateGroupCategory[];
};

export type PurchaseItemInput = {
  itemId: string;
  priceCents?: number | null;
  quantity?: string | null;
};

export type ReorderItemInput = {
  itemId: string;
  quantity: string;
  priceCents?: number | null;
};

/* -------------------------------------------------------------------------- */
/* Supabase schema                                                            */
/* -------------------------------------------------------------------------- */

export type Database = {
  needcart: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          locale?: Locale;
          theme_mode?: ThemeMode;
          accent_color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
      groups: {
        Row: GroupRow;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          invite_code?: string;
          currency?: string;
          budget_cents?: number | null;
          budget_period?: BudgetPeriod;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<GroupRow, 'id' | 'owner_id' | 'created_at'>>;
        Relationships: [];
      };
      group_members: {
        Row: GroupMemberRow;
        Insert: {
          group_id: string;
          user_id: string;
          role?: GroupRole;
          joined_at?: string;
        };
        Update: Partial<Pick<GroupMemberRow, 'role'>>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          color?: string;
          icon?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CategoryRow, 'id' | 'group_id' | 'created_at'>>;
        Relationships: [];
      };
      items: {
        Row: ItemRow;
        Insert: {
          id?: string;
          group_id: string;
          category_id?: string | null;
          name: string;
          quantity?: string;
          description?: string | null;
          price_cents?: number | null;
          is_checked?: boolean;
          created_by?: string | null;
          checked_by?: string | null;
          checked_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ItemRow, 'id' | 'group_id' | 'created_at'>>;
        Relationships: [];
      };
      item_purchases: {
        Row: ItemPurchaseRow;
        Insert: {
          id?: string;
          item_id?: string | null;
          group_id: string;
          category_id?: string | null;
          item_name: string;
          category_name?: string | null;
          quantity: string;
          price_cents?: number | null;
          ordered_by?: string | null;
          ordered_by_name?: string | null;
          purchased_by?: string | null;
          purchased_by_name?: string | null;
          ordered_at: string;
          purchased_at?: string;
          created_at?: string;
        };
        Update: Partial<ItemPurchaseRow>;
        Relationships: [];
      };
    };
    Views: {
      group_overview: {
        Row: GroupOverviewRow;
        Relationships: [];
      };
    };
    Functions: {
      create_group: {
        Args: {
          p_name: string;
          p_description?: string | null;
          p_currency?: string;
          p_budget_cents?: number | null;
          p_budget_period?: BudgetPeriod;
          p_timezone?: string;
          p_categories?: CreateGroupCategory[] | null;
        };
        Returns: GroupRow;
      };
      join_group_by_code: {
        Args: { p_code: string };
        Returns: string;
      };
      leave_group: {
        Args: { p_group_id: string };
        Returns: undefined;
      };
      rotate_invite_code: {
        Args: { p_group_id: string };
        Returns: string;
      };
      purchase_item: {
        Args: {
          p_item_id: string;
          p_price_cents?: number | null;
          p_quantity?: string | null;
        };
        Returns: ItemRow;
      };
      reorder_item: {
        Args: {
          p_item_id: string;
          p_quantity: string;
          p_price_cents?: number | null;
        };
        Returns: ItemRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['needcart']['Tables']> =
  Database['needcart']['Tables'][T]['Row'];

export type RpcName = keyof Database['needcart']['Functions'];
