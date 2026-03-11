import { createClient } from '@supabase/supabase-js';

// サーバーサイド専用：RLSをバイパスするServiceRoleクライアント
// ビルド時に環境変数がなくてもクラッシュしないようプレースホルダーを使用
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
