import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// 動的ルート（ビルド時に静的解析しない）
export const dynamic = 'force-dynamic';

// 管理者チェックヘルパー
async function getAdminTellerId(req: NextRequest): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const adminMap: Record<string, string> = JSON.parse(
    process.env.ADMIN_TELLER_MAP || '{}'
  );
  return adminMap[session.user.email ?? ''] ?? null;
}

// GET: 管理者認証確認
export async function GET(req: NextRequest) {
  const tellerId = await getAdminTellerId(req);
  if (!tellerId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { data: teller } = await supabaseAdmin
    .from('tellers')
    .select('id, name, emoji, is_online')
    .eq('id', tellerId)
    .single();

  return NextResponse.json({ teller });
}

// PATCH: ステータス更新
export async function PATCH(req: NextRequest) {
  const tellerId = await getAdminTellerId(req);
  if (!tellerId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { is_online } = await req.json();
  if (typeof is_online !== 'boolean') {
    return NextResponse.json({ error: 'is_online は boolean である必要があります' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('tellers')
    .update({ is_online })
    .eq('id', tellerId)
    .select('id, name, emoji, is_online')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ teller: data });
}
