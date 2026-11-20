import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { MainTabNavigator, MainTabParamList } from './MainTabNavigator';
import { MonthlyFinanceScreen } from '@/screens/finance/MonthlyFinanceScreen';
import { ReportsScreen } from '@/screens/reports/ReportsScreen';
import { SavingsGoalsScreen } from '@/screens/savings/SavingsGoalsScreen';
import { RecurringScreen } from '@/screens/recurring/RecurringScreen';
import { LendingScreen } from '@/screens/lending/LendingScreen';
import { CategoriesScreen } from '@/screens/categories/CategoriesScreen';
import { WishlistScreen } from '@/screens/wishlist/WishlistScreen';
import { QuickNotesScreen } from '@/screens/notes/QuickNotesScreen';
import { ToolsScreen } from '@/screens/tools/ToolsScreen';
import { NotificationsScreen } from '@/screens/notifications/NotificationsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  MonthlyFinance: undefined;
  Reports: undefined;
  SavingsGoals: undefined;
  Recurring: undefined;
  Lending: undefined;
  Categories: undefined;
  Wishlist: undefined;
  QuickNotes: undefined;
  Tools: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppStackNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="MonthlyFinance" component={MonthlyFinanceScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
      <Stack.Screen name="Recurring" component={RecurringScreen} />
      <Stack.Screen name="Lending" component={LendingScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="QuickNotes" component={QuickNotesScreen} />
      <Stack.Screen name="Tools" component={ToolsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};
