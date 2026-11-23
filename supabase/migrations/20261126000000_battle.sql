-- =========================================================
-- 戦闘: 特技の詳細・特技の枠（サイズで増える）・ステータスダウン・報酬倍率・戦闘の状態
-- =========================================================

-- ---------------------------------------------------------
-- 特技（Skills）の詳細
--   category    : attack（攻撃）/ heal（回復）/ support（効果のみ）
--   attack_stat : 威力の計算に使う、使い手のステータス（atk 以外も指定できる）
--   defense_stat: 攻撃のとき、受け手側で軽減に使うステータス
--   target      : enemy（敵1体）/ all_enemies（敵全体）/ ally（味方1体）/ all_allies（味方全体）/ self（自分）
-- ---------------------------------------------------------
alter table public."Skills"
  add column category text not null default 'attack'
    check (category in ('attack', 'heal', 'support')),
  add column attack_stat text not null default 'atk'
    check (attack_stat in ('hp', 'mp', 'atk', 'def', 'int', 'spd')),
  add column defense_stat text not null default 'def'
    check (defense_stat in ('hp', 'mp', 'atk', 'def', 'int', 'spd')),
  add column power numeric not null default 100 check (power >= 0),
  add column mp_cost int not null default 0 check (mp_cost >= 0),
  add column target text not null default 'enemy'
    check (target in ('enemy', 'all_enemies', 'ally', 'all_allies', 'self')),
  add column accuracy numeric not null default 100 check (accuracy between 0 and 100);

-- ---------------------------------------------------------
-- 状態異常の効果（今はステータスダウンのみ）
--   stat_down: stat を stages 段階下げる（最大 4 段階、1 段階 20%）。戦闘が終わるまで続く
-- ---------------------------------------------------------
alter table public."Status_Effects"
  add column effect_type text not null default 'stat_down' check (effect_type in ('stat_down')),
  add column stat text check (stat in ('atk', 'def', 'int', 'spd')),
  add column stages int not null default 1 check (stages between 1 and 4),
  add constraint "Status_Effects_stat_required" check (effect_type <> 'stat_down' or stat is not null);

-- 特技が付与する効果（1 つの特技に複数可）。chance は付与率（%）
create table public."Skill_Effects" (
  skill_id bigint not null references public."Skills" (id) on delete cascade,
  status_effect_id bigint not null references public."Status_Effects" (id) on delete cascade,
  chance numeric not null default 100 check (chance between 0 and 100),
  primary key (skill_id, status_effect_id)
);

alter table public."Skill_Effects" enable row level security;
create policy "ログインユーザーは特技の効果を読める"
  on public."Skill_Effects" for select to authenticated using (true);

-- ---------------------------------------------------------
-- 特技の枠: サイズごとの枠の数（登録のないサイズは 5 枠）
-- ---------------------------------------------------------
create table public."Size_Rules" (
  size int primary key check (size >= 1),
  skill_slots int not null default 5 check (skill_slots between 1 and 20)
);

alter table public."Size_Rules" enable row level security;
create policy "ログインユーザーはサイズの決まりを読める"
  on public."Size_Rules" for select to authenticated using (true);

create function public.skill_slots_for_species(p_species_id bigint)
returns int
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select r.skill_slots
       from public."Monster_Species" s
       join public."Size_Rules" r on r.size = s.size
      where s.id = p_species_id),
    5
  );
$$;

-- 特技は「枠ごとの行」で持つ（枠の数がモンスターによって違うため）
--   Species_Skills: 図鑑の初期の特技
--   Monster_Skills: 個体ごとの特技（合成などで変えたとき。1 つでもあれば図鑑の特技より優先）
create table public."Species_Skills" (
  species_id bigint not null references public."Monster_Species" (id) on delete cascade,
  slot int not null check (slot >= 1),
  skill_id bigint not null references public."Skills" (id) on delete cascade,
  primary key (species_id, slot)
);

create table public."Monster_Skills" (
  monster_id uuid not null references public."Player_Monsters" (id) on delete cascade,
  slot int not null check (slot >= 1),
  skill_id bigint not null references public."Skills" (id) on delete cascade,
  primary key (monster_id, slot)
);

alter table public."Species_Skills" enable row level security;
create policy "ログインユーザーは図鑑の特技を読める"
  on public."Species_Skills" for select to authenticated using (true);

alter table public."Monster_Skills" enable row level security;
create policy "自分のモンスターの特技を読める"
  on public."Monster_Skills" for select to authenticated
  using (exists (
    select 1 from public."Player_Monsters" m
     where m.id = monster_id and m.owner_id = auth.uid()
  ));

-- 枠の数を超える特技は登録できない
create function public.check_skill_slot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  species bigint;
  slots int;
begin
  if tg_table_name = 'Species_Skills' then
    species := new.species_id;
  else
    select m.species_id into species from public."Player_Monsters" m where m.id = new.monster_id;
  end if;
  slots := public.skill_slots_for_species(species);
  if new.slot > slots then
    raise exception '特技の枠は % 個までです（サイズで決まります）', slots;
  end if;
  return new;
end;
$$;

create trigger "Species_Skills_slot_check"
  before insert or update on public."Species_Skills"
  for each row execute function public.check_skill_slot();
create trigger "Monster_Skills_slot_check"
  before insert or update on public."Monster_Skills"
  for each row execute function public.check_skill_slot();

-- 固定の skill_1〜5 列は廃止（枠ごとの行に移行）
alter table public."Monster_Species"
  drop column skill_1, drop column skill_2, drop column skill_3, drop column skill_4, drop column skill_5;
