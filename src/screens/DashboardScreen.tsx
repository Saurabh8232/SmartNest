import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {
  DashboardData,
  masterUnlockAll,
  masterShutdownAll,
  requestDashboard,
  subscribeToConnection,
  subscribeToDashboard,
} from '../socket/liveCommunication';
import MiniChart from '../components/MiniChart';
import colors from '../constants/colors';

const CACHE_KEY     = '@smartnest_dashboard_v1';
const SHUTDOWN_KEY  = '@smartnest_shutdown_v1';

const DEFAULT_DATA: DashboardData = {
  systemOnline: false, totalDevices: 0, activeRelays: 0, totalCurrent: 0,
  voltage: 0, current: 0, power: 0, energy: 0,
  frequency: 0, powerFactor: 0,
  voltageHistory: [], powerHistory: [], energyHistory: [], currentHistory: [],
  lastUpdated: new Date().toISOString(),
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData]                     = useState<DashboardData>(DEFAULT_DATA);
  const [offline, setOffline]               = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [shutdownEnabled, setShutdownEnabled] = useState(false);

  // ── Load cache ───────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(raw => {
      if (raw) try { setData(JSON.parse(raw)); } catch {}
    });
    AsyncStorage.getItem(SHUTDOWN_KEY).then(raw => {
      if (raw) setShutdownEnabled(raw === 'true');
    });
  }, []);

  const load = useCallback(() => { requestDashboard(); }, []);

  useEffect(() => {
    const removeDashboard = subscribeToDashboard(d => {
      setData(d);
      setOffline(false);
      setRefreshing(false);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(d)).catch(() => {});
    });
    const removeConnection = subscribeToConnection(
      () => { setOffline(false); load(); },
      () => { setOffline(true);  setRefreshing(false); },
    );
    return () => { removeDashboard(); removeConnection(); };
  }, [load]);

  // ── Master Unlock All ────────────────────────────────────────
  const handleMasterUnlockAll = useCallback(() => {
    Alert.alert(
      'Unlock All Relays?',
      'This will unlock every individually locked relay on Main Board and Digital Board.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unlock All', onPress: () => masterUnlockAll() },
      ]
    );
  }, []);

  // ── Master Shutdown ──────────────────────────────────────────
  const handleMasterShutdown = useCallback((next: boolean) => {
    Alert.alert(
      next ? 'Master Shutdown?' : 'Cancel Shutdown?',
      next
        ? 'All relays on Main Board and Digital Board will be turned OFF.'
        : 'Shutdown will be cancelled — relays can be turned back on.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Shutdown' : 'Cancel Shutdown',
          style: next ? 'destructive' : 'default',
          onPress: () => {
            masterShutdownAll(next);
            setShutdownEnabled(next);
            AsyncStorage.setItem(SHUTDOWN_KEY, String(next)).catch(() => {});
          },
        },
      ]
    );
  }, []);

  const PARAMS = [
    { label: 'Voltage', value: data.voltage,  unit: 'V',   color: colors.warning,  icon: 'zap',              history: data.voltageHistory  },
    { label: 'Power',   value: data.power,     unit: 'W',   color: colors.accent,   icon: 'cpu',              history: data.powerHistory    },
    { label: 'Current', value: data.current,   unit: 'A',   color: colors.primary,  icon: 'activity',         history: data.currentHistory  },
    { label: 'Energy',  value: data.energy,    unit: 'kWh', color: colors.success,  icon: 'battery-charging', history: []                   },
  ] as const;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>IoT Control Panel</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        {offline ? (
          <View style={[styles.badge, { backgroundColor: colors.warning + '22' }]}>
            <Icon name="wifi-off" size={10} color={colors.warning} />
            <Text style={[styles.badgeText, { color: colors.warning }]}>Offline</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: data.systemOnline ? colors.success + '22' : colors.destructive + '22' }]}>
            <View style={[styles.dot, { backgroundColor: data.systemOnline ? colors.success : colors.destructive }]} />
            <Text style={[styles.badgeText, { color: data.systemOnline ? colors.success : colors.destructive }]}>
              {data.systemOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        )}
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{data.totalDevices}</Text>
          <Text style={styles.summaryLabel}>Devices</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.accent }]}>{data.activeRelays}</Text>
          <Text style={styles.summaryLabel}>Active Relays</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{data.totalCurrent.toFixed(1)}A</Text>
          <Text style={styles.summaryLabel}>Total Current</Text>
        </View>
      </View>

      {/* Electrical Parameters */}
      <Text style={styles.sectionTitle}>ELECTRICAL PARAMETERS</Text>
      {PARAMS.map(p => (
        <View key={p.label} style={styles.paramCard}>
          <View style={styles.paramLeft}>
            <View style={[styles.paramIcon, { backgroundColor: p.color + '22' }]}>
              <Icon name={p.icon} size={20} color={p.color} />
            </View>
            <View>
              <Text style={styles.paramLabel}>{p.label}</Text>
              <Text style={[styles.paramValue, { color: p.color }]}>
                {p.value.toFixed(p.unit === 'kWh' || p.unit === 'A' ? 2 : p.unit === 'W' ? 0 : 1)}
                <Text style={styles.paramUnit}> {p.unit}</Text>
              </Text>
            </View>
          </View>
          {p.history.length > 0 ? (
            <View style={styles.paramChart}>
              <MiniChart data={p.history} color={p.color} height={40} />
            </View>
          ) : (
            <View style={styles.paramChart} />
          )}
        </View>
      ))}

      {/* ── GLOBAL SYSTEM CONTROLS ──────────────────────────── */}
      <Text style={styles.sectionTitle}>GLOBAL SYSTEM CONTROLS</Text>
      <View style={styles.globalRow}>

        {/* Master Unlock All */}
        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={handleMasterUnlockAll}
          activeOpacity={0.8}
        >
          <View style={[styles.globalIcon, { backgroundColor: colors.success + '22' }]}>
            <Icon name="unlock" size={18} color={colors.success} />
          </View>
          <Text style={[styles.globalTitle, { color: colors.success }]}>Unlock All</Text>
          <Text style={styles.globalDesc}>Release all locked relays</Text>
        </TouchableOpacity>

        {/* Master Shutdown */}
        <TouchableOpacity
          style={[styles.shutdownBtn, shutdownEnabled && styles.shutdownBtnActive]}
          onPress={() => handleMasterShutdown(!shutdownEnabled)}
          activeOpacity={0.8}
        >
          <View style={[styles.globalIcon, { backgroundColor: colors.destructive + '22' }]}>
            <Icon name="power" size={18} color={colors.destructive} />
          </View>
          <Text style={[styles.globalTitle, { color: colors.destructive }]}>
            {shutdownEnabled ? 'Shutdown ON' : 'Shutdown'}
          </Text>
          <Text style={styles.globalDesc}>
            {shutdownEnabled ? 'All relays are OFF' : 'Turn off all relays'}
          </Text>
        </TouchableOpacity>

      </View>
      {/* ── END GLOBAL CONTROLS ────────────────────────────── */}

      {offline && (
        <View style={styles.offlineNote}>
          <Icon name="wifi-off" size={14} color={colors.warning} />
          <Text style={styles.offlineText}>No backend connected — connect Socket.IO server to see live data</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  subtitle: { color: colors.mutedForeground, fontSize: 12 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: colors.border },
  sectionTitle: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, marginTop: 4 },
  paramCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  paramLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  paramIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paramLabel: { color: colors.mutedForeground, fontSize: 12, marginBottom: 2 },
  paramValue: { fontSize: 22, fontWeight: '700' },
  paramUnit: { fontSize: 13, fontWeight: '400' },
  paramChart: { width: 90, height: 40 },
  globalRow: { flexDirection: 'row', gap: 10 },
  unlockBtn: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.success + '55', padding: 14, gap: 6, alignItems: 'center' },
  shutdownBtn: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.destructive + '44', padding: 14, gap: 6, alignItems: 'center' },
  shutdownBtnActive: { backgroundColor: colors.destructive + '12', borderColor: colors.destructive },
  globalIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  globalTitle: { fontSize: 14, fontWeight: '700' },
  globalDesc: { fontSize: 10, color: colors.mutedForeground, textAlign: 'center' },
  offlineNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warning + '11', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.warning + '33' },
  offlineText: { flex: 1, color: colors.warning, fontSize: 12 },
});