"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWorkspace } from "@/context/workspace-context";
import { CategoryType, type CategoryResponse } from "@/types/api";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CATEGORIES_QUERY_KEY, useCategories } from "@/hooks/use-categories";
export { CATEGORIES_QUERY_KEY, useCategories };

const COLOR_PALETTE = [
  { label: "Sage Emerald", value: "#2A6B58" },
  { label: "Slate Moss", value: "#5E716A" },
  { label: "Warm Ochre", value: "#B87D28" },
  { label: "Cobalt Blue", value: "#2563EB" },
  { label: "Plum Violet", value: "#7C3AED" },
  { label: "Terracotta", value: "#B84A39" },
] as const;

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(80),
  type: z.coerce.number(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a 7-char hex color"),
  accountId: z.string().optional(),
});

type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;

export function CategoriesFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace } = useWorkspace();
  const { data: categories = [], isLoading } = useCategories(activeWorkspace?.id);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (values: CreateCategoryFormValues) =>
      apiClient.post<CategoryResponse>("/api/v1/categories", {
        ...values,
        accountId:
          values.accountId && values.accountId !== "all"
            ? values.accountId
            : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      type: CategoryType.Expense,
      colorHex: "#2A6B58",
      accountId: activeWorkspace?.id ?? "all",
    },
  });

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Categories" />;
  }

  const renderCategoryGrid = (items: CategoryResponse[]) => {
    if (isLoading) {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-3.5 w-14 rounded-full" />
                      <Skeleton className="h-3.5 w-12 rounded-full" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-7 w-7 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <Alert variant="muted">
          <FolderKanban className="h-4 w-4" />
          <AlertTitle>No categories in this view</AlertTitle>
          <AlertDescription>
            Create a new category on the left to classify your transactions.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: cat.colorHex }}
                />
                <div>
                  <p className="text-sm font-medium">{cat.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="neutral">{cat.typeName}</Badge>
                    {cat.accountName ? (
                      <Badge variant="default" className="text-[10px]">
                        {cat.accountName}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[10px]">
                        Global
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(cat.id)}
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Categories</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {activeWorkspace
            ? `Organize income and expense categories for ${activeWorkspace.name}.`
            : "Organize your income and expense categories."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>New Category</CardTitle>
            <CardDescription>
              Create a category for either income or expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Category Name</Label>
                <Input
                  id="cat-name"
                  placeholder="Dining & Coffee"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(val) => field.onChange(Number(val))}
                      >
                        <SelectTrigger aria-label="Category Type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(CategoryType.Expense)}>
                            Expense
                          </SelectItem>
                          <SelectItem value={String(CategoryType.Income)}>
                            Income
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="colorHex">Accent Color</Label>
                  <Controller
                    control={control}
                    name="colorHex"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="colorHex"
                          aria-label="Accent Color"
                        >
                          <SelectValue placeholder="Choose color" />
                        </SelectTrigger>
                        <SelectContent>
                          {COLOR_PALETTE.map((swatch) => (
                            <SelectItem key={swatch.value} value={swatch.value}>
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: swatch.value }}
                                />
                                <span>{swatch.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-7">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({categories.length})</TabsTrigger>
              <TabsTrigger value="expense">
                Expense (
                {categories.filter((c) => c.type === CategoryType.Expense).length}
                )
              </TabsTrigger>
              <TabsTrigger value="income">
                Income (
                {categories.filter((c) => c.type === CategoryType.Income).length}
                )
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {renderCategoryGrid(categories)}
            </TabsContent>
            <TabsContent value="expense">
              {renderCategoryGrid(
                categories.filter((c) => c.type === CategoryType.Expense)
              )}
            </TabsContent>
            <TabsContent value="income">
              {renderCategoryGrid(
                categories.filter((c) => c.type === CategoryType.Income)
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
