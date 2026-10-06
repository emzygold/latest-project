import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Loading, Wordmark } from '../components/ui';
import { isRevealed } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getRecentEvents, RecentEvent } from '../lib/recent';
import { colors, radius, space, type } from '../lib/theme';

export default function Welcome() {
  const { loading, isPlanner } = useAuth();
  const [recent, setRecent] = useState<RecentEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecentEvents().then(setRecent);
    }, []),
  );

  if (loading) return <Loading />;
  if (isPlanner) return <Redirect href="/planner" />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Wordmark size={44} light />
        <Text style={styles.tagline}>Every guest is a camera.{'\n'}Every event gets a wall.</Text>
        <Text style={styles.sub}>
          Guests snap a limited roll of photos. Nobody sees them until the reveal, when the whole night lands on one wall.
        </Text>
      </View>

      <View style={styles.sheet}>
        {recent.length > 0 && (
          <View style={styles.recent}>
            <Text style={type.label}>YOUR EVENTS</Text>
            {recent.slice(0, 3).map((e) => (
              <Pressable
                key={e.id}
                style={styles.recentRow}
                onPress={() => router.push(isRevealed(e) ? `/event/${e.id}/wall` : `/event/${e.id}/camera`)}
              >
                <Text style={styles.recentName} numberOfLines={1}>
                  {e.name}
                </Text>
                <Text style={styles.recentMeta}>{isRevealed(e) ? 'Wall is live' : 'Open camera'}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        )}
        <Button
          title="Join an event"
          icon={<Ionicons name="qr-code-outline" size={20} color={colors.paper} />}
          onPress={() => router.push('/join')}
        />
        <Button title="I'm an event planner" variant="secondary" onPress={() => router.push('/sign-in')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.night },
  hero: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.md },
  tagline: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: colors.paper, letterSpacing: -0.6 },
  sub: { fontSize: 16, lineHeight: 23, color: '#B9B5C6' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.sm + 4,
  },
  recent: { gap: space.sm, marginBottom: space.sm },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  recentName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
  recentMeta: { fontSize: 13, color: colors.accent, fontWeight: '600' },
});
