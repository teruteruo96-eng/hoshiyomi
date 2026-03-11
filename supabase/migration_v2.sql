-- ============================================================
-- HOSHIYOMI 星詠み — Migration v2
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. user_profiles に birth_date カラムを追加
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. tellers に bio カラムを追加
ALTER TABLE public.tellers
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- 3. 各占い師の自己紹介文を設定
UPDATE public.tellers SET bio = CASE id
  WHEN 'mika'   THEN 'タロットと星座の神秘的な融合で、あなたの運命を読み解きます。10年以上の経験から生まれた独自のリーディングで、愛・仕事・人生のすべてをお伝えします。'
  WHEN 'rin'    THEN '四柱推命と数秘術の深い知識で、あなたの人生の流れを精密に分析。運命の転換期を見極め、最善の選択へと導きます。'
  WHEN 'kazuki' THEN '霊視と前世リーディングで、現世の課題と魂の使命を明らかにします。見えない世界からのメッセージをお届けします。'
  WHEN 'aoi'    THEN '恋愛・結婚専門の占い師。タロットと星座を組み合わせた独自の手法で、あなたの愛の行方を鮮明に映し出します。'
  WHEN 'nami'   THEN '水晶の波動を通じて宇宙のエネルギーを受け取り、あなたへの大切なメッセージをお伝えします。'
END
WHERE id IN ('mika', 'rin', 'kazuki', 'aoi', 'nami');

-- 4. handle_new_user トリガー関数を更新（birth_date 対応）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 占い師メールアドレスの場合は user_profiles に登録しない
  IF EXISTS (SELECT 1 FROM public.teller_auth_emails WHERE email = new.email) THEN
    RETURN new;
  END IF;

  INSERT INTO public.user_profiles (id, email, display_name, birth_date)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE
      WHEN new.raw_user_meta_data->>'birth_date' IS NOT NULL
      THEN (new.raw_user_meta_data->>'birth_date')::DATE
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    birth_date   = COALESCE(EXCLUDED.birth_date, user_profiles.birth_date);

  RETURN new;
END;
$$;

-- 5. messages テーブルの Realtime を確実に有効化
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tellers;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

-- 6. threads テーブルも Realtime に追加（管理画面のリアルタイム更新用）
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

-- 完了確認クエリ（実行後に結果を確認してください）
SELECT
  column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;
