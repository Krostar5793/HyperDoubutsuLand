/** Supabase の結果を取り出す小さな関数（エラーなら例外を投げる） */

type Res<T> = { data: T; error: { message: string } | null };

export function check<T>(res: Res<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** 1 行だけ返るはずのクエリ用。見つからなければエラー */
export function one<T>(res: Res<T>): NonNullable<T> {
  const data = check(res);
  if (data === null || data === undefined) throw new Error("データが見つかりません");
  return data as NonNullable<T>;
}

/** 複数行のクエリ用（null なら空配列） */
export function rows<T>(res: Res<T[] | null>): T[] {
  return check(res) ?? [];
}
