import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:5180"),
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});

export const env = parsedEnv.success
  ? parsedEnv.data
  : {
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:5180",
      NEXT_PUBLIC_APP_ENV: "development" as const,
    };
