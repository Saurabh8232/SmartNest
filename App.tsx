// App shell, auth gate, and main navigation.
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CommonActions, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type {
  NavigationState,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import { AuthProvider, useAuth } from './src/authentication/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import MainBoardScreen from './src/screens/MainBoardScreen';
import DigitalBoardScreen from './src/screens/DigitalBoardScreen';
import AcScreen from './src/screens/AcScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AccountScreen, { AboutScreen } from './src/screens/AccountScreen';
import colors from './src/constants/colors';
import socketManager from './src/socket/SocketManager';
import {
  DeviceConnectionPayload,
  subscribeToDeviceConnection,
} from './src/socket/liveCommunication';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const DevicesStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();
const TAB_BAR_CONTENT_HEIGHT = 62;
const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_DIRECTION_LOCK_RATIO = 1.3;
const PRIMARY_TAB_NAMES = ['Home', 'Devices', 'History', 'Account'] as const;
type PrimaryTabName = (typeof PRIMARY_TAB_NAMES)[number];
type TabSwipeState = {
  setStackAtRoot: (tabName: PrimaryTabName, atRoot: boolean) => void;
};
const TabSwipeStateContext = React.createContext<TabSwipeState | null>(null);
const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Devices: 'cpu',
  History: 'bar-chart-2',
  Account: 'user',
};

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function DeviceConnectionToast() {
  const insets = useSafeAreaInsets();
  const [connectionToast, setConnectionToast] =
    useState<DeviceConnectionPayload | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    const remove = subscribeToDeviceConnection(payload => {
      const wasInitialSnapshot = prevOnlineRef.current === null;
      const changed = prevOnlineRef.current !== payload.online;

      prevOnlineRef.current = payload.online;

      if (wasInitialSnapshot || !changed) return;

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }

      setConnectionToast(payload);
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      toastTimerRef.current = setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setConnectionToast(null));
      }, 5000);
    });

    return () => {
      remove();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [toastAnim]);

  if (!connectionToast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.connectionToast,
        {
          top: insets.top + 12,
          backgroundColor: connectionToast.online
            ? colors.success + 'F0'
            : colors.destructive + 'F0',
          opacity: toastAnim,
          transform: [
            {
              translateY: toastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-60, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Icon
        name={connectionToast.online ? 'wifi' : 'wifi-off'}
        size={16}
        color="#fff"
      />
      <View style={styles.connectionToastText}>
        <Text style={styles.connectionToastTitle}>
          {connectionToast.deviceId} is{' '}
          <Text style={styles.connectionToastStatus}>
            {connectionToast.online ? 'Online' : 'Offline'}
          </Text>
        </Text>
        {!connectionToast.online && connectionToast.lastSeen && (
          <Text style={styles.connectionToastSub}>
            Last seen {formatLastSeen(connectionToast.lastSeen)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

function HomeNavigator() {
  const swipeState = useContext(TabSwipeStateContext);
  const screenListeners = useMemo(
    () => ({
      state: (event: { data?: { state?: NavigationState } }) => {
        swipeState?.setStackAtRoot(
          'Home',
          (event.data?.state?.index ?? 0) === 0,
        );
      },
    }),
    [swipeState],
  );

  return (
    <HomeStack.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={screenListeners}
    >
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="AllAlerts" component={AlertsScreen} />
    </HomeStack.Navigator>
  );
}

function DevicesNavigator() {
  const swipeState = useContext(TabSwipeStateContext);
  const screenListeners = useMemo(
    () => ({
      state: (event: { data?: { state?: NavigationState } }) => {
        swipeState?.setStackAtRoot(
          'Devices',
          (event.data?.state?.index ?? 0) === 0,
        );
      },
    }),
    [swipeState],
  );

  return (
    <DevicesStack.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={screenListeners}
    >
      <DevicesStack.Screen name="DeviceList" component={DevicesScreen} />
      <DevicesStack.Screen name="MainBoard" component={MainBoardScreen} />
      <DevicesStack.Screen name="AC" component={AcScreen} />
      <DevicesStack.Screen name="DigitalBoard" component={DigitalBoardScreen} />
    </DevicesStack.Navigator>
  );
}

function AccountNavigator() {
  const swipeState = useContext(TabSwipeStateContext);
  const screenListeners = useMemo(
    () => ({
      state: (event: { data?: { state?: NavigationState } }) => {
        swipeState?.setStackAtRoot(
          'Account',
          (event.data?.state?.index ?? 0) === 0,
        );
      },
    }),
    [swipeState],
  );

  return (
    <AccountStack.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={screenListeners}
    >
      <AccountStack.Screen name="AccountMain" component={AccountScreen} />
      <AccountStack.Screen name="About" component={AboutScreen} />
    </AccountStack.Navigator>
  );
}

function MainTabBarIcon({
  routeName,
  color,
  size,
}: {
  routeName: string;
  color: string;
  size: number;
}) {
  return (
    <Icon
      name={TAB_ICONS[routeName] ?? 'circle'}
      size={size - 2}
      color={color}
    />
  );
}

function createMainTabScreenOptions(bottomInset: number) {
  return ({
    route,
  }: {
    route: RouteProp<ParamListBase, string>;
  }): BottomTabNavigationOptions => ({
    headerShown: false,
    tabBarStyle: {
      backgroundColor: colors.card,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      elevation: 0,
      height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
      paddingBottom: bottomInset,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.mutedForeground,
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
    tabBarIcon: ({ color, size }) => (
      <MainTabBarIcon routeName={route.name} color={color} size={size} />
    ),
  });
}

function isPrimaryTabAtRoot(route?: NavigationState['routes'][number]) {
  if (
    !route ||
    !PRIMARY_TAB_NAMES.includes(
      route.name as (typeof PRIMARY_TAB_NAMES)[number],
    )
  ) {
    return false;
  }

  const nestedState = route.state as NavigationState | undefined;
  return (nestedState?.index ?? 0) === 0;
}

function resetNestedTabRouteState(
  tabState: NavigationState,
  tabName: PrimaryTabName,
) {
  const targetRoute = tabState.routes.find(route => route.name === tabName);
  const targetState = targetRoute?.state as NavigationState | undefined;

  if (!targetState || targetState.index === 0) {
    return null;
  }

  const rootRoute = targetState.routes[0];
  if (!rootRoute) {
    return null;
  }

  return {
    ...tabState,
    routes: tabState.routes.map(route =>
      route.name === tabName
        ? {
            ...route,
            state: {
              ...targetState,
              index: 0,
              routes: [rootRoute],
            },
          }
        : route,
    ),
  };
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const activeTabIndexRef = useRef(0);
  const previousTabIndexRef = useRef(0);
  const tabNavigationRef = useRef<{
    dispatch: (action: ReturnType<typeof CommonActions.reset>) => void;
    navigate: (name: string) => void;
  } | null>(null);
  const swipeEnabledRef = useRef(true);
  const tabRootStateRef = useRef<Record<PrimaryTabName, boolean>>({
    Home: true,
    Devices: true,
    History: true,
    Account: true,
  });

  useEffect(() => {
    socketManager.connect();
    return () => socketManager.disconnect();
  }, []);

  const screenOptions = useMemo(
    () => createMainTabScreenOptions(insets.bottom),
    [insets.bottom],
  );

  const syncSwipeEnabled = useCallback(() => {
    const activeTabName = PRIMARY_TAB_NAMES[activeTabIndexRef.current];
    swipeEnabledRef.current =
      !!activeTabName && tabRootStateRef.current[activeTabName];
  }, []);

  const swipeState = useMemo<TabSwipeState>(
    () => ({
      setStackAtRoot: (tabName, atRoot) => {
        tabRootStateRef.current[tabName] = atRoot;
        syncSwipeEnabled();
      },
    }),
    [syncSwipeEnabled],
  );

  const screenListeners = useMemo(
    () =>
      ({
        navigation,
      }: {
        navigation: {
          dispatch: (action: ReturnType<typeof CommonActions.reset>) => void;
          navigate: (name: string) => void;
        };
      }) => {
        tabNavigationRef.current = navigation;

        return {
          state: (event: { data?: { state?: NavigationState } }) => {
            const tabState = event.data?.state;
            const activeIndex = tabState?.index ?? 0;
            const activeRoute = tabState?.routes[activeIndex];
            const previousTabName =
              PRIMARY_TAB_NAMES[previousTabIndexRef.current];
            const activeTabName = PRIMARY_TAB_NAMES[activeIndex];

            activeTabIndexRef.current = activeIndex;
            if (
              activeRoute?.name === 'Home' ||
              activeRoute?.name === 'Devices' ||
              activeRoute?.name === 'Account'
            ) {
              tabRootStateRef.current[activeRoute.name] =
                isPrimaryTabAtRoot(activeRoute);
            }
            if (previousTabName && previousTabName !== activeTabName) {
              const resetState = tabState
                ? resetNestedTabRouteState(tabState, previousTabName)
                : null;

              if (resetState) {
                navigation.dispatch(CommonActions.reset(resetState));
                tabRootStateRef.current[previousTabName] = true;
              }
            }
            previousTabIndexRef.current = activeIndex;
            syncSwipeEnabled();
          },
        };
      },
    [syncSwipeEnabled],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);

          return (
            swipeEnabledRef.current &&
            horizontalDistance > 20 &&
            horizontalDistance > verticalDistance * SWIPE_DIRECTION_LOCK_RATIO
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          if (
            !swipeEnabledRef.current ||
            Math.abs(gestureState.dx) < SWIPE_DISTANCE_THRESHOLD
          ) {
            return;
          }

          const nextIndex =
            gestureState.dx < 0
              ? activeTabIndexRef.current + 1
              : activeTabIndexRef.current - 1;

          if (nextIndex < 0 || nextIndex >= PRIMARY_TAB_NAMES.length) {
            return;
          }

          tabNavigationRef.current?.navigate(PRIMARY_TAB_NAMES[nextIndex]);
        },
      }),
    [],
  );

  return (
    <View style={styles.tabsRoot} {...panResponder.panHandlers}>
      <TabSwipeStateContext.Provider value={swipeState}>
        <Tab.Navigator
          screenOptions={screenOptions}
          screenListeners={screenListeners}
        >
          <Tab.Screen name="Home" component={HomeNavigator} />
          <Tab.Screen name="Devices" component={DevicesNavigator} />
          <Tab.Screen name="History" component={HistoryScreen} />
          <Tab.Screen name="Account" component={AccountNavigator} />
        </Tab.Navigator>
      </TabSwipeStateContext.Provider>
      <DeviceConnectionToast />
    </View>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      key={user ? 'authenticated' : 'unauthenticated'}
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.foreground,
          border: colors.border,
          notification: colors.destructive,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      {user ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRoot: { flex: 1 },
  connectionToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  connectionToastText: { flex: 1 },
  connectionToastTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  connectionToastStatus: { fontWeight: '900' },
  connectionToastSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2,
  },
});
