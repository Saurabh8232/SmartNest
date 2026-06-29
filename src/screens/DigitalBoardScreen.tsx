import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  controlDigitalRelay,
  DashboardData,
  DigitalBoardStatus,
  lockDigitalRelay,
  requestDashboard,
  requestDigitalBoard,
  subscribeToConnection,
  subscribeToDashboard,
  subscribeToDigitalBoard,
  subscribeToShutdownAll,
} from '../socket/liveCommunication';
import MiniChart from '../components/MiniChart';
import colors from '../constants/colors';

const CACHE_KEY = '@smartnest_digitalboard_v1';

const DEFAULT_DATA: DigitalBoardStatus = { relays: [], masterLockEnabled: false, totalCurrent: 0 };
const DEFAULT_DASH: DashboardData = {
  systemOnline: false, totalDevices: 0, activeRelays: 0, totalCurrent: 0,
  voltage: 0, current: 0, power: 0, energy: 0, frequency: 0, powerFactor: 0,
  voltageHistory: [], powerHistory: [], energyHistory: [], currentHistory: [],
  lastUpdated: new Date().toISOString(),
};

const paramCardStyle = (color: string) => [styles.paramCard, { borderTopColor: color + '99', borderTopWidth: 2 }];

export default function DigitalBoardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const chartWidth = width - 64;

  const [board, setBoard] = useState<DigitalBoardStatus>(DEFAULT_DATA);
  const [dash, setDash] = useState<DashboardData>(DEFAULT_DASH);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Load cached data on app start ──────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(raw => {
      if (!raw) return;
      try { setBoard(JSON.parse(raw)); } catch {}
    });
  }, []);

  const load = useCallback(() => {
    requestDigitalBoard();
    requestDashboard();
  }, []);

  useEffect(() => {
    const removeBoard = subscribeToDigitalBoard(status => {
      setBoard(status);
      setOffline(false);
      setRefreshing(false);
      // ── Save to cache ─────────────────────────────────────────
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(status)).catch(() => {});
    });
    const removeDashboard = subscribeToDashboard(setDash);
    const removeConnection = subscribeToConnection(
      () => { setOffline(false); load(); },
      () => { setOffline(true); setRefreshing(false); },
    );
    const removeShutdownAll = subscribeToShutdownAll(() => {
      setBoard(prev => {
        const next = {
          ...prev,
          totalCurrent: 0,
          relays: prev.relays.map(relay => ({
            ...relay,
            isOn: false,
            current: 0,
            power: 0,
          })),
        };
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      setRefreshing(false);
    });
    return () => {
      removeBoard();
      removeDashboard();
      removeConnection();
      removeShutdownAll();
    };
  }, [load]);

  const relay = board.relays[0] ?? null;
  const isRelayLocked = (relay as any)?.locked ?? false;

  const handleToggle = useCallback((next: boolean) => {
    if (!relay || isRelayLocked) return;
    const action = next ? 'on' : 'off';
    setBoard(prev => ({ ...prev, relays: prev.relays.map((r, i) => i === 0 ? { ...r, isOn: next } : r) }));
    if (offline) return;
    controlDigitalRelay(relay.id, action);
  }, [relay, isRelayLocked, offline]);

  const handleRelayLock = useCallback(() => {
    if (!relay) return;
    const next = !isRelayLocked;
    Alert.alert(
      next ? 'Lock Relay?' : 'Unlock Relay?',
      next ? 'This relay will be locked. Toggle control will be disabled.' : 'This relay will be unlocked and can be controlled again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Lock' : 'Unlock',
          onPress: () => {
            setBoard(prev => ({
              ...prev,
              relays: prev.relays.map((r, i) => i === 0 ? { ...r, locked: next } : r),
            }));
            if (!offline) lockDigitalRelay(relay.id, next);
          },
        },
      ]
    );
  }, [relay, isRelayLocked, offline]);

  const params = [
    { label: 'Voltage', value: `${dash.voltage.toFixed(1)}`, unit: 'V', icon: 'zap', color: colors.warning },
    { label: 'Current', value: `${dash.current.toFixed(2)}`, unit: 'A', icon: 'activity', color: colors.primary },
    { label: 'Power', value: `${dash.power.toFixed(0)}`, unit: 'W', icon: 'cpu', color: colors.accent },
    { label: 'Energy', value: `${dash.energy.toFixed(2)}`, unit: 'kWh', icon: 'battery-charging', color: colors.success },
  ];

  const relayStatusColor =
    !relay ? colors.mutedForeground :
    relay.status === 'error' ? colors.destructive :
    relay.status === 'offline' ? colors.mutedForeground :
    relay.isOn ? colors.success : colors.border;

  const activeIndicatorColor = isRelayLocked ? colors.warning : relayStatusColor;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.flex1}>
          <Text style={styles.subtitle}>Smart Relay · ACS Monitor</Text>
          <Text style={styles.title}>Digital Board</Text>
        </View>
        {offline && (
          <View style={styles.offlinePill}>
            <Icon name="wifi-off" size={11} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Electrical Parameters */}
      <Text style={styles.sectionTitle}>ELECTRICAL PARAMETERS</Text>
      <View style={styles.paramsGrid}>
        {params.map(p => (
          <View key={p.label} style={paramCardStyle(p.color)}>
            <View style={[styles.paramIcon, { backgroundColor: p.color + '1a' }]}>
              <Icon name={p.icon} size={15} color={p.color} />
            </View>
            <Text style={[styles.paramValue, { color: p.color }]}>{p.value}</Text>
            <Text style={styles.paramUnit}>{p.unit}</Text>
            <Text style={styles.paramLabel}>{p.label}</Text>
          </View>
        ))}
      </View>

      {/* Power Chart */}
      {dash.powerHistory.length > 1 && (
        <>
          <Text style={styles.sectionTitle}>POWER CONSUMPTION TREND</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <View style={[styles.chartDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.chartTitle}>Power Consumption</Text>
              </View>
              <Text style={[styles.chartValue, { color: colors.accent }]}>{dash.power.toFixed(0)} W</Text>
            </View>
            <MiniChart data={dash.powerHistory} color={colors.accent} height={68} width={chartWidth} />
          </View>
        </>
      )}

      {/* Relay Control */}
      <Text style={styles.sectionTitle}>RELAY CONTROL</Text>

      {relay === null ? (
        <View style={styles.emptyCard}>
          <Icon name="grid" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>{offline ? 'Backend not connected' : 'No relay data'}</Text>
          <Text style={styles.emptyDesc}>{offline ? 'Check your server connection' : 'Digital Board relay will appear here'}</Text>
        </View>
      ) : (
        <View style={[styles.relayCard, { borderColor: isRelayLocked ? colors.warning + '55' : relay.isOn ? relayStatusColor + '55' : colors.border }]}>
          <View style={styles.relayTop}>
            <View style={[styles.relayIconWrap, { backgroundColor: activeIndicatorColor + '22' }]}>
              <Icon name="toggle-right" size={22} color={activeIndicatorColor} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.relayName}>{relay.name || 'Digital Board Relay'}</Text>
              <View style={styles.relayStatusRow}>
                <View style={[styles.relayDot, { backgroundColor: activeIndicatorColor }]} />
                <Text style={[styles.relayStatusText, { color: activeIndicatorColor }]}>
                  {isRelayLocked ? 'LOCKED' : relay.status === 'normal' ? (relay.isOn ? 'ON — Active' : 'OFF — Idle') : relay.status.toUpperCase()}
                </Text>
              </View>
            </View>
            {/* Individual Lock Button */}
            <TouchableOpacity
              onPress={handleRelayLock}
              style={[styles.lockBtn, { backgroundColor: isRelayLocked ? colors.warning + '22' : colors.secondary }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name={isRelayLocked ? 'lock' : 'unlock'} size={14} color={isRelayLocked ? colors.warning : colors.mutedForeground} />
            </TouchableOpacity>
            <Switch
              value={relay.isOn}
              onValueChange={handleToggle}
              disabled={isRelayLocked || relay.status === 'offline'}
              trackColor={{ false: colors.border, true: colors.success + '88' }}
              thumbColor={relay.isOn ? colors.success : colors.mutedForeground}
            />
          </View>

          <View style={styles.relayMetrics}>
            <View style={styles.relayMetric}>
              <Text style={styles.relayMetricLabel}>ACS Current</Text>
              <Text style={[styles.relayMetricValue, { color: colors.primary }]}>{relay.current.toFixed(2)} A</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.relayMetric}>
              <Text style={styles.relayMetricLabel}>Load Power</Text>
              <Text style={[styles.relayMetricValue, { color: colors.accent }]}>{relay.power.toFixed(0)} W</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.relayMetric}>
              <Text style={styles.relayMetricLabel}>Status</Text>
              <Text style={[styles.relayMetricValue, { color: activeIndicatorColor }]}>{isRelayLocked ? 'Locked' : relay.isOn ? 'Running' : 'Standby'}</Text>
            </View>
          </View>
        </View>
      )}

      {offline && (
        <View style={styles.offlineNote}>
          <Icon name="cloud-off" size={14} color={colors.warning} />
          <Text style={styles.offlineNoteText}>No backend connected — electrical data and relay status unavailable</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  subtitle: { color: colors.mutedForeground, fontSize: 12 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  offlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.warning + '22', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.warning + '44' },
  offlineText: { color: colors.warning, fontSize: 11, fontWeight: '700' },
  sectionTitle: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  paramsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paramCard: { width: '47.5%', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 13, gap: 4 },
  paramIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  paramValue: { fontSize: 22, fontWeight: '800' },
  paramUnit: { fontSize: 11, color: colors.mutedForeground, marginTop: -2 },
  paramLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600', marginTop: 2 },
  chartCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14, overflow: 'hidden' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartDot: { width: 8, height: 8, borderRadius: 4 },
  chartTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  chartValue: { fontSize: 18, fontWeight: '800' },
  relayCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, padding: 16, gap: 16 },
  relayTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  relayIconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  relayName: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  relayStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  relayDot: { width: 7, height: 7, borderRadius: 4 },
  relayStatusText: { fontSize: 12, fontWeight: '600' },
  lockBtn: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  relayMetrics: { flexDirection: 'row', backgroundColor: colors.secondary, borderRadius: 12, padding: 12 },
  relayMetric: { flex: 1, alignItems: 'center', gap: 4 },
  relayMetricLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600' },
  relayMetricValue: { fontSize: 16, fontWeight: '800' },
  metricDivider: { width: 1, backgroundColor: colors.border },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 48, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  emptyDesc: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center' },
  offlineNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warning + '11', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.warning + '33' },
  offlineNoteText: { flex: 1, color: colors.warning, fontSize: 12 },
  flex1: { flex: 1 },
});
