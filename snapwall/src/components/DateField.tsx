import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateTime } from '../lib/format';
import { colors, radius, space, type } from '../lib/theme';

type Props = { label: string; value: Date; onChange: (date: Date) => void; minimumDate?: Date };

export function DateField({ label, value, onChange, minimumDate }: Props) {
  // Android has no combined picker: ask for the date, then the time.
  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (timeEvent, time) => {
            if (timeEvent.type === 'set' && time) onChange(time);
          },
        });
      },
    });
  };

  return (
    <View style={styles.field}>
      <Text style={type.label}>{label.toUpperCase()}</Text>
      {Platform.OS === 'ios' ? (
        <View style={styles.box}>
          <DateTimePicker
            value={value}
            mode="datetime"
            display="compact"
            minimumDate={minimumDate}
            accentColor={colors.accent}
            onChange={(_, date) => date && onChange(date)}
          />
        </View>
      ) : (
        <Pressable style={styles.box} onPress={openAndroid}>
          <Text style={styles.value}>{formatDateTime(value)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs + 2 },
  box: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
  value: { fontSize: 16, color: colors.ink },
});
