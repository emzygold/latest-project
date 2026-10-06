import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage, Photo, savePhotoToDevice } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { colors, space } from '../lib/theme';

type Props = {
  photo: Photo | null;
  onClose: () => void;
  // Planner-only moderation actions.
  onToggleHidden?: (photo: Photo) => Promise<void>;
  onDelete?: (photo: Photo) => Promise<void>;
};

export function PhotoViewer({ photo, onClose, onToggleHidden, onDelete }: Props) {
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, done?: string) => {
    setBusy(true);
    try {
      await action();
      if (done) Alert.alert(done);
    } catch (err) {
      Alert.alert('Something went wrong', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (p: Photo) =>
    Alert.alert('Delete this photo?', 'It will be removed for everyone. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => onDelete!(p)) },
    ]);

  return (
    <Modal visible={!!photo} animationType="fade" onRequestClose={onClose} transparent>
      {photo && (
        <SafeAreaView style={styles.backdrop}>
          <View style={styles.top}>
            <View>
              <Text style={styles.name}>{photo.guest_name}</Text>
              <Text style={styles.time}>{formatDateTime(photo.created_at)}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={16} accessibilityLabel="Close">
              <Ionicons name="close" size={28} color={colors.paper} />
            </Pressable>
          </View>
          <Image source={{ uri: photo.url }} style={styles.image} contentFit="contain" />
          <View style={styles.actions}>
            <Action icon="download-outline" label="Save" disabled={busy} onPress={() => run(() => savePhotoToDevice(photo), 'Saved to your photos')} />
            {onToggleHidden && (
              <Action
                icon={photo.hidden ? 'eye-outline' : 'eye-off-outline'}
                label={photo.hidden ? 'Show' : 'Hide'}
                disabled={busy}
                onPress={() => run(() => onToggleHidden(photo))}
              />
            )}
            {onDelete && <Action icon="trash-outline" label="Delete" disabled={busy} danger onPress={() => confirmDelete(photo)} />}
          </View>
        </SafeAreaView>
      )}
    </Modal>
  );
}

function Action({
  icon,
  label,
  onPress,
  disabled,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const color = danger ? '#FF7A7A' : colors.paper;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.action, disabled && { opacity: 0.4 }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.night },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space.md },
  name: { color: colors.paper, fontWeight: '700', fontSize: 16 },
  time: { color: '#9A96A8', fontSize: 13 },
  image: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', padding: space.md },
  action: { alignItems: 'center', gap: 4, padding: space.sm, minWidth: 72 },
  actionText: { fontSize: 13, fontWeight: '600' },
});
