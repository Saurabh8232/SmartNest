// Login and registration screen.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../authentication/AuthContext';
import SmartNestLogo from '../components/SmartNestLogo';
import colors from '../constants/colors';

const PASSWORD_MAX_LENGTH = 15;

type AuthMode = 'login' | 'register';

type AuthInputProps = TextInputProps & {
  icon: string;
  label: string;
  disabled: boolean;
  secureToggle?: {
    visible: boolean;
    onToggle: () => void;
  };
};

function limitPassword(value: string): string {
  return value.slice(0, PASSWORD_MAX_LENGTH);
}

function AuthInput({
  icon,
  label,
  disabled,
  secureToggle,
  style,
  onFocus,
  onBlur,
  ...props
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          disabled && styles.inputRowDisabled,
        ]}
      >
        <Icon
          name={icon}
          size={15}
          color={focused ? colors.primary : colors.mutedForeground}
          style={styles.inputIcon}
        />
        <TextInput
          {...props}
          style={[styles.input, style]}
          editable={!disabled}
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          underlineColorAndroid="transparent"
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {secureToggle ? (
          <TouchableOpacity
            onPress={secureToggle.onToggle}
            style={styles.eyeBtn}
            disabled={disabled}
          >
            <Icon
              name={secureToggle.visible ? 'eye-off' : 'eye'}
              size={15}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, mode]);

  const resetFormState = (nextMode: AuthMode) => {
    if (isLoading) return;
    setMode(nextMode);
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPass(false);
    setShowConfirmPass(false);
    setError('');
  };

  const handlePasswordChange = (value: string) => {
    setPassword(limitPassword(value));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(limitPassword(value));
  };

  const handleLogin = async () => {
    if (isLoading) return;

    setError('');
    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({ username: username.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (isLoading) return;

    setError('');
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password.');
      return;
    }
    if (!confirmPassword.trim()) {
      setError('Please confirm your password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setIsLoading(false);
    }
  };

  const isRegister = mode === 'register';
  const buttonLabel = isRegister ? 'Register' : 'Login';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <SmartNestLogo size={48} />
          </View>
          <Text style={styles.appName}>SmartNest</Text>
          <Text style={styles.appTagline}>IoT Control System</Text>
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.cardTitle}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.cardSub}>
            {isRegister
              ? 'Register to control your home'
              : 'Sign in to control your home'}
          </Text>

          {isRegister ? (
            <AuthInput
              icon="user"
              label="FULL NAME"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full Name"
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              disabled={isLoading}
            />
          ) : null}

          <AuthInput
            icon="user"
            label="USERNAME"
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            disabled={isLoading}
          />

          {isRegister ? (
            <AuthInput
              icon="mail"
              label="EMAIL ADDRESS"
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              disabled={isLoading}
            />
          ) : null}

          <AuthInput
            icon="lock"
            label="PASSWORD"
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="Password"
            secureTextEntry={!showPass}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType={isRegister ? 'newPassword' : 'password'}
            maxLength={PASSWORD_MAX_LENGTH}
            disabled={isLoading}
            secureToggle={{
              visible: showPass,
              onToggle: () => setShowPass(p => !p),
            }}
          />

          {isRegister ? (
            <AuthInput
              icon="lock"
              label="CONFIRM PASSWORD"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              placeholder="Confirm Password"
              secureTextEntry={!showConfirmPass}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              maxLength={PASSWORD_MAX_LENGTH}
              disabled={isLoading}
              secureToggle={{
                visible: showConfirmPass,
                onToggle: () => setShowConfirmPass(p => !p),
              }}
            />
          ) : null}

          {error ? (
            <View style={styles.errorRow}>
              <Icon name="alert-circle" size={13} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={isRegister ? handleRegister : handleLogin}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Icon
                  name={isRegister ? 'user-plus' : 'log-in'}
                  size={16}
                  color={colors.background}
                />
                <Text style={styles.loginBtnText}>{buttonLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.switchWrap}
          onPress={() => resetFormState(isRegister ? 'login' : 'register')}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.switchText}>
            {isRegister ? 'Already have an account? ' : 'New User? '}
            <Text style={styles.switchLink}>
              {isRegister ? 'Login' : 'Register'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },

  logoWrap: { alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  appName: { color: colors.foreground, fontSize: 28, fontWeight: '800' },
  appTagline: { color: colors.mutedForeground, fontSize: 13 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    gap: 16,
  },
  cardTitle: { color: colors.foreground, fontSize: 20, fontWeight: '800' },
  cardSub: { color: colors.mutedForeground, fontSize: 13, marginTop: -8 },

  fieldWrap: { gap: 6 },
  fieldLabel: {
    color: colors.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputRowFocused: { borderColor: colors.primary },
  inputRowDisabled: { opacity: 0.72 },
  inputIcon: { paddingLeft: 13 },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 13,
  },
  eyeBtn: { paddingHorizontal: 13, paddingVertical: 13 },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.destructive + '15',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.destructive + '33',
  },
  errorText: { color: colors.destructive, fontSize: 13, flex: 1 },

  loginBtn: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  loginBtnDisabled: { opacity: 0.82 },
  loginBtnText: { color: colors.background, fontSize: 15, fontWeight: '800' },

  switchWrap: { alignItems: 'center' },
  switchText: {
    color: colors.mutedForeground,
    fontSize: 13,
    textAlign: 'center',
  },
  switchLink: { color: colors.primary, fontWeight: '800' },
});
