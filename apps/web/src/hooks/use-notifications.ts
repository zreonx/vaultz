"use client";

import { useEffect, useRef, useState } from "react";
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@/config/env";
import { apiRequest } from "@/lib/api/client";
import { toast } from "@/components/ui/toast";
import type { NotificationItem, NotificationsListResponse } from "@/types/api";

function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.setValueAtTime(880.0, now + 0.1); // A5

    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);
  } catch {
    // Best effort chime
  }
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiRequest<NotificationsListResponse>("/notifications?limit=30"),
    staleTime: 30 * 1000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest<void>("/notifications/read-all", { method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const sendTestNotificationMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>("/notifications/test", { method: "POST" }),
  });

  useEffect(() => {
    let isCancelled = false;

    const hubUrl = `${env.NEXT_PUBLIC_API_BASE_URL}/hubs/notifications`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on("ReceiveNotification", (notification: NotificationItem) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      playNotificationChime();

      if (notification.type === "SecurityAlert") {
        toast.warning(notification.title, {
          description: notification.message,
          duration: 6000,
        });
      } else if (notification.type === "BudgetWarning") {
        toast.warning(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      } else {
        toast.success(notification.title, {
          description: notification.message,
          duration: 4000,
        });
      }
    });

    connection.onreconnecting(() => {
      if (!isCancelled) setIsConnected(false);
    });

    connection.onreconnected(() => {
      if (!isCancelled) setIsConnected(true);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    connection.onclose(() => {
      if (!isCancelled) setIsConnected(false);
    });

    connection
      .start()
      .then(() => {
        if (!isCancelled) {
          setIsConnected(true);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setIsConnected(false);
        }
        // Non-blocking log
        console.debug("SignalR connection attempt:", err?.message || err);
      });

    return () => {
      isCancelled = true;
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop().catch(() => {});
      }
    };
  }, [queryClient]);

  return {
    notifications: query.data?.items ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    isConnected,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    deleteNotification: (id: string) => deleteNotificationMutation.mutate(id),
    sendTestNotification: () => sendTestNotificationMutation.mutate(),
    isSendingTest: sendTestNotificationMutation.isPending,
  };
}
