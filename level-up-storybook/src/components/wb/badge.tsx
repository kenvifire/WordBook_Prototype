import { cn } from "@/lib/utils";
import type { Genre, Level } from "@/data/stories";
import { copy } from "@/content/copy";

const levelColor: Record<Level, string> = { A2: "bg-lemon text-ink", B1: "bg-lime text-ink", B2: "bg-mint text-ink", C1: "bg-aqua text-paper" };
const genreColor: Record<Genre, string> = { fantasy: "bg-aqua text-accent-foreground", mystery: "bg-ink text-paper", funny: "bg-lime text-ink", mine: "bg-primary text-primary-foreground" };

export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full border-2 border-ink px-3 py-0.5 text-sm font-bold", className)} {...p} />;
}
export const LevelBadge = ({ level }: { level: Level }) => <Badge className={levelColor[level]}>{level}</Badge>;
export const GenreBadge = ({ genre }: { genre: Genre }) => <Badge className={cn("capitalize", genreColor[genre])}>{copy.library.genres[genre]}</Badge>;
export const ComingSoonBadge = () => <Badge className="bg-mint text-ink">{copy.common.comingSoon}</Badge>;
