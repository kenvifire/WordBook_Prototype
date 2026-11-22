import { Link } from "@tanstack/react-router";
export function Logo() {
  return (
    <Link to="/" className="flex min-h-11 items-center gap-2 font-display text-xl font-extrabold">
      <span className="inline-block h-5 w-5 rotate-12 rounded-md border-2 border-ink bg-primary" aria-hidden />
      WordBook
    </Link>
  );
}
