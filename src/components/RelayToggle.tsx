import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import colors from '../constants/colors';

interface Props {
  id: string;
  name: string;
  isOn: boolean;
  current?: number;
  power?: number;
  status: 'normal' | 'error' | 'offline';
  onToggle: (id: string, action: 'on' | 'off') => void;
  disabled?: boolean;
  relayNumber?: number;
}

export default function RelayToggle({ id, name, isOn, current, power, status, onToggle, disabled, relayNumber }: Props) {
  const statusColor =
    status === 'error' ? colors.destructive :
    status === 'offline' ? colors.mutedForeground :
    isOn ? colors.success : colors.border;

  return (
    <View style={[styles.card, { borderColor: isOn ? statusColor + '44' : colors.border }]}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <View style={styles.info}>
        {relayNumber !== undefined && (
          <Text style={styles.relayNum}>Relay {relayNumber}</Text>
        )}
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.metrics}>
          {current !== undefined && <Text style={styles.metric}>{current.toFixed(2)} A</Text>}
          {power !== undefined && power > 0 && <Text style={styles.metric}>{power.toFixed(0)} W</Text>}
        </View>
      </View>
      <Switch
        value={isOn}
        onValueChange={() => onToggle(id, isOn ? 'off' : 'on')}
        disabled={disabled || status === 'offline'}
        trackColor={{ false: colors.border, true: colors.primary + '88' }}
        thumbColor={isOn ? colors.primary : colors.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  info: { flex: 1 },
  relayNum: { fontSize: 11, color: colors.mutedForeground, marginBottom: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  metrics: { flexDirection: 'row', gap: 10, marginTop: 2 },
  metric: { fontSize: 12, color: colors.mutedForeground },
});
