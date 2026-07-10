import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
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
    detail: '6 relays',
    icon: 'cpu',
    color: colors.primary,
    screen: 'MainBoard' as const,
  },
  {
    type: 'ac-controller' as const,
    label: 'AC Controller',
    subtitle: 'Air Conditioner',
    detail: 'Smart Remote',
    icon: 'wind',
    color: colors.accent,
    screen: 'AC' as const,
  },
  {
    type: 'digital-board' as const,
    label: 'Digital Board',
    subtitle: 'Digital I/O Controller',
    detail: '1 relay',
    icon: 'grid',
    color: colors.success,
    screen: 'DigitalBoard' as const,
  },
];

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Devices</Text>
          <Text style={styles.subtitle}>Select a controller</Text>
        </View>
      </View>

      <View style={styles.cardList}>
        {DEVICE_CONFIG.map(cfg => {
          return (
            <TouchableOpacity
              key={cfg.type}
              style={[styles.deviceCard, { borderColor: cfg.color + '33' }]}
              activeOpacity={0.78}
              onPress={() => navigation.navigate(cfg.screen)}
            >
              <View style={[styles.iconBox, { backgroundColor: cfg.color + '20' }]}>
                <Icon name={cfg.icon} size={28} color={cfg.color} />
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.deviceName}>{cfg.label}</Text>
                <Text style={styles.deviceSub}>{cfg.subtitle}</Text>
                <Text style={styles.deviceDetail}>{cfg.detail}</Text>
              </View>

              <View style={styles.cardRight}>
                <View style={[styles.chevron, { backgroundColor: cfg.color + '15' }]}>
                  <Icon name="chevron-right" size={14} color={cfg.color} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 12 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },

  cardList: { gap: 10 },
  deviceCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },

  iconBox: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  cardInfo: { flex: 1, gap: 2 },
  deviceName: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  deviceSub: { color: colors.mutedForeground, fontSize: 13 },
  deviceDetail: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },

  cardRight: { alignItems: 'flex-end' },
  chevron: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
