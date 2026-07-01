import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getHistory, HistoryData, EnergyRecord, AcRecord } from '../api/historyApi';
import MiniChart from '../components/MiniChart';
import colors from '../constants/colors';

// ── Types ─────────────────────────────────────────────────────────────────────
// Only Energy and AC are active.
// Power / Current / Voltage / Temp are disabled — not in HistoryData.
type Period = 'today' | 'last7days' | 'last30days';
type Tab = 'energy' | 'ac';

// ── Constants ─────────────────────────────────────────────────────────────────
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today',      label: 'Today'   },
  { key: 'last7days',  label: '7 Days'  },
  { key: 'last30days', label: '30 Days' },
];

// Tabs — power / current / voltage / temp commented out 
const TABS: { key: Tab; label: string; icon: string; color: string }[] = [
  // { key: 'power',   label: 'Power',   icon: 'zap',              color: colors.accent  },
  { key: 'energy',  label: 'Energy',  icon: 'battery-charging', color: colors.success },
  // { key: 'current', label: 'Current', icon: 'activity',          color: colors.primary },
  // { key: 'voltage', label: 'Voltage', icon: 'zap-off',           color: colors.warning },
  // { key: 'temp',    label: 'Temp',    icon: 'thermometer',       color: '#f59e0b'      },
  { key: 'ac',      label: 'AC',      icon: 'wind',             color: '#38bdf8'      },
];

// HistoryData shape (from historyApi.ts / types/communication.ts):
//   energyRecords: EnergyRecord[]  — { id, timestamp, energy }
//   energyTrend:   TimeSeriesPoint[] — { timestamp, value }
//   acRecords:     AcRecord[]
const DEFAULT_DATA: HistoryData = {
  energyRecords: [],
  energyTrend:   [],
  acRecords:     [],
};

