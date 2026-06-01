-- Live Memory Archive cloud sync schema
-- 方案 B：每个用户只看到和编辑自己的资料库。

create table if not exists public.concerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  project text,
  projects text[] default '{}',
  date date,
  city text,
  venue text,
  address text,
  theme_color text default '#ff6f9f',
  tags text[] default '{}',
  note text,
  thoughts text,
  favorite_song text,
  setlist text[] default '{}',
  ticket_info text,
  seat_info text,
  merch text[] default '{}',
  companions text[] default '{}',
  schedule text[] default '{}',
  memorable_moments text[] default '{}',
  external_videos text[] default '{}',
  cover_media_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.concerts
add column if not exists projects text[] default '{}';

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
drop constraint if exists username_format;

alter table public.profiles
add constraint username_format check (
  char_length(username) between 2 and 20
  and username !~ '[@[:space:]/\\#?&=%]'
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  concert_id uuid not null references public.concerts(id) on delete cascade,
  type text not null check (type = 'image'),
  file_name text,
  caption text,
  storage_path text not null,
  mime_type text,
  size_bytes bigint default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.concerts enable row level security;
alter table public.profiles enable row level security;
alter table public.media enable row level security;

drop policy if exists "Users can read profiles for login" on public.profiles;
create policy "Users can read profiles for login"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage own concerts" on public.concerts;
create policy "Users can manage own concerts"
on public.concerts
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage own media rows" on public.media;
create policy "Users can manage own media rows"
on public.media
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('live-media', 'live-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Users can read own image files" on storage.objects;
create policy "Users can read own image files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'live-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own image files" on storage.objects;
create policy "Users can upload own image files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'live-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own image files" on storage.objects;
create policy "Users can update own image files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'live-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'live-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own image files" on storage.objects;
create policy "Users can delete own image files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'live-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
