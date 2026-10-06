-- Snapwall database schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to re-run: every object is created with "if not exists" / "or replace".

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per event planner account. The plan is changed by you (or later by a
-- payment webhook) with the service key, never by the app itself.
create table if not exists public.planners (
  user_id    uuid primary key references auth.users on delete cascade,
  plan       text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  created_at timestamptz not null default now()
);

-- Readable 6-character join codes (no 0/O/1/I to avoid typos).
create or replace function public.generate_join_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.events where join_code = code);
  end loop;
  return code;
end;
$$;

create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  client_name     text check (char_length(client_name) <= 80),
  starts_at       timestamptz not null,
  reveal_at       timestamptz not null,
  shots_per_guest int not null default 15 check (shots_per_guest between 1 and 100),
  max_guests      int not null default 25,
  join_code       text not null unique default public.generate_join_code(),
  created_at      timestamptz not null default now()
);

create table if not exists public.guests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  joined_at    timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events on delete cascade,
  guest_id     uuid not null references public.guests on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  storage_path text not null unique,
  uploaded     boolean not null default false,
  hidden       boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists photos_event_idx on public.photos (event_id, created_at);
create index if not exists photos_guest_idx on public.photos (guest_id);
create index if not exists events_owner_idx on public.events (owner_id, starts_at desc);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies can call them without recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_event_owner(p_event_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.events where id = p_event_id and owner_id = auth.uid());
$$;

create or replace function public.is_event_guest(p_event_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.guests where event_id = p_event_id and user_id = auth.uid());
$$;

create or replace function public.is_anonymous()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- Plan limits live on the server so nobody can raise their own guest limit.
create or replace function public.apply_plan_limits()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_plan text;
begin
  select plan into v_plan from public.planners where user_id = new.owner_id;
  new.max_guests := case coalesce(v_plan, 'free')
    when 'studio' then 1000
    when 'pro'    then 250
    else 25
  end;
  return new;
end;
$$;

drop trigger if exists events_plan_limits on public.events;
create trigger events_plan_limits
  before insert or update on public.events
  for each row execute function public.apply_plan_limits();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.planners enable row level security;
alter table public.events   enable row level security;
alter table public.guests   enable row level security;
alter table public.photos   enable row level security;

drop policy if exists "planners read own" on public.planners;
create policy "planners read own" on public.planners
  for select using (user_id = auth.uid());

drop policy if exists "events read" on public.events;
create policy "events read" on public.events
  for select using (owner_id = auth.uid() or public.is_event_guest(id));

drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events
  for insert with check (owner_id = auth.uid() and not public.is_anonymous());

drop policy if exists "events update" on public.events;
create policy "events update" on public.events
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "events delete" on public.events;
create policy "events delete" on public.events
  for delete using (owner_id = auth.uid());

-- Guests can see who else is at their event (names show on the wall).
drop policy if exists "guests read" on public.guests;
create policy "guests read" on public.guests
  for select using (
    user_id = auth.uid() or public.is_event_owner(event_id) or public.is_event_guest(event_id)
  );

drop policy if exists "guests remove" on public.guests;
create policy "guests remove" on public.guests
  for delete using (public.is_event_owner(event_id));

-- Planners always see every photo (so they can moderate).
-- Guests see photos only after the reveal time, and never hidden ones.
drop policy if exists "photos read" on public.photos;
create policy "photos read" on public.photos
  for select using (
    public.is_event_owner(event_id)
    or (
      uploaded and not hidden and public.is_event_guest(event_id)
      and now() >= (select e.reveal_at from public.events e where e.id = event_id)
    )
  );

drop policy if exists "photos moderate" on public.photos;
create policy "photos moderate" on public.photos
  for update using (public.is_event_owner(event_id)) with check (public.is_event_owner(event_id));

drop policy if exists "photos delete" on public.photos;
create policy "photos delete" on public.photos
  for delete using (public.is_event_owner(event_id));

-- ---------------------------------------------------------------------------
-- RPCs used by the app
-- ---------------------------------------------------------------------------

