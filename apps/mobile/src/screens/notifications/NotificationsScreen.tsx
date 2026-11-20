import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StackHeader } from "@/components/shared/StackHeader";
import { notificationsApi } from "@/api/notifications";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { NotificationResponse } from "@/types/api";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export const NotificationsScreen: React.FC = () => {
  const { refetchAll } = useWorkspace();
  const { colors } = useTheme();

  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.getNotifications(40);
      setItems(res.items || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load notifications.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkRead = async (item: NotificationResponse) => {
    if (item.isRead) return;
    haptics.light();
    try {
      await notificationsApi.markAsRead(item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await refetchAll();
    } catch {
      // ignore quietly
    }
  };

  const handleMarkAllRead = async () => {
    haptics.light();
    try {
      await notificationsApi.markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await refetchAll();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Unable to mark notifications as read.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    haptics.light();
    try {
      await notificationsApi.deleteNotification(id);
      await Promise.all([loadNotifications(), refetchAll()]);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Unable to delete notification.");
    }
  };

  const confirmClearAll = () => {
    Alert.alert("Clear Notifications", "Remove all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          try {
            await notificationsApi.clearAll();
            setItems([]);
            setUnreadCount(0);
            await refetchAll();
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Unable to clear notifications.");
          }
        },
      },
    ]);
  };

  const getVisuals = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("warn") || t.includes("alert")) {
      return {
        icon: "warning-outline" as const,
        bg: colors.warningSoft,
        fg: colors.warning,
      };
    }
    if (t.includes("error") || t.includes("danger")) {
      return {
        icon: "alert-circle-outline" as const,
        bg: colors.dangerSoft,
        fg: colors.danger,
      };
    }
    if (t.includes("success")) {
      return {
        icon: "checkmark-circle-outline" as const,
        bg: colors.accentSoft,
        fg: colors.accent,
      };
    }
    return {
      icon: "notifications-outline" as const,
      bg: colors.surfaceMuted,
      fg: colors.accent,
    };
  };

  return (
    <ScreenWrapper>
      <StackHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        showPrivacyToggle={false}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={[styles.markAllBtn, { backgroundColor: colors.accentSoft }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.markAllText, { color: colors.accent }]}>Mark All</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void loadNotifications();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.container}>
        {isLoading && items.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons
                name="notifications-off-outline"
                size={26}
                color={colors.textMuted}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Notifications
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Updates about budgets, due schedules, and security alerts will appear here.
            </Text>
          </Card>
        ) : (
          <>
            <View style={styles.topUtilityRow}>
              <Text style={[styles.countHint, { color: colors.textMuted }]}>
                {items.length} notification{items.length === 1 ? "" : "s"}
              </Text>
              <Button
                title="Clear All"
                variant="ghost"
                size="sm"
                onPress={confirmClearAll}
                textStyle={{ color: colors.danger }}
              />
            </View>

            {items.map((item) => {
              const vis = getVisuals(item.type);
              return (
                <Card
                  key={item.id}
                  onPress={() => handleMarkRead(item)}
                  style={[
                    styles.card,
                    !item.isRead && { borderColor: colors.accent },
                  ]}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.iconBox, { backgroundColor: vis.bg }]}>
                      <Ionicons name={vis.icon} size={18} color={vis.fg} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.title,
                            { color: colors.textPrimary },
                            !item.isRead && { fontWeight: "700" },
                          ]}
                        >
                          {item.title}
                        </Text>
                        {!item.isRead ? (
                          <View
                            style={[styles.unreadDot, { backgroundColor: colors.accent }]}
                          />
                        ) : null}
                      </View>
                      <Text style={[styles.message, { color: colors.textSecondary }]}>
                        {item.message}
                      </Text>
                      <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                        {formatTimestamp(item.createdAtUtc)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item.id)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Delete notification"
                    >
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </>
        )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.huge,
  },
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  markAllBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  markAllText: {
    ...typography.caption,
    fontWeight: "700",
  },
  centerBox: {
    paddingVertical: spacing.huge,
    alignItems: "center",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    ...typography.title,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  topUtilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  countHint: {
    ...typography.caption,
    fontWeight: "600",
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.label,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    ...typography.body,
    fontSize: 13,
    marginTop: 2,
  },
  timestamp: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
