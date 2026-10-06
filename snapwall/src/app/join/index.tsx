import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ErrorText, Field, Screen } from '../../components/ui';
import { parseJoinCode } from '../../lib/joinCode';
import { colors, radius, space, type } from '../../lib/theme';

export default function JoinWithCode() {
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  const go = (value: string) => {
    const parsed = parseJoinCode(value);
    if (!parsed) {
      setError("That doesn't look like a Snapwall code.");
      return;
    }
    router.push(`/join/${parsed}`);
  };

  const startScan = async () => {
    setError(null);
    const result = permission?.granted ? permission : await requestPermission();
    if (!result.granted) {
      setError('Allow camera access to scan the QR code, or type the code instead.');
      return;
    }
    handled.current = false;
    setScanning(true);
  };

  return (
    <Screen>
      <Text style={type.display}>Got a code?</Text>
      <Text style={type.body}>Scan the QR code at the event, or type the 6-character code from your invite.</Text>

      {scanning ? (
        <View style={styles.scanner}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              const parsed = parseJoinCode(data);
              if (!parsed) return;
              handled.current = true;
              setScanning(false);
              router.push(`/join/${parsed}`);
            }}
          />
          <View style={styles.frame} />
        </View>
      ) : (
        <Button
          title="Scan QR code"
          variant="secondary"
          icon={<Ionicons name="scan-outline" size={20} color={colors.ink} />}
          onPress={startScan}
        />
      )}
      {scanning && <Button title="Cancel scan" variant="ghost" onPress={() => setScanning(false)} />}

      <Text style={styles.or}>or</Text>
      <Field
        label="Event code"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABC123"
        style={styles.codeInput}
      />
      <ErrorText message={error} />
      <Button title="Continue" disabled={code.length !== 6} onPress={() => go(code)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scanner: { height: 300, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 200, height: 200, borderRadius: radius.md, borderWidth: 3, borderColor: colors.accent },
  or: { textAlign: 'center', color: colors.muted, fontWeight: '600' },
  codeInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 16,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.ink,
  },
});
