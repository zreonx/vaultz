import React, { useEffect } from 'react';
import { StyleSheet, Platform, Dimensions, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTutorial } from '@/context/TutorialContext';
import { useTheme } from '@/context/ThemeContext';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { AccountsScreen } from '@/screens/accounts/AccountsScreen';
import { TransactionsScreen } from '@/screens/transactions/TransactionsScreen';
import { LendingScreen } from '@/screens/lending/LendingScreen';
import { ToolsScreen } from '@/screens/tools/ToolsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { typography } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export type MainTabParamList = {
  Dashboard: undefined;
  Accounts: undefined;
  Transactions: undefined;
  IOUs: undefined;
  Tools: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { registerTargetRect } = useTutorial();
  const { colors } = useTheme();

  // Bottom padding to clear Android navigation buttons (back, home, recent) & iOS home bar
  const bottomPadding = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 12 : 8
  );
  const tabHeight = 54 + bottomPadding;
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    registerTargetRect('bottom_tabs', {
      x: 0,
      y: screenHeight - tabHeight,
      width: screenWidth,
      height: tabHeight,
    });
  }, [registerTargetRect, screenHeight, screenWidth, tabHeight]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
            height: tabHeight,
            paddingBottom: bottomPadding,
          },
        ],
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Accounts':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'IOUs':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Tools':
              iconName = focused ? 'calculator' : 'calculator-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }

          return (
            <View
              style={[
                styles.iconContainer,
                focused && [
                  styles.iconContainerActive,
                  { backgroundColor: colors.accentSoft },
                ],
              ]}
            >
              <Ionicons name={iconName} size={19} color={color} />
            </View>
          );
        },
      })}
      screenListeners={{
        tabPress: () => {
          haptics.selection();
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Overview' }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ tabBarLabel: 'Accounts' }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ tabBarLabel: 'Activity' }}
      />
      <Tab.Screen
        name="IOUs"
        component={LendingScreen}
        options={{ tabBarLabel: 'IOUs' }}
      />
      <Tab.Screen
        name="Tools"
        component={ToolsScreen}
        options={{ tabBarLabel: 'Tools' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 5,
  },
  iconContainer: {
    width: 38,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {},
  tabBarLabel: {
    ...typography.caption,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
