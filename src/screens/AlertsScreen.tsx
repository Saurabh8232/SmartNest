import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  Alert as AlertType,
  resolveAlert,
  subscribeToAlerts,
  subscribeToConnection,
} from '../socket/liveCommunication';
import colors from '../constants/colors';

const SEVERITY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning', label: 'Warning' },
  { key: 'info', label: 'Info' },
] as const;

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

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const removeAlerts = subscribeToAlerts(nextAlerts => {
      setAlerts(nextAlerts);
      setOffline(false);
      setRefreshing(false);
    });
    const removeConnection = subscribeToConnection(
      () => {
        setOffline(false);
        load();
      },
      () => {
        setOffline(true);
        setRefreshing(false);
      },
    );
    return () => {
      removeAlerts();
      removeConnection();
    };
  }, [load]);

  const handleResolve = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isResolved: true } : a));
    if (!offline) resolveAlert(id);
  }, [offline]);

  const displayed = alerts.filter(a =>
    !a.isResolved && (filter === 'all' || a.severity === filter)
  );

  const critCount = alerts.filter(a => !a.isResolved && a.severity === 'critical').length;
  const warnCount = alerts.filter(a => !a.isResolved && a.severity === 'warning').length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.flex1}>
          <Text style={styles.subtitle}>System Monitoring</Text>
          <Text style={styles.title}>Alerts</Text>
        </View>
        {offline && (
          <View style={styles.offlinePill}>
            <Icon name="wifi-off" size={11} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {!offline && (
        <View style={styles.summaryRow}>
          {[
            { label: 'Critical', val: critCount, color: colors.destructive, icon: 'alert-octagon' },
            { label: 'Warnings', val: warnCount, color: colors.warning, icon: 'alert-triangle' },
            { label: 'Total Active', val: alerts.filter(a => !a.isResolved).length, color: colors.primary, icon: 'bell' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.summaryItem}>
                <Icon name={s.icon} size={15} color={s.color} />
                <Text style={[styles.summaryVal, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      <View style={styles.filterRow}>
        {SEVERITY_FILTERS.map(f => {
          const active = filter === f.key;
          const fc = f.key === 'critical' ? colors.destructive : f.key === 'warning' ? colors.warning : f.key === 'info' ? colors.primary : colors.foreground;
          return (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={filterButtonStyle(active, f.key === 'all' ? colors.primary : fc)}>
              <Text style={[styles.filterText, { color: active ? (f.key === 'all' ? colors.background : '#fff') : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {offline ? (
        <View style={styles.emptyCard}>
          <Icon name="wifi-off" size={36} color={colors.warning} />
          <Text style={styles.emptyTitle}>Backend not connected</Text>
          <Text style={styles.emptyDesc}>Set your API URL in api.ts to see live alerts</Text>
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="check-circle" size={36} color={colors.success} />
          <Text style={styles.emptyTitle}>No {filter === 'all' ? '' : filter} alerts</Text>
          <Text style={styles.emptyDesc}>All systems are running normally</Text>
        </View>
      ) : (
        <View style={styles.alertList}>
          {displayed.map(a => {
            const c = severityColor(a.severity);
            return (
              <View key={a.id} style={[styles.alertCard, { borderLeftColor: c }]}>
                <View style={styles.alertTop}>
                  <View style={[styles.alertIcon, { backgroundColor: c + '22' }]}>
                    <Icon name={severityIcon(a.severity)} size={16} color={c} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.alertTitle}>{a.title}</Text>
                    {a.deviceName && <Text style={styles.alertDevice}>{a.deviceName}</Text>}
                  </View>
                  <View style={styles.alertRight}>
                    <View style={[styles.severityPill, { backgroundColor: c + '22' }]}>
                      <Text style={[styles.severityText, { color: c }]}>{a.severity.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.alertTime}>
                      {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>

                {a.description && (
                  <Text style={styles.alertDesc}>{a.description}</Text>
                )}

                {a.suggestedSolution && (
                  <View style={styles.solutionBox}>
                    <Icon name="tool" size={12} color={colors.accent} />
                    <Text style={styles.solutionText}>{a.suggestedSolution}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => handleResolve(a.id)}
                  activeOpacity={0.7}
                >
                  <Icon name="check" size={13} color={colors.success} />
                  <Text style={styles.resolveText}>Mark Resolved</Text>
                </TouchableOpacity>
              </View>
            );
          })}
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
  summaryRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryVal: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: colors.mutedForeground },
  divider: { width: 1, height: 40, backgroundColor: colors.border },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 9, borderRadius: 22, borderWidth: 1, alignItems: 'center' },
  filterText: { fontSize: 12, fontWeight: '600' },
  emptyCard: { alignItems: 'center', gap: 10, paddingVertical: 52, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  emptyDesc: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  alertList: { gap: 10 },
  alertCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, padding: 14, gap: 10 },
  alertTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  alertIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  alertTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  alertDevice: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  alertRight: { alignItems: 'flex-end', gap: 4 },
  severityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  severityText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  alertTime: { color: colors.mutedForeground, fontSize: 11 },
  alertDesc: { color: colors.mutedForeground, fontSize: 12, lineHeight: 18 },
  solutionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.accent + '11', borderRadius: 8, padding: 10 },
  solutionText: { flex: 1, color: colors.accent, fontSize: 12 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.success + '44', backgroundColor: colors.success + '11' },
  resolveText: { color: colors.success, fontSize: 13, fontWeight: '600' },
  flex1: { flex: 1 },
});

const filterButtonStyle = (active: boolean, activeColor: string) => [
  styles.filterBtn,
  {
    backgroundColor: active ? activeColor : 'transparent',
    borderColor: active ? activeColor : colors.border,
  },
];
