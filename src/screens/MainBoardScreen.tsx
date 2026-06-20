import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getMainBoardRelays, controlMainRelay, setMasterLock, MainBoardStatus } from '../api/api';
import RelayToggle from '../components/RelayToggle';
import colors from '../constants/colors';

const DEFAULT_DATA: MainBoardStatus = {
  masterLockEnabled: false,
  totalCurrent: 0,
  relays: [],
};

export default function MainBoardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MainBoardStatus>(DEFAULT_DATA);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      setOffline(false);
      setData(await getMainBoardRelays());
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);

  const handleToggle = useCallback(async (id: string, action: 'on' | 'off') => {
    if (offline) {
      setData(prev => ({
        ...prev,
        relays: prev.relays.map(r => r.id === id ? { ...r, isOn: action === 'on' } : r),
      }));
      return;
    }
    try { await controlMainRelay(id, action); load(); } catch {}
  }, [load, offline]);

  const handleMasterLock = useCallback(async () => {
    const next = !data.masterLockEnabled;
    Alert.alert(
      next ? 'Enable Master Lock?' : 'Disable Master Lock?',
      next ? 'Physical switches will be disabled.' : 'Physical switches will be re-enabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: async () => {
          if (offline) { setData(p => ({ ...p, masterLockEnabled: next })); return; }
          await setMasterLock(next); load();
        }},
      ]
    );
  }, [data.masterLockEnabled, load, offline]);

  const locked = data.masterLockEnabled;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>Control Panel</Text>
          <Text style={styles.title}>Main Board</Text>
        </View>
        {offline && (
          <View style={styles.offlineBadge}>
            <Icon name="wifi-off" size={12} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      <TouchableOpacity onPress={handleMasterLock} activeOpacity={0.8}
        style={[styles.lockCard, { backgroundColor: locked ? colors.destructive + '22' : colors.card, borderColor: locked ? colors.destructive : colors.border }]}>
        <View style={[styles.lockIcon, { backgroundColor: locked ? colors.destructive + '33' : colors.secondary }]}>
          <Icon name={locked ? 'lock' : 'unlock'} size={22} color={locked ? colors.destructive : colors.mutedForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.lockTitle, { color: locked ? colors.destructive : colors.foreground }]}>
            Master Lock {locked ? 'Enabled' : 'Disabled'}
          </Text>
          <Text style={styles.lockDesc}>
            {locked ? 'Physical switches disabled. App control only.' : 'Tap to enable lock mode.'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.totalCard}>
        <Icon name="activity" size={18} color={colors.primary} />
        <Text style={styles.totalLabel}>Total Current</Text>
        <Text style={styles.totalValue}>{data.totalCurrent.toFixed(2)} A</Text>
      </View>

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
          {data.relays.map(r => (
            <RelayToggle key={r.id} id={r.id} name={r.name} isOn={r.isOn} current={r.current}
              status={r.status} onToggle={handleToggle} disabled={locked} relayNumber={r.number} />
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
  lockCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lockTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  lockDesc: { color: colors.mutedForeground, fontSize: 12 },
  totalCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  totalLabel: { flex: 1, color: colors.mutedForeground, fontSize: 14 },
  totalValue: { color: colors.primary, fontSize: 22, fontWeight: '700' },
  sectionTitle: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, marginTop: 4 },
  list: { gap: 8 },
  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 48, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
});
