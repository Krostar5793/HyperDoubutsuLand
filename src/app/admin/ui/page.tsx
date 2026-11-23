import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadAllLayouts } from "@/lib/ui/load";
import { UiEditor } from "./UiEditor";

export default async function UiEditorPage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

  if (!profile?.is_admin) {
    return (
      <main className="p-8">
        <p>この画面は管理者だけが使えます。</p>
        <Link href="/" className="underline">
          ホームへ
        </Link>
      </main>
    );
  }

  const layouts = await loadAllLayouts(supabase);
  return <UiEditor initialLayouts={layouts} />;
}
