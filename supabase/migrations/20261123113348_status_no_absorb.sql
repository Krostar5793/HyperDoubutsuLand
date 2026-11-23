-- 状態異常への耐性には「吸収」を設定できないようにする
alter table public."Species_Status_Resistances"
  add constraint "Species_Status_Resistances_no_absorb"
  check (level <> 'absorb');
