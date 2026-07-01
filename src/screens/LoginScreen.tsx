import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../authentication/AuthContext';
import colors from '../constants/colors';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!username.trim()) { setError('Please enter your username.'); return; }
    if (!password.trim()) { setError('Please enter a password.'); return; }
    try {
      await login({ username: username.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Icon name="home" size={32} color={colors.primary} />
          </View>
          <Text style={styles.appName}>SmartNest</Text>
          <Text style={styles.appTagline}>IoT Control System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to control your home</Text>

          {/* Name */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>USERNAME</Text>
            <View style={styles.inputRow}>
              <Icon name="user" size={15} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="admin"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={styles.inputRow}>
              <Icon name="lock" size={15} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                <Icon name={showPass ? 'eye-off' : 'eye'} size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorRow}>
              <Icon name="alert-circle" size={13} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Login button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
            <Icon name="log-in" size={16} color={colors.background} />
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>

          <Text style={styles.footer}>SmartNest IoT Control · backend auth ready</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 28 },

  logoWrap: { alignItems: 'center', gap: 10 },
  logoCircle: { width: 76, height: 76, borderRadius: 22, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary + '44' },
  appName: { color: colors.foreground, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  appTagline: { color: colors.mutedForeground, fontSize: 13 },

  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 16 },
  cardTitle: { color: colors.foreground, fontSize: 20, fontWeight: '800' },
  cardSub: { color: colors.mutedForeground, fontSize: 13, marginTop: -8 },

  fieldWrap: { gap: 6 },
  fieldLabel: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  inputIcon: { paddingLeft: 13 },
  input: { flex: 1, color: colors.foreground, fontSize: 14, paddingHorizontal: 10, paddingVertical: 13 },
  eyeBtn: { paddingHorizontal: 13, paddingVertical: 13 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.destructive + '15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.destructive + '33' },
  errorText: { color: colors.destructive, fontSize: 13 },

  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, marginTop: 4 },
  loginBtnText: { color: colors.background, fontSize: 15, fontWeight: '800' },

  footer: { color: colors.mutedForeground, fontSize: 11, textAlign: 'center' },
});
