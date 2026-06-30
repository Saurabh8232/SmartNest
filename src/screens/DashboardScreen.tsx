import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Alert,
  RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  Alert as AlertType,
  DashboardData,
  masterUnlockAll,
  shutdownAll,
  requestDashboard,
  requestDashboardAlerts,
  subscribeToConnection,
  subscribeToDashboard,
  subscribeToDashboardAlerts,
} from '../socket/liveCommunication';
import { TimeSeriesPoint } from '../types/communication';
import { REST_BASE_URL } from '../config/communication';
import MiniChart from '../components/MiniChart';
import colors from '../constants/colors';

const CACHE_KEY = '@smartnest_dashboard_v1';

const DEFAULT_DATA: DashboardData = {
  systemOnline: false, totalDevices: 0, activeRelays: 0, totalCurrent: 0,
  voltage: 0, current: 0, power: 0, energy: 0, frequency: 0, powerFactor: 0,
  voltageHistory: [], powerHistory: [], energyHistory: [], currentHistory: [],
  lastUpdated: new Date().toISOString(),
};

function severityColor(s: string) {
  if (s === 'critical') return colors.destructive;
  if (s === 'warning') return colors.warning;
  return colors.primary;
}
function severityIcon(s: string) {
  if (s === 'critical') return 'alert-octagon';
  if (s === 'warning') return 'alert-triangle';
  return 'info';
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [powerHistory, setPowerHistory] = useState<TimeSeriesPoint[]>([]);
  const [currentHistory, setCurrentHistory] = useState<TimeSeriesPoint[]>([]);
  const hasLiveDashboardDataRef = useRef(false);

  // ── Load cached data on app start ─────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(raw => {
      if (!raw) return;
      try {
        const cached = JSON.parse(raw);
        if (!hasLiveDashboardDataRef.current) {
          if (cached.data)                    setData(cached.data);
          if (cached.powerHistory?.length)    setPowerHistory(cached.powerHistory);
          if (cached.currentHistory?.length)  setCurrentHistory(cached.currentHistory);
        }
      } catch {}
    });
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch(`${REST_BASE_URL}/dashboard`);
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.powerHistory)) setPowerHistory(json.powerHistory);
      if (Array.isArray(json.currentHistory)) setCurrentHistory(json.currentHistory);
    } catch {}
  }, []);

  const load = useCallback(() => {
    requestDashboard();
    requestDashboardAlerts();
    fetchTrends();
  }, [fetchTrends]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  useEffect(() => {
    const removeDashboard = subscribeToDashboard(dash => {
      hasLiveDashboardDataRef.current = true;
      setData(dash);
      setOffline(false);
      setRefreshing(false);
      // if (dash.powerHistory?.length)   setPowerHistory(dash.powerHistory);
      // if (dash.currentHistory?.length) setCurrentHistory(dash.currentHistory);

      // ── Save to cache for next app restart ──────────────────
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data: dash,
        powerHistory: dash.powerHistory ?? [],
        currentHistory: dash.currentHistory ?? [],
      })).catch(() => {});
    });

    const removeAlerts = subscribeToDashboardAlerts(nextAlerts => {
      setAlerts(nextAlerts.filter(a => !a.isResolved).slice(0, 3));
    });

    const removeConnection = subscribeToConnection(
      () => { setOffline(false); load(); },
      () => { setOffline(true); setRefreshing(false); },
    );

    return () => {
      removeDashboard();
      removeAlerts();
      removeConnection();
    };
  }, [load]);

  // ── Master Unlock All ────────────────────────────────────────
  const handleMasterUnlock = useCallback(() => {
    Alert.alert(
      'Master Unlock?',
      'All locked relays on Main Board and Digital Board will be unlocked.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unlock All', onPress: () => { masterUnlockAll(); } },
      ]
    );
  }, []);

  // ── Master Shutdown (one-shot) ───────────────────────────────
  const handleMasterShutdown = useCallback(() => {
    Alert.alert(
      'Master Shutdown?',
      'All relays on Main Board and Digital Board will be turned OFF immediately. Relay controls continue working normally after shutdown.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shutdown All',
          style: 'destructive',
          onPress: () => { shutdownAll(); },
        },
      ]
    );
  }, []);

  const updatedTime = new Date(data.lastUpdated).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });

  const rawTemperature = (data as any).temperature ?? (data as any).Temperature;
  const rawHumidity = (data as any).humidity ?? (data as any).Humidity;
  const temperatureValue = typeof rawTemperature === 'number' ? rawTemperature : Number.parseFloat(String(rawTemperature).replace(/[^0-9.-]/g, ''));
  const humidityValue = typeof rawHumidity === 'number' ? rawHumidity : Number.parseFloat(String(rawHumidity).replace(/[^0-9.-]/g, ''));

  const paramCards = [
    { label: 'Voltage',       value: data.voltage > 0 ? data.voltage.toFixed(1) : '--',       unit: 'V',    icon: 'zap',              color: colors.primary  },
    { label: 'Current',       value: data.current > 0 ? data.current.toFixed(2) : '--',       unit: 'A',    icon: 'activity',         color: colors.primary  },
    { label: 'Power',         value: data.power > 0   ? data.power.toFixed(0)   : '--',       unit: 'W',    icon: 'cpu',              color: colors.accent   },
    { label: 'Energy',        value: data.energy > 0  ? data.energy.toFixed(2)  : '--',       unit: 'kWh',  icon: 'battery-charging', color: colors.success  },
    { label: 'Temperature',   value: Number.isFinite(temperatureValue) ? temperatureValue.toFixed(0) : '--', unit: '°C', icon: 'thermometer', color: colors.warning },
    { label: 'Humidity',      value: Number.isFinite(humidityValue)    ? humidityValue.toFixed(0)    : '--', unit: '%',  icon: 'droplet',     color: '#38bdf8'      },
    { label: 'Active Relays', value: String(data.activeRelays),  unit: '', icon: 'toggle-right', color: colors.success },
    { label: 'Devices Online',value: String(data.totalDevices),  unit: '', icon: 'wifi',          color: colors.primary },
  ];

  const cardW = (width - 32 - 10) / 2;
  const chartW = (width - 32 - 10) / 2;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.updatedText}>Updated {updatedTime}</Text>
        </View>
        <View style={[styles.statusPill, { borderColor: data.systemOnline && !offline ? colors.success + '55' : colors.destructive + '55', backgroundColor: data.systemOnline && !offline ? colors.success + '15' : colors.destructive + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: data.systemOnline && !offline ? colors.success : colors.destructive }]} />
          <Text style={[styles.statusText, { color: data.systemOnline && !offline ? colors.success : colors.destructive }]}>
            {offline ? 'Offline' : data.systemOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Live Parameters */}
      <Text style={styles.sectionLabel}>LIVE PARAMETERS</Text>
      <View style={styles.cardsGrid}>
        {paramCards.map(c => (
          <View key={c.label} style={[styles.paramCard, { width: cardW, borderTopColor: c.color }]}>
            <View style={styles.paramTop}>
              <View style={[styles.paramIconWrap, { backgroundColor: c.color + '20' }]}>
                <Icon name={c.icon} size={14} color={c.color} />
              </View>
              <Text style={styles.paramLabel}>{c.label}</Text>
            </View>
            <Text style={[styles.paramValue, { color: c.color }]}>
              {c.value}<Text style={[styles.paramUnit, { color: c.color + 'bb' }]}>{c.unit ? ` ${c.unit}` : ''}</Text>
            </Text>
          </View>
        ))}
      </View>

      {/* Trend Graphs */}
      <Text style={styles.sectionLabel}>TREND GRAPHS</Text>
      <View style={styles.chartsRow}>
        <View style={[styles.chartCard, { width: chartW }]}>
          <Text style={styles.chartTitle}>Power Trend</Text>
          <Text style={styles.chartSub}>24 Hours</Text>
          {powerHistory.length > 1 ? (
            <MiniChart data={powerHistory} color={colors.accent} height={56} width={chartW - 24} />
          ) : (
            <View style={[styles.noChartData, { width: chartW - 24 }]}>
              <Text style={styles.noChartText}>No data</Text>
            </View>
          )}
          <Text style={[styles.chartCurrent, { color: colors.accent }]}>{data.power.toFixed(0)} W</Text>
        </View>

        <View style={[styles.chartCard, { width: chartW }]}>
          <Text style={styles.chartTitle}>Energy Usage</Text>
          <Text style={styles.chartSub}>Today</Text>
          {currentHistory.length > 1 ? (
            <MiniChart data={currentHistory} color={colors.success} height={56} width={chartW - 24} />
          ) : (
            <View style={[styles.noChartData, { width: chartW - 24 }]}>
              <Text style={styles.noChartText}>No data</Text>
            </View>
          )}
          <Text style={[styles.chartCurrent, { color: colors.success }]}>{data.energy.toFixed(2)} kWh</Text>
        </View>
      </View>

      {/* ── GLOBAL SYSTEM CONTROLS ─────────────────────────────── */}
      <Text style={styles.sectionLabel}>GLOBAL SYSTEM CONTROLS</Text>
      <View style={styles.globalRow}>
        {/* Master Unlock All */}
        <TouchableOpacity
          onPress={handleMasterUnlock}
          activeOpacity={0.8}
          style={styles.unlockBtn}
        >
          <View style={[styles.globalIcon, { backgroundColor: colors.success + '22' }]}>
            <Icon name="unlock" size={20} color={colors.success} />
          </View>
          <Text style={[styles.globalTitle, { color: colors.success }]}>Unlock All</Text>
          <Text style={styles.globalDesc}>Release all locked relays</Text>
        </TouchableOpacity>

        {/* Master Shutdown */}
        <TouchableOpacity
          onPress={handleMasterShutdown}
          activeOpacity={0.8}
          style={styles.shutdownBtn}
        >
          <View style={[styles.globalIcon, { backgroundColor: colors.destructive + '22' }]}>
            <Icon name="power" size={20} color={colors.destructive} />
          </View>
          <Text style={[styles.globalTitle, { color: colors.destructive }]}>Shutdown</Text>
          <Text style={styles.globalDesc}>Turn off all relays</Text>
        </TouchableOpacity>
      </View>
      {/* ── END GLOBAL CONTROLS ────────────────────────────────── */}

      {/* Recent Alerts */}
      <View style={styles.alertsHeader}>
        <Text style={styles.sectionLabel}>RECENT ALERTS</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AllAlerts')}>
          <Text style={[styles.viewAllLink, { color: colors.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.noAlerts}>
          <Icon name="check-circle" size={20} color={colors.success} />
          <Text style={styles.noAlertsText}>
            {offline ? 'Connect backend to see alerts' : 'No active alerts — all systems normal'}
          </Text>
        </View>
      ) : (
        <View style={styles.alertList}>
          {alerts.map(a => {
            const c = severityColor(a.severity);
            return (
              <View key={a.id} style={[styles.alertRow, { borderLeftColor: c }]}>
                <Icon name={severityIcon(a.severity)} size={15} color={c} />
                <View style={styles.flex1}>
                  <Text style={styles.alertTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.alertMeta}>
                    {a.deviceName ? `${a.deviceName} · ` : ''}
                    {new Date(a.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={[styles.severityTag, { backgroundColor: c + '22' }]}>
                  <Text style={[styles.severityText, { color: c }]}>{a.severity.toUpperCase()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={styles.viewAllAlertsBtn}
        onPress={() => navigation.navigate('AllAlerts')}
        activeOpacity={0.8}
      >
        <Icon name="bell" size={14} color={colors.primary} />
        <Text style={styles.viewAllAlertsBtnText}>View All Alerts</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  title: { color: colors.foreground, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  updatedText: { color: colors.mutedForeground, fontSize: 11, marginTop: 3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  sectionLabel: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paramCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 13, gap: 8, borderTopWidth: 2 },
  paramTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paramIconWrap: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  paramLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600', flex: 1 },
  paramValue: { fontSize: 20, fontWeight: '800' },
  paramUnit: { fontSize: 12, fontWeight: '400' },
  chartsRow: { flexDirection: 'row', gap: 10 },
  chartCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 4 },
  chartTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  chartSub: { color: colors.mutedForeground, fontSize: 10 },
  chartCurrent: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  noChartData: { height: 56, alignItems: 'center', justifyContent: 'center' },
  noChartText: { color: colors.mutedForeground, fontSize: 11 },
  // ── Global system controls ──────────────────────────────────
  globalRow: { flexDirection: 'row', gap: 10 },
  unlockBtn: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.success + '44', padding: 14, gap: 6, alignItems: 'center' },
  shutdownBtn: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.destructive + '44', padding: 14, gap: 6, alignItems: 'center' },
  globalIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  globalTitle: { fontSize: 14, fontWeight: '700' },
  globalDesc: { fontSize: 10, color: colors.mutedForeground, textAlign: 'center' },
  // ── Alerts ──────────────────────────────────────────────────
  alertsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAllLink: { fontSize: 12, fontWeight: '600' },
  noAlerts: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '11', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.success + '22' },
  noAlertsText: { color: colors.mutedForeground, fontSize: 13, flex: 1 },
  alertList: { gap: 8 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, padding: 12 },
  alertTitle: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  alertMeta: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  severityTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '700' },
  viewAllAlertsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  viewAllAlertsBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  flex1: { flex: 1 },
});
