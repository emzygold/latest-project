import AsyncStorage from '@react-native-async-storage/async-storage';

// Events this device joined as a guest, so people can come back for the reveal.
export type RecentEvent = { id: string; name: string; reveal_at: string };

const KEY = 'snapwall.recentEvents';

export async function getRecentEvents(): Promise<RecentEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentEvent[]) : [];
  } catch {
    return [];
  }
}

export async function rememberEvent(event: RecentEvent): Promise<void> {
  const list = (await getRecentEvents()).filter((e) => e.id !== event.id);
  await AsyncStorage.setItem(KEY, JSON.stringify([event, ...list].slice(0, 10)));
}
