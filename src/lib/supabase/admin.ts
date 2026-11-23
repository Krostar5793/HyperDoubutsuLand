import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * サーバー専用の管理者クライアント（service_role キー）。
 * RLS を無視して読み書きでき、grant_monster などサーバー専用の関数を呼べる。
 * ブラウザに渡るコード（Client Component）からは絶対に import しないこと。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY が設定されていません（.env.local を確認してください）");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
