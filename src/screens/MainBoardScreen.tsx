import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  controlMainRelay,
  lockMainRelay,
  MainBoardStatus,
  requestMainBoard,
  subscribeToConnection,
  subscribeToMainBoard,
  subscribeToShutdownAll,
} from '../socket/liveCommunication';
import colors from '../constants/colors';

const CACHE_KEY = '@smartnest_mainboard_v1';
const DEFAULT_DATA: MainBoardStatus = { masterLockEnabled: false, shutdownEnabled: false, totalCurrent: 0, relays: [] };

export default function MainBoardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [data, setData] = useState<MainBoardStatus>(DEFAULT_DATA);
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

  const load = useCallback(() => { requestMainBoard(); }, []);

  useEffect(() => {
    const removeBoard = subscribeToMainBoard(status => {
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
    const removeShutdownAll = subscribeToShutdownAll(() => {
      setData(prev => {
        const next = {
          ...prev,
          totalCurrent: 0,
          relays: prev.relays.map(relay => ({
            ...relay,
            isOn: false,
            current: 0,
          })),
        };
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      setRefreshing(false);
    });
    return () => { removeBoard(); removeConnection(); removeShutdownAll(); };
  }, [load]);

  const handleToggle = useCallback((id: string, action: 'on' | 'off') => {
    setData(prev => ({
      ...prev,
      relays: prev.relays.map(r => r.id === id ? { ...r, isOn: action === 'on' } : r),
    }));
    if (offline) return;
    controlMainRelay(id, action);
  }, [offline]);

  const handleRelayLock = useCallback((id: string, currentLocked: boolean) => {
    const next = !currentLocked;
    Alert.alert(
      next ? 'Lock Relay?' : 'Unlock Relay?',
      next ? 'This relay will be locked. Toggle control will be disabled.' : 'This relay will be unlocked and can be controlled again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Lock' : 'Unlock',
          onPress: () => {
            setData(prev => ({
              ...prev,
              relays: prev.relays.map(r => r.id === id ? { ...r, locked: next } : r),
            }));
            if (!offline) lockMainRelay(id, next);
          },
        },
      ]
    );
  }, [offline]);

  const activeRelays = data.relays.filter(r => r.isOn).length;

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
          <Text style={styles.subtitle}>Control Panel</Text>
          <Text style={styles.title}>Main Board</Text>
        </View>
        {offline && (
          <View style={styles.offlinePill}>
            <Icon name="wifi-off" size={11} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Total Current', val: `${data.totalCurrent.toFixed(2)} A`, color: colors.primary, icon: 'activity' },
          { label: 'Active Relays', val: `${activeRelays} / ${data.relays.length}`, color: colors.accent, icon: 'toggle-right' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
              <Icon name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>RELAY CONTROLS</Text>

      {data.relays.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="cpu" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>{offline ? 'Backend not connected' : 'No relays configured'}</Text>
          <Text style={styles.emptyDesc}>{offline ? 'Set your API URL in api.ts' : 'Relays will appear here once configured'}</Text>
        </View>
      ) : (
        <View style={styles.relayList}>
          {data.relays.map(r => {
            const isLocked = (r as any).locked ?? false;
            const statusColor = r.status === 'error' ? colors.destructive : r.status === 'offline' ? colors.mutedForeground : r.isOn ? colors.success : colors.border;
            const cardBorderColor = isLocked ? colors.warning + '55' : r.isOn ? statusColor + '44' : colors.border;
            const indicatorColor = isLocked ? colors.warning : statusColor;
            return (
              <View key={r.id} style={[styles.relayCard, { borderColor: cardBorderColor }]}>
                <View style={[styles.relayIndicator, { backgroundColor: indicatorColor }]} />
                <View style={styles.relayInfo}>
                  <Text style={styles.relayNum}>RELAY {r.number}</Text>
                  <Text style={styles.relayName} numberOfLines={1}>{r.name}</Text>
                  <View style={styles.relayMeta}>
                    <Text style={styles.relayMetaText}>{r.current.toFixed(2)} A</Text>
                    <View style={[styles.relayStatusTag, { backgroundColor: indicatorColor + '22' }]}>
                      <Text style={[styles.relayStatusText, { color: indicatorColor }]}>
                        {isLocked ? 'LOCKED' : r.status === 'normal' ? (r.isOn ? 'ON' : 'OFF') : r.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                {/* Individual Lock Button */}
                <TouchableOpacity
                  onPress={() => handleRelayLock(r.id, isLocked)}
                  style={[styles.lockBtn, { backgroundColor: isLocked ? colors.warning + '22' : colors.secondary }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name={isLocked ? 'lock' : 'unlock'} size={14} color={isLocked ? colors.warning : colors.mutedForeground} />
                </TouchableOpacity>
                <Switch
                  value={r.isOn}
                  onValueChange={(next) => handleToggle(r.id, next ? 'on' : 'off')}
                  disabled={isLocked || r.status === 'offline'}
                  trackColor={{ false: colors.border, true: colors.primary + '88' }}
                  thumbColor={r.isOn ? colors.primary : colors.mutedForeground}
                />
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
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.mutedForeground },
  sectionTitle: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  relayList: { gap: 8 },
  relayCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, padding: 14 },
  relayIndicator: { width: 4, height: 44, borderRadius: 2 },
  relayInfo: { flex: 1 },
  relayNum: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600', letterSpacing: 0.5 },
  relayName: { color: colors.foreground, fontSize: 15, fontWeight: '600', marginTop: 1 },
  relayMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  relayMetaText: { color: colors.mutedForeground, fontSize: 12 },
  relayStatusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  relayStatusText: { fontSize: 10, fontWeight: '700' },
  lockBtn: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 48, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  emptyDesc: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center' },
  secondary: { backgroundColor: colors.secondary },
  flex1: { flex: 1 },
});
