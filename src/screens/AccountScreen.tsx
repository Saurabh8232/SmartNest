// Account, diagnostics, and about screens.
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../authentication/AuthContext';
import SmartNestLogo from '../components/SmartNestLogo';
import colors from '../constants/colors';

const TEAM = [
  {
    name: 'Ayush Gupta',
    role: 'Project Lead',
    initial: 'A',
    color: colors.primary,
    linkedin: 'https://www.linkedin.com/in/ayush-gupta-433633350/',
    responsibilities: [
      'Project Planning',
      'System Architecture',
      'Project Coordination',
      'System Testing & Validation',
    ],
  },
  {
    name: 'Saurabh Yadav',
    role: 'Mobile Application Developer',
    initial: 'S',
    color: colors.accent,
    linkedin: 'https://www.linkedin.com/in/saurabh-yadav-b75486259/',
    responsibilities: [
      'Complete React Native App Development',
      'UI/UX Design & Implementation',
      'REST API Integration',
      'Socket.IO Communication',
      'Application Architecture',
      'Real-Time Dashboard Development',
    ],
  },
  {
    name: 'Omji Dubey',
    role: 'Backend Developer',
    initial: 'O',
    color: colors.success,
    linkedin: 'https://www.linkedin.com/in/omjidubey',
    responsibilities: [
      'Backend Development',
      'REST API Development',
      'Database Integration',
      'Server Communication',
      'Backend Services',
    ],
  },
  {
    name: 'Arpit Gangwar',
    role: 'Hardware Developer',
    initial: 'A',
    color: colors.warning,
    linkedin: 'https://www.linkedin.com/in/arpit-gangwar/',
    responsibilities: [
      'ESP32 Development',
      'Hardware Integration',
      'Relay & Sensor Integration',
      'Embedded Systems Development',
      'Hardware Testing',
    ],
  },
];

const TECH_STACK = [
  'React Native',
  'TypeScript',
  'Node.js',
  'Socket.IO',
  'REST API',
  'ESP32',
  'MQTT',
  'Android Studio',
  'Git',
  'GitHub',
];

