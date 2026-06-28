import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  controlMainRelay,
  MainBoardStatus,
  requestMainBoard,
  setMasterLock,
  setMasterShutdown,
  subscribeToConnection,
  subscribeToMainBoard,
} from '../socket/liveCommunication';
import colors from '../constants/colors';

const DEFAULT_DATA: MainBoardStatus = { masterLockEnabled: false, shutdownEnabled: false, totalCurrent: 0, relays: [] };

export default function MainBoardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [data, setData] = useState<MainBoardStatus>(DEFAULT_DATA);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    requestMainBoard();
  }, []);

  useEffect(() => {
    const removeBoard = subscribeToMainBoard(status => {
      setData(status);
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
      removeBoard();
      removeConnection();
    };
  }, [load]);

  const handleToggle = useCallback(async (id: string, action: 'on' | 'off') => {
    setData(prev => ({
      ...prev,
      relays: prev.relays.map(r => r.id === id ? { ...r, isOn: action === 'on' } : r),
    }));
    if (offline) return;
    controlMainRelay(id, action);
  }, [offline]);

  const handleMasterLock = useCallback(async (next: boolean) => {
    Alert.alert(
      next ? 'Enable Master Lock?' : 'Disable Master Lock?',
      next ? 'Physical switches will be disabled. App control only.' : 'Physical switches will be re-enabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: async () => {
          setData(p => ({ ...p, masterLockEnabled: next }));
          if (!offline) setMasterLock(next);
        }},
      ]
    );
  }, [offline]);

  const handleShutdown = useCallback(async (next: boolean) => {
    Alert.alert(
      next ? 'Enable Master Shutdown?' : 'Disable Master Shutdown?',
      next ? 'All local relays will be turned OFF' : 'Relays will be unlocked and restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: next ? 'destructive' : 'default', onPress: async () => {
          setData(p => ({ ...p, shutdownEnabled: next }));
          if (!offline) setMasterShutdown(next);
        }},
      ]
    );
  }, [offline]);

  const locked = data.masterLockEnabled;
  const shutdown = data.shutdownEnabled;
  const activeRelays = data.relays.filter(r => r.isOn).length;

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

      {/* Stats Row */}
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

      {/* Master Lock */}
      <Text style={styles.sectionTitle}>SYSTEM CONTROLS</Text>
      <TouchableOpacity
        style={[styles.controlCard, { borderColor: locked ? colors.warning + '55' : colors.border, backgroundColor: locked ? colors.warning + '0a' : colors.card }]}
        onPress={() => handleMasterLock(!locked)}
        activeOpacity={0.8}
      >
        <View style={[styles.controlIcon, { backgroundColor: locked ? colors.warning + '22' : colors.secondary }]}>
          <Icon name={locked ? 'lock' : 'unlock'} size={20} color={locked ? colors.warning : colors.mutedForeground} />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.controlTitle, { color: locked ? colors.warning : colors.foreground }]}>
            Master Lock {locked ? 'ON' : 'OFF'}
          </Text>
          <Text style={styles.controlDesc}>
            {locked ? 'Physical switches disabled — app control only' : 'Physical switches enabled'}
          </Text>
        </View>
        <Switch
          value={locked}
          onValueChange={handleMasterLock}
          trackColor={{ false: colors.border, true: colors.warning + '88' }}
          thumbColor={locked ? colors.warning : colors.mutedForeground}
        />
      </TouchableOpacity>

      {/* Master Shutdown */}
      <TouchableOpacity
        style={[styles.controlCard, { borderColor: shutdown ? colors.destructive + '55' : colors.border, backgroundColor: shutdown ? colors.destructive + '0a' : colors.card }]}
        onPress={() => handleShutdown(!shutdown)}
        activeOpacity={0.8}
      >
        <View style={[styles.controlIcon, { backgroundColor: shutdown ? colors.destructive + '22' : colors.secondary }]}>
          <Icon name="power" size={20} color={shutdown ? colors.destructive : colors.mutedForeground} />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.controlTitle, { color: shutdown ? colors.destructive : colors.foreground }]}>
            Master Shutdown {shutdown ? 'ON' : 'OFF'}
          </Text>
          <Text style={styles.controlDesc}>
            {shutdown ? 'All relays OFF - System shutdown' : 'System running normally'}
          </Text>
        </View>
        <Switch
          value={shutdown}
          onValueChange={handleShutdown}
          trackColor={{ false: colors.border, true: colors.destructive + '88' }}
          thumbColor={shutdown ? colors.destructive : colors.mutedForeground}
        />
      </TouchableOpacity>

      {/* Relay Controls */}
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
            const statusColor = r.status === 'error' ? colors.destructive : r.status === 'offline' ? colors.mutedForeground : r.isOn ? colors.success : colors.border;
            return (
              <View key={r.id} style={[styles.relayCard, { borderColor: r.isOn ? statusColor + '44' : colors.border }]}>
                <View style={[styles.relayIndicator, { backgroundColor: statusColor }]} />
                <View style={styles.relayInfo}>
                  <Text style={styles.relayNum}>Relay {r.number}</Text>
                  <Text style={styles.relayName} numberOfLines={1}>{r.name}</Text>
                  <View style={styles.relayMeta}>
                    <Text style={styles.relayMetaText}>{r.current.toFixed(2)} A</Text>
                    <View style={[styles.relayStatusTag, { backgroundColor: statusColor + '22' }]}>
                      <Text style={[styles.relayStatusText, { color: statusColor }]}>
                        {r.status === 'normal' ? (r.isOn ? 'ON' : 'OFF') : r.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <Switch
                  value={r.isOn}
                  onValueChange={(next) => handleToggle(r.id, next ? 'on' : 'off')}
                  disabled={locked || shutdown || r.status === 'offline'}
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
  controlCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 16 },
  controlIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  controlTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  controlDesc: { color: colors.mutedForeground, fontSize: 12 },
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
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 48, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  emptyDesc: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center' },
  flex1: { flex: 1 },
});
