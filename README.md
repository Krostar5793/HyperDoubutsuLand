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

## 画面
| パス | 画面 |
| --- | --- |
| `/` | ホーム（メニュー、探索の再開、開発用ツール） |
| `/monsters` | 編成（バトル・スタンバイ・控え・預り所）。モンスターを選んで移動先を押すと移動・入れ替え |
| `/monsters/[id]` | モンスターの詳細（ステータス、LP の振り分け、リリース） |
| `/explore` | エリア選択（バトルメンバーが 1 体以上いれば出発できる） |
| `/explore/[id]` | 探索中（自動で進む。ポーズ中は引き返せる） |
| `/items` | 所持品・所持金（フィールドで使えるアイテムを使う） |
| `/help` | ヘルプ（ガイドの文章をいつでも読める） |
| `/welcome` | 初回ログイン時: チュートリアルを遊ぶかスキップするか |
| `/welcome/starter` | スキップしたとき: 最初のモンスターを選ぶ |
| `/admin/ui` | UI エディタ（管理者のみ） |

- **開発用ツール**: ホーム画面の下にあり、開発環境（`npm run dev`）でだけ表示されます。モンスター・ペリーカ・アイテムをもらえるので、テストプレイに使ってください。`SUPABASE_SERVICE_ROLE_KEY` が必要です。
- **ローカルのサンプルデータ**: `supabase/seed.sql` は `npm run db:reset` のときに自動で入ります。クラウドには入りません。中身はモンスター 5 種・特技 8 種・ステータスダウン 4 種・アイテム 3 種・エリア「はじまりの草原」です。
- **DB の型定義**: テーブルを変えたら `npm run db:types` で `src/lib/supabase/database.types.ts` を作り直してください。

## UI エディタ（`/admin/ui`）
- **画面の大きさ**: ゲーム画面は **1280×720（横向き 16:9）** で固定です。ウィンドウに合わせて拡大・縮小し、余白は黒帯になります。スマホを縦向きで持つと、横向きにするよう案内が出ます。
- **使える人**: 管理者だけです（`profiles.is_admin = true`）。管理者にはステータスバーに「UIエディタ」ボタンが出ます。
- **置けるもの**

  | 種類 | 中身 |
  | --- | --- |
  | テキスト | 文字・サイズ・色・背景色・太字・寄せ |
  | ボタン | テキストと同じ設定に加えて、押したときの動作（今は「画面へ移動」のみ） |
  | 画像 | エディタからアップロード（Storage の `Images/ui/` に保存）。収め方を選べる |
  | 表示領域 | モンスター一覧や探索ログなど、コードが中身を描く部分。位置と大きさだけ変えられる |
  | 背景 | 色または画像 |

- **操作**: ドラッグで移動、右下の四角でサイズ変更、矢印キーで微調整、Delete で削除。「保存」でゲームに反映されます。「初期配置に戻す」で、コードの初期配置に戻せます。
- **データの保存先**: `UI_Screens`（画面ごとの背景）と `UI_Elements`（要素）。保存されていない画面は、`src/lib/ui/types.ts` の初期配置で表示されます。

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
| 必要経験値（Lv → Lv+1） | `floor(50 × 1.1^(Lv−1) × ランク係数)`。係数は `Ranks.exp_rate`（SS 2.0 / S 1.8 / A 1.6 / B 1.4 / C 1.2 / D 1.0 / E 0.8） |
| ステータス | `初期値 + floor((固定値 + 初期値 × 割合) × 49 × ((Lv−1)/49)^1.3)`（ただし 1 レベルごとに最低 +1）。序盤はなだらかに伸び、Lv50 で目安の値になって成長が止まる |
| 固定値・割合 | HP: 8 + 初期値の23% / MP: 初期値の18.4% / atk・def・int・spd: 3 + 初期値の22% |
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

### モンスターの入手
**入手の共通処理**
- 探索・イベント・景品・交換・合成のどれで手に入れても、DB 関数 `grant_monster(プレイヤー, 種族, レベル, 入手経路)` を通します。サーバー側の処理専用で、プレイヤーからは呼べません。
- 控えに空きがあれば控えへ、なければ**預り所**（`Player_Monsters.in_storage = true`）へ送られます。
- 預り所のモンスターは編成できません。プレイヤーは次の関数で預り所を整理します。
  - `release_monster`: モンスターをリリースする（どこからでも可）
  - `withdraw_from_storage`: 預り所から控えへ引き取る（控えに空きが必要）

