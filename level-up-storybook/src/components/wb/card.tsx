import { cn } from "@/lib/utils";
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-block bg-card p-5 text-card-foreground", className)} {...p} />;
}
