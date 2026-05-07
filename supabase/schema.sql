-- =====================================================================
-- ARROBA — Schema isolado no Supabase
-- =====================================================================
-- Tudo do app fica em `arroba.*` para não conflitar com outros projetos
-- que usam o mesmo Supabase.
-- =====================================================================

create schema if not exists arroba;

-- Extensões compartilhadas (ficam em public/extensions, ok)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- ENUMS (no schema arroba)
-- =====================================================================
do $$ begin
  create type arroba.account_type as enum ('personal', 'business');
exception when duplicate_object then null; end $$;

do $$ begin
  create type arroba.store_mode as enum ('store', 'store+ai', 'scheduling');
exception when duplicate_object then null; end $$;

do $$ begin
  create type arroba.message_type as enum ('text', 'image', 'audio', 'video', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type arroba.message_status as enum ('sent', 'delivered', 'read');
exception when duplicate_object then null; end $$;

do $$ begin
  create type arroba.appointment_status as enum ('pending', 'confirmed', 'rejected', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type arroba.call_status as enum ('ringing', 'active', 'ended', 'missed', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type arroba.fcm_platform as enum ('web', 'android', 'ios');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- TABELAS
-- =====================================================================

create table if not exists arroba.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  email text,
  display_name text,
  photo_url text,
  account_type arroba.account_type not null default 'personal',

  store_name text,
  professional_slug text unique,
  store_mode arroba.store_mode,
  store_description text,
  template_id uuid,
  theme_color text default 'indigo',
  store_logo text,
  config jsonb default '{}'::jsonb,
  efi_config jsonb default '{}'::jsonb,
  access_code_enabled boolean default false,
  access_code text,
  onboarding_completed boolean default false,

  is_admin boolean default false,
  role text,

  online boolean default false,
  last_seen timestamptz default now(),

  notification_settings jsonb default '{"soundEnabled":true,"pushEnabled":true}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_arroba_profiles_username on arroba.profiles(username);
create index if not exists idx_arroba_profiles_slug on arroba.profiles(professional_slug);
create index if not exists idx_arroba_profiles_account_type on arroba.profiles(account_type);

create table if not exists arroba.store_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text not null,
  category text not null,
  theme_color text default 'indigo',
  config jsonb not null default '{}'::jsonb,
  sample_products jsonb default '[]'::jsonb,
  sample_services jsonb default '[]'::jsonb,
  thumbnail text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_arroba_templates_category on arroba.store_templates(category);

create table if not exists arroba.products (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references arroba.profiles(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  original_price numeric(12,2),
  description text,
  image text,
  category text default 'Geral',
  stock integer,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_arroba_products_owner on arroba.products(owner_id, active);
create index if not exists idx_arroba_products_category on arroba.products(category);

create table if not exists arroba.services (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references arroba.profiles(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  duration integer not null default 30,
  description text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_arroba_services_owner on arroba.services(owner_id, active);

create table if not exists arroba.appointments (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references arroba.profiles(id) on delete cascade,
  user_id uuid references arroba.profiles(id) on delete set null,
  service_id uuid references arroba.services(id) on delete set null,
  service_name text,
  customer_name text not null,
  customer_phone text,
  appointment_time timestamptz not null,
  status arroba.appointment_status default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_arroba_appointments_owner on arroba.appointments(owner_id, appointment_time desc);
create index if not exists idx_arroba_appointments_user on arroba.appointments(user_id);

create table if not exists arroba.chats (
  id uuid primary key default uuid_generate_v4(),
  participants uuid[] not null,
  is_group boolean default false,
  group_name text,
  group_photo text,
  last_message_text text,
  last_message_at timestamptz,
  created_by uuid references arroba.profiles(id),
  created_at timestamptz default now()
);

create index if not exists idx_arroba_chats_participants on arroba.chats using gin (participants);
create index if not exists idx_arroba_chats_last_msg on arroba.chats(last_message_at desc nulls last);

create table if not exists arroba.messages (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid not null references arroba.chats(id) on delete cascade,
  sender_id uuid not null references arroba.profiles(id) on delete cascade,
  text text,
  type arroba.message_type default 'text',
  media_url text,
  reactions jsonb default '{}'::jsonb,
  status arroba.message_status default 'sent',
  reply_to uuid references arroba.messages(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_arroba_messages_chat on arroba.messages(chat_id, created_at desc);
create index if not exists idx_arroba_messages_sender on arroba.messages(sender_id);

create table if not exists arroba.calls (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid not null references arroba.chats(id) on delete cascade,
  caller_id uuid not null references arroba.profiles(id) on delete cascade,
  callee_id uuid references arroba.profiles(id) on delete set null,
  offer jsonb,
  answer jsonb,
  status arroba.call_status default 'ringing',
  started_at timestamptz default now(),
  ended_at timestamptz
);

create index if not exists idx_arroba_calls_chat on arroba.calls(chat_id, started_at desc);

create table if not exists arroba.call_ice_candidates (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references arroba.calls(id) on delete cascade,
  role text not null check (role in ('caller', 'callee')),
  candidate jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_arroba_ice_call on arroba.call_ice_candidates(call_id);

create table if not exists arroba.fcm_tokens (
  user_id uuid not null references arroba.profiles(id) on delete cascade,
  token text not null,
  platform arroba.fcm_platform not null default 'web',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, token)
);

create table if not exists arroba.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references arroba.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_arroba_notif_user on arroba.notifications(user_id, read, created_at desc);

-- =====================================================================
-- HELPERS (security definer p/ funcionar em RLS)
-- =====================================================================
create or replace function arroba.is_admin(uid uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = arroba, public
as $$
  select coalesce((select is_admin from arroba.profiles where id = uid), false);
$$;

create or replace function arroba.is_chat_participant(chat uuid, uid uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = arroba, public
as $$
  select coalesce((select uid = any(participants) from arroba.chats where id = chat), false);
$$;

-- =====================================================================
-- TRIGGER: criar profile ao registrar no Auth
-- =====================================================================
create or replace function arroba.handle_new_user()
returns trigger language plpgsql security definer
set search_path = arroba, public
as $$
declare
  admin_emails text[] := array['lrlucasrafael11@gmail.com', 'lucasrafaellrl11@gmail.com'];
  is_admin_user boolean;
begin
  is_admin_user := lower(new.email) = any(admin_emails);

  insert into arroba.profiles (id, email, display_name, photo_url, is_admin, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    is_admin_user,
    case when is_admin_user then 'admin' else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_arroba on auth.users;
create trigger on_auth_user_created_arroba
  after insert on auth.users
  for each row execute function arroba.handle_new_user();

-- =====================================================================
-- TRIGGER: updated_at
-- =====================================================================
create or replace function arroba.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on arroba.profiles;
create trigger trg_profiles_updated before update on arroba.profiles
  for each row execute function arroba.set_updated_at();

drop trigger if exists trg_templates_updated on arroba.store_templates;
create trigger trg_templates_updated before update on arroba.store_templates
  for each row execute function arroba.set_updated_at();

drop trigger if exists trg_products_updated on arroba.products;
create trigger trg_products_updated before update on arroba.products
  for each row execute function arroba.set_updated_at();

drop trigger if exists trg_services_updated on arroba.services;
create trigger trg_services_updated before update on arroba.services
  for each row execute function arroba.set_updated_at();

drop trigger if exists trg_appointments_updated on arroba.appointments;
create trigger trg_appointments_updated before update on arroba.appointments
  for each row execute function arroba.set_updated_at();

-- =====================================================================
-- TRIGGER: chat.last_message ao inserir mensagem
-- =====================================================================
create or replace function arroba.update_chat_last_message()
returns trigger language plpgsql as $$
begin
  update arroba.chats
    set last_message_text = coalesce(new.text, '[mídia]'),
        last_message_at = new.created_at
  where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_chat_summary on arroba.messages;
create trigger trg_messages_chat_summary after insert on arroba.messages
  for each row execute function arroba.update_chat_last_message();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table arroba.profiles            enable row level security;
alter table arroba.store_templates     enable row level security;
alter table arroba.products            enable row level security;
alter table arroba.services            enable row level security;
alter table arroba.appointments        enable row level security;
alter table arroba.chats               enable row level security;
alter table arroba.messages            enable row level security;
alter table arroba.calls               enable row level security;
alter table arroba.call_ice_candidates enable row level security;
alter table arroba.fcm_tokens          enable row level security;
alter table arroba.notifications       enable row level security;

-- profiles
drop policy if exists "profiles_select" on arroba.profiles;
create policy "profiles_select" on arroba.profiles
  for select using (auth.uid() is not null);

drop policy if exists "profiles_insert_self" on arroba.profiles;
create policy "profiles_insert_self" on arroba.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self_or_admin" on arroba.profiles;
create policy "profiles_update_self_or_admin" on arroba.profiles
  for update using (auth.uid() = id or arroba.is_admin());

drop policy if exists "profiles_delete_admin" on arroba.profiles;
create policy "profiles_delete_admin" on arroba.profiles
  for delete using (arroba.is_admin());

-- store_templates
drop policy if exists "templates_select_all" on arroba.store_templates;
create policy "templates_select_all" on arroba.store_templates
  for select using (true);

drop policy if exists "templates_write_admin" on arroba.store_templates;
create policy "templates_write_admin" on arroba.store_templates
  for all using (arroba.is_admin()) with check (arroba.is_admin());

-- products
drop policy if exists "products_select_all" on arroba.products;
create policy "products_select_all" on arroba.products
  for select using (true);

drop policy if exists "products_write_owner" on arroba.products;
create policy "products_write_owner" on arroba.products
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- services
drop policy if exists "services_select_all" on arroba.services;
create policy "services_select_all" on arroba.services
  for select using (true);

drop policy if exists "services_write_owner" on arroba.services;
create policy "services_write_owner" on arroba.services
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- appointments
drop policy if exists "appointments_select_owner_or_user" on arroba.appointments;
create policy "appointments_select_owner_or_user" on arroba.appointments
  for select using (auth.uid() = owner_id or auth.uid() = user_id);

drop policy if exists "appointments_insert_authenticated" on arroba.appointments;
create policy "appointments_insert_authenticated" on arroba.appointments
  for insert with check (auth.uid() is not null);

drop policy if exists "appointments_update_owner" on arroba.appointments;
create policy "appointments_update_owner" on arroba.appointments
  for update using (auth.uid() = owner_id);

drop policy if exists "appointments_delete_owner" on arroba.appointments;
create policy "appointments_delete_owner" on arroba.appointments
  for delete using (auth.uid() = owner_id);

-- chats
drop policy if exists "chats_select_participant" on arroba.chats;
create policy "chats_select_participant" on arroba.chats
  for select using (auth.uid() = any(participants));

drop policy if exists "chats_insert_self_in_participants" on arroba.chats;
create policy "chats_insert_self_in_participants" on arroba.chats
  for insert with check (auth.uid() = any(participants));

drop policy if exists "chats_update_participant" on arroba.chats;
create policy "chats_update_participant" on arroba.chats
  for update using (auth.uid() = any(participants));

-- messages
drop policy if exists "messages_select_participant" on arroba.messages;
create policy "messages_select_participant" on arroba.messages
  for select using (arroba.is_chat_participant(chat_id));

drop policy if exists "messages_insert_self_participant" on arroba.messages;
create policy "messages_insert_self_participant" on arroba.messages
  for insert with check (
    arroba.is_chat_participant(chat_id) and auth.uid() = sender_id
  );

drop policy if exists "messages_update_participant" on arroba.messages;
create policy "messages_update_participant" on arroba.messages
  for update using (arroba.is_chat_participant(chat_id));

-- calls
drop policy if exists "calls_rw_participant" on arroba.calls;
create policy "calls_rw_participant" on arroba.calls
  for all using (arroba.is_chat_participant(chat_id))
  with check (arroba.is_chat_participant(chat_id));

drop policy if exists "ice_rw_participant" on arroba.call_ice_candidates;
create policy "ice_rw_participant" on arroba.call_ice_candidates
  for all using (
    exists (select 1 from arroba.calls c where c.id = call_id and arroba.is_chat_participant(c.chat_id))
  )
  with check (
    exists (select 1 from arroba.calls c where c.id = call_id and arroba.is_chat_participant(c.chat_id))
  );

-- fcm_tokens
drop policy if exists "fcm_select_self" on arroba.fcm_tokens;
create policy "fcm_select_self" on arroba.fcm_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "fcm_write_self" on arroba.fcm_tokens;
create policy "fcm_write_self" on arroba.fcm_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notifications
drop policy if exists "notif_select_self" on arroba.notifications;
create policy "notif_select_self" on arroba.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notif_update_self" on arroba.notifications;
create policy "notif_update_self" on arroba.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "notif_insert_authenticated" on arroba.notifications;
create policy "notif_insert_authenticated" on arroba.notifications
  for insert with check (auth.uid() is not null);

-- =====================================================================
-- GRANTS p/ PostgREST (anon e authenticated) acessarem o schema
-- =====================================================================
grant usage on schema arroba to anon, authenticated, service_role;
grant all on all tables    in schema arroba to anon, authenticated, service_role;
grant all on all sequences in schema arroba to anon, authenticated, service_role;
grant all on all functions in schema arroba to anon, authenticated, service_role;

alter default privileges in schema arroba grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema arroba grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema arroba grant all on functions to anon, authenticated, service_role;

-- =====================================================================
-- REALTIME — adiciona tabelas do schema à publication
-- =====================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles', 'store_templates', 'products', 'services',
    'appointments', 'chats', 'messages', 'calls',
    'call_ice_candidates', 'notifications'
  ])
  loop
    begin
      execute format('alter publication supabase_realtime add table arroba.%I', t);
    exception when others then null;
    end;
  end loop;
end $$;
