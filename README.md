# HOSHIYOMI 星詠み ✦

占い師が手動でチャット返信する**サブスク制占いチャットサービス**

---

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
# または
pnpm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開いて各値を設定してください。

### 3. Supabase のセットアップ

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. `supabase/schema.sql` の内容を **SQL Editor** で実行
3. Authentication → Settings でメール認証をONに
4. 占い師のメールアドレスを Auth → Users から手動追加

### 4. Stripe のセットアップ

1. [stripe.com](https://stripe.com) でアカウント作成
2. **Product** を3つ作成（ライト/スタンダード/プレミアム）
3. 各プランの **Price ID** を `.env.local` に設定
4. Webhook → エンドポイント追加（後述）

### 5. 開発サーバーの起動

```bash
npm run dev
```

→ http://localhost:3000 でユーザー画面、http://localhost:3000/admin/login で管理者画面

---

## Vercel デプロイ

```bash
# Vercel CLIインストール
npm i -g vercel

# デプロイ
vercel

# 環境変数を設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PRICE_LIGHT
vercel env add STRIPE_PRICE_STANDARD
vercel env add STRIPE_PRICE_PREMIUM
vercel env add ADMIN_TELLER_MAP
vercel env add NEXT_PUBLIC_ADMIN_TELLER_MAP
vercel env add NEXT_PUBLIC_APP_URL
vercel env add ADMIN_EMAILS

# 本番デプロイ
vercel --prod
```

### Stripe Webhook 設定

1. Stripeダッシュボード → Developers → Webhooks
2. エンドポイント追加: `https://your-domain.vercel.app/api/stripe/webhook`
3. 以下のイベントをリッスン:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Webhook Secret を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定

---

## 動作確認（テスト決済）

Stripe テスト用カード番号: `4242 4242 4242 4242`
- 有効期限: 将来の任意の日付
- CVC: 任意の3桁

---

## ディレクトリ構成

```
hoshiyomi/
├── app/
│   ├── (user)/               # ユーザー向けページ
│   │   ├── page.tsx          # トップ（ランディング＋占い師選択）
│   │   ├── chat/[tellerId]/  # チャット画面
│   │   └── subscribe/        # サブスク申込ページ
│   ├── (admin)/              # 管理者向けページ
│   │   └── admin/
│   │       ├── login/        # 占い師ログイン
│   │       └── dashboard/    # ダッシュボード（返信・ステータス管理）
│   └── api/
│       ├── stripe/checkout/  # Checkout Session作成
│       ├── stripe/webhook/   # Stripe Webhook処理
│       └── admin/status/     # 占い師ステータス更新
├── components/
│   ├── user/                 # ユーザー向けコンポーネント
│   └── admin/                # 管理者向けコンポーネント
├── lib/
│   ├── supabase/             # Supabaseクライアント
│   └── stripe.ts             # Stripeクライアント
├── types/index.ts            # 型定義
└── supabase/schema.sql       # DBスキーマ
```

---

## 占い師情報

| ID      | 名前         | 専門           |
|---------|------------|----------------|
| mika    | 月詠 みか   | タロット・星座占い |
| rin     | 桜花 りん   | 四柱推命・数秘術  |
| kazuki  | 炎詠 かずき | 霊視・前世占い    |
| aoi     | 星宮 あおい | 恋愛・結婚専門   |
| nami    | 海月 なみ   | 水晶占い・波動   |
