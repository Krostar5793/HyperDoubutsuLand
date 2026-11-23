-- =========================================================
-- チュートリアル・最初のモンスター・ガイド（ヘルプ）
-- =========================================================

-- チュートリアルの進み具合
--   pending    : まだ選んでいない（初回ログイン時に「遊ぶ / スキップ」を選ぶ）
--   in_progress: チュートリアルのエリアを探索中
--   completed  : 遊び終えた / skipped: スキップした
-- starter_chosen: 最初のモンスターを選び終えたか（2 回選べないようにする）
alter table public.profiles
  add column tutorial_state text not null default 'pending'
    check (tutorial_state in ('pending', 'in_progress', 'completed', 'skipped')),
  add column starter_chosen boolean not null default false;

-- すでにモンスターを持っているプレイヤーは、チュートリアル済みとして扱う
update public.profiles p
   set tutorial_state = 'completed', starter_chosen = true
 where exists (select 1 from public."Player_Monsters" m where m.owner_id = p.id);

-- チュートリアル用のエリア（エリア一覧には出ない。1 つだけ）
alter table public."Areas" add column is_tutorial boolean not null default false;
create unique index "Areas_one_tutorial" on public."Areas" (is_tutorial) where is_tutorial;

-- 最初のモンスターの候補（3 体を想定。Table Editor で編集する）
create table public."Starter_Options" (
  species_id bigint primary key references public."Monster_Species" (id) on delete cascade,
  level int not null default 1 check (level between 1 and 99),
  -- 選ぶ画面に出す紹介文（空なら図鑑の説明）
  message text,
  sort_order int not null default 0
);

alter table public."Starter_Options" enable row level security;
create policy "ログインユーザーは最初のモンスターの候補を読める"
  on public."Starter_Options" for select to authenticated using (true);

-- ガイドの文章（チュートリアル中に表示し、ヘルプでいつでも読める。Table Editor で編集する）
--   key はチュートリアルで表示するきっかけ: intro / explore / loot / starter / battle / recruit / party / finish
create table public."Guide_Pages" (
  key text primary key,
  title text not null,
  body text not null,
  sort_order int not null default 0,
  show_in_help boolean not null default true
);

alter table public."Guide_Pages" enable row level security;
create policy "ログインユーザーはガイドを読める"
  on public."Guide_Pages" for select to authenticated using (true);

insert into public."Guide_Pages" (key, title, body, sort_order) values
  ('intro', 'ようこそ！',
   'ここはハイパーどうぶつランド。モンスターを仲間にして育てながら、各地を探索しましょう。まずは探索の流れを体験してみましょう。', 1),
  ('explore', '探索',
   E'探索では、マスを 1 つずつ自動で進みます。マスでは、モンスターとの戦闘・落とし物・宝箱などが起こります。\n「ポーズ」を押すと止まり、そこから引き返すこともできます。最後のマスの先にはボスが待っていることもあります。', 2),
  ('loot', '拾ったもの',
   '探索中に拾ったアイテムや通貨（ペリーカ）は、探索をクリアするか引き返したときに受け取れます。全滅すると失われるので注意しましょう。', 3),
  ('starter', '最初の仲間',
   'モンスターの気配がします！ 戦う前に、いっしょに旅をする最初の仲間を 1 体選びましょう。', 4),
  ('battle', '戦闘',
   E'戦闘はターン制です。場に出ている仲間ごとにコマンドを選ぶと、素早さの順に行動します。\n・戦う: 通常の攻撃\n・特技: MP を使う技。属性や、ステータスを下げる効果を持つものもあります\n・アイテム: 1 ターンに 1 回だけ使えます\n・防御: 受けるダメージを半分にします\n・交代: スタンバイの仲間と入れ替わります', 5),
  ('recruit', '仲間にする',
   E'戦闘に勝つと、倒したモンスターが確率で仲間になります。ランクが高いモンスターほど仲間になりにくく、すでに持っている種族はさらに半分になります。\n「なかまの鈴」などのアイテムを戦闘中に使うと、確率が上がります。', 6),
  ('party', '編成と育成',
   E'「モンスター」画面で、バトルメンバー（4 体）とスタンバイメンバー（4 体）を編成できます。\n戦闘で経験値を得るとレベルが上がります。Lv51 からはリミットポイント（LP）で好きなステータスを伸ばせます。', 7),
  ('finish', 'チュートリアル完了',
   'これで基本はおしまいです！ 説明は「ヘルプ」からいつでも読み返せます。さっそく探索に出かけましょう。', 8);
