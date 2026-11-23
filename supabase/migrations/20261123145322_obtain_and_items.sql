-- =========================================================
-- ランク・モンスターの入手（控え / 預り所）・アイテム
-- =========================================================

-- ---------------------------------------------------------
-- ランク（マスタ）: 必要経験値の係数と、戦闘後に仲間になる確率
--   ※ 初期値は src/lib/game/ranks.ts と同じ。Table Editor で調整してよい
-- ---------------------------------------------------------
create table public."Ranks" (
  code text primary key,
  exp_rate numeric not null check (exp_rate > 0),
  recruit_rate numeric not null check (recruit_rate between 0 and 1),
  sort_order int not null default 0
);

insert into public."Ranks" (code, exp_rate, recruit_rate, sort_order) values
  ('SS', 2.0, 0.001, 1),
  ('S',  1.8, 0.005, 2),
  ('A',  1.6, 0.01,  3),
  ('B',  1.4, 0.02,  4),
  ('C',  1.2, 0.05,  5),
  ('D',  1.0, 0.10,  6),
  ('E',  0.8, 0.20,  7);

alter table public."Ranks" enable row level security;
create policy "ログインユーザーはランクを読める"
  on public."Ranks" for select to authenticated using (true);

-- 図鑑のランクは Ranks を参照する（Table Editor ではプルダウンで選べる）
alter table public."Monster_Species"
  drop constraint "Monster_Species_rank_check",
  add constraint "Monster_Species_rank_fkey"
    foreign key (rank) references public."Ranks" (code) on update cascade;

-- 必要経験値の係数を Ranks から読む
create or replace function public.rank_exp_rate(p_rank text)
returns float8
language sql
stable
set search_path = ''
as $$
  select r.exp_rate::float8 from public."Ranks" r where r.code = p_rank;
$$;

alter function public.exp_to_next(int, text) stable;

-- ---------------------------------------------------------
-- 預り所: 控えがいっぱいのときに入手したモンスターの置き場
--   預り所のモンスターはパーティに入れられない。控えに空きを作ってから引き取る
-- ---------------------------------------------------------
alter table public."Player_Monsters"
  add column in_storage boolean not null default false,
  add column source text,
  add constraint "Player_Monsters_storage_not_in_party"
    check (not (in_storage and party_slot is not null));

comment on column public."Player_Monsters".in_storage is '預り所にいるか（true ならパーティ・控えに含まれない）';
comment on column public."Player_Monsters".source is '入手経路（explore / event / reward / shop / fusion など）';

-- 控えの上限チェック: 預り所のモンスターは数えない
create or replace function public.check_box_capacity()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  capacity int;
  box_count int;
begin
  if new.party_slot is not null or new.in_storage then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.party_slot is null and not old.in_storage
     and old.owner_id = new.owner_id then
    return new; -- もともと控えにいた行の更新（レベルアップ等）は対象外
  end if;

  select p.box_capacity into capacity
    from public.profiles p
   where p.id = new.owner_id
   for update;

  select count(*) into box_count
    from public."Player_Monsters" m
   where m.owner_id = new.owner_id
     and m.party_slot is null
     and not m.in_storage
     and m.id <> new.id;

  if box_count >= capacity then
    raise exception '控えがいっぱいです（上限 % 体）', capacity
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger "Player_Monsters_box_capacity" on public."Player_Monsters";
create trigger "Player_Monsters_box_capacity"
  before insert or update of party_slot, owner_id, in_storage on public."Player_Monsters"
  for each row execute function public.check_box_capacity();

-- 編成の移動: 預り所のモンスターは動かせない
create or replace function public.move_monster(p_monster_id uuid, p_target_slot bigint)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  from_slot bigint;
  stored boolean;
  occupant_id uuid;
begin
  if uid is null then
    raise exception 'ログインが必要です';
  end if;
  if p_target_slot is not null and p_target_slot not between 1 and 8 then
    raise exception '枠番号が不正です: %', p_target_slot;
  end if;

  select m.party_slot, m.in_storage into from_slot, stored
    from public."Player_Monsters" m
   where m.id = p_monster_id and m.owner_id = uid
   for update;
  if not found then
    raise exception 'モンスターが見つかりません';
  end if;
  if stored then
    raise exception '預り所のモンスターは編成できません。先に控えへ引き取ってください';
  end if;

  if from_slot is not distinct from p_target_slot then
    return;
  end if;

  if p_target_slot is not null then
    select m.id into occupant_id
      from public."Player_Monsters" m
     where m.owner_id = uid and m.party_slot = p_target_slot
     for update;
  end if;

  update public."Player_Monsters" set party_slot = p_target_slot where id = p_monster_id;
  if occupant_id is not null then
    update public."Player_Monsters" set party_slot = from_slot where id = occupant_id;
  end if;
end;
$$;

-- ---------------------------------------------------------
-- モンスターを渡す（探索・イベント・景品・交換・合成など、すべての入手でこれを使う）
--   控えに空きがあれば控えへ、なければ預り所へ
--   サーバー側の処理専用。プレイヤーからは呼べない
-- ---------------------------------------------------------
create function public.grant_monster(
  p_owner_id uuid,
  p_species_id bigint,
  p_level int default 1,
  p_source text default null
)
returns table (monster_id uuid, in_storage boolean)
language plpgsql
security definer set search_path = ''
as $$
declare
  capacity int;
  box_count int;
  to_storage boolean;
  new_id uuid;
