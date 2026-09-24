[
  {
    "table_name": "duos",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "duos",
    "column_name": "tournament_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "duos",
    "column_name": "player1_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "duos",
    "column_name": "player2_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "duos",
    "column_name": "duo_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "duos",
    "column_name": "duo_team",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "duos",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "goals",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "goals",
    "column_name": "match_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "goals",
    "column_name": "player_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "goals",
    "column_name": "quantity",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "1"
  },
  {
    "table_name": "goals",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "group_members",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "group_members",
    "column_name": "group_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "group_members",
    "column_name": "player_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "groups",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "groups",
    "column_name": "tournament_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "groups",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "matches",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "matches",
    "column_name": "tournament_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "matches",
    "column_name": "mode",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "matches",
    "column_name": "stage",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "matches",
    "column_name": "home_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "matches",
    "column_name": "away_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "matches",
    "column_name": "home_score",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "matches",
    "column_name": "away_score",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "matches",
    "column_name": "played",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "false"
  },
  {
    "table_name": "matches",
    "column_name": "match_order",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "matches",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "profiles",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "username",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "avatar_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "team_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": "'player'::text"
  },
  {
    "table_name": "profiles",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": "'pending'::text"
  },
  {
    "table_name": "profiles",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "push_subscriptions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "push_subscriptions",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "push_subscriptions",
    "column_name": "subscription",
    "data_type": "jsonb",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "push_subscriptions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "tournament_players",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "tournament_players",
    "column_name": "tournament_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "tournament_players",
    "column_name": "player_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "tournament_players",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": "'player'::text"
  },
  {
    "table_name": "tournament_players",
    "column_name": "joined_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "tournaments",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "tournaments",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "tournaments",
    "column_name": "mode",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "tournaments",
    "column_name": "format",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "tournaments",
    "column_name": "date",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tournaments",
    "column_name": "location",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tournaments",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tournaments",
    "column_name": "invite_code",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "tournaments",
    "column_name": "created_by",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "tournaments",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": "'setup'::text"
  },
  {
    "table_name": "tournaments",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]



[
  {
    "schemaname": "public",
    "tablename": "duos",
    "policyname": "duos: admin or supreme manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(is_tournament_admin(tournament_id) OR (get_my_role() = 'supreme'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "duos",
    "policyname": "duos: public read",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "goals",
    "policyname": "goals: admin or supreme manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM matches m\n  WHERE ((m.id = goals.match_id) AND (is_tournament_admin(m.tournament_id) OR (get_my_role() = 'supreme'::text)))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "goals",
    "policyname": "goals: public read",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "policyname": "group_members: admin or supreme manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM groups g\n  WHERE ((g.id = group_members.group_id) AND (is_tournament_admin(g.tournament_id) OR (get_my_role() = 'supreme'::text)))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "group_members",
    "policyname": "group_members: public read",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "groups",
    "policyname": "groups: admin or supreme manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(is_tournament_admin(tournament_id) OR (get_my_role() = 'supreme'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "groups",
    "policyname": "groups: public read",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "matches",
    "policyname": "matches: admin or supreme manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(is_tournament_admin(tournament_id) OR (get_my_role() = 'supreme'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "matches",
    "policyname": "matches: public read",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "profiles: own update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": "(auth.uid() = id)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "profiles: public read",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "profiles: supreme update any",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(get_my_role() = 'supreme'::text)",
    "with_check": "(get_my_role() = 'supreme'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "profiles: trigger insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = id)"
  },
  {
    "schemaname": "public",
    "tablename": "push_subscriptions",
    "policyname": "push: own manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tournament_players",
    "policyname": "tournament_players: admin or supreme manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(is_tournament_admin(tournament_id) OR (get_my_role() = 'supreme'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tournament_players",
    "policyname": "tournament_players: insert self",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((player_id = auth.uid()) AND (get_my_status() = 'active'::text))"
  },
  {
    "schemaname": "public",
    "tablename": "tournament_players",
    "policyname": "tournament_players: public read",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tournaments",
    "policyname": "tournaments: active user create",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(get_my_status() = 'active'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "tournaments",
    "policyname": "tournaments: admin or supreme update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((created_by = auth.uid()) OR (get_my_role() = 'supreme'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tournaments",
    "policyname": "tournaments: public read",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tournaments",
    "policyname": "tournaments: supreme delete",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(get_my_role() = 'supreme'::text)",
    "with_check": null
  }
]



[
  {
    "tablename": "groups",
    "rowsecurity": true
  },
  {
    "tablename": "group_members",
    "rowsecurity": true
  },
  {
    "tablename": "duos",
    "rowsecurity": true
  },
  {
    "tablename": "matches",
    "rowsecurity": true
  },
  {
    "tablename": "goals",
    "rowsecurity": true
  },
  {
    "tablename": "push_subscriptions",
    "rowsecurity": true
  },
  {
    "tablename": "profiles",
    "rowsecurity": true
  },
  {
    "tablename": "tournaments",
    "rowsecurity": true
  },
  {
    "tablename": "tournament_players",
    "rowsecurity": true
  }
]