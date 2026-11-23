-- ローカル開発用のサンプルデータ（npx supabase db reset で自動的に投入される。クラウドには入らない）

insert into public."Elements" (id, name) values (1, '火'), (2, '水'), (3, '草')
  on conflict do nothing;
select setval(pg_get_serial_sequence('public."Elements"', 'id'), 100);
insert into public."Element_Matchups" (attack_element_id, defense_element_id, level) values
  (1, 3, 'weak'), (2, 1, 'weak'), (3, 2, 'weak'),
  (1, 2, 'resist'), (2, 3, 'resist'), (3, 1, 'resist')
  on conflict do nothing;

insert into public."Monster_Species" (id, name, rank, description, size, hp, mp, atk, def, int, spd, element_id) values
  (1, 'ぷにスライム', 'E', 'どこにでもいる、ぷにぷにのスライム。', 1, 12, 10, 6, 6, 5, 8, 2),
  (2, 'ひのこウサギ', 'D', '耳の先に小さな火をともすウサギ。', 1, 15, 15, 10, 6, 9, 14, 1),
  (3, 'はっぱリス', 'C', 'しっぽの葉っぱで風をおこす。', 1, 18, 20, 9, 10, 12, 16, 3),
  (4, 'いわガメ', 'B', '甲羅が岩でできた、のんびり屋のカメ。', 2, 30, 12, 14, 24, 6, 5, 3),
  (5, 'ほのおグマ', 'S', '草原の主。燃えるたてがみを持つ。', 3, 45, 30, 28, 22, 15, 12, 1)
  on conflict do nothing;
select setval(pg_get_serial_sequence('public."Monster_Species"', 'id'), 100);

insert into public."Items" (id, name, description, effect_type, effect_value, usable_in_battle, usable_in_field) values
  (1, 'なかまの鈴', '戦闘中、指定したモンスター1体が仲間になる確率を2倍にする。', 'recruit_boost', 2, true, false),
  (2, '控え拡張チケット', '控えの上限を10増やす。', 'box_expand', 10, false, true),
  (3, 'やくそう', 'どこにでも生えている草。', 'none', null, false, false)
  on conflict do nothing;
select setval(pg_get_serial_sequence('public."Items"', 'id'), 100);

insert into public."Areas" (id, name, description, clear_amount, min_enemies, max_enemies, sort_order) values
  (1, 'はじまりの草原', '見晴らしのいい草原。弱いモンスターが多い。', 300, 1, 3, 1)
  on conflict do nothing;
select setval(pg_get_serial_sequence('public."Areas"', 'id'), 100);

insert into public."Area_Squares" (area_id, position, monster_rate, item_rate, chest_rate, choice_rate) values
  (1, 1, 40, 30, 0, 0),
  (1, 2, 50, 20, 10, 0),
  (1, 3, 40, 20, 10, 10),
  (1, 4, 60, 10, 20, 0),
  (1, 5, 30, 0, 50, 0)
  on conflict do nothing;

insert into public."Area_Encounters" (area_id, species_id, weight, min_level, max_level) values
  (1, 1, 5, 1, 3),
  (1, 2, 3, 2, 4),
  (1, 3, 2, 3, 5),
  (1, 4, 1, 4, 6);

insert into public."Area_Loot" (area_id, source, item_id, currency_code, weight, min_quantity, max_quantity) values
  (1, 'field', 3, null, 5, 1, 3),
  (1, 'field', null, 'perica', 3, 10, 50),
  (1, 'chest', 1, null, 2, 1, 1),
  (1, 'chest', 2, null, 1, 1, 1),
  (1, 'chest', null, 'perica', 3, 100, 200);

insert into public."Area_Bosses" (area_id, slot, species_id, level) values (1, 1, 5, 8)
  on conflict do nothing;