alter table public."Player_Monsters"
  drop column skill_1, drop column skill_2, drop column skill_3, drop column skill_4, drop column skill_5;

-- ---------------------------------------------------------
-- 報酬の倍率（メタル系のような、倒すと経験値が多い敵用）
-- ---------------------------------------------------------
alter table public."Monster_Species"
  add column exp_multiplier numeric not null default 1 check (exp_multiplier > 0);

-- ---------------------------------------------------------
-- 戦闘の状態
--   state: 戦闘の全情報（敵味方のステータス・HP・ダウン段階・特技など）。サーバーの TypeScript が計算する
-- ---------------------------------------------------------
create table public."Battles" (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  expedition_id uuid not null references public."Expeditions" (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'won', 'lost')),
  turn int not null default 1,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public."Battles" enable row level security;
create policy "自分の戦闘を読める"
  on public."Battles" for select to authenticated using (auth.uid() = owner_id);

-- 探索中の戦闘と、パーティの HP・MP（探索中は持ち越し。探索が終われば全回復）
alter table public."Expeditions"
  add column battle_id uuid references public."Battles" (id) on delete set null,
  add column party_state jsonb not null default '{}'::jsonb;

-- 戦闘を始める（サーバー側専用）
create function public.begin_expedition_battle(
  p_expedition_id uuid,
  p_expected_position int,
  p_state jsonb,
  p_event jsonb
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  exp record;
  new_id uuid;
begin
  select * into exp from public."Expeditions" where id = p_expedition_id for update;
  if not found or exp.status <> 'exploring' then
    raise exception '探索中ではありません';
  end if;
  if exp.battle_id is not null then
    raise exception 'すでに戦闘中です';
  end if;
  if exp.position <> p_expected_position then
    raise exception '探索の状態が変わっています。もう一度読み込んでください' using errcode = 'P0002';
  end if;

  insert into public."Battles" (owner_id, expedition_id, state)
  values (exp.owner_id, p_expedition_id, p_state)
  returning id into new_id;

  update public."Expeditions"
     set battle_id = new_id, log = log || jsonb_build_array(p_event)
   where id = p_expedition_id;
  return new_id;
end;
$$;

-- 戦闘の 1 ターン分を保存する（サーバー側専用）
--   p_result が 'won' / 'lost' なら戦闘を終え、経験値・仲間・探索の進行をまとめて反映する
--   p_exp: [{ "monster_id": "...", "amount": 123 }]
create function public.commit_battle_turn(
  p_battle_id uuid,
  p_expected_turn int,
  p_state jsonb,
  p_item_id bigint default null,
  p_result text default null,
  p_exp jsonb default '[]'::jsonb,
  p_party_state jsonb default '{}'::jsonb,
  p_recruit jsonb default null,
  p_event jsonb default null,
  p_boss boolean default false
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  b record;
  exp record;
  row jsonb;
  gained int;
  levels jsonb := '{}'::jsonb;
  step jsonb;
begin
  if p_result is not null and p_result not in ('won', 'lost') then
    raise exception '戦闘結果が不正です: %', p_result;
  end if;

  select * into b from public."Battles" where id = p_battle_id for update;
  if not found or b.status <> 'active' then
    raise exception 'この戦闘はすでに終わっています';
  end if;
  if b.turn <> p_expected_turn then
    raise exception '戦闘の状態が変わっています。もう一度読み込んでください' using errcode = 'P0002';
  end if;

  if p_item_id is not null then
    perform public.consume_item(b.owner_id, p_item_id, 1);
  end if;

  update public."Battles"
     set state = p_state,
         turn = turn + 1,
         status = coalesce(p_result, 'active'),
         updated_at = now()
   where id = p_battle_id;

  if p_result is null then
    return '{}'::jsonb;
  end if;

  -- 経験値（探索中に逃がしたモンスターは飛ばす）
  for row in select * from jsonb_array_elements(coalesce(p_exp, '[]'::jsonb)) loop
    if (row->>'amount')::bigint > 0 and exists (
      select 1 from public."Player_Monsters" m where m.id = (row->>'monster_id')::uuid
    ) then
      gained := public.grant_exp((row->>'monster_id')::uuid, (row->>'amount')::bigint);
      levels := levels || jsonb_build_object(row->>'monster_id', gained);
    end if;
  end loop;

  select * into exp from public."Expeditions" where id = b.expedition_id for update;
  update public."Expeditions"
     set battle_id = null, party_state = coalesce(p_party_state, '{}'::jsonb)
   where id = b.expedition_id;

  step := public.commit_expedition_step(
    b.expedition_id,
    exp.position,
    p_result = 'won' and not p_boss,
    coalesce(p_event, '{}'::jsonb),
    '[]'::jsonb,
    case when p_result = 'won' then p_recruit else null end,
    case when p_result = 'lost' then 'failed' when p_boss then 'cleared' else null end
  );

  return step || jsonb_build_object('levels_gained', levels);
end;
$$;

revoke execute on function public.begin_expedition_battle(uuid, int, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.commit_battle_turn(uuid, int, jsonb, bigint, text, jsonb, jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.begin_expedition_battle(uuid, int, jsonb, jsonb) to service_role;
grant execute on function public.commit_battle_turn(uuid, int, jsonb, bigint, text, jsonb, jsonb, jsonb, jsonb, boolean) to service_role;

-- 特技の枠の仮の初期値（Table Editor で調整してよい）: サイズ 1 → 5 枠、2 → 6 枠、3 → 7 枠
insert into public."Size_Rules" (size, skill_slots) values (1, 5), (2, 6), (3, 7);
