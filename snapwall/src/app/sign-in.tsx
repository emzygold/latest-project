import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Button, ErrorText, Field, Screen, Wordmark } from '../components/ui';
import { ensurePlanner, errorMessage } from '../lib/api';
import { supabase } from '../lib/supabase';
import { colors, type } from '../lib/theme';

export default function SignIn() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const credentials = { email: email.trim(), password };
      const { data, error: authError } =
        mode === 'sign-in'
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp(credentials);
      if (authError) throw authError;
      if (!data.session) {
        setNotice('Check your email to confirm your account, then sign in.');
        setMode('sign-in');
        return;
      }
      await ensurePlanner();
      router.replace('/planner');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Wordmark />
      <Text style={type.display}>{mode === 'sign-in' ? 'Welcome back' : 'Create your planner account'}</Text>
      <Text style={type.body}>Run every event's photo wall from one place.</Text>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@studio.com" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="At least 6 characters" />
      <ErrorText message={error} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Button
        title={mode === 'sign-in' ? 'Sign in' : 'Create account'}
        loading={busy}
        disabled={!email.includes('@') || password.length < 6}
        onPress={submit}
      />
      <Pressable onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
        <Text style={styles.switch}>
          {mode === 'sign-in' ? "New to Snapwall? Create an account" : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switch: { textAlign: 'center', color: colors.accent, fontWeight: '700', fontSize: 15, paddingVertical: 8 },
  notice: { color: colors.teal, fontWeight: '600' },
});
