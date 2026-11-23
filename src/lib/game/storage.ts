/** Images バケット内のパスから公開 URL を作る */
export function publicImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/Images/${imagePath}`;
}

/** Monster_Species.image_path から公開 URL を作る */
export const monsterImageUrl = publicImageUrl;
