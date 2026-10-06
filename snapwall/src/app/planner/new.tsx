import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DateField } from '../../components/DateField';
import { Button, ErrorText, Field, Screen } from '../../components/ui';
import { createEvent, errorMessage } from '../../lib/api';
import { colors, radius, space, type } from '../../lib/theme';

const SHOT_OPTIONS = [10, 15, 24, 36];
const HOUR = 60 * 60 * 1000;

function nextHour() {
  const d = new Date(Date.now() + HOUR);
  d.setMinutes(0, 0, 0);
  return d;
}

export default function NewEvent() {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [startsAt, setStartsAt] = useState(nextHour);
  const [revealAt, setRevealAt] = useState(() => new Date(nextHour().getTime() + 12 * HOUR));
  const [shots, setShots] = useState(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revealTooEarly = revealAt.getTime() <= startsAt.getTime();

  const changeStart = (date: Date) => {
    // Keep the reveal after the start so planners don't have to fix it by hand.
    if (revealAt.getTime() <= date.getTime()) setRevealAt(new Date(date.getTime() + 12 * HOUR));
    setStartsAt(date);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const event = await createEvent({
        name: name.trim(),
        client_name: client.trim() || null,
        starts_at: startsAt,
        reveal_at: revealAt,
        shots_per_guest: shots,
      });
      router.replace(`/planner/${event.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Field label="Event name" value={name} onChangeText={setName} placeholder="Tolu & Kemi's Wedding" maxLength={80} />
      <Field label="Client (optional)" value={client} onChangeText={setClient} placeholder="Who is this event for?" maxLength={80} />
      <DateField label="Starts" value={startsAt} onChange={changeStart} />
      <DateField label="Photos revealed" value={revealAt} onChange={setRevealAt} minimumDate={startsAt} />
      <Text style={styles.hint}>
        Guests can shoot until the reveal. After that the camera closes and everyone sees the wall.
      </Text>

      <View style={styles.group}>
        <Text style={type.label}>SHOTS PER GUEST</Text>
        <View style={styles.chips}>
          {SHOT_OPTIONS.map((n) => (
            <Pressable key={n} onPress={() => setShots(n)} style={[styles.chip, shots === n && styles.chipOn]}>
              <Text style={[styles.chipText, shots === n && styles.chipTextOn]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ErrorText message={revealTooEarly ? 'The reveal must be after the event starts.' : error} />
      <Button title="Create event" loading={busy} disabled={!name.trim() || revealTooEarly} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.muted, marginTop: -space.sm },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', gap: space.sm },
  chip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 17, fontWeight: '700', color: colors.ink },
  chipTextOn: { color: colors.paper },
});