**戦闘後に仲間になる判定**（`src/lib/game/recruit.ts` の `resolveRecruit`）
- 確率は次のかけ算で決まります（上限 100%）。専用アイテムは 1 ターンに 1 回だけ使えます。
  - ランクの確率（`Ranks.recruit_rate`: E 20% / D 10% / C 5% / B 2% / A 1% / S 0.5% / SS 0.1%）
  - 同じ種族を今持っていれば × 0.5
  - 戦闘中にそのモンスターへ使った専用アイテムの倍率（複数なら掛け合わせ）
- 仲間になるのは 1 回の戦闘で 1 体だけです。複数当たったら確率が低い方、同じ確率ならランダムで決まります。
- ボスは仲間になりません。
- 仲間になるときのレベルは出会ったときのレベルです（最大 Lv50）。

### アイテム（`Items` / `Player_Items`）
| `effect_type` | 効果 | `effect_value` |
| --- | --- | --- |
| `none` | 効果なし（素材など） | 不要 |
| `recruit_boost` | 戦闘中、指定した 1 体の仲間になる確率を何倍にするか | 倍率（2 なら 2 倍） |
| `box_expand` | 控えの上限を増やす | 増やす数 |

- **渡す・消費する**: `grant_item` / `consume_item` を使います（サーバー側専用）。
- **フィールドで使う**: プレイヤーが `supabase.rpc("use_field_item", { p_item_id })` を呼びます（`usable_in_field = true` のアイテムのみ）。

### 戦闘（`src/lib/game/battle.ts` / `battle-server.ts`）
**流れ**
- コマンドは 戦う／特技／アイテム／防御／交代 の 5 つです。
- 毎ターン、場の味方全員のコマンドを選んでからまとめて実行します。実行の順番は「交代・防御 → アイテム → それ以外（素早さ順）」です。
- 場の味方が倒れると、スタンバイ（枠の小さい順）が自動で入ります。8 体すべて倒れたら全滅です。
- アイテム（仲間になる確率アップ）はパーティ全体で 1 ターンに 1 回までで、ボスには使えません。

**ダメージ**
- 計算式は `(使い手の[attack_stat] × 威力/100 − 受け手の[defense_stat]/2) × 0.75〜1.25` です。そこに会心（5%、1.5 倍）、防御中（0.5 倍）、属性耐性（反射・とばっちりを含む）がかかり、最低でも 1 ダメージ入ります。
- 定数は `BATTLE` にまとめてあります。

**特技（`Skills`）**

| 列 | 中身 |
| --- | --- |
| `category` | attack（攻撃）／ heal（回復）／ support（効果のみ） |
| `attack_stat` / `defense_stat` | 威力・軽減に使うステータス（atk 以外も指定可） |
| `power` | 威力 |
| `mp_cost` | 消費 MP |
| `target` | 対象 |
| `accuracy` | 命中率 |
| `element_id` | 属性 |

**付与する効果**
- 特技が付与する効果は `Skill_Effects`（特技 × 状態異常 × 付与率%）に登録します。1 つの特技に複数の効果を付けられます。
- 今の状態異常はステータスダウンだけです（`Status_Effects.effect_type = stat_down`、`stat`、`stages`）。1 段階 20% 下がり、最大 4 段階まで。戦闘が終わるまで続きます。

**特技の枠**
- 図鑑の初期の特技は `Species_Skills`、個体ごとの特技（合成など）は `Monster_Skills` に、どちらも枠ごとの行で登録します。個体の特技が 1 つでもあれば、そちらが優先されます。
- 枠の数はサイズで決まり、`Size_Rules` で設定します。仮の値はサイズ 1 → 5 枠、2 → 6、3 → 7 で、登録のないサイズは 5 枠です。

**報酬**
- 経験値は、敵 1 体あたり `10 × レベル × ランク係数 × Monster_Species.exp_multiplier` です。
- メタル系のように経験値の多い敵は、`exp_multiplier` を大きくします。
- 場に残った味方で均等に分け、生き残ったスタンバイには半分入ります。

**不正対策**
- 戦闘の状態は `Battles` に保存し、計算はすべてサーバーで行います。
- 同じターンを二重に送ると拒否されます。

