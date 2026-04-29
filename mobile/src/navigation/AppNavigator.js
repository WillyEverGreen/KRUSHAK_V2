import React from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows, typography } from '../theme/tokens';

import HomeScreen from '../screens/HomeScreen';
import DiagnoseScreen from '../screens/DiagnoseScreen';
import DiagnoseResultScreen from '../screens/DiagnoseResultScreen';
import MyFarmScreen from '../screens/MyFarmScreen';
import MarketScreen from '../screens/MarketScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NewsScreen from '../screens/NewsScreen';
import ChatScreen from '../screens/ChatScreen';
import CareGuidesScreen from '../screens/CareGuidesScreen';
import FaqScreen from '../screens/FaqScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/* ── Diagnose Stack (main tab + result sub-page) ──────────────── */
function DiagnoseStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiagnoseMain" component={DiagnoseScreen} />
      <Stack.Screen name="DiagnoseResult" component={DiagnoseResultScreen} />
    </Stack.Navigator>
  );
}

/* ── Bottom Tab Navigator ─────────────────────────────────────── */
const TABS = [
  { name: 'Home', label: 'Home', active: 'home', inactive: 'home-outline', component: HomeScreen },
  { name: 'Diagnose', label: 'Diagnose', active: 'scan', inactive: 'scan-outline', component: DiagnoseStack },
  { name: 'MyFarm', label: 'My Farm', active: 'leaf', inactive: 'leaf-outline', component: MyFarmScreen },
  { name: 'Market', label: 'Market', active: 'trending-up', inactive: 'trending-up-outline', component: MarketScreen },
  { name: 'Profile', label: 'Profile', active: 'person', inactive: 'person-outline', component: ProfileScreen },
];

export default function AppNavigator() {
  const insets = useSafeAreaInsets();

  // Tab bar height: fixed 56px content + bottom safe area
  const tabBarHeight = 56 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
          paddingTop: 8,
          backgroundColor: '#fff',
          borderTopColor: colors.borderSoft,
          borderTopWidth: 1,
          ...shadows.card,
          elevation: 16,
        },
        tabBarActiveTintColor: colors.primaryGreen,
        tabBarInactiveTintColor: colors.textGrey,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          const tabConfig = TABS.find((t) => t.name === route.name);
          const iconName = focused ? tabConfig?.active : tabConfig?.inactive;
          return <Ionicons name={iconName || 'apps-outline'} size={24} color={color} />;
        },
      })}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ title: tab.label }}
        />
      ))}
    </Tab.Navigator>
  );
}

/* ── Export secondary screens for use via navigation.navigate() ── */
export { NewsScreen, ChatScreen, CareGuidesScreen, FaqScreen };
