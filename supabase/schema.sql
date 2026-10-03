-- FlashBack database schema for Supabase.
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Design: the browser never writes to tables directly. Every write goes through
-- a SECURITY DEFINER function that checks the rules (shot limit, host key,
-- reveal time) on the server, so guests can't cheat by editing the app.

create extension if not exists pgcrypto;

-- ───────────── Tables ─────────────

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null check (char_length(title) between 1 and 120),
  event_date date not null,
  shots_per_guest int not null check (shots_per_guest between 1 and 100),
  reveal_at timestamptz not null,
  film text not null default 'classic' check (film in ('classic', 'bw', 'golden')),
  date_stamp boolean not null default true,
  created_at timestamptz not null default now()
);

-- Kept in its own table with no policies, so it can never be read from the browser.
create table if not exists public.event_secrets (
  event_id uuid primary key references public.events on delete cascade,
  host_key text not null
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  device_id text not null,
  shots_used int not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, device_id)
);

create table if not exists public.photos (
  id uuid primary key,
  event_id uuid not null references public.events on delete cascade,
  guest_id uuid not null references public.guests on delete cascade,
  storage_path text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists photos_event_idx on public.photos (event_id, created_at);

alter table public.events enable row level security;
alter table public.event_secrets enable row level security;
alter table public.guests enable row level security;
alter table public.photos enable row level security;

-- Event details (title, date, reveal time) are public to anyone with the code.
drop policy if exists "events readable" on public.events;
create policy "events readable" on public.events for select using (true);
-- No other policies: guests/photos/secrets are only reachable through the functions below.

-- ───────────── Storage ─────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "guests upload photos" on storage.objects;
create policy "guests upload photos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'photos');

-- ───────────── Helpers ─────────────

create or replace function public._event_json(e public.events) returns json
language sql immutable as $$
  select json_build_object(
    'id', e.id, 'code', e.code, 'title', e.title, 'eventDate', e.event_date,
    'shotsPerGuest', e.shots_per_guest, 'revealAt', e.reveal_at, 'film', e.film,
    'dateStamp', e.date_stamp, 'createdAt', e.created_at
  )
$$;

create or replace function public._guest_json(g public.guests) returns json
language sql immutable as $$
  select json_build_object('id', g.id, 'eventId', g.event_id, 'name', g.name, 'shotsUsed', g.shots_used)
$$;

create or replace function public._require_host(p_code text, p_key text) returns public.events
language plpgsql security definer set search_path = public as $$
declare
  e public.events;
begin
  select ev.* into e
  from public.events ev join public.event_secrets s on s.event_id = ev.id
  where ev.code = upper(p_code) and s.host_key = p_key;
  if not found then
    raise exception 'NOT_AUTHORIZED';
  end if;
  return e;
end $$;

-- ───────────── Host functions ─────────────

create or replace function public.create_event(
  p_title text, p_event_date date, p_shots int, p_reveal_at timestamptz, p_film text, p_date_stamp boolean
) returns json
language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code text;
  new_key text := encode(gen_random_bytes(18), 'base64');
  e public.events;
begin
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.events where code = new_code);
  end loop;
  new_key := translate(new_key, '+/=', '-_');

  insert into public.events (code, title, event_date, shots_per_guest, reveal_at, film, date_stamp)
  values (new_code, p_title, p_event_date, p_shots, p_reveal_at, p_film, p_date_stamp)
  returning * into e;
  insert into public.event_secrets (event_id, host_key) values (e.id, new_key);

  return json_build_object('event', public._event_json(e), 'hostKey', new_key);
end $$;

