// Hand-written to match supabase/migrations/0001_init.sql. If the schema
// changes, update this alongside the migration — there's no CLI codegen step
// wired up for this project (would need `supabase gen types typescript`,
// which requires the Supabase CLI + a linked project).
//
// Every table needs a `Relationships` array (even if empty) and the schema
// needs a `Views` map, or it silently fails to satisfy postgrest-js's
// `GenericSchema` constraint — when that happens every query/rpc call type
// resolves to `never` with no direct error pointing at this file.

type NoRelationships = { Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      } & NoRelationships;
      groups: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["groups"]["Row"]> & { name: string; owner_id: string };
        Update: Partial<Database["public"]["Tables"]["groups"]["Row"]>;
      } & NoRelationships;
      group_members: {
        Row: {
          id: string;
          group_id: string;
          display_name: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["group_members"]["Row"]> & {
          group_id: string;
          display_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["group_members"]["Row"]>;
        // Declared so `group_members(*, profiles(...))` embeds type-check.
        // The FK is real in Postgres either way; without this entry
        // postgrest-js resolves the embed to
        // SelectQueryError<"could not find the relation ...">.
        Relationships: [
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          description: string;
          total_cents: number;
          paid_by: string;
          participant_ids: string[];
          split_method: "equal" | "exact";
          splits: { personId: string; amountCents: number }[];
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["expenses"]["Row"]> & {
          id: string;
          group_id: string;
          description: string;
          total_cents: number;
          paid_by: string;
          participant_ids: string[];
          split_method: "equal" | "exact";
          splits: { personId: string; amountCents: number }[];
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Row"]>;
      } & NoRelationships;
      settlements: {
        Row: {
          id: string;
          group_id: string;
          from_member_id: string;
          to_member_id: string;
          amount_cents: number;
          created_at: string;
        };
        // `id` and `created_at` are DB-defaulted: addSettlement omits both and
        // reads them back, restoreSettlement supplies both to preserve the
        // original row on Undo.
        Insert: Partial<Database["public"]["Tables"]["settlements"]["Row"]> & {
          group_id: string;
          from_member_id: string;
          to_member_id: string;
          amount_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["settlements"]["Row"]>;
      } & NoRelationships;
      group_invites: {
        Row: {
          token: string;
          group_id: string;
          created_by: string;
          created_at: string;
          expires_at: string;
          max_uses: number;
          uses: number;
          revoked: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["group_invites"]["Row"]> & {
          group_id: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["group_invites"]["Row"]>;
      } & NoRelationships;
    };
    Views: Record<string, never>;
    Functions: {
      is_group_member: { Args: { gid: string }; Returns: boolean };
      ensure_profile: { Args: Record<PropertyKey, never>; Returns: undefined };
      leave_group: { Args: { gid: string }; Returns: undefined };
      create_group: {
        Args: { group_name: string };
        Returns: Database["public"]["Tables"]["groups"]["Row"];
      };
      accept_invite: { Args: { invite_token: string }; Returns: string };
      claim_ghost_member: { Args: { member_id: string }; Returns: undefined };
      get_invite_preview: {
        Args: { invite_token: string };
        Returns: { group_id: string | null; group_name: string | null; member_count: number; valid: boolean }[];
      };
    };
  };
};
