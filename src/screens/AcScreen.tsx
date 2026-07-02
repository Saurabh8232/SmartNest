import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  AcStatus,
  sendAcCommand,
  subscribeToAc,
  subscribeToConnection,
} from '../socket/liveCommunication';
import colors from '../constants/colors';

const CACHE_KEY = '@smartnest_ac_v1';

// Mode selector removed — hardware firmware does not support mode changes via MQTT
// fan keys match hardware ac_set fan values exactly: auto | min | low | med | high | max
const FAN_SPEEDS = [
  { key: 'min',  label: 'Min'  },
  { key: 'low',  label: 'Low'  },
  { key: 'med',  label: 'Med'  },
  { key: 'high', label: 'High' },
  { key: 'max',  label: 'Max'  },
  { key: 'auto', label: 'Auto' },
] as const;

const DEFAULT_AC: AcStatus = {
  isOn: false,
  temperature: 24,
  fanSpeed: 'auto',
  swingOn: false,
  irBlasterAvailable: true,
  acCurrent: 0,
  acPower: 0,
  acEnergyKwh: 0,
  pzemCumulativeEnergyKwh: 0,
};

const MIN_TEMP = 16;
const MAX_TEMP = 30;

const paramCardStyle = (color: string) => [styles.paramCard, { borderTopColor: color + '99', borderTopWidth: 2 }];

