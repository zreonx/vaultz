import { apiClient } from "./client";
import { CategoryResponse, CategoryType } from "@/types/api";

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
  colorHex?: string;
  accountId?: string | null;
}

export interface UpdateCategoryRequest {
  name: string;
  colorHex?: string;
  isArchived: boolean;
}

export const categoriesApi = {
  async getCategories(accountId?: string): Promise<CategoryResponse[]> {
    const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    return apiClient<CategoryResponse[]>(`/api/v1/categories${query}`);
  },

  async createCategory(data: CreateCategoryRequest): Promise<CategoryResponse> {
    return apiClient<CategoryResponse>("/api/v1/categories", {
      method: "POST",
      body: JSON.stringify({
        name: data.name.trim(),
        type: data.type,
        colorHex: data.colorHex || "#2A6B58",
        accountId: data.accountId || null,
      }),
    });
  },

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<CategoryResponse> {
    return apiClient<CategoryResponse>(`/api/v1/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: data.name.trim(),
        colorHex: data.colorHex || null,
        isArchived: data.isArchived,
      }),
    });
  },

  async deleteCategory(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/categories/${id}`, {
      method: "DELETE",
    });
  },
};
