import { apiClient } from "./client";
import { QuickNoteResponse } from "@/types/api";

export interface CreateQuickNoteRequest {
  title: string;
  content: string;
  colorHex?: string | null;
  isPinned?: boolean;
  accountId?: string | null;
}

export interface UpdateQuickNoteRequest {
  title: string;
  content: string;
  colorHex?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  accountId?: string | null;
}

export const quickNotesApi = {
  async getNotes(
    accountId?: string,
    includeArchived = false,
    search?: string
  ): Promise<QuickNoteResponse[]> {
    const params: string[] = [];
    if (accountId) params.push(`accountId=${encodeURIComponent(accountId)}`);
    if (includeArchived) params.push("includeArchived=true");
    if (search?.trim()) params.push(`search=${encodeURIComponent(search.trim())}`);
    const query = params.length > 0 ? `?${params.join("&")}` : "";
    return apiClient<QuickNoteResponse[]>(`/api/v1/quick-notes${query}`);
  },

  async createNote(data: CreateQuickNoteRequest): Promise<QuickNoteResponse> {
    return apiClient<QuickNoteResponse>("/api/v1/quick-notes", {
      method: "POST",
      body: JSON.stringify({
        title: data.title.trim(),
        content: data.content.trim(),
        colorHex: data.colorHex || null,
        isPinned: Boolean(data.isPinned),
        accountId: data.accountId || null,
      }),
    });
  },

  async updateNote(
    id: string,
    data: UpdateQuickNoteRequest
  ): Promise<QuickNoteResponse> {
    return apiClient<QuickNoteResponse>(`/api/v1/quick-notes/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: data.title.trim(),
        content: data.content.trim(),
        colorHex: data.colorHex || null,
        isPinned: data.isPinned,
        isArchived: data.isArchived,
        accountId: data.accountId || null,
      }),
    });
  },

  async togglePin(id: string): Promise<QuickNoteResponse> {
    return apiClient<QuickNoteResponse>(`/api/v1/quick-notes/${id}/toggle-pin`, {
      method: "POST",
    });
  },

  async deleteNote(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/quick-notes/${id}`, {
      method: "DELETE",
    });
  },
};
