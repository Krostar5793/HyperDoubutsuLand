-- トレーナー（プレイヤー）のプロフィール。auth.users と 1 対 1。
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "自分のプロフィールを読める"
  on public.profiles for select
  using (auth.uid() = id);

create policy "自分のプロフィールを更新できる"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ユーザー登録時にプロフィールを自動作成する
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
