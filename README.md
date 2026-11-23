# ハイパーどうぶつランド

モンスター育成型RPG（Webアプリ）。

## 技術スタック

- [Next.js](https://nextjs.org/) 15（App Router）+ TypeScript
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Supabase](https://supabase.com/)（PostgreSQL / 認証）

## ディレクトリ構成

```
src/
  app/                 画面（App Router）
    login/             ログイン・新規登録
    auth/signout/      ログアウト
  lib/supabase/        Supabase クライアント（ブラウザ用 / サーバー用 / middleware 用）
  middleware.ts        セッション更新と未ログイン時のリダイレクト
supabase/
  config.toml          ローカル Supabase の設定
  migrations/          DB スキーマ（SQL マイグレーション）
```

## ローカル開発

必要なもの: Node.js 20 以上、Docker（ローカル Supabase 用）

```bash
npm install
npm run db:start        # ローカル Supabase を起動（初回はイメージ取得に時間がかかります）
cp .env.example .env.local
```

`db:start` の出力に表示される `API URL` と `anon key` を `.env.local` に設定してから:

```bash
npm run dev
```

http://localhost:3000 を開き、「新規登録」でアカウントを作成します。

- Supabase Studio（DB 管理画面）: http://127.0.0.1:54323
- スキーマを変更したら `supabase/migrations/` に SQL を追加し、`npm run db:reset` で反映
- `npm run db:types` で DB の型定義を生成

## クラウドの Supabase に接続する

1. Supabase でプロジェクトを作成
2. `npx supabase link --project-ref <project-ref>` → `npx supabase db push` でスキーマを反映
3. `.env.local`（本番はホスティング側の環境変数）に Project Settings > API の URL と anon key を設定
