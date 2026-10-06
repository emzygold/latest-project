import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { supabase } from './supabase';

export type SnapEvent = {
  id: string;
  owner_id: string;
  name: string;
  client_name: string | null;
  starts_at: string;
  reveal_at: string;
  shots_per_guest: number;
  max_guests: number;
  join_code: string;
  created_at: string;
};

export type EventWithCounts = SnapEvent & { guest_count: number; photo_count: number };

export type Photo = {
  id: string;
  created_at: string;
  hidden: boolean;
  storage_path: string;
  guest_name: string;
  url: string;
};

const BUCKET = 'photos';
const SIGNED_URL_SECONDS = 60 * 60;

const friendly: Record<string, string> = {
  EVENT_NOT_FOUND: "We couldn't find an event with that code. Check it and try again.",
  EVENT_FULL: 'This event has reached its guest limit. Ask the planner to upgrade.',
  EVENT_CLOSED: 'The camera is closed. The photos have been revealed!',
  NO_SHOTS_LEFT: "You've used all your shots for this event.",
  NOT_A_GUEST: 'Join the event first.',
  NOT_A_PLANNER: 'Sign in with your planner account first.',
};

export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err);
  const code = Object.keys(friendly).find((key) => raw.includes(key));
  return code ? friendly[code] : raw;
}

function check<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}

export const joinLink = (code: string) => `snapwall://join/${code}`;

export function isRevealed(event: Pick<SnapEvent, 'reveal_at'>) {
  return Date.now() >= new Date(event.reveal_at).getTime();
}

// ---------- Planner ----------

export async function ensurePlanner(): Promise<string> {
  return check(await supabase.rpc('ensure_planner')) as string;
}

export async function listMyEvents(): Promise<EventWithCounts[]> {
  const { data: auth } = await supabase.auth.getUser();
  const rows = check(
    await supabase
      .from('events')
      .select('*, guests(count), photos(count)')
      .eq('owner_id', auth.user?.id ?? '')
      .order('starts_at', { ascending: false }),
  ) as (SnapEvent & { guests: { count: number }[]; photos: { count: number }[] })[];

  return rows.map(({ guests, photos, ...event }) => ({
    ...event,
    guest_count: guests[0]?.count ?? 0,
    photo_count: photos[0]?.count ?? 0,
  }));
}

export async function createEvent(input: {
  name: string;
  client_name: string | null;
  starts_at: Date;
  reveal_at: Date;
  shots_per_guest: number;
}): Promise<SnapEvent> {
  const { data: auth } = await supabase.auth.getUser();
  return check(
    await supabase
      .from('events')
      .insert({
        ...input,
        owner_id: auth.user?.id,
        starts_at: input.starts_at.toISOString(),
        reveal_at: input.reveal_at.toISOString(),
      })
      .select()
      .single(),
  ) as SnapEvent;
}

export async function revealNow(eventId: string): Promise<void> {
  check(await supabase.from('events').update({ reveal_at: new Date().toISOString() }).eq('id', eventId));
}

export async function deleteEvent(eventId: string): Promise<void> {
  const paths = check(await supabase.from('photos').select('storage_path').eq('event_id', eventId)) as { storage_path: string }[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths.map((p) => p.storage_path));
  check(await supabase.from('events').delete().eq('id', eventId));
}

export async function setPhotoHidden(photoId: string, hidden: boolean): Promise<void> {
  check(await supabase.from('photos').update({ hidden }).eq('id', photoId));
}

export async function deletePhoto(photo: Pick<Photo, 'id' | 'storage_path'>): Promise<void> {
  await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  check(await supabase.from('photos').delete().eq('id', photo.id));
}

// ---------- Shared ----------

export async function getEvent(eventId: string): Promise<SnapEvent> {
  return check(await supabase.from('events').select('*').eq('id', eventId).single()) as SnapEvent;
}

export async function guestCount(eventId: string): Promise<number> {
  const { count, error } = await supabase.from('guests').select('id', { count: 'exact', head: true }).eq('event_id', eventId);
  if (error) throw error;
  return count ?? 0;
}

// Planners see every photo; guests only see revealed, visible ones (enforced by the database).
export async function listPhotos(eventId: string): Promise<Photo[]> {
  const rows = check(
    await supabase
      .from('photos')
      .select('id, created_at, hidden, storage_path, guests(display_name)')
      .eq('event_id', eventId)
      .eq('uploaded', true)
      .order('created_at', { ascending: true }),
  ) as unknown as { id: string; created_at: string; hidden: boolean; storage_path: string; guests: { display_name: string } | null }[];

  if (!rows.length) return [];

  const signed = check(
    await supabase.storage.from(BUCKET).createSignedUrls(
      rows.map((r) => r.storage_path),
      SIGNED_URL_SECONDS,
    ),
  );
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return rows
    .filter((r) => urlByPath.get(r.storage_path))
    .map((r) => ({
      id: r.id,
      created_at: r.created_at,
      hidden: r.hidden,
      storage_path: r.storage_path,
      guest_name: r.guests?.display_name ?? 'Guest',
      url: urlByPath.get(r.storage_path)!,
    }));
}

export async function savePhotoToDevice(photo: Pick<Photo, 'id' | 'url'>): Promise<void> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) throw new Error('Allow photo access to save pictures.');
  const folder = new Directory(Paths.cache, 'snapwall');
  folder.create({ idempotent: true });
  const file = await File.downloadFileAsync(photo.url, new File(folder, `${photo.id}.jpg`), { idempotent: true });
  await MediaLibrary.Asset.create(file.uri);
}

// ---------- Guest ----------

export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  check(await supabase.auth.signInAnonymously());
}

export async function joinEvent(code: string, name: string): Promise<string> {
  await ensureSession();
  return check(await supabase.rpc('join_event', { p_code: code, p_name: name })) as string;
}

export async function shotsUsed(eventId: string): Promise<number> {
  return check(await supabase.rpc('shots_used', { p_event_id: eventId })) as number;
}

// Reserve a shot (server checks the limit), upload the picture, then confirm it.
export async function takeShot(eventId: string, localUri: string): Promise<void> {
  const reserved = check(await supabase.rpc('reserve_shot', { p_event_id: eventId })) as { photo_id: string; storage_path: string }[];
  const { photo_id, storage_path } = reserved[0];

  try {
    const bytes = await new File(localUri).arrayBuffer();
    check(await supabase.storage.from(BUCKET).upload(storage_path, bytes, { contentType: 'image/jpeg' }));
    check(await supabase.rpc('confirm_shot', { p_photo_id: photo_id }));
  } catch (err) {
    await supabase.rpc('release_shot', { p_photo_id: photo_id });
    throw err;
  }
}
