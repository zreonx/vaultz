"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Bell,
  Check,
  CheckCheck,
  HandCoins,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NotificationItem, NotificationType } from "@/types/api";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

function getNotificationIcon(type: NotificationType | string) {
  switch (type) {
    case "SecurityAlert":
      return <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />;
    case "BudgetWarning":
      return <TriangleAlert className="h-4 w-4 text-red-500 shrink-0" />;
    case "SavingsGoalMilestone":
      return <Target className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "LendingReminder":
      return <HandCoins className="h-4 w-4 text-blue-500 shrink-0" />;
    case "TransferCompleted":
      return <ArrowRightLeft className="h-4 w-4 text-teal-500 shrink-0" />;
    default:
      return <Sparkles className="h-4 w-4 text-primary shrink-0" />;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendTestNotification,
    isSendingTest,
  } = useNotifications();

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      setIsOpen(false);
      router.push(notification.actionUrl);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open notifications"
          className="relative h-9 w-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] focus-visible:ring-0"
        >
          <Bell className="h-4 w-4 text-[var(--foreground)]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-84 sm:w-96 p-0 shadow-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="danger" className="h-5 px-1.5 text-[11px] font-medium">
                {unreadCount} new
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] px-2 py-0.5 rounded-full bg-[var(--surface-muted)]"
              title={isConnected ? "Real-time SignalR active" : "Reconnecting to live notifications..."}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span>{isConnected ? "Live" : "Connecting"}</span>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="h-7 px-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[380px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-10 w-10 rounded-2xl bg-[var(--surface-muted)] flex items-center justify-center mb-2.5 text-[var(--muted-foreground)]">
                <Bell className="h-5 w-5 opacity-40" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">All caught up</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                No notifications right now. Activity will appear here live.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`group relative flex items-start gap-3 p-3 text-left transition-colors cursor-pointer ${
                  n.isRead
                    ? "opacity-75 hover:bg-[var(--surface-muted)]/50"
                    : "bg-[var(--surface-muted)]/40 hover:bg-[var(--surface-muted)]"
                }`}
              >
                <div className="mt-0.5 rounded-lg p-1.5 bg-[var(--surface)] border border-[var(--border-subtle)]">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs truncate ${n.isRead ? "font-medium text-[var(--foreground)]" : "font-semibold text-[var(--foreground)]"}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>

                  <span className="text-[10px] text-[var(--muted-foreground)]/70 mt-1 block">
                    {formatRelativeTime(n.createdAtUtc)}
                  </span>
                </div>

                {/* Quick actions on hover */}
                <div className="absolute right-2 top-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      className="h-6 w-6 rounded-md hover:bg-[var(--surface)]"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3 text-[var(--muted-foreground)]" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="h-6 w-6 rounded-md hover:bg-[var(--surface)] text-red-500/80 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-2.5 border-t border-[var(--border)] bg-[var(--surface-muted)]/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => sendTestNotification()}
            disabled={isSendingTest}
            className="h-7 text-[11px] gap-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Send className="h-3 w-3" />
            {isSendingTest ? "Sending..." : "Send test"}
          </Button>

          <span className="text-[10px] text-[var(--muted-foreground)]">
            Powered by SignalR
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
