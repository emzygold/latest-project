import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer } from '../../components/PhotoViewer';
import { Button, Card, ErrorText, Loading } from '../../components/ui';
import {
  deleteEvent,
  deletePhoto,
  errorMessage,
  guestCount,
  getEvent,
  joinEvent,
  joinLink,
  listPhotos,
  Photo,
  revealNow,
  setPhotoHidden,
  SnapEvent,
} from '../../lib/api';
import { formatDateTime, timeUntil } from '../../lib/format';
import { eventStatus, statusStyle } from '../../lib/status';
import { colors, radius, space, type } from '../../lib/theme';

export default function PlannerEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<SnapEvent | null>(null);
  const [guests, setGuests] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [e, g, p] = await Promise.all([getEvent(id), guestCount(id), listPhotos(id)]);
      setEvent(e);
      setGuests(g);
      setPhotos(p);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!event) return error ? <ErrorText message={error} /> : <Loading />;

  const status = eventStatus(event);
  const pill = statusStyle[status];

  const share = () =>
    Share.share({
      message: `📸 You're invited to shoot "${event.name}" on Snapwall!\n\nOpen the Snapwall app and enter code: ${event.join_code}\n\n${joinLink(event.join_code)}`,
    });

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      Alert.alert('Something went wrong', errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const shootAsHost = () =>
    act('shoot', async () => {
      await joinEvent(event.join_code, 'Host');
      router.push(`/event/${event.id}/camera`);
    });

  const confirmReveal = () =>
    Alert.alert('Reveal the wall now?', 'Guests will see every photo and the camera will close.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reveal', onPress: () => act('reveal', async () => { await revealNow(event.id); await load(); }) },
    ]);

  const confirmDelete = () =>
    Alert.alert('Delete this event?', 'All photos will be permanently deleted for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => act('delete', async () => { await deleteEvent(event.id); router.back(); }),
      },
    ]);

  const updatePhoto = (next: Photo) => {
    setPhotos((list) => list.map((p) => (p.id === next.id ? next : p)));
    setSelected(next);
  };

  const header = (
    <View style={styles.header}>
      <View style={[styles.pill, { backgroundColor: pill.bg }]}>
        <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
      </View>
      <Text style={type.display}>{event.name}</Text>
      {event.client_name ? <Text style={type.body}>for {event.client_name}</Text> : null}

      <Card style={styles.qrCard}>
        <QRCode value={joinLink(event.join_code)} size={180} color={colors.ink} backgroundColor={colors.card} />
        <Text style={styles.code}>{event.join_code}</Text>
        <Text style={styles.qrHint}>Guests scan this or type the code in the Snapwall app</Text>
        <Button title="Share invite" variant="secondary" icon={<Ionicons name="share-outline" size={18} color={colors.ink} />} onPress={share} />
      </Card>

      <View style={styles.statsRow}>
        <Stat value={`${guests}/${event.max_guests}`} label="Guests" />
        <Stat value={String(photos.length)} label="Shots" />
        <Stat value={String(event.shots_per_guest)} label="Per guest" />
      </View>

      <Card>
        <Row label="Starts" value={formatDateTime(event.starts_at)} />
        <Row
          label="Reveal"
          value={status === 'revealed' ? `Revealed ${formatDateTime(event.reveal_at)}` : `${formatDateTime(event.reveal_at)} · in ${timeUntil(event.reveal_at)}`}
        />
      </Card>

      {status !== 'revealed' && (
        <>
          <Button title="Shoot as host" loading={busy === 'shoot'} icon={<Ionicons name="camera" size={20} color={colors.paper} />} onPress={shootAsHost} />
          <Button title="Reveal now" variant="secondary" loading={busy === 'reveal'} onPress={confirmReveal} />
        </>
      )}

      <ErrorText message={error} />
      <Text style={[type.title, styles.wallTitle]}>The wall</Text>
      <Text style={styles.wallHint}>
        {status === 'revealed' ? 'Guests can see these now.' : 'Only you can see these until the reveal. Tap a photo to hide or delete it.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: '' }} />
      <PhotoGrid
        photos={photos}
        onPress={setSelected}
        header={header}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }}
        empty={<Text style={styles.empty}>No shots yet. They'll appear here as guests snap.</Text>}
      />
      <View style={styles.footer}>
        <Button title="Delete event" variant="danger" loading={busy === 'delete'} onPress={confirmDelete} />
      </View>
      <PhotoViewer
        photo={selected}
        onClose={() => setSelected(null)}
        onToggleHidden={async (p) => {
          await setPhotoHidden(p.id, !p.hidden);
          updatePhoto({ ...p, hidden: !p.hidden });
        }}
        onDelete={async (p) => {
          await deletePhoto(p);
          setPhotos((list) => list.filter((x) => x.id !== p.id));
          setSelected(null);
        }}
      />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { gap: space.md, paddingBottom: space.sm, paddingHorizontal: space.xs },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  qrCard: { alignItems: 'center', padding: space.lg, gap: space.md },
  code: { fontSize: 32, fontWeight: '900', letterSpacing: 6, color: colors.ink },
  qrHint: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.md, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  rowLabel: { color: colors.muted, fontWeight: '600' },
  rowValue: { color: colors.ink, flexShrink: 1, textAlign: 'right' },
  wallTitle: { marginTop: space.sm },
  wallHint: { color: colors.muted, marginTop: -space.sm },
  empty: { color: colors.muted, textAlign: 'center', padding: space.xl },
  footer: { padding: space.md, paddingTop: 0 },
});
