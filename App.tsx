import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import AccountScreen from './src/screens/AccountScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import DigitalBoardScreen from './src/screens/DigitalBoardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import MainBoardScreen from './src/screens/MainBoardScreen';
import AcScreen from './src/screens/AcScreen';
import colors from './src/constants/colors';
import socketManager from './src/socket/SocketManager';

type RootTabParamList = {
  Home: undefined;
  Devices: undefined;
  History: undefined;
  Account: undefined;
};

type HomeStackParamList = {
  Dashboard: undefined;
  Alerts: undefined;
};

type DevicesStackParamList = {
  DeviceList: undefined;
  MainBoard: undefined;
  AC: undefined;
  DigitalBoard: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const DevicesStack = createNativeStackNavigator<DevicesStackParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, string> = {
  Home: 'home',
  Devices: 'cpu',
  History: 'bar-chart-2',
  Account: 'user',
};

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="Alerts" component={AlertsScreen} />
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

function TabBarIcon({ routeName, color, size }: { routeName: keyof RootTabParamList; color: string; size: number }) {
  return <Icon name={TAB_ICONS[routeName]} size={size - 2} color={color} />;
}

function getScreenOptions({ route }: { route: { name: keyof RootTabParamList } }) {
  return {
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
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const, marginBottom: 4 },
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
      <TabBarIcon routeName={route.name} color={color} size={size} />
    ),
  };
}

export default function App() {
  useEffect(() => {
    socketManager.connect();
    return () => socketManager.disconnect();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator screenOptions={(props) => getScreenOptions({ route: props.route })}>
          <Tab.Screen name="Home" component={HomeNavigator} />
          <Tab.Screen name="Devices" component={DevicesNavigator} />
          <Tab.Screen name="History" component={HistoryScreen} />
          <Tab.Screen name="Account" component={AccountScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
