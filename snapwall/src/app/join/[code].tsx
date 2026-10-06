import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, ErrorText, Field, Screen } from '../../components/ui';
import { errorMessage, getEvent, joinEvent } from '../../lib/api';
import { rememberEvent } from '../../lib/recent';
import { colors, type } from '../../lib/theme';

export default function JoinEvent() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const eventId = await joinEvent(code, name);
      const event = await getEvent(eventId);
      await rememberEvent({ id: event.id, name: event.name, reveal_at: event.reveal_at });
      // Opened from a deep link there is nothing underneath to go back to.
      if (router.canDismiss()) {
        router.dismissAll();
        router.push(`/event/${event.id}/camera`);
      } else {
        router.replace(`/event/${event.id}/camera`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.code}>{code?.toUpperCase()}</Text>
      <Text style={type.display}>What should we call you?</Text>
      <Text style={type.body}>Your name shows on the wall next to your shots.</Text>
      <Field label="Your name" value={name} onChangeText={setName} placeholder="e.g. Ada" autoFocus maxLength={40} returnKeyType="go" onSubmitEditing={() => name.trim() && join()} />
      <ErrorText message={error} />
      <Button title="Join & open camera" loading={busy} disabled={!name.trim()} onPress={join} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 14, fontWeight: '800', letterSpacing: 4, color: colors.accent },
});