function periodLabel(p: Period) {
  if (p === 'today')     return 'Last 24 hours';
  if (p === 'last7days') return 'Last 7 days';
  return 'Last 30 days';
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const chartWidth = width - 64;
  const tabScrollRef = useRef<ScrollView>(null);

  const [period, setPeriod]   = useState<Period>('today');
  const [tab, setTab]         = useState<Tab>('energy');
  const [data, setData]       = useState<HistoryData>(DEFAULT_DATA);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setOffline(false);
      setLoading(true);
      setData(await getHistory(period));
    } catch {
      setOffline(true);
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Trend for chart — only energyTrend exists in HistoryData
  const trend = tab === 'energy' ? (data.energyTrend ?? []) : [];

  // hasData check — uses only real HistoryData fields
  const hasData =
    (tab === 'energy' && (trend.length > 1 || (data.energyRecords ?? []).length > 0)) ||
    (tab === 'ac'     && (data.acRecords ?? []).length > 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Analytics & trends</Text>
        </View>
        {offline && (
          <View style={styles.offlinePill}>
            <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {/* ── Period filter ── */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.periodBtn, {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor:     active ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.periodText, { color: active ? colors.background : colors.mutedForeground }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => Alert.alert('Custom Range', 'Custom date range coming soon.')}
          style={[styles.periodBtn, styles.customPeriodBtn]}
        >
          <Icon name="calendar" size={11} color={colors.mutedForeground} />
          <Text style={[styles.periodText, { color: colors.mutedForeground }]}>Custom</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category tabs (Energy & AC only) ── */}
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScroll}
      >
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, {
                backgroundColor: active ? t.color : colors.card,
                borderColor:     active ? t.color : colors.border,
              }]}
            >
              <Icon name={t.icon} size={13} color={active ? colors.background : t.color} />
              <Text style={[styles.tabText, { color: active ? colors.background : colors.mutedForeground }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Loading / Offline ── */}
      {(offline || loading) ? (
        <View style={styles.emptyCard}>
          <Icon name={offline ? 'wifi-off' : 'clock'} size={42} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>{offline ? 'Not Connected' : 'Loading...'}</Text>
          {offline && <Text style={styles.emptyDesc}>Check your device connection and BASE_URL in config.</Text>}
        </View>

      ) : !hasData ? (
        /* ── No Data ── */
        <View style={styles.emptyCard}>
          <View style={styles.noDataIconWrap}>
            <Icon name="trending-up" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptyDesc}>Select a period and category to view data.</Text>
        </View>

      ) : tab === 'energy' ? (
        /* ── Energy Tab ── */
        <>
          {/* Energy trend chart — uses energyTrend: TimeSeriesPoint[] */}
          {trend.length > 1 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Energy Trend</Text>
                  <Text style={styles.chartPeriod}>{periodLabel(period)}</Text>
                </View>
                <View style={styles.kwhBadge}>
                  <Text style={styles.kwhText}>kWh</Text>
                </View>
              </View>
              <MiniChart data={trend} color={colors.success} height={80} width={chartWidth} />
              <View style={styles.xAxis}>
                {['00:00', '06:00', '12:00', '18:00', '24:00'].map(l => (
                  <Text key={l} style={styles.xLabel}>{l}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Energy records list — uses energyRecords: EnergyRecord[] { id, timestamp, energy } */}
          {(data.energyRecords ?? []).length > 0 && (
            <>
              <Text style={styles.sectionLabel}>ENERGY RECORDS</Text>
              <View style={styles.recList}>
                {(data.energyRecords ?? []).slice(0, 15).map((r: EnergyRecord) => (
                  <View key={r.id} style={styles.recCard}>
                    <View style={[styles.recDot, { backgroundColor: colors.success }]} />
                    <Text style={styles.recTime}>
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.recVal, { color: colors.success }]}>
                      {Number(r.energy).toFixed(3)} kWh
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>

      ) : (
        /* ── AC Tab ── uses acRecords: AcRecord[] { id, timestamp, action, oldValue?, newValue? } */
        <>
          <Text style={styles.sectionLabel}>AC ACTIVITY</Text>
          <View style={styles.recList}>
            {(data.acRecords ?? []).length === 0 ? (
              <View style={styles.noDataCard}>
                <Icon name="wind" size={24} color={colors.mutedForeground} />
                <Text style={styles.noDataText}>No AC activity for this period</Text>
              </View>
            ) : (data.acRecords ?? []).map((r: AcRecord) => (
              <View key={r.id} style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Icon name="wind" size={13} color="#38bdf8" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.recTitle}>{r.action}</Text>
                  {r.oldValue && r.newValue && (
                    <Text style={styles.recMeta}>{r.oldValue} → {r.newValue}</Text>
                  )}
                </View>
                <Text style={styles.recMeta}>
                  {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },
  flex1: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },

  offlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.destructive + '15', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.destructive + '44' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  offlineText: { color: colors.destructive, fontSize: 11, fontWeight: '700' },

  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 22, borderWidth: 1 },
  customPeriodBtn: { backgroundColor: colors.card, borderColor: colors.border, gap: 5 },
  periodText: { fontSize: 12, fontWeight: '600' },

  tabScroll: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1 },
  tabText: { fontSize: 13, fontWeight: '600' },

  sectionLabel: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  emptyCard: { alignItems: 'center', gap: 12, paddingVertical: 64, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  noDataIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.foreground, fontSize: 17, fontWeight: '700' },
  emptyDesc: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },

  chartCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12, overflow: 'hidden' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  chartPeriod: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  kwhBadge: { backgroundColor: colors.success + '15', borderRadius: 10, borderWidth: 1, borderColor: colors.success + '55', paddingHorizontal: 10, paddingVertical: 5 },
  kwhText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  xLabel: { color: colors.mutedForeground, fontSize: 9 },

  noDataCard: { alignItems: 'center', gap: 8, paddingVertical: 32, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  noDataText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },

  recList: { gap: 8 },
  recCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  recTime: { color: colors.mutedForeground, fontSize: 12, width: 52 },
  recVal: { fontSize: 15, fontWeight: '700', flex: 1 },
  recMeta: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },

  activityCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  activityIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#38bdf822', alignItems: 'center', justifyContent: 'center' },
  recTitle: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
});
