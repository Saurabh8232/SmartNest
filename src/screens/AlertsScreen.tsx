import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getAlerts, resolveAlert, Alert as AlertType } from '../api/api';
import colors from '../constants/colors';

type Filter = 'all' | 'critical' | 'warning' | 'info';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'critical', label: 'Critical' },
  { key: 'warning', label: 'Warning' }, { key: 'info', label: 'Info' },
];
const TYPE_ICONS: Record<string, string> = { electrical: 'zap', communication: 'wifi', relay: 'toggle-left' };

function severityColor(s: string) {
  if (s === 'critical') return colors.destructive;
  if (s === 'warning') return colors.warning;
  return colors.primary;
}

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      setOffline(false);
      const params = filter === 'all' ? {} : { severity: filter };
      const r = await getAlerts(params);
      setAlerts(r.alerts);
      setUnread(r.unreadCount);
    } catch {
      setOffline(true);
    }
  }, [filter]);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const handleResolve = useCallback(async (id: string) => {
    if (offline) {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isResolved: true } : a));
      setUnread(u => Math.max(0, u - 1));
      return;
    }
    try {
      const updated = await resolveAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? updated : a));
      setUnread(u => Math.max(0, u - 1));
    } catch {}
  }, [offline]);

  const displayed = showResolved ? alerts : alerts.filter(a => !a.isResolved);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>System</Text>
          <Text style={styles.title}>Alerts</Text>
        </View>
        <View style={styles.headerRight}>
          {unread > 0 && (
            <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unread}</Text></View>
          )}
          {offline && (
            <View style={styles.offlineBadge}>
              <Icon name="wifi-off" size={12} color={colors.warning} />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
            style={[styles.filterBtn, { backgroundColor: filter === f.key ? colors.primary : colors.card, borderColor: filter === f.key ? colors.primary : colors.border }]}>
            <Text style={[styles.filterText, { color: filter === f.key ? colors.background : colors.mutedForeground }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setShowResolved(!showResolved)}
          style={[styles.filterBtn, { backgroundColor: showResolved ? colors.success + '22' : colors.card, borderColor: showResolved ? colors.success : colors.border }]}>
          <Icon name="check-circle" size={12} color={showResolved ? colors.success : colors.mutedForeground} />
          <Text style={[styles.filterText, { color: showResolved ? colors.success : colors.mutedForeground }]}>Resolved</Text>
        </TouchableOpacity>
      </ScrollView>

      {displayed.length === 0 && (
        <View style={styles.empty}>
          <Icon name="check-circle" size={40} color={offline ? colors.warning : colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {offline ? 'No Backend Connected' : 'All Clear'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {offline ? 'Set your API URL in api.ts to see live alerts' : 'No alerts to display'}
          </Text>
        </View>
      )}

      <View style={styles.list}>
        {displayed.map(a => {
          const c = severityColor(a.severity);
          return (
            <View key={a.id} style={[styles.alertCard, { borderColor: a.isResolved ? colors.border : c + '44', borderLeftColor: a.isResolved ? colors.border : c, opacity: a.isResolved ? 0.6 : 1 }]}>
              <View style={styles.alertHeader}>
                <View style={[styles.alertIcon, { backgroundColor: c + '22' }]}>
                  <Icon name={TYPE_ICONS[a.type] ?? 'alert-triangle'} size={16} color={c} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.alertTitle} numberOfLines={1}>{a.title}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: c + '22' }]}>
                      <Text style={[styles.severityText, { color: c }]}>{a.severity.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.alertMeta}>{a.deviceName} · {new Date(a.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </View>
              <Text style={styles.alertDesc}>{a.description}</Text>
              <View style={[styles.solutionBox, { backgroundColor: c + '0f', borderColor: c + '33' }]}>
                <Icon name="info" size={12} color={c} />
                <Text style={styles.solutionText}>{a.suggestedSolution}</Text>
              </View>
              {!a.isResolved && (
                <TouchableOpacity onPress={() => handleResolve(a.id)}
                  style={[styles.resolveBtn, { backgroundColor: colors.success + '22', borderColor: colors.success + '44' }]}>
                  <Icon name="check" size={14} color={colors.success} />
                  <Text style={[styles.resolveBtnText, { color: colors.success }]}>Mark Resolved</Text>
                </TouchableOpacity>
              )}
              {a.isResolved && (
                <View style={[styles.resolvedTag, { backgroundColor: colors.success + '22' }]}>
                  <Icon name="check-circle" size={12} color={colors.success} />
                  <Text style={[styles.resolvedText, { color: colors.success }]}>Resolved</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subtitle: { color: colors.mutedForeground, fontSize: 12 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '700' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning + '22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  offlineText: { color: colors.warning, fontSize: 11, fontWeight: '600' },
  unreadBadge: { backgroundColor: colors.destructive, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, minWidth: 28, alignItems: 'center' },
  unreadText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filterRow: { gap: 8, paddingRight: 16 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  list: { gap: 12 },
  alertCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, padding: 14, gap: 10 },
  alertHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  alertIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: '600' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  severityText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  alertMeta: { color: colors.mutedForeground, fontSize: 11 },
  alertDesc: { color: colors.mutedForeground, fontSize: 13, lineHeight: 19 },
  solutionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  solutionText: { flex: 1, color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  resolveBtnText: { fontSize: 13, fontWeight: '600' },
  resolvedTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  resolvedText: { fontSize: 12, fontWeight: '500' },
});
