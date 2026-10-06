import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui';
import { errorMessage, getEvent, isRevealed, shotsUsed, SnapEvent, takeShot } from '../../../lib/api';
import { timeUntil } from '../../../lib/format';
import { colors, radius, space } from '../../../lib/theme';

export default function Camera() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const flash = useRef(new Animated.Value(0)).current;

  const [event, setEvent] = useState<SnapEvent | null>(null);
  const [used, setUsed] = useState(0);
  const [uploading, setUploading] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState<'off' | 'on'>('off');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [e, u] = await Promise.all([getEvent(id), shotsUsed(id)]);
      setEvent(e);
      setUsed(u);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-render every 30s so the countdown and reveal state stay fresh.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (loadError) {
    return (
      <Dark>
        <Text style={styles.bigText}>Can't open this camera</Text>
        <Text style={styles.subText}>{loadError}</Text>
        <Button title="Join with a code" onPress={() => router.replace('/join')} />
        <Button title="Back" variant="ghost" onPress={close} />
      </Dark>
    );
  }

  if (!event || !permission) return <Dark />;

  if (isRevealed(event)) {
    return (
      <Dark>
        <Ionicons name="sparkles" size={48} color={colors.accent} />
        <Text style={styles.bigText}>The wall is live!</Text>
        <Text style={styles.subText}>The camera for {event.name} is closed. Go see what everyone shot.</Text>
        <Button title="Open the wall" onPress={() => router.replace(`/event/${event.id}/wall`)} />
        <Button title="Close" variant="ghost" onPress={close} />
      </Dark>
    );
  }

  if (!permission.granted) {
    return (
      <Dark>
        <Ionicons name="camera-outline" size={48} color={colors.paper} />
        <Text style={styles.bigText}>Camera access needed</Text>
        <Text style={styles.subText}>Snapwall needs your camera to take shots for {event.name}.</Text>
        <Button title="Allow camera" onPress={requestPermission} />
        <Button title="Not now" variant="ghost" onPress={close} />
      </Dark>
    );
  }

  const left = Math.max(0, event.shots_per_guest - used);
  const rollDone = left === 0;
  const revealIn = timeUntil(event.reveal_at);

  const shoot = async () => {
    if (!camera.current || capturing || rollDone) return;
    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();

    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.7, shutterSound: true });
      setUsed((n) => n + 1);
      setUploading((n) => n + 1);
      // Upload in the background so the guest can keep shooting.
      takeShot(event.id, picture.uri)
        .catch((err) => {
          setUsed((n) => n - 1);
          Alert.alert("That shot didn't save", errorMessage(err));
        })
        .finally(() => setUploading((n) => n - 1));
    } catch (err) {
      Alert.alert('Camera error', errorMessage(err));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={close} hitSlop={16} accessibilityLabel="Close camera">
            <Ionicons name="close" size={28} color={colors.paper} />
          </Pressable>
          <Text style={styles.eventName} numberOfLines={1}>
            {event.name}
          </Text>
          <View style={styles.counter}>
            <Text style={styles.counterText}>{String(left).padStart(2, '0')}</Text>
            <Text style={styles.counterLabel}>LEFT</Text>
          </View>
        </View>

        <View style={styles.viewfinder}>
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={torch === 'on'}
            onCameraReady={() => setReady(true)}
          />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
          {rollDone && (
            <View style={styles.rollDone}>
              <Text style={styles.bigText}>Roll finished 🎞️</Text>
              <Text style={styles.subText}>
                Your shots are developing. The wall opens {revealIn ? `in ${revealIn}` : 'soon'}.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.status}>
          {uploading > 0 ? `Developing ${uploading} shot${uploading > 1 ? 's' : ''}…` : revealIn ? `Reveal in ${revealIn}` : ' '}
        </Text>

        <View style={styles.controls}>
          <Pressable
            onPress={() => setTorch((t) => (t === 'on' ? 'off' : 'on'))}
            style={styles.sideButton}
            accessibilityLabel="Toggle light"
            disabled={facing === 'front'}
          >
            <Ionicons name={torch === 'on' ? 'flash' : 'flash-off'} size={24} color={facing === 'front' ? colors.inkSoft : colors.paper} />
          </Pressable>
          <Pressable
            onPress={shoot}
            disabled={!ready || capturing || rollDone}
            accessibilityLabel="Take photo"
            style={({ pressed }) => [styles.shutterRing, (rollDone || !ready) && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            <View style={styles.shutter} />
          </Pressable>
          <Pressable
            onPress={() => {
              setTorch('off');
              setFacing((f) => (f === 'back' ? 'front' : 'back'));
            }}
            style={styles.sideButton}
            accessibilityLabel="Flip camera"
          >
            <Ionicons name="camera-reverse-outline" size={26} color={colors.paper} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Dark({ children }: { children?: React.ReactNode }) {
  return (
    <SafeAreaView style={[styles.root, styles.center]}>
      <View style={styles.message}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
  message: { padding: space.xl, gap: space.md, alignItems: 'stretch' },
  bigText: { color: colors.paper, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subText: { color: '#B9B5C6', fontSize: 16, textAlign: 'center', lineHeight: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.md },
  eventName: { flex: 1, color: colors.paper, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  counter: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  counterText: { color: colors.paper, fontWeight: '900', fontSize: 18, fontVariant: ['tabular-nums'] },
  counterLabel: { color: colors.paper, fontWeight: '800', fontSize: 8, letterSpacing: 1 },
  viewfinder: { flex: 1, marginHorizontal: space.sm, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' },
  flash: { backgroundColor: '#fff' },
  rollDone: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(11,10,18,0.85)', alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  status: { color: '#B9B5C6', textAlign: 'center', paddingTop: space.md, fontSize: 14, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: space.lg },
  sideButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#24222F', alignItems: 'center', justifyContent: 'center' },
  shutterRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.accent },
});
