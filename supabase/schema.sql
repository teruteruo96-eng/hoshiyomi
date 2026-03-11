-- ============================================================
-- HOSHIYOMI 星詠み — データベーススキーマ
-- Supabase SQL Editorで実行してください
-- ============================================================

-- 占い師マスタ
CREATE TABLE IF NOT EXISTS tellers (
  id          TEXT PRIMARY KEY,  -- 'mika', 'rin', 'kazuki', 'aoi', 'nami'
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  specialty   TEXT NOT NULL,
  rating      NUMERIC(3,1) DEFAULT 4.8,
  review_count INT DEFAULT 0,
  is_online   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 初期データ
INSERT INTO tellers VALUES
  ('mika',   '月詠 みか',  '🌙', 'タロット・星座占い',  4.9, 3241, false, now()),
  ('rin',    '桜花 りん',  '🌸', '四柱推命・数秘術',   4.8, 2109, false, now()),
  ('kazuki', '炎詠 かずき','🔥', '霊視・前世占い',    4.7, 1855, false, now()),
  ('aoi',    '星宮 あおい','💫', '恋愛・結婚専門',    4.9, 4502, false, now()),
  ('nami',   '海月 なみ',  '🌊', '水晶占い・波動',    4.6,  987, false, now())
ON CONFLICT (id) DO NOTHING;

-- ユーザー (Supabase Authと連携)
CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id),
  email         TEXT NOT NULL,
  display_name  TEXT,
  plan          TEXT DEFAULT 'free',   -- 'free' | 'light' | 'standard' | 'premium'
  free_msgs_left INT DEFAULT 3,
  stripe_customer_id  TEXT,
  stripe_subscription_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- チャットスレッド (ユーザー × 占い師)
CREATE TABLE IF NOT EXISTS threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  teller_id   TEXT REFERENCES tellers(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, teller_id)
);

-- メッセージ
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID REFERENCES threads(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'fortune')),
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_threads_teller  ON threads(teller_id);
CREATE INDEX IF NOT EXISTS idx_threads_user    ON threads(user_id);

-- Realtime有効化
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE tellers;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tellers ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみ閲覧・更新可
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "users_own_threads" ON threads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_select_messages" ON messages
  FOR SELECT USING (
    thread_id IN (SELECT id FROM threads WHERE user_id = auth.uid())
  );

CREATE POLICY "users_insert_messages" ON messages
  FOR INSERT WITH CHECK (
    thread_id IN (SELECT id FROM threads WHERE user_id = auth.uid())
  );

-- tellers は誰でも読める
CREATE POLICY "tellers_public_read" ON tellers
  FOR SELECT USING (true);

-- 占い師は自分のteller_idをオンライン/オフライン更新できる
CREATE POLICY "tellers_update_own_status" ON tellers
  FOR UPDATE USING (
    id IN (
      SELECT tae.teller_id FROM teller_auth_emails tae
      WHERE tae.email = auth.email()
    )
  );

-- ============================================================
-- 占い師メール認証マッピングテーブル
-- （セットアップ時に各占い師のメールアドレスを登録する）
-- ============================================================

CREATE TABLE IF NOT EXISTS teller_auth_emails (
  email     TEXT PRIMARY KEY,
  teller_id TEXT NOT NULL REFERENCES tellers(id)
);

-- teller_auth_emails は誰でも読める（占い師チェックに使用）
ALTER TABLE teller_auth_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teller_auth_emails_public_read" ON teller_auth_emails
  FOR SELECT USING (true);

-- ============================================================
-- 占い師向け RLS ポリシー
-- teller_auth_emails テーブルのメールアドレスで照合
-- ============================================================

-- 占い師は自分のスレッドを閲覧できる
CREATE POLICY "tellers_view_threads" ON threads
  FOR SELECT USING (
    teller_id IN (
      SELECT tae.teller_id FROM teller_auth_emails tae
      WHERE tae.email = auth.email()
    )
  );

-- 占い師は自分のスレッドのメッセージを閲覧できる
CREATE POLICY "tellers_view_messages" ON messages
  FOR SELECT USING (
    thread_id IN (
      SELECT t.id FROM threads t
      WHERE t.teller_id IN (
        SELECT tae.teller_id FROM teller_auth_emails tae
        WHERE tae.email = auth.email()
      )
    )
  );

-- 占い師はメッセージを返信できる（role='fortune'のみ）
CREATE POLICY "tellers_insert_messages" ON messages
  FOR INSERT WITH CHECK (
    role = 'fortune'
    AND thread_id IN (
      SELECT t.id FROM threads t
      WHERE t.teller_id IN (
        SELECT tae.teller_id FROM teller_auth_emails tae
        WHERE tae.email = auth.email()
      )
    )
  );

-- 占い師はメッセージを既読にできる
CREATE POLICY "tellers_update_messages" ON messages
  FOR UPDATE USING (
    thread_id IN (
      SELECT t.id FROM threads t
      WHERE t.teller_id IN (
        SELECT tae.teller_id FROM teller_auth_emails tae
        WHERE tae.email = auth.email()
      )
    )
  );

-- ============================================================
-- 初期セットアップ: 占い師のメールを登録してください
-- 例:
-- INSERT INTO teller_auth_emails (email, teller_id) VALUES
--   ('mika@hoshiyomi.jp',   'mika'),
--   ('rin@hoshiyomi.jp',    'rin'),
--   ('kazuki@hoshiyomi.jp', 'kazuki'),
--   ('aoi@hoshiyomi.jp',    'aoi'),
--   ('nami@hoshiyomi.jp',   'nami');
-- ============================================================

-- ============================================================
-- ユーザー登録トリガー (Supabase Authとの自動同期)
-- 注意: 占い師メールは teller_auth_emails にあるため
--       user_profiles には登録しない（条件付き）
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 占い師メールアドレスの場合はuser_profilesに登録しない
  IF EXISTS (SELECT 1 FROM public.teller_auth_emails WHERE email = new.email) THEN
    RETURN new;
  END IF;

  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
