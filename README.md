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

## ゲームデータの仕組み

### モンスター図鑑（`monster_species`）
- **データの入力**: ダッシュボードの Table Editor で行います。アプリからは読むことしかできません。
- **画像**: Storage の `monster-images` バケット（公開）にアップロードし、そのファイルパス（例: `slime.png`）を `image_path` 列に入れます。
- **列を増やすときの注意**: Table Editor ではなく、`supabase/migrations/` に SQL を追加して変更してください。

### 所持モンスター（`player_monsters`）
| `party_slot` | 扱い |
| --- | --- |
| 1〜4 | バトルメンバー |
| 5〜8 | スタンバイメンバー |
| NULL | 控え |

- **控えの上限**: `profiles.box_capacity`（初期値 100）。超えるとDB側でエラーになります。
- **プレイヤーにできないこと**: `box_capacity` は書き換えられません。上限を上げるのはアイテム使用の処理を通してのみです。
- **編成の変更**: `supabase.rpc("move_monster", { p_monster_id, p_target_slot })` を呼びます。移動先に別のモンスターがいれば入れ替わり、`p_target_slot` に `null` を渡すと控えに移ります。
- **枠番号の定義**: `src/lib/game/party.ts` にあります。

## 開発の始め方（クラウドの Supabase を使う）

必要なもの: Node.js 20 以上（Docker は不要）

### 1. Supabase のプロジェクトを作る

1. https://supabase.com で新しいプロジェクトを作成
2. ダッシュボードの **SQL Editor** を開き、`supabase/migrations/` 内の SQL ファイルを**ファイル名の順に**（古い順に）1つずつ貼り付けて実行
3. 開発中は **Authentication > Sign In / Providers > Email** の「Confirm email」をオフにしておくと、登録後すぐログインできます

### 2. 接続情報を設定する

`.env.local` はリポジトリに含まれていません（秘密情報を含むため `.gitignore` で除外）。ひな形からコピーして作ります。

```bash
cp .env.example .env.local
```

`.env.local` に次の値を設定します。

| 変数 | 値の場所 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings > Data API（または「Connect」ボタン）のプロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings > API Keys の **Publishable key**（`sb_publishable_...`）または旧形式の **anon key** |

> `secret` / `service_role` キーは絶対に入れないでください（ブラウザに公開されます）。

### 3. 起動する

```bash
npm install
npm run dev
```

http://localhost:3000 を開き、「新規登録」でアカウントを作成します。
`.env.local` を書き換えたら `npm run dev` を再起動してください。

### DB スキーマを変更するとき

新しい SQL を `supabase/migrations/` に `YYYYMMDDHHMMSS_説明.sql` の形式で追加し、SQL Editor で実行します。

Supabase CLI を使うと、SQL Editor に貼り付ける代わりにコマンドで反映できます（任意）:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>   # project-ref はダッシュボード URL の英数字部分
npx supabase db push                            # 未反映のマイグレーションを適用
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts   # 型定義を生成
```

## （任意）ローカルの Supabase を使う

Docker Desktop を起動した状態で:

```bash
npm run db:start   # ローカル Supabase を起動。表示される API URL と anon key を .env.local に設定
npm run db:reset   # マイグレーションを適用し直す（データは消えます）
npm run db:types   # 型定義を生成
npm run db:stop    # 停止
```

Supabase Studio（DB 管理画面）: http://127.0.0.1:54323