function AboutSection() {
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(TEAM.map(() => new Animated.Value(0))).current;
  const chipsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const cardSequence = cardAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 200 + i * 120,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(cardSequence).start();

    Animated.timing(chipsAnim, {
      toValue: 1,
      duration: 400,
      delay: 800,
      useNativeDriver: true,
    }).start();
  }, [cardAnims, chipsAnim, headerAnim]);

  return (
    <>
      <Animated.View
        style={[
          about.heroCard,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={about.logoWrap}>
          <SmartNestLogo size={44} />
        </View>
        <Text style={about.heroTitle}>SmartNest</Text>
        <Text style={about.heroTagline}>
          Smart Home Automation &{'\n'}Energy Monitoring System
        </Text>
        <View style={about.versionBadge}>
          <Text style={about.versionText}>Version 1.0.0 Beta</Text>
        </View>
        <Text style={about.heroDesc}>
          SmartNest is an IoT-based Smart Home Automation and Energy Monitoring
          platform designed to provide real-time monitoring, intelligent device
          control, and historical energy analytics using ESP32, REST APIs, and
          Socket.IO communication.
        </Text>
      </Animated.View>

      <Text style={about.sectionLabel}>PROJECT TEAM</Text>

      {TEAM.map((member, i) => (
        <Animated.View
          key={member.name}
          style={[
            about.memberCard,
            {
              opacity: cardAnims[i],
              transform: [
                {
                  translateY: cardAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={about.memberTop}>
            <View
              style={[
                about.avatar,
                {
                  borderColor: member.color,
                  backgroundColor: member.color + '22',
                },
              ]}
            >
              <Text style={[about.avatarInitial, { color: member.color }]}>
                {member.initial}
              </Text>
            </View>
            <View style={about.memberInfo}>
              <Text style={about.memberName}>{member.name}</Text>
              <Text style={[about.memberRole, { color: member.color }]}>
                {member.role}
              </Text>
            </View>
          </View>

          <View style={about.respList}>
            {member.responsibilities.map(r => (
              <View key={r} style={about.respRow}>
                <View
                  style={[about.respDot, { backgroundColor: member.color }]}
                />
                <Text style={about.respText}>{r}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[about.linkedinBtn, { borderColor: member.color + '55' }]}
            onPress={() => Linking.openURL(member.linkedin)}
            activeOpacity={0.75}
          >
            <Icon name="linkedin" size={14} color={member.color} />
            <Text style={[about.linkedinText, { color: member.color }]}>
              LinkedIn
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ))}

      <Animated.View style={{ opacity: chipsAnim }}>
        <Text style={about.sectionLabel}>TECHNOLOGY STACK</Text>
        <View style={about.chipsWrap}>
          {TECH_STACK.map(tech => (
            <View key={tech} style={about.chip}>
              <Text style={about.chipText}>{tech}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[about.orgCard, { opacity: chipsAnim }]}>
        <Icon name="book-open" size={18} color={colors.accent} />
        <View style={about.orgInfo}>
          <Text style={about.orgName}>Invertis University</Text>
          <Text style={about.orgDept}>
            Department of Computer Science & Engineering
          </Text>
          <Text style={about.orgLocation}>Bareilly, Uttar Pradesh</Text>
        </View>
      </Animated.View>

      <View style={about.footer}>
        <Text style={about.footerText}>Version 1.0.0 Beta</Text>
        <Text style={about.footerText}>© 2026 SmartNest Team</Text>
        <Text style={about.footerText}>All Rights Reserved.</Text>
      </View>
    </>
  );
}

export function AboutScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-left" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.flex1}>
          <Text style={styles.title}>About</Text>
          <Text style={styles.subtitle}>SmartNest application details</Text>
        </View>
      </View>
      <AboutSection />
    </ScrollView>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout, refreshProfile } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => {});
    }, [refreshProfile]),
  );

  const displayName = user?.name || 'Unknown User';
  const displayEmail = user?.email || 'Email unavailable';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 76 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Settings & configuration</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarInitial}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.profileLabel}>Name</Text>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={[styles.profileLabel, styles.profileLabelSpaced]}>
            Email
          </Text>
          <Text style={styles.profileDesc}>{displayEmail}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>A. DIAGNOSTICS</Text>
      <View style={styles.menuGroup}>
        {[
          {
            icon: 'activity',
            label: 'System Status',
            val: 'Running',
            valColor: colors.success,
            onPress: () =>
              Alert.alert(
                'System Status',
                'Use STATUS command on Serial Monitor for full diagnostics including uptime, RSSI, relay states, and slave board status.',
              ),
          },
          
          {
            icon: 'wifi',
            label: 'WiFi Settings',
            val: '',
            valColor: colors.mutedForeground,
            onPress: () =>
              Alert.alert(
                'WiFi Settings',
                'WiFi is configured on the ESP32 via Serial Monitor.\nCommand: RESET WIFI — clears credentials and restarts.',
              ),
          },
        ].map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, i > 0 && styles.menuBorder]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, styles.menuIconPrimary]}>
              <Icon name={item.icon} size={14} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuRight}>
              {item.val ? (
                <Text style={[styles.menuVal, { color: item.valColor }]}>
                  {item.val}
                </Text>
              ) : null}
              <Icon
                name="chevron-right"
                size={14}
                color={colors.mutedForeground}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>B. ABOUT</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('About')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, styles.menuIconMuted]}>
            <Icon name="info" size={14} color={colors.mutedForeground} />
          </View>
          <Text style={styles.menuLabel}>About</Text>
          <View style={styles.menuRight}>
            <Text style={styles.menuVal}>v1.0.0</Text>
            <Icon
              name="chevron-right"
              size={14}
              color={colors.mutedForeground}
            />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signOutBtn}
        activeOpacity={0.8}
        onPress={() =>
          Alert.alert('Sign Out', 'Are you sure you want to sign out?.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ])
        }
      >
        <Icon name="log-out" size={15} color={colors.destructive} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, gap: 10 },

  header: { marginBottom: 2 },
  headerRow: {
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
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  avatarInitial: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  profileLabel: {
    color: colors.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  profileLabelSpaced: { marginTop: 10 },
  profileName: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  profileDesc: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },

  sectionTitle: {
    color: colors.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },

  menuGroup: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, color: colors.foreground, fontSize: 14 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuVal: { color: colors.mutedForeground, fontSize: 13 },

  menuIconPrimary: { backgroundColor: colors.primary + '20' },
  menuIconMuted: { backgroundColor: colors.mutedForeground + '22' },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.destructive + '15',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.destructive + '40',
    paddingVertical: 15,
    marginTop: 4,
  },
  signOutText: { color: colors.destructive, fontSize: 15, fontWeight: '700' },

  flex1: { flex: 1 },
});

const about = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primary + '18',
    borderWidth: 1,
    borderColor: colors.primary + '44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  heroTitle: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroTagline: {
    color: colors.mutedForeground,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  versionBadge: {
    backgroundColor: colors.accent + '22',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent + '55',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  versionText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  heroDesc: {
    color: colors.mutedForeground,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 4,
  },

  sectionLabel: {
    color: colors.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 6,
  },

  memberCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '600',
  },

  respList: {
    gap: 6,
  },
  respRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  respDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  respText: {
    color: colors.mutedForeground,
    fontSize: 12,
    flex: 1,
  },

  linkedinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  linkedinText: {
    fontSize: 12,
    fontWeight: '700',
  },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: colors.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '600',
  },

  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent + '44',
    padding: 16,
    marginTop: 4,
  },
  orgInfo: {
    flex: 1,
    gap: 2,
  },
  orgName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '700',
  },
  orgDept: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginTop: 1,
  },
  orgLocation: {
    color: colors.mutedForeground,
    fontSize: 11,
    marginTop: 1,
  },

  footer: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  footerText: {
    color: colors.mutedForeground,
    fontSize: 11,
  },
});
