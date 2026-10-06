import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoGrid } from '../../../components/PhotoGrid';
import { PhotoViewer } from '../../../components/PhotoViewer';
import { ErrorText, Loading } from '../../../components/ui';
import { errorMessage, getEvent, isRevealed, listPhotos, Photo, SnapEvent } from '../../../lib/api';
import { formatDateTime, timeUntil } from '../../../lib/format';
import { colors, space, type } from '../../../lib/theme';

export default function Wall() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<SnapEvent | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const e = await getEvent(id);
      setEvent(e);
      setPhotos(isRevealed(e) ? await listPhotos(id) : []);
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

  if (!isRevealed(event)) {
    return (
      <SafeAreaView style={[styles.safe, styles.locked]}>
        <Stack.Screen options={{ title: event.name }} />
        <Ionicons name="lock-closed-outline" size={44} color={colors.accent} />
        <Text style={type.title}>Still developing…</Text>
        <Text style={[type.body, styles.centerText]}>
          The wall opens {formatDateTime(event.reveal_at)} (in {timeUntil(event.reveal_at)}).
        </Text>
      </SafeAreaView>
    );
  }

  const guestsWhoShot = new Set(photos.map((p) => p.guest_name)).size;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: event.name }} />
      <PhotoGrid
        photos={photos}
        onPress={setSelected}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }}
        header={
          <View style={styles.header}>
            <Text style={type.display}>The wall</Text>
            <Text style={type.body}>
              {photos.length} shots from {guestsWhoShot} {guestsWhoShot === 1 ? 'guest' : 'guests'}
            </Text>
            <ErrorText message={error} />
          </View>
        }
        empty={<Text style={styles.empty}>No photos made it onto this wall.</Text>}
      />
      <PhotoViewer photo={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  locked: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  centerText: { textAlign: 'center' },
  header: { gap: space.xs, paddingBottom: space.md, paddingHorizontal: space.xs },
  empty: { color: colors.muted, textAlign: 'center', padding: space.xl },
});