### チュートリアルと最初のモンスター
**流れ**
1. 初回ログイン時は `/welcome` に案内され、「チュートリアルを遊ぶ」か「スキップする」かを選びます。どちらか選ぶまで、ほかの画面には行けません。
2. **遊ぶ場合**: チュートリアル用のエリアを、ガイドを読みながら探索します。初めての戦闘の直前に、最初のモンスターを 3 体の中から選びます。探索が終わるとチュートリアル完了です。
3. **スキップする場合**: 最初のモンスターを選ぶ画面だけが出ます。
4. チュートリアルは 1 回だけ遊べます。最初のモンスターも 1 回だけ選べます。

**データ（Table Editor で編集）**

| テーブル | 中身 |
| --- | --- |
| `Areas.is_tutorial` | チュートリアル用のエリア（1 つだけ。エリア一覧には出ない） |
| `Starter_Options` | 最初のモンスターの候補（種族・レベル・紹介文・並び順） |
| `Guide_Pages` | ガイドの文章。`key` がチュートリアルで出るタイミング（intro / explore / loot / starter / battle / recruit / party / finish）。`show_in_help` が true のものはヘルプにも出る |

**進み具合の記録**: `profiles.tutorial_state`（pending / in_progress / completed / skipped）と `profiles.starter_chosen` に記録します。プレイヤーが自分で変えることはできません。

### 通貨（`Currencies` / `Player_Currencies`）
- 基本通貨は**ペリーカ（P）**です（`code = perica`）。通貨は `Currencies` に行を足せば増やせます。
- 渡す・使うときは `grant_currency` / `spend_currency` を使います（サーバー側専用）。

### 探索（`src/lib/game/explore.ts` / `expedition.ts`）
**エリアの設定（Table Editor で入力）**

| テーブル | 中身 |
| --- | --- |
| `Areas` | エリア。クリア報酬（通貨と額）、通常戦闘の敵の数（1〜3） |
| `Area_Squares` | マス（1 から順番に）。各マスでモンスター・落とし物・宝箱・選択イベントが起こる確率（%）。合計 100 に満たない分は「何も起きない」 |
| `Area_Encounters` | 出現するモンスター。重み（出やすさの比率）とレベルの範囲 |
| `Area_Loot` | 落とし物（`source = field`）と宝箱（`source = chest`）の候補。アイテムか通貨のどちらか、重み、個数の範囲 |
| `Area_Bosses` | ボス（最大 3 体）。仲間にはならない |

**進み方**
1. 全マスを進むとボス戦です。勝てばクリアで、拾ったものとクリア報酬を受け取ります。
2. 途中で引き返すと、拾ったものは受け取れますが、クリア報酬はもらえません。
3. 全滅すると、その探索で拾ったアイテム・通貨は消えます。仲間になったモンスターは残ります。

**仕組み**
- 抽選はすべてサーバーで行い、1 マスごとに `Expeditions`（進行状況と記録）へ保存します。
- 同じマスを二重に処理しようとすると拒否されます。
- 1 人が同時に進められる探索は 1 つだけです。
- サーバーの処理には `.env.local` の `SUPABASE_SERVICE_ROLE_KEY` が必要です（Supabase の Project Settings > API Keys の secret key）。
- **戦闘**: モンスターのマスとボスで始まります（下の「戦闘」を参照）。探索中、HP・MP は戦闘をまたいで持ち越し、探索が終わると全回復します。
- **まだの部分**: 選択イベントは内容が決まるまで「何も起きない」扱いです。
- **結合テスト**: ローカルの Supabase を起動して、次のように実行します。
  `TEST_SUPABASE_URL=http://127.0.0.1:54321 TEST_SUPABASE_SERVICE_ROLE_KEY=<ローカルの service_role key> npx vitest run expedition.integration`

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
| `NEXT_PUBLIC_SUPABASE_URL` | プロジェクト URL。`https://<project-ref>.supabase.co` の形で、**末尾に `/rest/v1` などを付けない**（付けると「Invalid path specified in request URL」で失敗します） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings > API Keys の **Publishable key**（`sb_publishable_...`）または旧形式の **anon key** |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings > API Keys の **Secret key**（`sb_secret_...`）。サーバー専用 |

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
