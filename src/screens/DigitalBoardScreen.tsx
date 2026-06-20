import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { getDigitalBoardRelays, controlDigitalRelay, setDigitalLock, rebootDigitalBoard, DigitalBoardStatus } from '../api/api';
import colors from '../constants/colors';

const DEFAULT_DATA: DigitalBoardStatus = {
  relays: [],
  masterLockEnabled: false,
  totalCurrent: 0,
};

export default function DigitalBoardScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DigitalBoardStatus>(DEFAULT_DATA);
  const [offline, setOffline] = useState(false);
  const [rebooting, setRebooting] = useState(false);

  const load = useCallback(async () => {
    try {
      setOffline(false);
      setData(await getDigitalBoardRelays());
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
    try { await controlDigitalRelay(id, action); load(); } catch {}
  }, [load, offline]);

  const handleLock = useCallback(async () => {
    const next = !data.masterLockEnabled;
    Alert.alert(
      next ? 'Enable Master Lock?' : 'Disable Master Lock?',
      next ? 'Physical switches will be disabled.' : 'Physical switches will be re-enabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: async () => {
          if (offline) { setData(p => ({ ...p, masterLockEnabled: next })); return; }
          try { await setDigitalLock(next); load(); } catch {}
        }},
      ]
    );
  }, [data.masterLockEnabled, load, offline]);

  const handleReboot = useCallback(() => {
    Alert.alert(
      'Reboot ?',
      'The digital board will restart. Relay control will be unavailable for ~10 seconds.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reboot', style: 'destructive', onPress: async () => {
          setRebooting(true);
          try { await rebootDigitalBoard(); } catch {}
          setTimeout(() => { setRebooting(false); load(); }, 12000);
        }},
      ]
    );
  }, [load]);

  const locked = data.masterLockEnabled;
  const active = data.relays.filter(r => r.isOn).length;
  const totalCurrent = data.totalCurrent ?? data.relays.filter(r => r.isOn).reduce((s, r) => s + r.current, 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>Smart Appliances</Text>
          <Text style={styles.title}>Digital Board</Text>
        </View>
        {offline && (
          <View style={styles.offlineBadge}>
            <Icon name="wifi-off" size={12} color={colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Active',        value: String(active),                   color: colors.accent },
          { label: 'Total Current', value: `${totalCurrent.toFixed(2)} A`,   color: colors.warning },
          { label: 'Idle',          value: String(data.relays.length - active), color: colors.mutedForeground },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Lock card */}
      <TouchableOpacity onPress={handleLock} activeOpacity={0.8}
        style={[styles.lockCard, {
          backgroundColor: locked ? colors.destructive + '22' : colors.card,
          borderColor: locked ? colors.destructive : colors.border,
        }]}
      >
        <View style={[styles.lockIcon, { backgroundColor: locked ? colors.destructive + '33' : colors.secondary }]}>
          <Icon name={locked ? 'lock' : 'unlock'} size={20} color={locked ? colors.destructive : colors.mutedForeground} />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.lockTitle, { color: locked ? colors.destructive : colors.foreground }]}>
            Master Lock {locked ? 'Enabled' : 'Disabled'}
          </Text>
          <Text style={styles.lockDesc}>
            {locked ? 'Physical switches disabled. App control only.' : 'Tap to enable lock mode.'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Relays */}
      <Text style={styles.sectionTitle}>SMART APPLIANCES</Text>

      {data.relays.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="grid" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>
            {offline ? 'Connect your backend to see smart appliances' : 'No appliances configured'}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {data.relays.map(r => {
            const statusColor =
              r.status === 'error'   ? colors.destructive :
              r.status === 'offline' ? colors.mutedForeground :
              r.isOn                 ? colors.success : colors.border;

            return (
              <View key={r.id} style={[styles.relayCard, {
                borderColor: r.isOn ? statusColor + '44' : colors.border,
                backgroundColor: r.isOn ? colors.card : colors.card,
              }]}>
                {/* Top row: status dot + name + switch toggle */}
                <View style={styles.relayTop}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <View style={styles.relayInfo}>
                    <Text style={styles.relayName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.relayCurrent}>{r.current.toFixed(2)} A · {r.power.toFixed(0)} W</Text>
                  </View>
                  <Switch
                    value={r.isOn}
                    onValueChange={() => handleToggle(r.id, r.isOn ? 'off' : 'on')}
                    disabled={locked || r.status === 'offline'}
                    trackColor={{ false: colors.border, true: colors.primary + '88' }}
                    thumbColor={r.isOn ? colors.primary : colors.mutedForeground}
                  />
                </View>

                {/* Bottom row: relay state + switch state */}
                <View style={styles.relayBadges}>
                  <View style={[styles.badge, { backgroundColor: r.isOn ? colors.success + '22' : colors.border + '44' }]}>
                    <View style={[styles.badgeDot, { backgroundColor: r.isOn ? colors.success : colors.mutedForeground }]} />
                    <Text style={[styles.badgeText, { color: r.isOn ? colors.success : colors.mutedForeground }]}>
                      Relay {r.isOn ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                  <View style={[styles.badge, {
                    backgroundColor: r.switchState === 'pressed' ? colors.accent + '22' : colors.border + '44',
                  }]}>
                    <Icon
                      name={r.switchState === 'pressed' ? 'toggle-right' : 'toggle-left'}
                      size={12}
                      color={r.switchState === 'pressed' ? colors.accent : colors.mutedForeground}
                    />
                    <Text style={[styles.badgeText, {
                      color: r.switchState === 'pressed' ? colors.accent : colors.mutedForeground,
                    }]}>
                      Switch {r.switchState === 'pressed' ? 'Pressed' : 'Released'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Reboot */}
      <Text style={styles.sectionTitle}>SYSTEM</Text>
      <TouchableOpacity onPress={handleReboot} disabled={rebooting} activeOpacity={0.8}
        style={[styles.rebootBtn, rebooting && styles.rebootBtnDisabled]}
      >
        <View style={[styles.rebootIcon, { backgroundColor: colors.destructive + '22' }]}>
          <Icon name="refresh-cw" size={18} color={colors.destructive} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.rebootTitle}>{rebooting ? 'Rebooting…' : 'Reboot'}</Text>
          <Text style={styles.rebootDesc}>Restart the digital board module</Text>
        </View>
        <Icon name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
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
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.mutedForeground },
  lockCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lockTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  lockDesc: { color: colors.mutedForeground, fontSize: 12 },
  sectionTitle: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, marginTop: 4 },
  list: { gap: 10 },
  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 48, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  relayCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  relayTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  relayInfo: { flex: 1 },
  relayName: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  relayCurrent: { fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
  relayBadges: { flexDirection: 'row', gap: 8, paddingLeft: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  rebootBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.destructive + '44', padding: 14 },
  rebootBtnDisabled: { opacity: 0.5 },
  rebootIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rebootTitle: { color: colors.destructive, fontSize: 15, fontWeight: '600' },
  rebootDesc: { color: colors.mutedForeground, fontSize: 12, marginTop: 1 },
  flex1: { flex: 1 },
});
