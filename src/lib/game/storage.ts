/** Monster_Species.image_path から公開 URL を作る */
export function monsterImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/Images/${imagePath}`;
}
