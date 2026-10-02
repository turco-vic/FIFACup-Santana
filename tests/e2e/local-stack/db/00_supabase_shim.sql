-- =====================================================================
-- Shim mínimo do Supabase para testes locais (sem Docker).
-- Recria o que as migrations e o app esperam do Supabase: roles, auth.uid(),
-- auth.users, schema storage e a publicação do realtime. NÃO é o Supabase real.
-- =====================================================================

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit password 'authenticator';
grant anon, authenticated, service_role to authenticator;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- auth
-- ---------------------------------------------------------------------
create schema auth;

create table auth.users (
  instance_id uuid,
  id uuid primary key,
  aud varchar(255) default 'authenticated',
  role varchar(255) default 'authenticated',
  email varchar(255) unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb default '{"provider":"email","providers":["email"]}',
  raw_user_meta_data jsonb default '{}',
  recovery_token varchar(255),
  recovery_sent_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_anonymous boolean default false
);

-- Mesmo comportamento das funções do Supabase: leem as claims que o PostgREST põe na sessão
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true), auth.jwt() ->> 'sub'), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claim.role', true), auth.jwt() ->> 'role')
$$;
create function auth.email() returns text language sql stable as $$
  select auth.jwt() ->> 'email'
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- storage (só o necessário para a migration da Fase 3 aplicar)
-- ---------------------------------------------------------------------
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  metadata jsonb
);
alter table storage.objects enable row level security;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
create policy "avatars: public read" on storage.objects for select using (bucket_id = 'avatars');
grant usage on schema storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- realtime: a publicação existe vazia no Supabase (a Fase 4.4 adiciona matches)
-- ---------------------------------------------------------------------
create publication supabase_realtime;

-- ---------------------------------------------------------------------
-- Privilégios padrão do Supabase no schema public (o RLS é quem restringe)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
