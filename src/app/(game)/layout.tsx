import { Stage } from "@/components/stage/Stage";
import { requireUser } from "@/lib/auth";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <Stage>{children}</Stage>;
}
