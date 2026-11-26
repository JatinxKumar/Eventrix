-- Supabase SQL schema for Eventrix (PostgreSQL)
-- Enable extensions
create extension if not exists "uuid-ossp";

-- 1. profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users not null,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  role text not null default 'participant' check (role in ('participant','organizer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. events
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  organizer_id uuid not null references public.profiles(id),
  title text not null,
  description text,
  category text,
  venue text,
  cover_image text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  registration_deadline timestamptz,
  capacity int,
  registration_type text not null check (registration_type in ('individual','team')),
  min_team_size int,
  max_team_size int,
  status text not null default 'draft' check (status in ('draft','published','ongoing','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. registrations
create table if not exists public.registrations (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered','cancelled')),
  registered_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

-- 4. teams
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  leader_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 5. team_members
create table if not exists public.team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (team_id, participant_id)
);

-- 6. attendance
create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  qr_token uuid not null unique,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id)
);

-- 7. rounds
create table if not exists public.rounds (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  round_number int not null,
  status text not null default 'upcoming' check (status in ('upcoming','ongoing','completed')),
  created_at timestamptz not null default now()
);

-- 8. results
create table if not exists public.results (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  score numeric,
  rank int,
  feedback text,
  published_at timestamptz
);

-- 9. certificates
create table if not exists public.certificates (
  id uuid primary key default uuid_generate_v4(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  certificate_number uuid not null unique,
  issued_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.attendance enable row level security;
alter table public.rounds enable row level security;
alter table public.results enable row level security;
alter table public.certificates enable row level security;

-- ==========================
-- Policies (example set)
-- Profiles: users can select & update their own profile; admins can manage all
create policy "profile_select_self" on public.profiles for select using (auth.uid() = id);
create policy "profile_update_self" on public.profiles for update using (auth.uid() = id);
create policy "profile_admin_all" on public.profiles for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Events: public can read published events; organizers can manage their own events; admins all
create policy "event_select_published" on public.events for select using (status = 'published');
create policy "event_manage_own" on public.events for all using (auth.uid() = organizer_id);
create policy "event_admin_all" on public.events for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Registrations: participants can insert/select their own; organizers can view registrations for their events; admins all
create policy "registration_insert_self" on public.registrations for insert with check (auth.uid() = participant_id);
create policy "registration_select_self" on public.registrations for select using (auth.uid() = participant_id);
create policy "registration_organizer_view" on public.registrations for select using (
  exists (select 1 from public.events where id = event_id and organizer_id = auth.uid())
);
create policy "registration_admin_all" on public.registrations for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Teams: participants can create/join teams for events they are registered in; organizers see all; admins all
create policy "team_insert_self" on public.teams for insert with check (auth.uid() = leader_id);
create policy "team_select_owner" on public.teams for select using (auth.uid() = leader_id);
create policy "team_organizer_view" on public.teams for select using (
  exists (select 1 from public.events where id = event_id and organizer_id = auth.uid())
);
create policy "team_admin_all" on public.teams for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Team members: participants can view their membership; organizers can view all members of their event; admins all
create policy "team_member_select_self" on public.team_members for select using (auth.uid() = participant_id);
create policy "team_member_organizer_view" on public.team_members for select using (
  exists (select 1 from public.teams t join public.events e on t.event_id = e.id where t.id = team_id and e.organizer_id = auth.uid())
);
create policy "team_member_admin_all" on public.team_members for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Attendance: participants can view their own attendance; organizers can view for their events; admins all
create policy "attendance_select_self" on public.attendance for select using (
  exists (select 1 from public.registrations r where r.id = registration_id and r.participant_id = auth.uid())
);
create policy "attendance_organizer_view" on public.attendance for select using (
  exists (select 1 from public.registrations r join public.events e on r.event_id = e.id where r.id = registration_id and e.organizer_id = auth.uid())
);
create policy "attendance_admin_all" on public.attendance for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Rounds, Results, Certificates: similar patterns (organizer & participant access). For brevity, generic admin policy added.
create policy "round_admin_all" on public.rounds for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "result_admin_all" on public.results for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "certificate_admin_all" on public.certificates for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- End of schema.sql
