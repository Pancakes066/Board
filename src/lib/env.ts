import { z } from "zod";

/**
 * Validates required environment variables at startup so a missing
 * `DATABASE_URL`/`AUTH_SECRET` fails fast with a clear message instead of a
 * cryptic runtime error deep inside a request.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
});
