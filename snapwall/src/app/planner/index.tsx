import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ErrorText, Loading } from '../../components/ui';
import { errorMessage, EventWithCounts, listMyEvents } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { eventStatus, statusStyle } from '../../lib/status';
import { supabase } from '../../lib/supabase';
import { colors, radius, space, type } from '../../lib/theme';

export default function PlannerHome() {
  const { loading: authLoading, isPlanner } = useAuth();
  const [events, setEvents] = useState<EventWithCounts[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setEvents(await listMyEvents());
    } catch (err) {
      setError(errorMessage(err));
      setEvents((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isPlanner) load();
    }, [isPlanner, load]),
  );

  if (authLoading) return <Loading />;
  if (!isPlanner) return <Redirect href="/" />;

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={signOut} hitSlop={12}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
          ),
        }}
      />
      {events === null ? (
        <Loading />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
          ListHeaderComponent={<ErrorText message={error} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={48} color={colors.muted} />
              <Text style={type.title}>No events yet</Text>
              <Text style={[type.body, styles.center]}>
                Create your first event, share the QR code with guests, and watch the wall fill up.
              </Text>
            </View>
          }
          renderItem={({ item }) => <EventCard event={item} />}
        />
      )}
      <View style={styles.footer}>
        <Button
          title="New event"
          icon={<Ionicons name="add" size={22} color={colors.paper} />}
          onPress={() => router.push('/planner/new')}
        />
      </View>
    </SafeAreaView>
  );
}

function EventCard({ event }: { event: EventWithCounts }) {
  const status = statusStyle[eventStatus(event)];
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => router.push(`/planner/${event.id}`)}
    >
      <View style={styles.cardTop}>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
        </View>
        <Text style={styles.code}>{event.join_code}</Text>
      </View>
      <Text style={type.title} numberOfLines={1}>
        {event.name}
      </Text>
      {event.client_name ? <Text style={styles.client}>for {event.client_name}</Text> : null}
      <Text style={styles.meta}>{formatDateTime(event.starts_at)}</Text>
      <View style={styles.stats}>
        <Stat icon="people-outline" value={`${event.guest_count}/${event.max_guests}`} label="guests" />
        <Stat icon="camera-outline" value={String(event.photo_count)} label="shots" />
      </View>
    </Pressable>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.inkSoft} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  list: { padding: space.lg, gap: space.md, paddingBottom: 120 },
  signOut: { color: colors.accent, fontWeight: '700' },
  empty: { alignItems: 'center', gap: space.sm, paddingTop: 80, paddingHorizontal: space.lg },
  center: { textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.md + 4, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  code: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 2 },
  client: { fontSize: 15, color: colors.inkSoft },
  meta: { fontSize: 14, color: colors.muted },
  stats: { flexDirection: 'row', gap: space.lg, marginTop: space.sm },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontWeight: '700', color: colors.ink },
  statLabel: { color: colors.muted },
  footer: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.xl },
});
