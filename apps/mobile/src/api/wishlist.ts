import { apiClient } from "./client";
import {
  WishlistItemResponse,
  WishlistPriority,
  WishlistStatus,
} from "@/types/api";

export interface CreateWishlistItemRequest {
  name: string;
  estimatedPrice: number;
  currencyCode: string;
  priority: WishlistPriority;
  accountId?: string | null;
  categoryId?: string | null;
  targetDate?: string | null;
  url?: string | null;
  notes?: string | null;
}

export interface UpdateWishlistItemRequest extends CreateWishlistItemRequest {
  status: WishlistStatus;
}

export interface PurchaseWishlistItemRequest {
  logExpense: boolean;
  accountId?: string | null;
  categoryId?: string | null;
  occurredOn?: string | null;
  actualAmount?: number | null;
}

export const wishlistApi = {
  async getWishlist(
    accountId?: string,
    status?: WishlistStatus
  ): Promise<WishlistItemResponse[]> {
    const params: string[] = [];
    if (accountId) params.push(`accountId=${encodeURIComponent(accountId)}`);
    if (status !== undefined) params.push(`status=${status}`);
    const query = params.length > 0 ? `?${params.join("&")}` : "";
    return apiClient<WishlistItemResponse[]>(`/api/v1/wishlist${query}`);
  },

  async createItem(
    data: CreateWishlistItemRequest
  ): Promise<WishlistItemResponse> {
    return apiClient<WishlistItemResponse>("/api/v1/wishlist", {
      method: "POST",
      body: JSON.stringify({
        name: data.name.trim(),
        estimatedPrice: data.estimatedPrice,
        currencyCode: data.currencyCode.toUpperCase(),
        priority: data.priority,
        accountId: data.accountId || null,
        categoryId: data.categoryId || null,
        targetDate: data.targetDate || null,
        url: data.url?.trim() || null,
        notes: data.notes?.trim() || null,
      }),
    });
  },

  async updateItem(
    id: string,
    data: UpdateWishlistItemRequest
  ): Promise<WishlistItemResponse> {
    return apiClient<WishlistItemResponse>(`/api/v1/wishlist/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: data.name.trim(),
        estimatedPrice: data.estimatedPrice,
        currencyCode: data.currencyCode.toUpperCase(),
        priority: data.priority,
        status: data.status,
        accountId: data.accountId || null,
        categoryId: data.categoryId || null,
        targetDate: data.targetDate || null,
        url: data.url?.trim() || null,
        notes: data.notes?.trim() || null,
      }),
    });
  },

  async purchaseItem(
    id: string,
    data: PurchaseWishlistItemRequest
  ): Promise<WishlistItemResponse> {
    return apiClient<WishlistItemResponse>(`/api/v1/wishlist/${id}/purchase`, {
      method: "POST",
      body: JSON.stringify({
        logExpense: data.logExpense,
        accountId: data.logExpense ? data.accountId || null : null,
        categoryId: data.logExpense ? data.categoryId || null : null,
        occurredOn: data.logExpense ? data.occurredOn || null : null,
        actualAmount:
          data.logExpense && data.actualAmount !== undefined
            ? data.actualAmount
            : null,
      }),
    });
  },

  async deleteItem(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/wishlist/${id}`, {
      method: "DELETE",
    });
  },
};
