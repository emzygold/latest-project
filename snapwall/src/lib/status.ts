import type { SnapEvent } from './api';
import { colors } from './theme';

export type EventStatus = 'upcoming' | 'live' | 'revealed';

export function eventStatus(event: Pick<SnapEvent, 'starts_at' | 'reveal_at'>, now = Date.now()): EventStatus {
  if (now >= new Date(event.reveal_at).getTime()) return 'revealed';
  if (now >= new Date(event.starts_at).getTime()) return 'live';
  return 'upcoming';
}

export const statusStyle: Record<EventStatus, { label: string; bg: string; fg: string }> = {
  upcoming: { label: 'Upcoming', bg: '#ECEAF3', fg: colors.inkSoft },
  live: { label: 'Live now', bg: colors.accentSoft, fg: colors.accent },
  revealed: { label: 'Revealed', bg: '#D9F4F1', fg: '#0B7F74' },
};
