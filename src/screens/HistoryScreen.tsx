import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getHistory, HistoryData } from '../api/api';
import MiniChart from '../components/MiniChart';
import colors from '../constants/colors';

type Period = 'today' | 'yesterday' | 'last7days' | 'last30days';
type Tab = 'electrical' | 'relay' | 'ac';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7days', label: '7 Days' }, { key: 'last30days', label: '30 Days' },
];
const TABS: { key: Tab; label: string }[] = [
  { key: 'electrical', label: 'Electrical' }, { key: 'relay', label: 'Relay' }, { key: 'ac', label: 'AC' },
];

const DEFAULT_DATA: HistoryData = {
  powerTrend: [],
  energyTrend: [],
  electricalRecords: [],
  relayRecords: [],
  acRecords: [],
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('today');
  const [tab, setTab] = useState<Tab>('electrical');
  const [data, setData] = useState<HistoryData>(DEFAULT_DATA);
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>Analytics</Text>
          <Text style={styles.title}>History</Text>
        </View>
        {offline && (
          <View style={styles.offlineBadge}>
            <Icon name="wifi-off" size={12} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} onPress={() => setPeriod(p.key)}
            style={[styles.filterBtn, { backgroundColor: period === p.key ? colors.primary : colors.card, borderColor: period === p.key ? colors.primary : colors.border }]}>
            <Text style={[styles.filterText, { color: period === p.key ? colors.background : colors.mutedForeground }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {(offline || loading) && (
        <View style={styles.statusBanner}>
          <Icon name={offline ? 'wifi-off' : 'clock'} size={14} color={offline ? colors.warning : colors.mutedForeground} />
          <Text style={[styles.statusBannerText, { color: offline ? colors.warning : colors.mutedForeground }]}>
            {offline ? 'No backend connected yet. Charts will appear when real data is available.' : 'Loading history data...'}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>TRENDS</Text>
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}><Text style={styles.chartTitle}>Power Consumption</Text><Icon name="zap" size={16} color={colors.accent} /></View>
        {data.powerTrend.length > 1 ? (
          <MiniChart data={data.powerTrend} color={colors.accent} height={64} />
        ) : (
          <View style={styles.chartEmpty}>
            <Text style={styles.chartEmptyTitle}>No power trend yet</Text>
            <Text style={styles.chartEmptyText}>Connect the backend and this chart will show live data.</Text>
          </View>
        )}
      </View>
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}><Text style={styles.chartTitle}>Energy Usage</Text><Icon name="battery-charging" size={16} color={colors.success} /></View>
        {data.energyTrend.length > 1 ? (
          <MiniChart data={data.energyTrend} color={colors.success} height={64} />
        ) : (
          <View style={styles.chartEmpty}>
            <Text style={styles.chartEmptyTitle}>No energy trend yet</Text>
            <Text style={styles.chartEmptyText}>Connect the backend and this chart will show live data.</Text>
          </View>
        )}
      </View>

      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={[styles.tabBtn, tab === t.key ? styles.tabBtnActive : styles.tabBtnInactive]}>
            <Text style={[styles.tabText, { color: tab === t.key ? colors.background : colors.mutedForeground }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'electrical' && (
        <View style={styles.list}>
          {data.electricalRecords.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No electrical records for this period</Text></View>
          ) : data.electricalRecords.slice(0, 15).map(r => (
            <View key={r.id} style={styles.recordCard}>
              <Text style={styles.recordTime}>{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <View style={styles.pills}>
                {([['V', r.voltage.toFixed(1), colors.warning], ['A', r.current.toFixed(2), colors.primary], ['W', r.power.toFixed(0), colors.accent], ['PF', r.powerFactor.toFixed(2), colors.success]] as [string, string, string][]).map(([l, v, c]) => (
                  <View key={l} style={[styles.pill, { backgroundColor: c + '18' }]}>
                    <Text style={[styles.pillLabel, { color: colors.mutedForeground }]}>{l}</Text>
                    <Text style={[styles.pillValue, { color: c }]}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {tab === 'relay' && (
        <View style={styles.list}>
          {data.relayRecords.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No relay records for this period</Text></View>
          ) : data.relayRecords.slice(0, 20).map(r => (
            <View key={r.id} style={styles.relayRecord}>
              <View style={[styles.actionDot, { backgroundColor: r.action === 'on' ? colors.success : colors.destructive }]} />
              <View style={styles.flex1}>
                <Text style={styles.relayName}>{r.relayName}</Text>
                <Text style={styles.relayMeta}>{r.userAction} · {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View style={[styles.actionBadge, { backgroundColor: r.action === 'on' ? colors.success + '22' : colors.destructive + '22' }]}>
                <Text style={[styles.actionText, { color: r.action === 'on' ? colors.success : colors.destructive }]}>{r.action.toUpperCase()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {tab === 'ac' && (
        <View style={styles.list}>
          {data.acRecords.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No AC records for this period</Text></View>
          ) : data.acRecords.map(r => (
            <View key={r.id} style={styles.relayRecord}>
              <View style={[styles.acIcon, { backgroundColor: colors.primary + '22' }]}><Icon name="wind" size={14} color={colors.primary} /></View>
              <View style={styles.flex1}>
                <Text style={styles.relayName}>{r.action}</Text>
                <Text style={styles.relayMeta}>{r.oldValue} → {r.newValue}</Text>
              </View>
              <Text style={styles.relayMeta}>{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          ))}
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
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning + '22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  offlineText: { color: colors.warning, fontSize: 11, fontWeight: '600' },
  filterRow: { gap: 8, paddingRight: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  statusBannerText: { flex: 1, fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, marginTop: 4 },
  chartCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  chartEmpty: { height: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  chartEmptyTitle: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  chartEmptyText: { color: colors.mutedForeground, fontSize: 11, textAlign: 'center', marginTop: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnInactive: { backgroundColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '600' },
  flex1: { flex: 1 },
  list: { gap: 8 },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 36, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  emptyText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  recordCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
  recordTime: { color: colors.mutedForeground, fontSize: 11 },
  pills: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  pillLabel: { fontSize: 9, fontWeight: '500' },
  pillValue: { fontSize: 13, fontWeight: '700' },
  relayRecord: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionDot: { width: 10, height: 10, borderRadius: 5 },
  relayName: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  relayMeta: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  actionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  actionText: { fontSize: 11, fontWeight: '700' },
  acIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
