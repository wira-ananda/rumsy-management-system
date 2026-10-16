import type { AuthUser } from "./types/auth.type";
export interface Bindings {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  RMS_URL?: string;
}
export interface ApiEnv {
  Bindings: Bindings;
  Variables: { currentUser: AuthUser | null };
}
