import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.paper },
            headerShadowVisible: false,
            headerTintColor: colors.ink,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.paper },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ title: '' }} />
          <Stack.Screen name="planner/index" options={{ title: 'Your events', headerBackVisible: false }} />
          <Stack.Screen name="planner/new" options={{ title: 'New event', presentation: 'modal' }} />
          <Stack.Screen name="planner/[id]" options={{ title: '' }} />
          <Stack.Screen name="join/index" options={{ title: 'Join an event' }} />
          <Stack.Screen name="join/[code]" options={{ title: '' }} />
          <Stack.Screen name="event/[id]/camera" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]/wall" options={{ title: 'The wall' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
