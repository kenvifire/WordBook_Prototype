import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { EmptyState } from "./empty-state";
import { Button } from "./button";
import { copy } from "@/content/copy";

export function LoadingState() {
  return <p role="status" className="py-10 text-center font-semibold text-muted-foreground">{copy.common.loading}</p>;
}

export function ErrorState({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return <EmptyState title={copy.common.errorTitle} text={copy.common.errorText} action={<Button onClick={() => { router.invalidate(); reset(); }}>{copy.common.retry}</Button>} />;
}
