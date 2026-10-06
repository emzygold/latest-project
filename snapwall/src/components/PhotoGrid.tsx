import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { Photo } from '../lib/api';
import { colors, space } from '../lib/theme';

const COLUMNS = 3;
const GAP = 6;

type Props = {
  photos: Photo[];
  onPress: (photo: Photo) => void;
  header?: React.ReactElement;
  empty?: React.ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function PhotoGrid({ photos, onPress, header, empty, refreshing, onRefresh }: Props) {
  const { width } = useWindowDimensions();
  const size = (width - space.md * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <FlatList
      data={photos}
      numColumns={COLUMNS}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      columnWrapperStyle={{ gap: GAP }}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      refreshing={refreshing}
      onRefresh={onRefresh}
      renderItem={({ item }) => (
        <Pressable onPress={() => onPress(item)} style={{ width: size, height: size }}>
          <Image source={{ uri: item.url }} style={styles.image} contentFit="cover" transition={200} cachePolicy="memory-disk" recyclingKey={item.id} />
          {item.hidden && (
            <View style={styles.hiddenBadge}>
              <Text style={styles.hiddenText}>Hidden</Text>
            </View>
          )}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.md, gap: GAP },
  image: { flex: 1, borderRadius: 8, backgroundColor: colors.line },
  hiddenBadge: {
    ...StyleSheet.absoluteFill,
    borderRadius: 8,
    backgroundColor: 'rgba(11,10,18,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenText: { color: colors.paper, fontWeight: '700', fontSize: 12 },
});
