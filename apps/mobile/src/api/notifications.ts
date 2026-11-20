import { apiClient } from "./client";
import { NotificationsListResponse } from "@/types/api";

export const notificationsApi = {
  async getNotifications(limit = 30): Promise<NotificationsListResponse> {
    return apiClient<NotificationsListResponse>(
      `/api/v1/notifications?limit=${limit}`
    );
  },

  async markAsRead(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/notifications/${id}/read`, {
      method: "PUT",
    });
  },

  async markAllAsRead(): Promise<void> {
    return apiClient<void>("/api/v1/notifications/read-all", {
      method: "PUT",
    });
  },

  async deleteNotification(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/notifications/${id}`, {
      method: "DELETE",
    });
  },

  async clearAll(): Promise<void> {
    return apiClient<void>("/api/v1/notifications", {
      method: "DELETE",
    });
  },
};
