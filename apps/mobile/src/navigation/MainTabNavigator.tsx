import React, { useEffect } from 'react';
import { StyleSheet, Platform, Dimensions, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTutorial } from '@/context/TutorialContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useTheme } from '@/context/ThemeContext';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { MonthlyFinanceScreen } from '@/screens/finance/MonthlyFinanceScreen';
import { TransactionsScreen } from '@/screens/transactions/TransactionsScreen';
import { AccountsScreen } from '@/screens/accounts/AccountsScreen';
import { MoreScreen } from '@/screens/more/MoreScreen';
import { typography } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export type MainTabParamList = {
  Dashboard: undefined;
  Finance: undefined;
  Transactions: undefined;
  Accounts: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { registerTargetRect } = useTutorial();
  const { unreadNotificationsCount } = useWorkspace();
  const { colors } = useTheme();

  // Bottom padding to clear Android navigation buttons (back, home, recent) & iOS home bar
  const bottomPadding = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 12 : 8
  );
  const tabHeight = 58 + bottomPadding;
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
        sceneStyle: { backgroundColor: colors.background },
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
            case 'Finance':
              iconName = focused ? 'pie-chart' : 'pie-chart-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Accounts':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'More':
              iconName = focused ? 'menu' : 'menu-outline';
              break;
          }

          return (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: colors.accentSoft },
              ]}
            >
              <Ionicons name={iconName} size={20} color={color} />
              {route.name === 'More' && unreadNotificationsCount > 0 ? (
                <View
                  style={[
                    styles.tabBadgeDot,
                    {
                      backgroundColor: colors.danger,
                      borderColor: colors.surface,
                    },
                  ]}
                />
              ) : null}
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
        name="Finance"
        component={MonthlyFinanceScreen}
        options={{ tabBarLabel: 'Finance' }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ tabBarLabel: 'Activity' }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ tabBarLabel: 'Accounts' }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  iconContainer: {
    width: 42,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabBadgeDot: {
    position: 'absolute',
    top: 3,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  tabBarLabel: {
    ...typography.caption,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
});
