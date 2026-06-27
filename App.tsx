import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import AccountScreen from './src/screens/AccountScreen';
import colors from './src/constants/colors';
import socketManager from './src/socket/SocketManager';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const DevicesStack = createNativeStackNavigator();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="AllAlerts" component={AlertsScreen} />
    </HomeStack.Navigator>
  );
}

function DevicesNavigator() {
  return (
    <DevicesStack.Navigator screenOptions={{ headerShown: false }}>
      <DevicesStack.Screen name="DeviceList" component={DevicesScreen} />
      <DevicesStack.Screen name="MainBoard" component={MainBoardScreen} />
      <DevicesStack.Screen name="AC" component={AcScreen} />
      <DevicesStack.Screen name="DigitalBoard" component={DigitalBoardScreen} />
    </DevicesStack.Navigator>
  );
}

function MainTabs() {
  useEffect(() => {
    socketManager.connect();
    return () => socketManager.disconnect();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
          height: 62,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: 'home', Devices: 'cpu', History: 'bar-chart-2', Account: 'user',
          };
          return <Icon name={icons[route.name] ?? 'circle'} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Devices" component={DevicesNavigator} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
