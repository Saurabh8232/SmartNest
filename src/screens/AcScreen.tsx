import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getAcStatus, sendAcCommand, rebootAc, AcStatus } from '../api/api';
import colors from '../constants/colors';

const MODES = [
  { key: 'cool', label: 'Cool', icon: 'wind' },
  { key: 'fan',  label: 'Fan',  icon: 'navigation' },
  { key: 'dry',  label: 'Dry',  icon: 'droplet' },
  { key: 'auto', label: 'Auto', icon: 'cpu' },
] as const;

const FAN_SPEEDS = [
  { key: 'low',    label: 'Low'  },
  { key: 'medium', label: 'Med'  },
  { key: 'high',   label: 'High' },
  { key: 'auto',   label: 'Auto' },
] as const;

const DEFAULT_AC: AcStatus = {
  isOn: false, temperature: 24, mode: 'cool', fanSpeed: 'auto',
  swingOn: false, irBlasterAvailable: true,
  voltage: 0, current: 0, power: 0, energy: 0,
};

export default function AcScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AcStatus>(DEFAULT_AC);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [rebooting, setRebooting] = useState(false);

  const load = useCallback(async () => {
    try {
      setOffline(false);
      setData(await getAcStatus());
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = useCallback(async (action: string, value?: unknown) => {
    if (offline) {
      setData(prev => {
        if (action === 'power_on')          return { ...prev, isOn: true };
        if (action === 'power_off')         return { ...prev, isOn: false };
        if (action === 'temperature_up')    return { ...prev, temperature: Math.min(30, prev.temperature + 1) };
        if (action === 'temperature_down')  return { ...prev, temperature: Math.max(16, prev.temperature - 1) };
        if (action === 'set_temperature')   return { ...prev, temperature: value as number };
        if (action === 'set_mode')          return { ...prev, mode: value as AcStatus['mode'] };
        if (action === 'set_fan_speed')     return { ...prev, fanSpeed: value as AcStatus['fanSpeed'] };
        if (action === 'toggle_swing')      return { ...prev, swingOn: !prev.swingOn };
        return prev;
      });
      return;
    }
    try { setData(await sendAcCommand(action, value)); } catch {}
  }, [offline]);

  const handleReboot = useCallback(() => {
    Alert.alert(
      'Reboot?',
      'The AC controller will restart. IR control will be unavailable for ~10 seconds.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reboot', style: 'destructive', onPress: async () => {
          setRebooting(true);
          try { await rebootAc(); } catch {}
          setTimeout(() => { setRebooting(false); load(); }, 12000);
        }},
      ]
    );
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const powerColor = data.isOn ? colors.success : colors.mutedForeground;

  const READINGS = [
    { label: 'Voltage', value: data.voltage.toFixed(1), unit: 'V',   color: colors.warning, icon: 'zap' },
    { label: 'Power',   value: data.power.toFixed(0),   unit: 'W',   color: colors.accent,  icon: 'cpu' },
    { label: 'Current', value: data.current.toFixed(2), unit: 'A',   color: colors.primary, icon: 'activity' },
    { label: 'Energy',  value: data.energy.toFixed(2),  unit: 'kWh', color: colors.success, icon: 'battery-charging' },
  ] as const;

  const modeLabelStyle = (active: boolean) => [styles.modeLabel, active ? styles.modeLabelActive : styles.modeLabelInactive];
  const fanBtnStyle = (active: boolean) => [styles.fanBtn, active ? styles.fanBtnActive : styles.fanBtnInactive];
  const fanLabelStyle = (active: boolean) => [styles.fanLabel, active ? styles.fanLabelActive : styles.fanLabelInactive];
  const rebootBtnStyle = [styles.rebootBtn, rebooting ? styles.rebootBtnDisabled : styles.rebootBtnEnabled];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>IR Blaster</Text>
          <Text style={styles.title}>AC Control</Text>
        </View>
        {offline && (
          <View style={styles.offlineBadge}>
            <Icon name="wifi-off" size={12} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Power Card */}
      <View style={[styles.powerCard, {
        backgroundColor: data.isOn ? colors.primary + '18' : colors.card,
        borderColor: data.isOn ? colors.primary + '44' : colors.border,
      }]}>
        <View>
          <Text style={styles.tempLabel}>Temperature</Text>
          <Text style={styles.tempValue}>{data.temperature}°C</Text>
          <View style={[styles.statusBadge, { backgroundColor: powerColor + '22' }]}>
            <View style={[styles.dot, { backgroundColor: powerColor }]} />
            <Text style={[styles.statusText, { color: powerColor }]}>{data.isOn ? 'ON' : 'OFF'}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => send(data.isOn ? 'power_off' : 'power_on')}
          activeOpacity={0.85}
          style={[styles.powerBtn, {
            backgroundColor: data.isOn ? colors.primary : colors.secondary,
            borderColor: data.isOn ? colors.primary : colors.border,
          }]}
        >
          <Icon name="power" size={28} color={data.isOn ? colors.background : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Temperature */}
      <Text style={styles.sectionTitle}>TEMPERATURE</Text>
      <View style={[styles.tempControls, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => send('temperature_down')} style={[styles.tempBtn, { backgroundColor: colors.secondary }]}>
          <Icon name="minus" size={24} color={data.isOn ? colors.foreground : colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.tempCenter}>
          <Text style={[styles.tempBig, { color: colors.primary }]}>{data.temperature}°</Text>
          <Text style={styles.tempRange}>16 – 30°C</Text>
        </View>
        <TouchableOpacity onPress={() => send('temperature_up')} style={[styles.tempBtn, { backgroundColor: colors.secondary }]}>
          <Icon name="plus" size={24} color={data.isOn ? colors.foreground : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.presetRow}>
        {[16, 18, 20, 22, 24, 26, 28, 30].map(t => (
          <TouchableOpacity key={t} onPress={() => send('set_temperature', t)}
            style={[styles.preset, {
              backgroundColor: data.temperature === t ? colors.primary : colors.card,
              borderColor: data.temperature === t ? colors.primary : colors.border,
            }]}
          >
            <Text style={[styles.presetText, { color: data.temperature === t ? colors.background : colors.mutedForeground }]}>{t}°</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mode */}
      <Text style={styles.sectionTitle}>MODE</Text>
      <View style={styles.modeRow}>
        {MODES.map(m => {
          const active = data.mode === m.key;
          return (
            <TouchableOpacity key={m.key} onPress={() => send('set_mode', m.key)}
              style={[styles.modeCard, {
                backgroundColor: active ? colors.accent : colors.card,
                borderColor: active ? colors.accent : colors.border,
              }]}
            >
              <Icon name={m.icon} size={20} color={active ? '#fff' : colors.mutedForeground} />
              <Text style={modeLabelStyle(active)}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fan Speed */}
      <Text style={styles.sectionTitle}>FAN SPEED</Text>
      <View style={[styles.fanRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {FAN_SPEEDS.map(f => {
          const active = data.fanSpeed === f.key;
          return (
            <TouchableOpacity key={f.key} onPress={() => send('set_fan_speed', f.key)}
              style={fanBtnStyle(active)}
            >
              <Text style={fanLabelStyle(active)}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Swing
      <Text style={styles.sectionTitle}>SWING</Text>
      <TouchableOpacity onPress={() => send('toggle_swing')}
        style={[styles.swingCard, {
          backgroundColor: data.swingOn ? colors.primary + '18' : colors.card,
          borderColor: data.swingOn ? colors.primary : colors.border,
        }]}
      >
        <Icon name="refresh-cw" size={20} color={data.swingOn ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.swingText, { color: data.swingOn ? colors.primary : colors.foreground }]}>
          Swing {data.swingOn ? 'ON' : 'OFF'}
        </Text>
        <View style={[styles.swingBadge, { backgroundColor: data.swingOn ? colors.primary : colors.border }]}>
          <Text style={styles.swingBadgeText}>{data.swingOn ? 'ON' : 'OFF'}</Text>
        </View>
      </TouchableOpacity> */}

      {/* Electrical Readings */}
      <Text style={styles.sectionTitle}>ELECTRICAL READINGS</Text>
      {READINGS.map(r => (
        <View key={r.label} style={styles.readingCard}>
          <View style={[styles.readingIcon, { backgroundColor: r.color + '22' }]}>
            <Icon name={r.icon} size={18} color={r.color} />
          </View>
          <Text style={styles.readingLabel}>{r.label}</Text>
          <Text style={[styles.readingValue, { color: r.color }]}>
            {r.value} <Text style={styles.readingUnit}>{r.unit}</Text>
          </Text>
        </View>
      ))}

      {/* Reboot */}
      <Text style={styles.sectionTitle}>SYSTEM</Text>
      <TouchableOpacity onPress={handleReboot} disabled={rebooting} activeOpacity={0.8}
        style={rebootBtnStyle}
      >
        <View style={[styles.rebootIcon, { backgroundColor: colors.destructive + '22' }]}>
          <Icon name="refresh-cw" size={18} color={colors.destructive} />
        </View>
        <View style={styles.rebootContent}>
          <Text style={styles.rebootTitle}>{rebooting ? 'Rebooting…' : 'Reboot'}</Text>
          <Text style={styles.rebootDesc}>Restart the AC controller module</Text>
        </View>
        <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  subtitle: { color: colors.mutedForeground, fontSize: 12 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '700' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning + '22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  offlineText: { color: colors.warning, fontSize: 11, fontWeight: '600' },
  powerCard: { borderRadius: 16, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tempLabel: { color: colors.mutedForeground, fontSize: 12 },
  tempValue: { color: colors.foreground, fontSize: 36, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  powerBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  sectionTitle: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, marginTop: 4 },
  tempControls: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, gap: 16 },
  tempBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tempCenter: { flex: 1, alignItems: 'center' },
  tempBig: { fontSize: 48, fontWeight: '700' },
  tempRange: { color: colors.mutedForeground, fontSize: 12 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presetText: { fontSize: 13, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 8 },
  modeLabel: { fontSize: 12, fontWeight: '600' },
  modeLabelActive: { color: '#fff' },
  modeLabelInactive: { color: colors.mutedForeground },
  fanRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4 },
  fanBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  fanBtnActive: { backgroundColor: colors.primary },
  fanBtnInactive: { backgroundColor: 'transparent' },
  fanLabel: { fontSize: 13 },
  fanLabelActive: { color: colors.background, fontWeight: '700' },
  fanLabelInactive: { color: colors.mutedForeground, fontWeight: '400' },
  swingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  swingText: { flex: 1, fontSize: 15, fontWeight: '600' },
  swingBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  swingBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  readingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  readingIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  readingLabel: { flex: 1, color: colors.mutedForeground, fontSize: 14 },
  readingValue: { fontSize: 20, fontWeight: '700' },
  readingUnit: { fontSize: 12, fontWeight: '400' },
  rebootBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.destructive + '44', padding: 14 },
  rebootBtnEnabled: { opacity: 1 },
  rebootBtnDisabled: { opacity: 0.5 },
  rebootIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rebootContent: { flex: 1 },
  rebootTitle: { color: colors.destructive, fontSize: 15, fontWeight: '600' },
  rebootDesc: { color: colors.mutedForeground, fontSize: 12, marginTop: 1 },
});
