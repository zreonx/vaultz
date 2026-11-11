import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/context/WorkspaceContext';
import { OfflineSyncProvider } from '@/context/OfflineSyncContext';
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

function InnerApp() {
  const { isDark } = useTheme();
  const { refetchAll } = useWorkspace();

  return (
    <OfflineSyncProvider onSyncSuccess={refetchAll}>
      <TutorialProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <RootNavigator />
        <SpotlightTourModal />
      </TutorialProvider>
    </OfflineSyncProvider>
  );
}

function AppContent() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <InnerApp />
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
