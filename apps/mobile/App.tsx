import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { TutorialProvider } from '@/context/TutorialContext';
import { SpotlightTourModal } from '@/components/tutorial/SpotlightTourModal';
import { RootNavigator } from '@/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

function AppContent() {
  const { isDark } = useTheme();

  return (
    <AuthProvider>
      <WorkspaceProvider>
        <TutorialProvider>
          <StatusBar style={isDark ? "light" : "dark"} />
          <RootNavigator />
          <SpotlightTourModal />
        </TutorialProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
