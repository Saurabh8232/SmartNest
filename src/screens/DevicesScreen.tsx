import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getDevices, reconnectDevice, removeDevice, IoTDevice } from '../api/api';
import colors from '../constants/colors';

function signalBars(rssi: number) { if (rssi > -50) return 4; if (rssi > -65) return 3; if (rssi > -75) return 2; return 1; }
const ICONS: Record<string, string> = { 'main-board': 'cpu', 'digital-board': 'grid', 'ac-controller': 'wind', sensor: 'radio' };

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [offline, setOffline] = useState(false);
  const [reconnecting, setReconnecting] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      setOffline(false);
      const r = await getDevices();
      setDevices(r.devices);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const handleReconnect = useCallback(async (id: string) => {
    setReconnecting(p => ({ ...p, [id]: true }));
    try {
      const d = await reconnectDevice(id);
      setDevices(prev => prev.map(x => x.id === id ? d : x));
    } catch {} finally { setReconnecting(p => ({ ...p, [id]: false })); }
  }, []);

  const handleRemove = useCallback((id: string, name: string) => {
    Alert.alert('Remove Device', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setDevices(p => p.filter(d => d.id !== id));
        if (!offline) { try { await removeDevice(id); } catch {} }
      }},
    ]);
  }, [offline]);

  const online = devices.filter(d => d.isOnline).length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>IoT Network</Text>
          <Text style={styles.title}>Devices</Text>
        </View>
        <View style={styles.headerRight}>
          {offline && (
            <View style={styles.offlineBadge}>
              <Icon name="wifi-off" size={12} color={colors.warning} />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
          <TouchableOpacity onPress={load} style={styles.refreshBtn}>
            <Icon name="refresh-cw" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[['Online', online, colors.success], ['Offline', devices.length - online, colors.destructive], ['Total', devices.length, colors.primary]].map(([l, v, c]) => (
          <View key={String(l)} style={styles.statCard}>
            <Text style={[styles.statValue, { color: c as string }]}>{v}</Text>
            <Text style={styles.statLabel}>{l}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>CONNECTED DEVICES</Text>

      {devices.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="server" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>
            {offline ? 'No Backend Connected' : 'No Devices Found'}
          </Text>
          <Text style={styles.emptyText}>
            {offline ? 'Set your API URL in api.ts to see your IoT devices' : 'No devices are registered yet'}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {devices.map(d => {
            const bars = signalBars(d.rssi);
            return (
              <View key={d.id} style={[styles.deviceCard, { borderColor: d.isOnline ? colors.border : colors.destructive + '33' }]}>
                <View style={[styles.iconWrap, { backgroundColor: d.isOnline ? colors.primary + '22' : colors.destructive + '22' }]}>
                  <Icon name={ICONS[d.type] ?? 'box'} size={20} color={d.isOnline ? colors.primary : colors.destructive} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.deviceName} numberOfLines={1}>{d.name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: d.isOnline ? colors.success : colors.destructive }]} />
                  </View>
                  <Text style={styles.deviceId}>{d.deviceId}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>{d.ipAddress}</Text>
                    <View style={styles.signal}>
                      {[1,2,3,4].map(b => <View key={b} style={[styles.bar, { height: 6 + b * 3, backgroundColor: b <= bars && d.isOnline ? colors.primary : colors.border }]} />)}
                      <Text style={styles.rssi}>{d.rssi} dBm</Text>
                    </View>
                  </View>
                  <Text style={styles.meta}>{d.isOnline ? 'Online now' : `Last seen ${new Date(d.lastConnected).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</Text>
                </View>
                <View style={styles.actions}>
                  {!d.isOnline && (
                    <TouchableOpacity onPress={() => handleReconnect(d.id)} style={[styles.actionBtn, { backgroundColor: colors.primary + '22' }]} disabled={reconnecting[d.id]}>
                      {reconnecting[d.id] ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="refresh-cw" size={14} color={colors.primary} />}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleRemove(d.id, d.name)} style={[styles.actionBtn, { backgroundColor: colors.destructive + '22' }]}>
                    <Icon name="trash-2" size={14} color={colors.destructive} />
                  </TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subtitle: { color: colors.mutedForeground, fontSize: 12 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '700' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning + '22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  offlineText: { color: colors.warning, fontSize: 11, fontWeight: '600' },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.mutedForeground },
  sectionTitle: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, marginTop: 4 },
  list: { gap: 10 },
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: 52, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
  emptyText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  deviceCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deviceName: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  deviceId: { color: colors.mutedForeground, fontSize: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { color: colors.mutedForeground, fontSize: 11 },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 3, borderRadius: 2 },
  rssi: { color: colors.mutedForeground, fontSize: 10, marginLeft: 3 },
  actions: { gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
