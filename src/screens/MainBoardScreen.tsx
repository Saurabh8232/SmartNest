// Main board relay control screen.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  controlMainLightingGroup,
  controlMainRelay,
  CommandAck,
  lockMainRelay,
  MainBoardStatus,
  rebootSystem,
  subscribeToConnection,
  subscribeToCommandAck,
  subscribeToMainBoard,
  subscribeToShutdownAll,
  subscribeToUnlockAll,
} from '../socket/liveCommunication';
import colors from '../constants/colors';

const CACHE_KEY = '@smartnest_mainboard_v1';

const DEFAULT_DATA: MainBoardStatus = {
  masterLockEnabled: false,
  shutdownEnabled: false,
  mainCurrent: 0,
  mainEnergyKwh: 0,
  relays: [],
};

function commandErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function MainBoardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [data, setData] = useState<MainBoardStatus>(DEFAULT_DATA);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commandPending, setCommandPending] = useState(false);
  const hasLiveDataRef = useRef(false);
  const pendingCommandIdRef = useRef<string | null>(null);
  const pendingRollbackRef = useRef<(() => void) | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(raw => {
      if (!raw) return;
      try {
        if (!hasLiveDataRef.current) setData(JSON.parse(raw));
      } catch {}
    });
  }, []);

  const load = useCallback(() => {
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const removeBoard = subscribeToMainBoard(status => {
      hasLiveDataRef.current = true;
      setData(status);
      setOffline(false);
      setRefreshing(false);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(status)).catch(() => {});
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
    const removeAck = subscribeToCommandAck((ack: CommandAck) => {
      if (ack.cmd_id !== pendingCommandIdRef.current) return;

      const rollback = pendingRollbackRef.current;
      pendingCommandIdRef.current = null;
      pendingRollbackRef.current = null;
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      setCommandPending(false);

      if (!ack.ok) {
        rollback?.();
        Alert.alert(
          'Command Failed',
          ack.message || 'The command was rejected by the backend.',
        );
        load();
      }
    });
    const removeShutdownAll = subscribeToShutdownAll(() => {
      setData(prev => {
        const next = {
          ...prev,
          mainCurrent: 0,
          mainEnergyKwh: prev.mainEnergyKwh, // energy is cumulative — keep it, don't reset
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
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      setCommandPending(false);
      pendingCommandIdRef.current = null;
      pendingRollbackRef.current = null;
    });
    const removeUnlockAll = subscribeToUnlockAll(() => {
      setData(prev => {
        const next = {
          ...prev,
          masterLockEnabled: false,
          relays: prev.relays.map(relay => ({
            ...relay,
            locked: false,
          })),
        };
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      setRefreshing(false);
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      setCommandPending(false);
      pendingCommandIdRef.current = null;
      pendingRollbackRef.current = null;
    });
    return () => {
      removeBoard();
      removeConnection();
      removeAck();
      removeShutdownAll();
      removeUnlockAll();
    };
  }, [load]);

  const runCommand = useCallback(
    async (
      execute: () => Promise<{ cmd_id?: string }>,
      rollback?: () => void,
    ) => {
      if (offline || commandPending) return;

      try {
        const result = await execute();
        const cmdId = result.cmd_id ?? null;
        if (cmdId) {
          pendingCommandIdRef.current = cmdId;
          pendingRollbackRef.current = rollback ?? null;
          setCommandPending(true);
          pendingTimeoutRef.current = setTimeout(() => {
            pendingCommandIdRef.current = null;
            pendingRollbackRef.current = null;
            pendingTimeoutRef.current = null;
            rollback?.();
            setCommandPending(false);
          }, 10000);
        } else {
          setCommandPending(false);
        }
      } catch (error) {
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = null;
        }
        rollback?.();
        setCommandPending(false);
        pendingCommandIdRef.current = null;
        pendingRollbackRef.current = null;
        Alert.alert(
          'Command Failed',
          commandErrorMessage(error, 'Unable to send the command.'),
        );
      }
    },
    [commandPending, offline],
  );

  const handleToggle = useCallback(
    (id: string, action: 'on' | 'off') => {
      if (offline || commandPending) return;
      const previousRelays = data.relays.map(relay => ({ ...relay }));
      setData(prev => ({
        ...prev,
        relays: prev.relays.map(r =>
          r.id === id ? { ...r, isOn: action === 'on' } : r,
        ),
      }));
      runCommand(
        () => controlMainRelay(id, action),
        () =>
          setData(prev => ({
            ...prev,
            relays: previousRelays,
          })),
      );
    },
    [commandPending, data.relays, offline, runCommand],
  );

  const handleRelayLock = useCallback(
    (id: string, currentLocked: boolean) => {
      if (offline || commandPending) return;
      const next = !currentLocked;
      const previousRelays = data.relays.map(relay => ({ ...relay }));
      Alert.alert(
        next ? 'Lock Relay?' : 'Unlock Relay?',
        next
          ? 'This relay will be locked. Toggle control will be disabled.'
          : 'This relay will be unlocked and can be controlled again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: next ? 'Lock' : 'Unlock',
            onPress: () => {
              setData(prev => ({
                ...prev,
                relays: prev.relays.map(r =>
                  r.id === id ? { ...r, locked: next } : r,
                ),
              }));
              runCommand(
                () => lockMainRelay(id, next),
                () =>
                  setData(prev => ({
                    ...prev,
                    relays: previousRelays,
                  })),
              );
            },
          },
        ],
      );
    },
    [commandPending, data.relays, offline, runCommand],
  );

  const handleReboot = useCallback(() => {
    if (offline) {
      Alert.alert(
        'System Offline',
        'Connect to the backend before rebooting the system.',
      );
      return;
    }
    if (commandPending) return;
    Alert.alert(
      'Reboot System?',
      'The backend will send a reboot command to the hardware for the full system.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reboot',
          onPress: () => {
            runCommand(() => rebootSystem());
          },
        },
      ],
    );
  }, [commandPending, offline, runCommand]);

  const handleLightingGroup = useCallback(
    (action: 'on' | 'off') => {
      if (offline || commandPending) return;
      const previousRelays = data.relays.map(relay => ({ ...relay }));
      setData(prev => ({
        ...prev,
        relays: prev.relays.map(relay =>
          relay.number >= 1 && relay.number <= 5 && !(relay as any).locked
            ? { ...relay, isOn: action === 'on' }
            : relay,
        ),
      }));
      runCommand(
        () => controlMainLightingGroup(action),
        () =>
          setData(prev => ({
            ...prev,
            relays: previousRelays,
          })),
      );
    },
    [commandPending, data.relays, offline, runCommand],
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-left" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.flex1}>
          <Text style={styles.subtitle}>Smart Control</Text>
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
          {
            label: 'Main Current',
            val: `${data.mainCurrent.toFixed(2)} A`,
            color: colors.primary,
            icon: 'activity',
          },
          {
            label: 'Main Energy',
            val: `${data.mainEnergyKwh.toFixed(3)} kWh`,
            color: colors.success,
            icon: 'battery-charging',
          },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <View
              style={[styles.statIcon, { backgroundColor: s.color + '22' }]}
            >
              <Icon name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleReboot}
        activeOpacity={0.85}
        disabled={offline || commandPending}
        style={[
          styles.rebootBtn,
          (offline || commandPending) && styles.disabledBtn,
        ]}
      >
        <View style={styles.rebootIcon}>
          <Icon name="rotate-cw" size={17} color={colors.warning} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.rebootTitle}>Reboot</Text>
          <Text style={styles.rebootDesc}>
            Restart the full hardware system
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <View style={styles.groupIcon}>
            <Icon name="sun" size={17} color={colors.primary} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.groupTitle}>Lighting Group</Text>
            <Text style={styles.groupDesc}>Control Light 1-5 together</Text>
          </View>
        </View>
        <View style={styles.groupActions}>
          <TouchableOpacity
            onPress={() => handleLightingGroup('on')}
            activeOpacity={0.85}
            disabled={offline || commandPending}
            style={[
              styles.groupBtn,
              styles.groupBtnOn,
              (offline || commandPending) && styles.disabledBtn,
            ]}
          >
            <Icon name="power" size={14} color={colors.background} />
            <Text style={styles.groupBtnOnText}>All ON</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleLightingGroup('off')}
            activeOpacity={0.85}
            disabled={offline || commandPending}
            style={[
              styles.groupBtn,
              styles.groupBtnOff,
              (offline || commandPending) && styles.disabledBtn,
            ]}
          >
            <Icon name="power" size={14} color={colors.mutedForeground} />
            <Text style={styles.groupBtnOffText}>All OFF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>RELAY CONTROLS</Text>

      {data.relays.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="cpu" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>
            {offline ? 'Backend not connected' : 'No relays configured'}
          </Text>
          <Text style={styles.emptyDesc}>
            {offline
              ? 'Set your API URL in api.ts'
              : 'Relays will appear here once configured'}
          </Text>
        </View>
      ) : (
        <View style={styles.relayList}>
          {data.relays.map(r => {
            const isLocked = (r as any).locked ?? false;
            const statusColor =
              r.status === 'error'
                ? colors.destructive
                : r.status === 'offline'
                ? colors.mutedForeground
                : r.isOn
                ? colors.success
                : colors.border;
            const cardBorderColor = isLocked
              ? colors.warning + '55'
              : r.isOn
              ? statusColor + '44'
              : colors.border;
            const indicatorColor = isLocked ? colors.warning : statusColor;
            return (
              <View
                key={r.id}
                style={[styles.relayCard, { borderColor: cardBorderColor }]}
              >
                <View
                  style={[
                    styles.relayIndicator,
                    { backgroundColor: indicatorColor },
                  ]}
                />
                <View style={styles.relayInfo}>
                  <Text style={styles.relayNum}>RELAY {r.number}</Text>
                  <Text style={styles.relayName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <View style={styles.relayMeta}>
                    <Text style={styles.relayMetaText}>
                      {r.current.toFixed(2)} A
                    </Text>
                    <View
                      style={[
                        styles.relayStatusTag,
                        { backgroundColor: indicatorColor + '22' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.relayStatusText,
                          { color: indicatorColor },
                        ]}
                      >
                        {isLocked
                          ? 'LOCKED'
                          : r.status === 'normal'
                          ? r.isOn
                            ? 'ON'
                            : 'OFF'
                          : r.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleRelayLock(r.id, isLocked)}
                  disabled={offline || commandPending}
                  style={[
                    styles.lockBtn,
                    {
                      backgroundColor: isLocked
                        ? colors.warning + '22'
                        : colors.secondary,
                    },
                    (offline || commandPending) && styles.disabledBtn,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon
                    name={isLocked ? 'lock' : 'unlock'}
                    size={14}
                    color={isLocked ? colors.warning : colors.mutedForeground}
                  />
                </TouchableOpacity>
                <Switch
                  value={r.isOn}
                  onValueChange={next =>
                    handleToggle(r.id, next ? 'on' : 'off')
                  }
                  disabled={
                    isLocked ||
                    r.status === 'offline' ||
                    offline ||
                    commandPending
                  }
                  trackColor={{
                    false: colors.border,
                    true: colors.primary + '88',
                  }}
                  thumbColor={r.isOn ? colors.primary : colors.mutedForeground}
                />
              </View>
            );
          })}
        </View>
      )}

      {commandPending && (
        <View style={styles.pendingNote}>
          <Icon name="clock" size={14} color={colors.primary} />
          <Text style={styles.pendingNoteText}>
            Waiting for command acknowledgement...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { color: colors.mutedForeground, fontSize: 12 },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.warning + '22',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.warning + '44',
  },
  offlineText: { color: colors.warning, fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.mutedForeground },
  rebootBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.warning + '44',
    padding: 14,
  },
  disabledBtn: { opacity: 0.55 },
  rebootIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning + '22',
  },
  rebootTitle: { color: colors.warning, fontSize: 14, fontWeight: '700' },
  rebootDesc: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '22',
  },
  groupTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  groupDesc: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  groupActions: { flexDirection: 'row', gap: 10 },
  groupBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    borderWidth: 1,
  },
  groupBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupBtnOff: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
  },
  groupBtnOnText: { color: colors.background, fontSize: 13, fontWeight: '700' },
  groupBtnOffText: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  relayList: { gap: 8 },
  relayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  relayIndicator: { width: 4, height: 44, borderRadius: 2 },
  relayInfo: { flex: 1 },
  relayNum: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  relayName: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 1,
  },
  relayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  relayMetaText: { color: colors.mutedForeground, fontSize: 12 },
  relayStatusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  relayStatusText: { fontSize: 10, fontWeight: '700' },
  lockBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 48,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  emptyDesc: {
    color: colors.mutedForeground,
    fontSize: 13,
    textAlign: 'center',
  },
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '11',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  pendingNoteText: { flex: 1, color: colors.primary, fontSize: 12 },
  secondary: { backgroundColor: colors.secondary },
});
