// Energy history and date filtering screen.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {
  getHistory,
  HistoryData,
  EnergyRecord,
  HistoryDateRange,
} from '../api/historyApi';
import DateRangePicker from '../components/DateRangePicker';
import MiniChart from '../components/MiniChart';
import colors from '../constants/colors';

type PresetPeriod = 'today' | 'last7days' | 'last30days';
type Period = PresetPeriod | 'custom';
type Tab = 'energy';

const PERIODS: { key: PresetPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'last7days', label: '7 Days' },
  { key: 'last30days', label: '30 Days' },
];
const MINIMUM_HISTORY_DATE = new Date(2000, 0, 1);

const TABS: { key: Tab; label: string; icon: string; color: string }[] = [
  {
    key: 'energy',
    label: 'Energy',
    icon: 'battery-charging',
    color: colors.success,
  },
];

const DEFAULT_DATA: HistoryData = {
  filter: 'today',
  summary: { totalEnergyKwh: 0, recordCount: 0 },
  records: [],
};

function periodLabel(p: Period) {
  if (p === 'today') return 'Last 24 hours';
  if (p === 'last7days') return 'Last 7 days';
  if (p === 'custom') return 'Custom range';
  return 'Last 30 days';
}

function formatRecordTime(date: string) {
  const parsed = new Date(date);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.slice(11, 16) || '--:--';
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const chartWidth = width - 64;
  const tabScrollRef = useRef<ScrollView>(null);

  const [period, setPeriod] = useState<Period>('today');
  const [tab, setTab] = useState<Tab>('energy');
  const [data, setData] = useState<HistoryData>(DEFAULT_DATA);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [customRange, setCustomRange] = useState<HistoryDateRange | null>(null);
  const [datePickerOpenSignal, setDatePickerOpenSignal] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (period === 'custom' && !customRange) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setOffline(false);
      setErrorText('');
      setLoading(true);
      const nextData = await getHistory(
        period,
        controller.signal,
        customRange ?? undefined,
      );
      if (requestIdRef.current !== requestId) return;
      setData(nextData);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      if ((error as Error).name === 'AbortError') return;
      setOffline(true);
      setData(DEFAULT_DATA);
      setErrorText(
        error instanceof Error ? error.message : 'Unable to load history.',
      );
    } finally {
      if (requestIdRef.current !== requestId) return;
      setLoading(false);
    }
  }, [customRange, period]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const trend = data.records.map(record => ({
    timestamp: record.date,
    value: record.totalEnergyKwh,
  }));

  const hasData = trend.length > 0;
  const maximumHistoryDate = new Date();

  const handleCustomApply = useCallback((fromDate: Date, toDate: Date) => {
    setCustomRange({ fromDate, toDate });
    setPeriod('custom');
  }, []);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Analytics & trends</Text>
        </View>
        {offline && (
          <View style={styles.offlinePill}>
            <View
              style={[styles.dot, { backgroundColor: colors.destructive }]}
            />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      <View style={styles.periodRow}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[
                styles.periodBtn,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  {
                    color: active ? colors.background : colors.mutedForeground,
                  },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => setDatePickerOpenSignal(value => value + 1)}
          style={[styles.periodBtn, styles.customPeriodBtn]}
        >
          <Icon name="calendar" size={11} color={colors.mutedForeground} />
          <Text style={[styles.periodText, { color: colors.mutedForeground }]}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      <DateRangePicker
        fromDate={customRange?.fromDate ?? null}
        toDate={customRange?.toDate ?? null}
        minimumDate={MINIMUM_HISTORY_DATE}
        maximumDate={maximumHistoryDate}
        onApply={handleCustomApply}
        openSignal={datePickerOpenSignal}
        showTrigger={false}
      />

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
              style={[
                styles.tabBtn,
                {
                  backgroundColor: active ? t.color : colors.card,
                  borderColor: active ? t.color : colors.border,
                },
              ]}
            >
              <Icon
                name={t.icon}
                size={13}
                color={active ? colors.background : t.color}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? colors.background : colors.mutedForeground,
                  },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.emptyCard}>
          <Icon name="clock" size={42} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      ) : offline ? (
        <View style={styles.emptyCard}>
          <Icon name="wifi-off" size={42} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Not Connected</Text>
          <Text style={styles.emptyDesc}>
            {errorText || 'Check your backend connection and login session.'}
          </Text>
        </View>
      ) : !hasData ? (
        <View style={styles.emptyCard}>
          <View style={styles.noDataIconWrap}>
            <Icon name="trending-up" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptyDesc}>
            No records found for the selected period.
          </Text>
        </View>
      ) : (
        <>
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
              <MiniChart
                data={trend}
                color={colors.success}
                height={80}
                width={chartWidth}
              />
              <View style={styles.xAxis}>
                {['00:00', '06:00', '12:00', '18:00', '24:00'].map(l => (
                  <Text key={l} style={styles.xLabel}>
                    {l}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {data.records.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>ENERGY RECORDS</Text>
              <View style={styles.recList}>
                {data.records.slice(0, 15).map((r: EnergyRecord) => (
                  <View key={r.recordId} style={styles.recCard}>
                    <View
                      style={[
                        styles.recDot,
                        { backgroundColor: colors.success },
                      ]}
                    />
                    <Text style={styles.recTime}>
                      {formatRecordTime(r.date)}
                    </Text>
                    <Text style={[styles.recVal, { color: colors.success }]}>
                      {Number(r.totalEnergyKwh).toFixed(3)} kWh
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },

  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.destructive + '15',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.destructive + '44',
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  offlineText: { color: colors.destructive, fontSize: 11, fontWeight: '700' },

  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  customPeriodBtn: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    gap: 5,
  },
  periodText: { fontSize: 12, fontWeight: '600' },

  tabScroll: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  tabText: { fontSize: 13, fontWeight: '600' },

  sectionLabel: {
    color: colors.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  emptyCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 64,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noDataIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: colors.foreground, fontSize: 17, fontWeight: '700' },
  emptyDesc: {
    color: colors.mutedForeground,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  chartPeriod: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  kwhBadge: {
    backgroundColor: colors.success + '15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success + '55',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  kwhText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  xLabel: { color: colors.mutedForeground, fontSize: 9 },

  recList: { gap: 8 },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  recTime: { color: colors.mutedForeground, fontSize: 12, width: 52 },
  recVal: { fontSize: 15, fontWeight: '700', flex: 1 },
});
