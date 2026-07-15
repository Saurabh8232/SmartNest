// Compact metric card for dashboard values.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../constants/colors';

interface Props {
  label: string;
  value: number | string;
  unit: string;
  icon: React.ReactNode;
  accentColor?: string;
}

export default function MetricCard({
  label,
  value,
  unit,
  icon,
  accentColor = colors.primary,
}: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: accentColor }]}>
      <View style={[styles.iconBadge, { backgroundColor: accentColor + '22' }]}>
        {icon}
      </View>
      <View style={styles.info}>
        <Text style={styles.value}>
          {typeof value === 'number'
            ? value.toFixed(value < 10 ? 2 : 1)
            : value}
          <Text style={styles.unit}> {unit}</Text>
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  value: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  unit: { fontSize: 12, fontWeight: '400', color: colors.mutedForeground },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
    marginTop: 2,
  },
});
