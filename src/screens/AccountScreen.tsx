import React from 'react';
import {
  Alert, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
// MQTT API calls disabled while MQTT UI is commented out
// MQTT settings communication can be added as a dedicated API module when re-enabled.
import { useAuth } from '../authentication/AuthContext';
import colors from '../constants/colors';

// interface MqttForm {
//   enabled: boolean; broker: string; port: string; clientId: string;
//   username: string; password: string; baseTopic: string; keepalive: string;
// }

// const DEFAULTS: MqttForm = {
//   enabled: true, broker: 'broker.hivemq.com', port: '1883',
//   clientId: 'SmartNest_001', username: '', password: '',
//   baseTopic: 'smartnest', keepalive: '60',
// };

// function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType }: {
//   label: string; value: string; onChangeText: (v: string) => void;
//   placeholder?: string; secureTextEntry?: boolean; keyboardType?: 'default' | 'numeric' | 'url';
// }) {
//   return (
//     <View style={fStyles.wrap}>
//       <Text style={fStyles.label}>{label}</Text>
//       <TextInput
//         style={fStyles.input}
//         value={value}
//         onChangeText={onChangeText}
//         placeholder={placeholder ?? label}
//         placeholderTextColor={colors.mutedForeground}
//         secureTextEntry={secureTextEntry}
//         keyboardType={keyboardType ?? 'default'}
//         autoCapitalize="none"
//         autoCorrect={false}
//       />
//     </View>
//   );
// }

// const fStyles = StyleSheet.create({
//   wrap: { gap: 5 },
//   label: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
//   input: { backgroundColor: colors.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 14, paddingHorizontal: 13, paddingVertical: 11 },
// });

// export default function AccountScreen() {
//   const insets = useSafeAreaInsets();
//   const logRef = useRef<ScrollView>(null);

//   const [mqtt, setMqtt] = useState<MqttForm>(DEFAULTS);
//   const [logs, setLogs] = useState<string[]>(['Ready. Press Load MQTT to fetch current settings.']);
//   const [loading, setLoading] = useState(false);

//   const addLog = useCallback((msg: string) => {
//     const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
//     setLogs(prev => [...prev, `[${time}] ${msg}`]);
//     setTimeout(() => logRef.current?.scrollToEnd({ animated: true }), 100);
//   }, []);

//   const set = (key: keyof MqttForm) => (val: string | boolean) =>
//     setMqtt(prev => ({ ...prev, [key]: val }));

//   const handleLoad = useCallback(async () => {
//     setLoading(true);
//     addLog('Loading MQTT settings from device...');
//     try {
//       const s = await getMqttSettings();
//       setMqtt({ enabled: s.enabled, broker: s.broker, port: String(s.port), clientId: s.clientId, username: s.username ?? '', password: s.password ?? '', baseTopic: s.baseTopic, keepalive: String(s.keepalive) });
//       addLog('✓ MQTT settings loaded successfully.');
//     } catch {
//       addLog('✗ Backend not reachable — showing local defaults.');
//     } finally { setLoading(false); }
//   }, [addLog]);

//   const handleSave = useCallback(async () => {
//     if (!mqtt.broker.trim()) { addLog('✗ Broker address cannot be empty.'); return; }
//     const port = parseInt(mqtt.port, 10);
//     if (isNaN(port) || port < 1 || port > 65535) { addLog('✗ Port must be 1–65535.'); return; }
//     const keepalive = parseInt(mqtt.keepalive, 10);
//     if (isNaN(keepalive) || keepalive < 1) { addLog('✗ Keepalive must be positive.'); return; }
//     setLoading(true);
//     addLog(`Saving — Broker: ${mqtt.broker}:${mqtt.port}, Topic: ${mqtt.baseTopic}`);
//     try {
//       const res = await saveMqttSettings({ enabled: mqtt.enabled, broker: mqtt.broker.trim(), port, clientId: mqtt.clientId.trim(), username: mqtt.username.trim(), password: mqtt.password, baseTopic: mqtt.baseTopic.trim(), keepalive } as any);
//       addLog(`✓ ${res.message ?? 'Settings saved. Device will reconnect.'}`);
//     } catch {
//       addLog('✗ Save failed — backend not reachable.');
//     } finally { setLoading(false); }
//   }, [mqtt, addLog]);

//   const handleReset = useCallback(() => {
//     Alert.alert('Reset MQTT Settings', 'Reset all MQTT config to factory defaults?', [
//       { text: 'Cancel', style: 'cancel' },
//       { text: 'Reset', style: 'destructive', onPress: async () => {
//         setLoading(true);
//         addLog('Resetting MQTT configuration...');
//         try {
//           const res = await resetMqttSettings();
//           setMqtt(DEFAULTS);
//           addLog(`✓ ${res.message ?? 'MQTT reset to defaults.'}`);
//         } catch {
//           setMqtt(DEFAULTS);
//           addLog('✗ Backend not reachable — form reset locally.');
//           addLog('  Serial Monitor: MQTT RESET');
//         } finally { setLoading(false); }
//       }},
//     ]);
//   }, [addLog]);

export default function AccountScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Settings & configuration</Text>
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Icon name="cpu" size={26} color={colors.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.profileName}>Saurabh</Text>
          <Text style={styles.profileDesc}>MQTT · ESP32 · Local IoT</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={[styles.bDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.bText, { color: colors.success }]}>Active</Text>
        </View>
      </View>

      {/* ── A. Diagnostics ── */}
      <Text style={styles.sectionTitle}>A. DIAGNOSTICS</Text>
      <View style={styles.menuGroup}>
        {[
          { icon: 'activity',  label: 'System Status',  val: 'Running',   valColor: colors.success, onPress: () => Alert.alert('System Status', 'Use STATUS command on Serial Monitor for full diagnostics including uptime, RSSI, relay states, and slave board status.') },
          { icon: 'database',  label: 'SD Card Logs',   val: 'Available', valColor: colors.success, onPress: () => Alert.alert('SD Card Logs', 'Serial Monitor commands:\nLOGS LIST — view all log files\nLOGS VIEW <file> <chunk> — read 10 records') },
          { icon: 'wifi',      label: 'WiFi Settings',  val: '',          valColor: colors.mutedForeground, onPress: () => Alert.alert('WiFi Settings', 'WiFi is configured on the ESP32 via Serial Monitor.\nCommand: RESET WIFI — clears credentials and restarts.') },
        ].map((item, i) => (
          <TouchableOpacity key={item.label} style={[styles.menuItem, i > 0 && styles.menuBorder]} onPress={item.onPress} activeOpacity={0.7}>
            <View style={[styles.menuIcon, styles.menuIconPrimary]}>
              <Icon name={item.icon} size={14} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuRight}>
              {item.val ? <Text style={[styles.menuVal, { color: item.valColor }]}>{item.val}</Text> : null}
              <Icon name="chevron-right" size={14} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* MQTT UI is commented out in source; no placeholder shown here */}

      {/* ── B. About ── */}
      <Text style={styles.sectionTitle}>B. ABOUT</Text>
      <View style={styles.menuGroup}>
        {[
          { icon: 'info',      label: 'About SmartNest',     val: 'v1.0.0', onPress: () => Alert.alert('SmartNest', 'SmartNest IoT Control v1.0.0\nReact Native · MQTT · ESP32\n\nGitHub: MakeWithArpit/SmartNest') },
          { icon: 'link',      label: 'Connectivity Details', val: '',       onPress: () => Alert.alert('Connectivity', 'MQTT Broker: broker.hivemq.com:1883\nBase Topic: smartnest\nProtocol: MQTT v3.1.1\n\nSee SmartNest_Communication_Contract.md for full documentation.') },
        ].map((item, i) => (
          <TouchableOpacity key={item.label} style={[styles.menuItem, i > 0 && styles.menuBorder]} onPress={item.onPress} activeOpacity={0.7}>
            <View style={[styles.menuIcon, styles.menuIconMuted]}>
              <Icon name={item.icon} size={14} color={colors.mutedForeground} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuRight}>
              {item.val ? <Text style={styles.menuVal}>{item.val}</Text> : null}
              <Icon name="chevron-right" size={14} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutBtn}
        activeOpacity={0.8}
        onPress={() => Alert.alert('Sign Out', 'This is a local IoT control app — no account to sign out from.', [{ text: 'OK' }])}
      >
        <Icon name="log-out" size={15} color={colors.destructive} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>SmartNest IoT Control · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 10 },

  header: { marginBottom: 2 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  avatarWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  profileName: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  profileDesc: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success + '22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.success + '44' },
  bDot: { width: 7, height: 7, borderRadius: 3.5 },
  bText: { fontSize: 11, fontWeight: '700' },

  sectionTitle: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },

  menuGroup: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  menuIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: colors.foreground, fontSize: 14 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuVal: { color: colors.mutedForeground, fontSize: 13 },

  // MQTT
  mqttCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  enableRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  enableLabel: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  enableDesc: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  hr: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  fieldsGrid: { padding: 16, gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  fieldFull: { width: '100%' },
  fieldHalf: { width: '47.5%' },
  actionRow: { flexDirection: 'row', gap: 8, padding: 16, paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  terminal: { margin: 16, marginTop: 0, backgroundColor: '#060d1a', borderRadius: 12, borderWidth: 1, borderColor: colors.border + '88', overflow: 'hidden' },
  terminalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '66' },
  termDots: { flexDirection: 'row', gap: 5, marginRight: 10 },
  termDot: { width: 10, height: 10, borderRadius: 5 },
  termTitle: { flex: 1, color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  termScroll: { maxHeight: 150, padding: 12 },
  termLine: { color: '#7ec8e3', fontSize: 12, fontFamily: 'monospace', lineHeight: 20 },

  flex1: { flex: 1 },

  menuIconPrimary: { backgroundColor: colors.primary + '20' },
  menuIconMuted: { backgroundColor: colors.mutedForeground + '22' },

  actionBtnSecondary: { backgroundColor: colors.secondary, borderColor: colors.border },
  actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnDestructive: { backgroundColor: colors.destructive, borderColor: colors.destructive },
  actionBtnTextPrimary: { color: colors.primary },
  actionBtnTextOnPrimary: { color: colors.background },
  actionBtnTextWhite: { color: '#fff' },

  termDotRed: { backgroundColor: '#ff5f56' },
  termDotYellow: { backgroundColor: '#ffbd2e' },
  termDotGreen: { backgroundColor: '#27c93f' },

  iconBtnSmall: { padding: 4 },

  termLineSuccess: { color: colors.success },
  termLineError: { color: colors.destructive },
  termLineNote: { color: colors.mutedForeground, fontSize: 11 },


  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.destructive + '15', borderRadius: 16, borderWidth: 1, borderColor: colors.destructive + '40', paddingVertical: 15, marginTop: 4 },
  signOutText: { color: colors.destructive, fontSize: 15, fontWeight: '700' },
  version: { color: colors.mutedForeground, fontSize: 11, textAlign: 'center', paddingBottom: 4 },
});
