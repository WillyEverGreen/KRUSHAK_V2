import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './store/authStore';
import AppNavigator from './navigation/AppNavigator';
import AuthScreen from './screens/AuthScreen';
import NewsScreen from './screens/NewsScreen';
import ChatScreen from './screens/ChatScreen';
import CareGuidesScreen from './screens/CareGuidesScreen';
import FaqScreen from './screens/FaqScreen';
import CommonDiseasesScreen from './screens/CommonDiseasesScreen';
import { colors } from './theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const Stack = createStackNavigator();

/* ── Common header options for secondary screens ──────────────── */
const greenHeader = (title) => ({
  headerShown: true,
  title,
  headerStyle: {
    backgroundColor: colors.primaryGreen,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '800', fontSize: 17 },
  headerBackTitleVisible: false,
});

function RootNavigator() {
  const { token, isReady, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundGreen }}>
        <ActivityIndicator size="large" color={colors.accentGreen} />
      </View>
    );
  }

  if (!token) {
    return <AuthScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={AppNavigator} />
      {/* Secondary screens — accessible via navigation.navigate('News') etc from any screen */}
      <Stack.Screen
        name="News"
        component={NewsScreen}
        options={greenHeader('Agri News')}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={greenHeader('Farm Assistant')}
      />
      <Stack.Screen
        name="CareGuides"
        component={CareGuidesScreen}
        options={greenHeader('Care Guides')}
      />
      <Stack.Screen
        name="Faq"
        component={FaqScreen}
        options={greenHeader('Help & FAQ')}
      />
      <Stack.Screen
        name="CommonDiseases"
        component={CommonDiseasesScreen}
        options={greenHeader('Common Diseases')}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
