import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {
  controlMainRelay,
  lockMainRelay,
  MainBoardStatus,
  requestMainBoard,
  subscribeToConnection,
  subscribeToMainBoard,
} from '../socket/liveCommunication';
import colors from '../constants/colors';

const CACHE_KEY      = '@smartnest_mainboard_v1';
const RELAY_LOCK_KEY = '@smartnest_mainboard_locks_v1';

const DEFAULT_DATA: MainBoardStatus = { masterLockEnabled: false, shutdownEnabled: false, totalCurrent: 0, relays: [] };

export default function MainBoardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData]               = useState<MainBoardStatus>(DEFAULT_DATA);
  const [offline, setOffline]         = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [lockedRelays, setLockedRelays] = useState<Record<string, boolean>>({});

  // ── Load cache ────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(raw => {
      if (raw) try { setData(JSON.parse(raw)); } catch {}
    });
    AsyncStorage.getItem(RELAY_LOCK_KEY).then(raw => {
      if (raw) try { setLockedRelays(JSON.parse(raw)); } catch {}
    });
  }, []);

  const saveLocks = useCallback((locks: Record<string, boolean>) => {
    AsyncStorage.setItem(RELAY_LOCK_KEY, JSON.stringify(locks)).catch(() => {});
  }, []);

  const load = useCallback(() => { requestMainBoard(); }, []);

  useEffect(() => {
    const removeBoard = subscribeToMainBoard(status => {
      setData(status);
      setOffline(false);
      setRefreshing(false);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(status)).catch(() => {});
    });
    const removeConnection = subscribeToConnection(
      () => { setOffline(false); load(); },
      () => { setOffline(true);  setRefreshing(false); },
    );
    return () => { removeBoard(); removeConnection(); };
  }, [load]);

  const handleToggle = useCallback((id: string, action: 'on' | 'off') => {
    if (lockedRelays[id]) return;
    setData(prev => ({
      ...prev,
      relays: prev.relays.map(r => r.id === id ? { ...r, isOn: action === 'on' } : r),
    }));
    if (!offline) controlMainRelay(id, action);
  }, [offline, lockedRelays]);

  const handleRelayLock = useCallback((id: string) => {
    const next = !lockedRelays[id];
    const updated = { ...lockedRelays, [id]: next };
    setLockedRelays(updated);
    saveLocks(updated);
    if (!offline) lockMainRelay(id, next);
  }, [lockedRelays, offline, saveLocks]);

  const activeRelays = data.relays.filter(r => r.isOn).length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
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

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total Current', val: `${data.totalCurrent.toFixed(2)} A`, color: colors.primary,  icon: 'activity'     },
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

      {/* Relays */}
      <Text style={styles.sectionTitle}>RELAY CONTROLS</Text>

      {data.relays.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="cpu" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>
            {offline ? 'Connect your backend to see relay controls' : 'No relays configured'}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {data.relays.map(r => {
            const isLocked = !!lockedRelays[r.id];
            const statusColor =
              r.status === 'error'   ? colors.destructive :
              r.status === 'offline' ? colors.mutedForeground :
              r.isOn                 ? colors.success : colors.border;

            return (
              <View
                key={r.id}
                style={[styles.relayCard, {
                  borderColor: isLocked ? colors.warning + '66' : r.isOn ? statusColor + '44' : colors.border,
                  backgroundColor: isLocked ? colors.warning + '08' : colors.card,
                }]}
              >
                {/* Colored left bar */}
                <View style={[styles.relayBar, { backgroundColor: isLocked ? colors.warning : statusColor }]} />

                <View style={styles.relayBody}>
                  {/* Top row */}
                  <View style={styles.relayTop}>
                    <View style={styles.relayTitleBlock}>
                      <Text style={styles.relayNum}>Relay {r.number}</Text>
                      <Text style={styles.relayName} numberOfLines={1}>{r.name}</Text>
                    </View>

                    <View style={styles.relayActions}>
                      {/* Individual lock icon */}
                      <TouchableOpacity
                        onPress={() => handleRelayLock(r.id)}
                        style={[styles.lockBtn, { backgroundColor: isLocked ? colors.warning + '22' : colors.secondary }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name={isLocked ? 'lock' : 'unlock'} size={14} color={isLocked ? colors.warning : colors.mutedForeground} />
                      </TouchableOpacity>

                      {/* ON / OFF button */}
                      <TouchableOpacity
                        onPress={() => handleToggle(r.id, r.isOn ? 'off' : 'on')}
                        disabled={isLocked || r.status === 'offline'}
                        style={[
                          styles.toggleBtn,
                          {
                            backgroundColor: r.isOn ? colors.primary : colors.secondary,
                            opacity: (isLocked || r.status === 'offline') ? 0.4 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.toggleText, { color: r.isOn ? '#fff' : colors.mutedForeground }]}>
                          {r.isOn ? 'ON' : 'OFF'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Bottom meta */}
                  <View style={styles.relayMeta}>
                    <View style={[styles.metaBadge, { backgroundColor: statusColor + '22' }]}>
                      <View style={[styles.metaDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.metaText, { color: statusColor }]}>
                        {r.status === 'normal' ? (r.isOn ? 'ON' : 'OFF') : r.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.relayCurrent}>{r.current.toFixed(2)} A</Text>
                    {isLocked && (
                      <View style={[styles.metaBadge, { backgroundColor: colors.warning + '22' }]}>
                        <Icon name="lock" size={10} color={colors.warning} />
                        <Text style={[styles.metaText, { color: colors.warning }]}>Locked</Text>
                      </View>
                    )}
                  </View>
                </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  subtitle: { color: colors.mutedForeground, fontSize: 12 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '700' },
  offlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.warning + '22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  offlineText: { color: colors.warning, fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6 },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.mutedForeground },
  sectionTitle: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, marginTop: 4 },
  list: { gap: 8 },
  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 48, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  relayCard: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  relayBar: { width: 4 },
  relayBody: { flex: 1, padding: 14, gap: 10 },
  relayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  relayTitleBlock: { flex: 1 },
  relayNum: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600', letterSpacing: 0.5 },
  relayName: { fontSize: 15, fontWeight: '600', color: colors.foreground, marginTop: 2 },
  relayActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  toggleBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 10 },
  toggleText: { fontSize: 13, fontWeight: '700' },
  relayMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  metaDot: { width: 6, height: 6, borderRadius: 3 },
  metaText: { fontSize: 10, fontWeight: '700' },
  relayCurrent: { fontSize: 12, color: colors.mutedForeground },
});