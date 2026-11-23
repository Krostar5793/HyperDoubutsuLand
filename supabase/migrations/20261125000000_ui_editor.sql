-- =========================================================
-- UI エディタ: 画面ごとの配置（背景・画像・テキスト・ボタン・動的な表示領域）
--   画面は 1280×720（横向き 16:9）の座標で配置する
-- =========================================================

-- 管理者フラグ（プレイヤーは自分で変更できない。profiles で更新できるのは display_name のみ）
alter table public.profiles add column is_admin boolean not null default false;

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 画面（key はコードで決まっている画面の識別子: home / monsters / explore など）
create table public."UI_Screens" (
  key text primary key,
  background_color text,
  background_image_path text,
  updated_at timestamptz not null default now()
);

-- 画面に置く要素
--   type: image / text / button / widget（モンスター一覧など、コードで中身を描く領域）
--   props: 種類ごとの設定（文字・色・画像のパス・ボタンの動作など）
create table public."UI_Elements" (
  id uuid primary key default gen_random_uuid(),
  screen_key text not null references public."UI_Screens" (key) on delete cascade on update cascade,
  type text not null check (type in ('image', 'text', 'button', 'widget')),
  x numeric not null default 0,
  y numeric not null default 0,
  width numeric not null default 100 check (width > 0),
  height numeric not null default 100 check (height > 0),
  z_index int not null default 0,
  props jsonb not null default '{}'::jsonb
);

create index "UI_Elements_screen_idx" on public."UI_Elements" (screen_key);

alter table public."UI_Screens" enable row level security;
create policy "ログインユーザーは画面設定を読める"
  on public."UI_Screens" for select to authenticated using (true);

alter table public."UI_Elements" enable row level security;
create policy "ログインユーザーは画面の要素を読める"
  on public."UI_Elements" for select to authenticated using (true);

-- 画面の配置をまとめて保存する（管理者のみ）。要素はすべて置き換える
--   p_elements: [{ type, x, y, width, height, z_index, props }]
create function public.save_ui_layout(
  p_screen_key text,
  p_background_color text,
  p_background_image_path text,
  p_elements jsonb
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '管理者だけが UI を編集できます';
  end if;

  insert into public."UI_Screens" (key, background_color, background_image_path, updated_at)
  values (p_screen_key, p_background_color, p_background_image_path, now())
  on conflict (key) do update
    set background_color = excluded.background_color,
        background_image_path = excluded.background_image_path,
        updated_at = now();

  delete from public."UI_Elements" where screen_key = p_screen_key;

  insert into public."UI_Elements" (screen_key, type, x, y, width, height, z_index, props)
  select p_screen_key, e.type, e.x, e.y, e.width, e.height, coalesce(e.z_index, 0), coalesce(e.props, '{}'::jsonb)
    from jsonb_to_recordset(coalesce(p_elements, '[]'::jsonb))
      as e(type text, x numeric, y numeric, width numeric, height numeric, z_index int, props jsonb);
end;
$$;

-- 保存した配置を消して、コードの初期配置に戻す（管理者のみ）
create function public.reset_ui_layout(p_screen_key text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '管理者だけが UI を編集できます';
  end if;
  delete from public."UI_Screens" where key = p_screen_key;
end;
$$;

revoke execute on function public.save_ui_layout(text, text, text, jsonb) from public, anon;
revoke execute on function public.reset_ui_layout(text) from public, anon;
grant execute on function public.save_ui_layout(text, text, text, jsonb) to authenticated;
grant execute on function public.reset_ui_layout(text) to authenticated;

-- 管理者は Images バケットに画像をアップロード・差し替え・削除できる（閲覧は公開）
create policy "管理者は Images に画像を追加できる"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'Images' and public.is_admin());
create policy "管理者は Images の画像を更新できる"
  on storage.objects for update to authenticated
  using (bucket_id = 'Images' and public.is_admin());
create policy "管理者は Images の画像を削除できる"
  on storage.objects for delete to authenticated
  using (bucket_id = 'Images' and public.is_admin());
