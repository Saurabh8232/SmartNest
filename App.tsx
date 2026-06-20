import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import DashboardScreen from './src/screens/DashboardScreen';
import MainBoardScreen from './src/screens/MainBoardScreen';
import DigitalBoardScreen from './src/screens/DigitalBoardScreen';
import AcScreen from './src/screens/AcScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import colors from './src/constants/colors';

const Tab = createBottomTabNavigator();
const TAB_ICONS: Record<string, string> = {
  Dashboard: 'activity',
  Main: 'sliders',
  Digital: 'grid',
  AC: 'wind',
  History: 'bar-chart-2',
  Devices: 'wifi',
  Alerts: 'bell',
};

function TabBarIcon({ routeName, color, size }: { routeName: string; color: string; size: number }) {
  return <Icon name={TAB_ICONS[routeName] ?? 'circle'} size={size} color={color} />;
}

function getScreenOptions({ route }: { route: { name: string } }) {
  return {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: colors.card,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      elevation: 0,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.mutedForeground,
    tabBarLabelStyle: { fontSize: 10, fontWeight: '500' as const, marginBottom: 2 },
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
      <TabBarIcon routeName={route.name} color={color} size={size} />
    ),
  };
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={(props) => getScreenOptions({ route: props.route })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Main" component={MainBoardScreen} />
          <Tab.Screen name="Digital" component={DigitalBoardScreen} />
          <Tab.Screen name="AC" component={AcScreen} />
          <Tab.Screen name="History" component={HistoryScreen} />
          <Tab.Screen name="Devices" component={DevicesScreen} />
          <Tab.Screen name="Alerts" component={AlertsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
