-- handle_new_user はトリガー専用。API（/rpc）から呼べないようにする
revoke execute on function public.handle_new_user() from public, anon, authenticated;
