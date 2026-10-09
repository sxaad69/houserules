import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from './navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { LocaleProvider, useStrings } from './i18n';
import { SessionProvider } from './store/session';
import { ThemesProvider } from './store/themes';
import { HomeScreen } from './screens/HomeScreen';
import { DecksScreen } from './screens/DecksScreen';
import { ThemesScreen } from './screens/ThemesScreen';
import { LeaderboardsScreen } from './screens/LeaderboardsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { TableScreen } from './screens/TableScreen';
import { PrivateTableScreen } from './screens/PrivateTableScreen';
import { RoomScreen } from './screens/RoomScreen';
import { WalletScreen } from './screens/WalletScreen';
import { VipScreen } from './screens/VipScreen';
import type { RootTabParamList, RootStackParamList } from './navigation';

// One stack per tab so each tab keeps its own navigation history.
// Built once at module level — never inside render, or stacks remount.
function tabStack(screens: { name: string; component: React.ComponentType<any> }[]) {
  const Stack = createNativeStackNavigator();
  return function TabStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {screens.map((s) => (
          <Stack.Screen key={s.name} name={s.name} component={s.component} />
        ))}
      </Stack.Navigator>
    );
  };
}

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, React.ComponentProps<typeof Ionicons>['name']> = {
  Home: 'home-outline',
  Decks: 'layers-outline',
  Leaders: 'trophy-outline',
  Profile: 'person-outline',
};

function Tabs() {
  const { t } = useStrings();
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={tabStack([{ name: 'HomeHome', component: HomeScreen }])}
        options={{ title: t.tabs.home }}
      />
      <Tab.Screen
        name="Decks"
        component={tabStack([
          { name: 'DecksHome', component: DecksScreen },
          { name: 'Themes', component: ThemesScreen },
        ])}
        options={{ title: t.tabs.decks }}
      />
      <Tab.Screen
        name="Leaders"
        component={tabStack([{ name: 'LeadersHome', component: LeaderboardsScreen }])}
        options={{ title: t.tabs.boards }}
      />
      <Tab.Screen
        name="Profile"
        component={tabStack([{ name: 'ProfileHome', component: ProfileScreen }])}
        options={{ title: t.tabs.profile }}
      />
    </Tab.Navigator>
  );
}

// Single NavigationContainer for the whole app. Tabs own the bottom nav;
// Table + PrivateTable push on top as full-screen stacks.
function RootNavigator() {
  const { colors, colorScheme } = useTheme();
  const base: NavigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <NavigationContainer
      theme={{
        ...base,
        colors: { ...base.colors, background: colors.background },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // Web: the JS stack's card container doesn't bound screen height,
          // so flex:1 columns grow unbounded (table overflowed to 1080px in
          // an 844px viewport). Constrain cards on web only; native is fine.
          ...(Platform.OS === 'web' ? { cardStyle: { flex: 1, maxHeight: '100vh' } } : null),
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Table" component={TableScreen} />
        <Stack.Screen name="PrivateTable" component={PrivateTableScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Vip" component={VipScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppShell() {
  const { colorScheme } = useTheme();
  // CrazyGames SDK v3: init once on web boot; no-op everywhere else.
  useEffect(() => {
    import('./integrations/crazygames').then(({ crazyGames }) => crazyGames.init());
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default function App() {
  // Dismiss the web boot splash once React has mounted (native uses expo-splash-screen).
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const el = document.getElementById('hr-splash');
      if (el) {
        el.style.transition = 'opacity 0.6s ease';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 650);
      }
    }
  }, []);
  return (
    <ThemeProvider>
      <LocaleProvider>
        <SessionProvider>
          <ThemesProvider>
            <AppShell />
          </ThemesProvider>
        </SessionProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
