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

### スキル（`Skills`）・モンスター図鑑（`Monster_Species`）
- **データの入力**: ダッシュボードの Table Editor で行います。アプリからは読むことしかできません。
- **画像**: Storage の `Images` バケット（公開）にアップロードし、そのファイルパス（例: `monsters/slime.png`）を `image_path` 列に入れます。
- **スキルの指定**: `skill_1`〜`skill_5` には `Skills` の `id` を入れます（Table Editor ではプルダウンで選べます）。
- **SQL で書くときの注意**: テーブル名に大文字が入っているので、`"Monster_Species"` のようにダブルクォートで囲みます（アプリの `supabase.from("Monster_Species")` ではそのままで OK）。
- **列を増やすときの注意**: Table Editor ではなく、`supabase/migrations/` に SQL を追加して変更してください。

### 所持モンスター（`Player_Monsters`）
| `party_slot` | 扱い |
| --- | --- |
| 1〜4 | バトルメンバー |
| 5〜8 | スタンバイメンバー |
| NULL | 控え |

- **控えの上限**: `profiles.box_capacity`（初期値 100）。超えるとDB側でエラーになります。
- **プレイヤーにできないこと**: `box_capacity` は書き換えられません。上限を上げるのはアイテム使用の処理を通してのみです。
- **編成の変更**: `supabase.rpc("move_monster", { p_monster_id, p_target_slot })` を呼びます。移動先に別のモンスターがいれば入れ替わり、`p_target_slot` に `null` を渡すと控えに移ります。
- **枠番号の定義**: `src/lib/game/party.ts` にあります。

### 属性・状態異常と耐性
| テーブル | 中身 |
| --- | --- |
| `Resistance_Levels` | 耐性の段階（弱点 2倍 / 普通 1倍 / 耐性 0.6倍 / 適応 0.2倍 / 無効 0倍 / 吸収 / 反射）。倍率はここで調整 |
| `Elements` | 属性の一覧。`Monster_Species.element_id`（1体に1つ）と `Skills.element_id`（空なら無属性）で参照 |
| `Element_Matchups` | 属性のすくみ（攻撃側の属性 → 防御側の属性 → 耐性段階） |
| `Species_Element_Resistances` | 種族ごとの属性耐性の上書き（すくみと違う耐性を持たせたいときだけ） |
| `Status_Effects` | 状態異常の一覧 |
| `Species_Status_Resistances` | 種族ごとの状態異常耐性 |

- 登録のない組み合わせはすべて「普通（等倍）」です。特徴のあるものだけ入力すれば OK です。
- 実際の耐性は DB 関数で求めます: `element_resistance(種族id, 攻撃の属性id)`（上書き → すくみ → 普通 の順）、`status_resistance(種族id, 状態異常id)`。
- 状態異常の耐性には「吸収」を設定できません（DB の制約でエラーになります）。

### 反射と「とばっちり」（`src/lib/game/hit.ts` の `resolveHit`）
1. 防御側の耐性で判定する
2. 防御側が **反射** → 攻撃側の耐性で判定する
3. 攻撃側も **反射** → **とばっちり**: 攻撃側を除く攻撃側パーティから 1 体が、**耐性を一段階下げて**判定を受ける
   - 段階の強さ: 反射 = 吸収 ＞ 無効 ＞ 適応 ＞ 耐性 ＞ 普通 ＞ 弱点（弱点はそれ以上下がらない）
   - 候補は反射・吸収を持たない（無効以下の）モンスター。その中で最も倍率が高くなる（攻撃側が最も不利になる）1 体が選ばれる。同じ倍率なら乱数
   - 候補がいなければ効果は霧散する

ダメージにも状態異常にも同じ流れで使えます（状態異常では `baseAmount` に付与率を渡すと、倍率をかけた付与率が返ります）。`npm test` でテストを実行できます。

### 育成（`src/lib/game/growth.ts`）
| 項目 | 仕様 |
| --- | --- |
| 必要経験値（Lv → Lv+1） | `floor(50 × 1.1^(Lv−1) × ランク係数)`。SS 2.0 / S 1.8 / A 1.6 / B 1.4 / C 1.2 / D 1.0 / E 0.8 |
| ステータス | `初期値 + floor((固定値 + 初期値 × 割合) × (Lv−1))`。Lv50 で成長が止まる |
| 1レベルの増加量 | HP: 8 + 初期値の23% / MP: 初期値の18.4% / atk・def・int・spd: 3 + 初期値の22% |
| リミットポイント（LP） | Lv51 以降、1 レベルごとに +5。振ると HP +10、MP +5、その他 +1 |
| LP を振るときの消費 | `5 + 5 × floor(そのステータスに振った回数 / 10)` |
| レベル上限 | `Player_Monsters.level_cap`（初期値 99）。上限に達したら余った経験値は捨てる |

**Lv50 の目安**（LP を除く）

| ステータス | 初期値 → Lv50 |
| --- | --- |
| HP | 10〜50 → 514〜1005 |
| MP | 10〜50 → 100〜500 |
| atk・def・int・spd | 5〜30 → 205〜500 |

- atk〜spd の Lv50 での合計は、およそ `588 + 初期値の合計 × 11.8` です。
  - 初期値の合計を 35〜95 にすると、Lv50 で 1000〜1700 になります。

**実装について**
- **ステータスは保存しません**: 図鑑の初期値・レベル・LP を振った回数（`alloc_hp` など）から `statsAt()` で計算します。図鑑の値を調整すると、所持モンスターにも反映されます。
- **経験値の付与**: DB 関数 `grant_exp(モンスターid, 量)` を使います。サーバー側の処理専用で、プレイヤーからは呼べません。
- **LP を振る**: `supabase.rpc("allocate_limit_point", { p_monster_id, p_stat })` を呼びます。
- **式を変えるとき**: `growth.ts` とマイグレーションの SQL 関数の両方を直してください。

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