create or replace function public.host_update_event(
  p_code text, p_key text,
  p_title text default null, p_shots int default null, p_reveal_at timestamptz default null,
  p_film text default null, p_date_stamp boolean default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  e public.events := public._require_host(p_code, p_key);
begin
  update public.events set
    title = coalesce(p_title, title),
    shots_per_guest = coalesce(p_shots, shots_per_guest),
    reveal_at = coalesce(p_reveal_at, reveal_at),
    film = coalesce(p_film, film),
    date_stamp = coalesce(p_date_stamp, date_stamp)
  where id = e.id
  returning * into e;
  return public._event_json(e);
end $$;

create or replace function public.host_list_photos(p_code text, p_key text)
returns table (id uuid, guest_id uuid, guest_name text, storage_path text, created_at timestamptz, hidden boolean)
language plpgsql security definer set search_path = public as $$
declare
  e public.events := public._require_host(p_code, p_key);
begin
  return query
    select p.id, p.guest_id, g.name, p.storage_path, p.created_at, p.hidden
    from public.photos p join public.guests g on g.id = p.guest_id
    where p.event_id = e.id
    order by p.created_at;
end $$;

create or replace function public.host_set_hidden(p_code text, p_key text, p_photo_id uuid, p_hidden boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  e public.events := public._require_host(p_code, p_key);
begin
  update public.photos set hidden = p_hidden where id = p_photo_id and event_id = e.id;
end $$;

create or replace function public.host_delete_photo(p_code text, p_key text, p_photo_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  e public.events := public._require_host(p_code, p_key);
begin
  delete from public.photos where id = p_photo_id and event_id = e.id;
end $$;

create or replace function public.host_stats(p_code text, p_key text) returns json
language plpgsql security definer set search_path = public as $$
declare
  e public.events := public._require_host(p_code, p_key);
begin
  return json_build_object(
    'guests', (select count(*) from public.guests where event_id = e.id),
    'photos', (select count(*) from public.photos where event_id = e.id)
  );
end $$;

-- ───────────── Guest functions ─────────────

create or replace function public.join_event(p_code text, p_name text, p_device text) returns json
language plpgsql security definer set search_path = public as $$
declare
  e public.events;
  g public.guests;
begin
  select * into e from public.events where code = upper(p_code);
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;

  insert into public.guests (event_id, name, device_id)
  values (e.id, trim(p_name), p_device)
  on conflict (event_id, device_id) do update set name = excluded.name
  returning * into g;
  return public._guest_json(g);
end $$;

create or replace function public.get_guest(p_code text, p_device text) returns json
language sql security definer set search_path = public as $$
  select public._guest_json(g)
  from public.guests g join public.events e on e.id = g.event_id
  where e.code = upper(p_code) and g.device_id = p_device
$$;

-- Atomic shot check: locks the guest row so two fast taps can't both slip under the limit.
-- Idempotent on p_photo_id so a retried upload never costs a second shot.
create or replace function public.add_photo(p_code text, p_device text, p_photo_id uuid, p_path text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  e public.events;
  g public.guests;
begin
  select * into e from public.events where code = upper(p_code);
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;

  select * into g from public.guests where event_id = e.id and device_id = p_device for update;
  if not found then raise exception 'GUEST_NOT_FOUND'; end if;

  if exists (select 1 from public.photos where id = p_photo_id) then
    return;
  end if;
  if g.shots_used >= e.shots_per_guest then
    raise exception 'OUT_OF_FILM';
  end if;
  if p_path not like e.id::text || '/%' then
    raise exception 'BAD_PATH';
  end if;

  insert into public.photos (id, event_id, guest_id, storage_path)
  values (p_photo_id, e.id, g.id, p_path);
  update public.guests set shots_used = shots_used + 1 where id = g.id;
end $$;

-- Shared album: nothing comes back until the reveal time has passed.
create or replace function public.list_photos(p_code text)
returns table (id uuid, guest_id uuid, guest_name text, storage_path text, created_at timestamptz, hidden boolean)
language sql security definer set search_path = public as $$
  select p.id, p.guest_id, g.name, p.storage_path, p.created_at, p.hidden
  from public.photos p
  join public.guests g on g.id = p.guest_id
  join public.events e on e.id = p.event_id
  where e.code = upper(p_code) and e.reveal_at <= now() and not p.hidden
  order by p.created_at
$$;

-- ───────────── Permissions ─────────────

revoke all on function public._require_host(text, text) from public, anon, authenticated;
grant execute on function
  public.create_event(text, date, int, timestamptz, text, boolean),
  public.host_update_event(text, text, text, int, timestamptz, text, boolean),
  public.host_list_photos(text, text),
  public.host_set_hidden(text, text, uuid, boolean),
  public.host_delete_photo(text, text, uuid),
  public.host_stats(text, text),
  public.join_event(text, text, text),
  public.get_guest(text, text),
  public.add_photo(text, text, uuid, text),
  public.list_photos(text)
to anon, authenticated;
