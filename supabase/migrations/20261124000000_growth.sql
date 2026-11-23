-- =========================================================
-- 育成: レベル・経験値・マスターポイント
--   ステータスは保存せず、図鑑の初期値・レベル・マスターポイントの振り分けから計算する
--   （計算式は src/lib/game/growth.ts。図鑑の値を調整すると所持モンスターにも反映される）
--   ※ 定数・式を変えるときは growth.ts と、このファイルの関数を合わせて変えること
-- =========================================================

-- ランクは SS / S / A / B / C / D / E のみ
alter table public."Monster_Species"
  add constraint "Monster_Species_rank_check"
  check (rank in ('SS', 'S', 'A', 'B', 'C', 'D', 'E'));

-- 所持モンスター: 保存していたステータスを、マスターポイントの振り分け回数に置き換える
alter table public."Player_Monsters"
  drop column hp,
  drop column atk,
  drop column def,
  drop column int,
  drop column spd,
  add column level_cap int not null default 99 check (level_cap >= 1),
  add column master_points int not null default 0 check (master_points >= 0),
  add column mp_hp int not null default 0 check (mp_hp >= 0),
  add column mp_atk int not null default 0 check (mp_atk >= 0),
  add column mp_def int not null default 0 check (mp_def >= 0),
  add column mp_int int not null default 0 check (mp_int >= 0),
  add column mp_spd int not null default 0 check (mp_spd >= 0),
  add constraint "Player_Monsters_level_within_cap" check (level <= level_cap);

comment on column public."Player_Monsters".exp is '現在のレベルで貯まっている経験値（レベルアップで 0 から数え直す）';
comment on column public."Player_Monsters".level_cap is 'レベル上限（進化・限界突破などで変わる）';
comment on column public."Player_Monsters".master_points is '未使用のマスターポイント';
comment on column public."Player_Monsters".mp_hp is 'HP にマスターポイントを振った回数（1回 +10）';
comment on column public."Player_Monsters".mp_atk is 'atk に振った回数（1回 +1）';
comment on column public."Player_Monsters".mp_def is 'def に振った回数（1回 +1）';
comment on column public."Player_Monsters".mp_int is 'int に振った回数（1回 +1）';
comment on column public."Player_Monsters".mp_spd is 'spd に振った回数（1回 +1）';

-- ---------------------------------------------------------
-- 必要経験値: level → level+1 = floor(50 × 1.1^(level-1) × ランク係数)
-- ---------------------------------------------------------
create function public.rank_exp_rate(p_rank text)
returns float8
language sql
immutable
set search_path = ''
as $$
  select case p_rank
    when 'SS' then 2.0
    when 'S'  then 1.8
    when 'A'  then 1.6
    when 'B'  then 1.4
    when 'C'  then 1.2
    when 'D'  then 1.0
    when 'E'  then 0.8
  end::float8;
$$;

create function public.exp_to_next(p_level int, p_rank text)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  rate float8 := public.rank_exp_rate(p_rank);
begin
  if rate is null then
    raise exception 'ランクが未設定または不正です: %', p_rank;
  end if;
  return floor(50::float8 * power(1.1::float8, p_level - 1) * rate)::bigint;
end;
$$;

-- ---------------------------------------------------------
-- 経験値の付与（サーバー側の処理専用。プレイヤーからは呼べない）
--   上限レベルに達したら、それ以上の経験値は捨てる
--   Lv51 以降は 1 レベルごとにマスターポイント +5
-- 戻り値: 上がったレベル数
-- ---------------------------------------------------------
create function public.grant_exp(p_monster_id uuid, p_amount bigint)
returns int
language plpgsql
security definer set search_path = ''
as $$
declare
  m record;
  rest bigint;
  need bigint;
  new_level int;
  new_mp int;
  gained int := 0;
begin
  if p_amount < 0 then
    raise exception '経験値はマイナスにできません';
  end if;

  select pm.level, pm.exp, pm.level_cap, pm.master_points, s.rank
    into m
    from public."Player_Monsters" pm
    join public."Monster_Species" s on s.id = pm.species_id
   where pm.id = p_monster_id
   for update of pm;
  if not found then
    raise exception 'モンスターが見つかりません';
  end if;

  new_level := m.level;
  new_mp := m.master_points;
  rest := m.exp + p_amount;

  while new_level < m.level_cap loop
    need := public.exp_to_next(new_level, m.rank);
    exit when rest < need;
    rest := rest - need;
    new_level := new_level + 1;
    gained := gained + 1;
    if new_level > 50 then
      new_mp := new_mp + 5;
    end if;
  end loop;

  if new_level >= m.level_cap then
    rest := 0;
  end if;

  update public."Player_Monsters"
     set level = new_level, exp = rest, master_points = new_mp
   where id = p_monster_id;

  return gained;
end;
$$;

revoke execute on function public.grant_exp(uuid, bigint) from public, anon, authenticated;
grant execute on function public.grant_exp(uuid, bigint) to service_role;

-- ---------------------------------------------------------
-- マスターポイントを振る（プレイヤーが自分のモンスターに対して行う）
--   消費: 5 + 5 × floor(そのステータスに振った回数 / 10)
--   上昇: HP は +10、その他は +1（上昇量は growth.ts の計算で反映）
-- アプリからは supabase.rpc('allocate_master_point', { p_monster_id, p_stat }) で呼ぶ
-- 戻り値: 残りのマスターポイント
-- ---------------------------------------------------------
create function public.allocate_master_point(p_monster_id uuid, p_stat text)
returns int
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  points int;
  times int;
  cost int;
begin
  if uid is null then
    raise exception 'ログインが必要です';
  end if;
  if p_stat not in ('hp', 'atk', 'def', 'int', 'spd') then
    raise exception 'ステータスの指定が不正です: %', p_stat;
  end if;

  select pm.master_points,
         case p_stat
           when 'hp'  then pm.mp_hp
           when 'atk' then pm.mp_atk
           when 'def' then pm.mp_def
           when 'int' then pm.mp_int
           when 'spd' then pm.mp_spd
         end
    into points, times
    from public."Player_Monsters" pm
   where pm.id = p_monster_id and pm.owner_id = uid
   for update;
  if not found then
    raise exception 'モンスターが見つかりません';
  end if;

  cost := 5 + 5 * (times / 10);
  if points < cost then
    raise exception 'マスターポイントが足りません（必要 %、所持 %）', cost, points;
  end if;

  update public."Player_Monsters"
     set master_points = master_points - cost,
         mp_hp  = mp_hp  + (p_stat = 'hp')::int,
         mp_atk = mp_atk + (p_stat = 'atk')::int,
         mp_def = mp_def + (p_stat = 'def')::int,
         mp_int = mp_int + (p_stat = 'int')::int,
         mp_spd = mp_spd + (p_stat = 'spd')::int
   where id = p_monster_id;

  return points - cost;
end;
$$;

revoke execute on function public.allocate_master_point(uuid, text) from public, anon;
grant execute on function public.allocate_master_point(uuid, text) to authenticated;