function TemperatureDial({ temperature, isOn }: { temperature: number; isOn: boolean }) {
  const SIZE = 200;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 78;
  const SW = 10;
  const START = 135;
  const SWEEP = 270;
  const progress = (temperature - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
  const activeColor = isOn ? colors.primary : colors.mutedForeground;

  function toXY(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
  }

  function arc(from: number, to: number) {
    const s = toXY(from);
    const e = toXY(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const endAngle = START + progress * SWEEP;
  const knob = toXY(endAngle);

  return (
    <View style={styles.dialCenter}>
      <Svg width={SIZE} height={SIZE}>
        <Path d={arc(START, START + SWEEP)} stroke={colors.border} strokeWidth={SW} fill="none" strokeLinecap="round" />
        {progress > 0 && (
          <Path d={arc(START, endAngle)} stroke={activeColor} strokeWidth={SW} fill="none" strokeLinecap="round" />
        )}
        {progress > 0 && <Circle cx={knob.x} cy={knob.y} r={7} fill={activeColor} />}
      </Svg>
      <View style={styles.dialOverlay}>
        <Text style={[styles.dialTemp, { color: isOn ? colors.primary : colors.mutedForeground }]}>
          {temperature}°
        </Text>
        <Text style={styles.dialTempF}>{Math.round(temperature * 9 / 5 + 32)}°F</Text>
        <Text style={[styles.dialStatus, { color: isOn ? colors.success : colors.destructive }]}>
          {isOn ? 'ON' : 'OFF'}
        </Text>
      </View>
    </View>
  );
}

export default function AcScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [data, setData] = useState<AcStatus>(DEFAULT_AC);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasLiveDataRef = useRef(false);

  // ── Load cached data on app start ──────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(raw => {
      if (!raw) return;
      try {
        if (!hasLiveDataRef.current) setData(JSON.parse(raw));
      } catch {}
    });
  }, []);

  const load = useCallback(() => {
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const removeAc = subscribeToAc(status => {
      hasLiveDataRef.current = true;
      setData(status);
      setOffline(false);
      setRefreshing(false);
      // ── Save to cache ─────────────────────────────────────────
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(status)).catch(() => {});
    });
    const removeConnection = subscribeToConnection(
      () => { setOffline(false); load(); },
      () => { setOffline(true); setRefreshing(false); },
    );
    return () => { removeAc(); removeConnection(); };
  }, [load]);

  const send = useCallback(async (action: string, value?: unknown) => {
    setData(prev => {
      const next = (() => {
        if (action === 'power_on')         return { ...prev, isOn: true };
        if (action === 'power_off')        return { ...prev, isOn: false };
        if (action === 'temperature_up')   return { ...prev, temperature: Math.min(MAX_TEMP, prev.temperature + 1) };
        if (action === 'temperature_down') return { ...prev, temperature: Math.max(MIN_TEMP, prev.temperature - 1) };
        if (action === 'set_temperature')  return { ...prev, temperature: value as number };
        if (action === 'set_fan_speed')    return { ...prev, fanSpeed: value as AcStatus['fanSpeed'] };
        return prev;
      })();
      // ── Persist optimistic UI state to cache ──────────────────
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    if (!offline) sendAcCommand(action, value);
  }, [offline]);

  // AC-specific electrical readings — all from hardware /live/sensors PZEM fields
  const params = [
    { label: 'AC Current',           value: `${data.acCurrent.toFixed(2)}`,              unit: 'A',   icon: 'activity',         color: colors.primary },
    { label: 'AC Power',             value: `${data.acPower.toFixed(0)}`,                unit: 'W',   icon: 'cpu',              color: colors.accent  },
    { label: 'AC Energy Today',      value: `${data.acEnergyKwh.toFixed(3)}`,            unit: 'kWh', icon: 'battery-charging', color: colors.success },
    { label: 'AC Cumulative Energy', value: `${data.pzemCumulativeEnergyKwh.toFixed(3)}`, unit: 'kWh', icon: 'archive',         color: colors.warning },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.flex1}>
          <Text style={styles.subtitle}>Smart Control</Text>
          <Text style={styles.title}>AC Controller</Text>
        </View>
        {offline && (
          <View style={styles.offlinePill}>
            <Icon name="wifi-off" size={11} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Temperature Dial Card */}
      <View style={styles.dialCard}>
        <View style={styles.dialRow}>
          <TouchableOpacity
            onPress={() => send('temperature_down')}
            style={[styles.tempBtn, !data.isOn && styles.tempBtnDisabled]}
            disabled={!data.isOn}
          >
            <Icon name="minus" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TemperatureDial temperature={data.temperature} isOn={data.isOn} />

          <TouchableOpacity
            onPress={() => send('temperature_up')}
            style={[styles.tempBtn, !data.isOn && styles.tempBtnDisabled]}
            disabled={!data.isOn}
          >
            <Icon name="plus" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.tempRange}>{MIN_TEMP}° — {MAX_TEMP}°C</Text>

        {/* Power Button */}
        <TouchableOpacity
          onPress={() => send(data.isOn ? 'power_off' : 'power_on')}
          style={[styles.powerBtn, {
            backgroundColor: data.isOn ? colors.primary : colors.secondary,
            borderColor: data.isOn ? colors.primary : colors.border,
          }]}
          activeOpacity={0.85}
        >
          <Icon name="power" size={22} color={data.isOn ? colors.background : colors.mutedForeground} />
          <Text style={[styles.powerBtnText, { color: data.isOn ? colors.background : colors.mutedForeground }]}>
            POWER {data.isOn ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AC Electrical Parameters — from hardware /live/sensors PZEM readings */}
      <Text style={styles.sectionTitle}>ELECTRICAL PARAMETERS</Text>
      <View style={styles.paramsGrid}>
        {params.map(p => (
          <View key={p.label} style={paramCardStyle(p.color)}>
            <View style={[styles.paramIcon, { backgroundColor: p.color + '1a' }]}>
              <Icon name={p.icon} size={15} color={p.color} />
            </View>
            <Text style={[styles.paramValue, { color: p.color }]}>{p.value}</Text>
            <Text style={styles.paramUnit}>{p.unit}</Text>
            <Text style={styles.paramLabel}>{p.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {/* Quick Temperature Presets */}
      <Text style={styles.sectionTitle}>QUICK TEMPERATURE</Text>
      <View style={styles.presetRow}>
        {[16, 18, 20, 22, 24, 26, 28, 30].map(t => {
          const active = data.temperature === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => send('set_temperature', t)}
              style={[styles.presetBtn, {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.presetText, { color: active ? colors.background : colors.mutedForeground }]}>
                {t}°
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fan Speed */}
      <Text style={styles.sectionTitle}>FAN SPEED</Text>
      <View style={styles.fanRow}>
        {FAN_SPEEDS.map(f => {
          const active = data.fanSpeed === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => send('set_fan_speed', f.key)}
              style={[styles.fanBtn, active ? styles.fanBtnActive : styles.fanBtnInactive]}
            >
              <Text style={[styles.fanLabel, active ? styles.fanLabelActive : styles.fanLabelInactive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },
  flex1: { flex: 1 },
  dialCenter: { alignItems: 'center', justifyContent: 'center' },
  dialOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  subtitle: { color: colors.mutedForeground, fontSize: 12 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  offlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.warning + '22', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.warning + '44' },
  offlineText: { color: colors.warning, fontSize: 11, fontWeight: '700' },
  dialCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, alignItems: 'center', gap: 12 },
  dialRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dialTemp: { fontSize: 52, fontWeight: '800', letterSpacing: -2, textAlign: 'center' },
  dialTempF: { color: colors.mutedForeground, fontSize: 14, textAlign: 'center', marginTop: -4 },
  dialStatus: { fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  tempBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary + '44' },
  tempBtnDisabled: { opacity: 0.5 },
  tempRange: { color: colors.mutedForeground, fontSize: 12 },
  powerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, borderWidth: 2, marginTop: 4 },
  powerBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  sectionTitle: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  paramsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paramCard: { width: '47.5%', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 13, gap: 4 },
  paramIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  paramValue: { fontSize: 22, fontWeight: '800' },
  paramUnit: { fontSize: 11, color: colors.mutedForeground, marginTop: -2 },
  paramLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600', marginTop: 2 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1 },
  presetText: { fontSize: 13, fontWeight: '600' },
  fanRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 4, gap: 2 },
  fanBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  fanLabel: { fontSize: 13 },
  fanBtnActive: { backgroundColor: colors.primary },
  fanBtnInactive: { backgroundColor: 'transparent' },
  fanLabelActive: { color: colors.background, fontWeight: '700' },
  fanLabelInactive: { color: colors.mutedForeground, fontWeight: '500' },
});