import { monsterImageUrl } from "@/lib/game/storage";

/** モンスターの画像。画像が未設定なら名前の頭文字を表示する */
export function MonsterImage({
  imagePath,
  name,
  size = 48,
}: {
  imagePath: string | null;
  name: string;
  size?: number;
}) {
  const url = monsterImageUrl(imagePath);
  if (!url) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-hidden
      >
        {name.slice(0, 1)}
      </div>
    );
  }
  return (
    // Supabase Storage の公開画像をそのまま表示する
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      className="shrink-0 rounded-lg object-contain"
      style={{ width: size, height: size }}
    />
  );
}