-- First sign-in of a planner: make sure they have a planners row.
create or replace function public.ensure_planner()
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_plan text;
begin
  if auth.uid() is null or public.is_anonymous() then
    raise exception 'NOT_A_PLANNER';
  end if;
  insert into public.planners (user_id) values (auth.uid()) on conflict do nothing;
  select plan into v_plan from public.planners where user_id = auth.uid();
  return v_plan;
end;
$$;

-- Guest joins an event with its code. Returns the event id.
create or replace function public.join_event(p_code text, p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;

  select * into v_event from public.events where join_code = upper(trim(p_code));
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if exists (select 1 from public.guests where event_id = v_event.id and user_id = auth.uid()) then
    update public.guests set display_name = trim(p_name)
      where event_id = v_event.id and user_id = auth.uid();
    return v_event.id;
  end if;

  select count(*) into v_count from public.guests where event_id = v_event.id;
  if v_count >= v_event.max_guests then
    raise exception 'EVENT_FULL';
  end if;

  insert into public.guests (event_id, user_id, display_name)
    values (v_event.id, auth.uid(), trim(p_name));
  return v_event.id;
end;
$$;

-- How many shots the current guest has used.
create or replace function public.shots_used(p_event_id uuid)
returns int
language sql stable security definer
set search_path = ''
as $$
  select count(*)::int from public.photos p
  join public.guests g on g.id = p.guest_id
  where g.event_id = p_event_id and g.user_id = auth.uid();
$$;

-- Reserve one shot before uploading. Enforces the shot limit and reveal time.
create or replace function public.reserve_shot(p_event_id uuid)
returns table (photo_id uuid, storage_path text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_guest public.guests;
  v_event public.events;
  v_used  int;
  v_id    uuid := gen_random_uuid();
  v_path  text;
begin
  -- Lock the guest row so two fast taps can't both slip past the limit.
  select * into v_guest from public.guests
    where event_id = p_event_id and user_id = auth.uid()
    for update;
  if not found then
    raise exception 'NOT_A_GUEST';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if now() >= v_event.reveal_at then
    raise exception 'EVENT_CLOSED';
  end if;

  select count(*) into v_used from public.photos where guest_id = v_guest.id;
  if v_used >= v_event.shots_per_guest then
    raise exception 'NO_SHOTS_LEFT';
  end if;

  v_path := p_event_id::text || '/' || auth.uid()::text || '/' || v_id::text || '.jpg';
  insert into public.photos (id, event_id, guest_id, user_id, storage_path)
    values (v_id, p_event_id, v_guest.id, auth.uid(), v_path);

  return query select v_id, v_path;
end;
$$;

create or replace function public.confirm_shot(p_photo_id uuid)
returns void
language sql security definer
set search_path = ''
as $$
  update public.photos set uploaded = true where id = p_photo_id and user_id = auth.uid();
$$;

-- Give the shot back if the upload failed.
create or replace function public.release_shot(p_photo_id uuid)
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.photos where id = p_photo_id and user_id = auth.uid() and not uploaded;
$$;

-- ---------------------------------------------------------------------------
-- Storage: private "photos" bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create or replace function public.can_upload_photo(p_path text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.photos
    where storage_path = p_path and user_id = auth.uid() and not uploaded
  );
$$;

create or replace function public.can_view_photo(p_path text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.photos p
    join public.events e on e.id = p.event_id
    where p.storage_path = p_path
      and (
        e.owner_id = auth.uid()
        or (
          p.uploaded and not p.hidden and now() >= e.reveal_at
          and exists (select 1 from public.guests g where g.event_id = e.id and g.user_id = auth.uid())
        )
      )
  );
$$;

drop policy if exists "snapwall upload" on storage.objects;
create policy "snapwall upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and public.can_upload_photo(name));

drop policy if exists "snapwall view" on storage.objects;
create policy "snapwall view" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and public.can_view_photo(name));

drop policy if exists "snapwall delete" on storage.objects;
create policy "snapwall delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.is_event_owner(((storage.foldername(name))[1])::uuid));

grant execute on function
  public.ensure_planner(), public.join_event(text, text), public.shots_used(uuid),
  public.reserve_shot(uuid), public.confirm_shot(uuid), public.release_shot(uuid)
to authenticated;
