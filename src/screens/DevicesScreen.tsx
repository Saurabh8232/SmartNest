import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import {
  IoTDevice,
  requestDevices,
  subscribeToConnection,
  subscribeToDevices,
} from '../socket/liveCommunication';
import colors from '../constants/colors';

type DevicesStackParamList = {
  DeviceList: undefined;
  MainBoard: undefined;
  AC: undefined;
  DigitalBoard: undefined;
};
type NavProp = NativeStackNavigationProp<DevicesStackParamList, 'DeviceList'>;

const DEVICE_CONFIG = [
  {
    type: 'main-board' as const,
    label: 'Main Board',
    subtitle: 'SmartNest Controller',
    detail: '6 relays · UART · MQTT',
    icon: 'cpu',
    color: colors.primary,
    screen: 'MainBoard' as const,
  },
  {
    type: 'ac-controller' as const,
    label: 'AC Controller',
    subtitle: 'Air Conditioner',
    detail: 'IR Blaster · Smart Remote',
    icon: 'wind',
    color: colors.accent,
    screen: 'AC' as const,
  },
  {
    type: 'digital-board' as const,
    label: 'Digital Board',
    subtitle: 'Digital I/O Controller',
    detail: '1 relay · ACS sensor · ESP-NOW',
    icon: 'grid',
    color: colors.success,
    screen: 'DigitalBoard' as const,
  },
];

function formatUptime(lastConnected: string): string {
  const diff = Date.now() - new Date(lastConnected).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    requestDevices();
  }, []);

  useEffect(() => {
    const removeDevices = subscribeToDevices((nextDevices: IoTDevice[]) => {
      setDevices(nextDevices);
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
      removeDevices();
      removeConnection();
    };
  }, [load]);

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Devices</Text>
          <Text style={styles.subtitle}>Tap any card to open control screen</Text>
        </View>
        {offline && (
          <View style={styles.offlinePill}>
            <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Stats summary */}
      <View style={styles.statsCard}>
        {[
          { label: 'Total', val: DEVICE_CONFIG.length, color: colors.primary },
          { label: 'Online', val: offline ? 0 : devices.filter(d => d.isOnline).length, color: colors.success },
          { label: 'Offline', val: offline ? DEVICE_CONFIG.length : devices.filter(d => !d.isOnline).length, color: colors.destructive },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDiv} />}
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Device cards */}
      <View style={styles.cardList}>
        {DEVICE_CONFIG.map(cfg => {
          const device = devices.find(d => d.type === cfg.type);
          const isOnline = device?.isOnline ?? false;
          const statusColor = offline ? colors.mutedForeground : isOnline ? colors.success : colors.destructive;
          const statusLabel = offline ? 'N/A' : isOnline ? 'Online' : 'Offline';
          const uptime = device?.lastConnected ? formatUptime(device.lastConnected) : null;
          const lastUpdate = now;

          return (
            <TouchableOpacity
              key={cfg.type}
              style={[styles.deviceCard, { borderColor: isOnline && !offline ? cfg.color + '44' : colors.border }]}
              activeOpacity={0.78}
              onPress={() => navigation.navigate(cfg.screen)}
            >
              {/* Left icon */}
              <View style={[styles.iconBox, { backgroundColor: cfg.color + '20' }]}>
                <Icon name={cfg.icon} size={28} color={cfg.color} />
              </View>

              {/* Center info */}
              <View style={styles.cardInfo}>
                <Text style={styles.deviceName}>{cfg.label}</Text>
                <Text style={styles.deviceSub}>{cfg.subtitle}</Text>
                <Text style={styles.deviceDetail}>{cfg.detail}</Text>

                <View style={styles.metaRow}>
                  {isOnline && uptime && (
                    <View style={styles.metaChip}>
                      <Icon name="clock" size={10} color={colors.mutedForeground} />
                      <Text style={styles.metaText}>Uptime: {uptime}</Text>
                    </View>
                  )}
                  <View style={styles.metaChip}>
                    <Icon name="refresh-cw" size={10} color={colors.mutedForeground} />
                    <Text style={styles.metaText}>Last Update: {lastUpdate}</Text>
                  </View>
                </View>
              </View>

              {/* Right status + chevron */}
              <View style={styles.cardRight}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '55' }]}>
                  <View style={[styles.dot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
                <View style={[styles.chevron, { backgroundColor: cfg.color + '15' }]}>
                  <Icon name="chevron-right" size={14} color={cfg.color} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Hint */}
      <View style={styles.hintRow}>
        <Icon name="info" size={12} color={colors.mutedForeground} />
        <Text style={styles.hintText}>Tap any device card to open its control screen</Text>
      </View>

      {offline && (
        <View style={styles.offlineNote}>
          <Icon name="cloud-off" size={14} color={colors.warning} />
          <Text style={styles.offlineNoteText}>
            Backend not connected — set BASE_URL in api.ts to see live device status
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },

  offlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.destructive + '15', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.destructive + '44' },
  offlineText: { color: colors.destructive, fontSize: 11, fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },

  statsCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  statDiv: { width: 1, height: 36, backgroundColor: colors.border },

  cardList: { gap: 10 },
  deviceCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },

  iconBox: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  cardInfo: { flex: 1, gap: 2 },
  deviceName: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  deviceSub: { color: colors.mutedForeground, fontSize: 13 },
  deviceDetail: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },

  metaRow: { flexDirection: 'column', gap: 3, marginTop: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.mutedForeground, fontSize: 11 },

  cardRight: { alignItems: 'flex-end', gap: 8, paddingTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: '700' },
  chevron: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  hintText: { color: colors.mutedForeground, fontSize: 11 },

  offlineNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.warning + '11', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.warning + '33' },
  offlineNoteText: { flex: 1, color: colors.warning, fontSize: 12 },
});
