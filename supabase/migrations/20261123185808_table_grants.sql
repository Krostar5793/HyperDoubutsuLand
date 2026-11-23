-- =========================================================
-- テーブルの権限を明示的に付ける
--   新しい Supabase プロジェクトでは、テーブルを作っても API 用のロールに権限が自動では付かない。
--   （ローカルの Supabase では自動で付くため、ローカルでは問題が見えなかった）
--
--   authenticated（ログイン中のプレイヤー）: 読み取りのみ。どの行が読めるかは RLS で制限する
--                                         書き込みはすべて関数（RPC）またはサーバー経由
--   service_role（サーバー）               : すべて
--   anon（未ログイン）                     : なし
-- =========================================================

grant usage on schema public to authenticated, service_role;

grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- profiles はプレイヤーが表示名だけ変えられる（それ以外の列は変えられない）
grant update (display_name, updated_at) on public.profiles to authenticated;

-- これから作るテーブルにも同じ権限を付ける
alter default privileges in schema public grant select on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