begin
  if p_level < 1 or p_level > 99 then
    raise exception 'レベルが不正です: %', p_level;
  end if;

  select p.box_capacity into capacity
    from public.profiles p
   where p.id = p_owner_id
   for update;
  if not found then
    raise exception 'プレイヤーが見つかりません';
  end if;

  select count(*) into box_count
    from public."Player_Monsters" m
   where m.owner_id = p_owner_id and m.party_slot is null and not m.in_storage;

  to_storage := box_count >= capacity;

  insert into public."Player_Monsters"
    (owner_id, species_id, level, limit_points, in_storage, source)
  values
    (p_owner_id, p_species_id, p_level, greatest(p_level - 50, 0) * 5, to_storage, p_source)
  returning id into new_id;

  return query select new_id, to_storage;
end;
$$;

revoke execute on function public.grant_monster(uuid, bigint, int, text) from public, anon, authenticated;
grant execute on function public.grant_monster(uuid, bigint, int, text) to service_role;

-- 預り所から控えへ引き取る（控えに空きが必要）
create function public.withdraw_from_storage(p_monster_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;
  update public."Player_Monsters"
     set in_storage = false
   where id = p_monster_id and owner_id = auth.uid() and in_storage;
  if not found then
    raise exception '預り所にそのモンスターはいません';
  end if;
end;
$$;

-- モンスターをリリースする（逃がす）。パーティ・控え・預り所のどこからでも可
create function public.release_monster(p_monster_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;
  delete from public."Player_Monsters"
   where id = p_monster_id and owner_id = auth.uid();
  if not found then
    raise exception 'モンスターが見つかりません';
  end if;
end;
$$;

revoke execute on function public.withdraw_from_storage(uuid) from public, anon;
revoke execute on function public.release_monster(uuid) from public, anon;
grant execute on function public.withdraw_from_storage(uuid) to authenticated;
grant execute on function public.release_monster(uuid) to authenticated;

-- ---------------------------------------------------------
-- アイテム（マスタ）と所持品
--   effect_type:
--     none          : 効果なし（素材・換金用など）
--     recruit_boost : 戦闘中に指定したモンスター 1 体の「仲間になる確率」を effect_value 倍（その戦闘のみ）
--     box_expand    : 控えの上限を effect_value 増やす
-- ---------------------------------------------------------
create table public."Items" (
  id bigint generated by default as identity primary key,
  name text not null,
  description text,
  image_path text,
  effect_type text not null default 'none'
    check (effect_type in ('none', 'recruit_boost', 'box_expand')),
  effect_value numeric,
  usable_in_battle boolean not null default false,
  usable_in_field boolean not null default false,
  constraint "Items_effect_value_required"
    check (effect_type = 'none' or coalesce(effect_value, 0) > 0)
);

create table public."Player_Items" (
  owner_id uuid not null references auth.users (id) on delete cascade,
  item_id bigint not null references public."Items" (id) on delete cascade,
  quantity int not null check (quantity >= 0),
  primary key (owner_id, item_id)
);

alter table public."Items" enable row level security;
create policy "ログインユーザーはアイテムを読める"
  on public."Items" for select to authenticated using (true);

alter table public."Player_Items" enable row level security;
create policy "自分の所持品を読める"
  on public."Player_Items" for select to authenticated using (auth.uid() = owner_id);

-- アイテムを渡す（サーバー側の処理専用）。戻り値: 渡した後の個数
create function public.grant_item(p_owner_id uuid, p_item_id bigint, p_quantity int default 1)
returns int
language plpgsql
security definer set search_path = ''
as $$
declare
  result int;
begin
  if p_quantity <= 0 then
    raise exception '個数が不正です: %', p_quantity;
  end if;
  insert into public."Player_Items" as pi (owner_id, item_id, quantity)
  values (p_owner_id, p_item_id, p_quantity)
  on conflict (owner_id, item_id)
  do update set quantity = pi.quantity + excluded.quantity
  returning quantity into result;
  return result;
end;
$$;

-- アイテムを消費する（サーバー側の処理専用。戦闘中の使用など）。戻り値: 残りの個数
create function public.consume_item(p_owner_id uuid, p_item_id bigint, p_quantity int default 1)
returns int
language plpgsql
security definer set search_path = ''
as $$
declare
  result int;
begin
  if p_quantity <= 0 then
    raise exception '個数が不正です: %', p_quantity;
  end if;
  update public."Player_Items"
     set quantity = quantity - p_quantity
   where owner_id = p_owner_id and item_id = p_item_id and quantity >= p_quantity
  returning quantity into result;
  if not found then
    raise exception 'アイテムが足りません';
  end if;
  return result;
end;
$$;

revoke execute on function public.grant_item(uuid, bigint, int) from public, anon, authenticated;
revoke execute on function public.consume_item(uuid, bigint, int) from public, anon, authenticated;
grant execute on function public.grant_item(uuid, bigint, int) to service_role;
grant execute on function public.consume_item(uuid, bigint, int) to service_role;

-- フィールドでアイテムを使う（プレイヤーが呼ぶ）。今は box_expand のみ対応
-- アプリからは supabase.rpc('use_field_item', { p_item_id }) で呼ぶ
create function public.use_field_item(p_item_id bigint)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  item record;
begin
  if uid is null then
    raise exception 'ログインが必要です';
  end if;

  select i.effect_type, i.effect_value, i.usable_in_field into item
    from public."Items" i where i.id = p_item_id;
  if not found then
    raise exception 'アイテムが見つかりません';
  end if;
  if not item.usable_in_field then
    raise exception 'このアイテムはここでは使えません';
  end if;

  perform public.consume_item(uid, p_item_id, 1);

  case item.effect_type
    when 'box_expand' then
      update public.profiles
         set box_capacity = box_capacity + item.effect_value::int
       where id = uid;
    else
      raise exception 'このアイテムはここでは使えません';
  end case;
end;
$$;

revoke execute on function public.use_field_item(bigint) from public, anon;
grant execute on function public.use_field_item(bigint) to authenticated;
