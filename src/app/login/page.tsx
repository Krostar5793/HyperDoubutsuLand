import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-4 rounded-xl border border-black/10 p-6 shadow-sm dark:border-white/15">
        <h1 className="text-2xl font-bold">ハイパーどうぶつランド</h1>
        <p className="text-sm opacity-70">トレーナーとしてログインしてください</p>

        <label className="block space-y-1">
          <span className="text-sm">メールアドレス</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">パスワード</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            formAction={login}
            className="flex-1 rounded-md bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700"
          >
            ログイン
          </button>
          <button
            formAction={signup}
            className="flex-1 rounded-md border border-emerald-600 px-3 py-2 font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
          >
            新規登録
          </button>
        </div>
      </form>
    </main>
  );
}
