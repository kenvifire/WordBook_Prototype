import { Link } from "@tanstack/react-router";
import { EmptyState } from "./empty-state";
import { Button } from "./button";
import { copy } from "@/content/copy";
export function NotFoundCard() {
  return <EmptyState title={copy.common.notFoundTitle} text={copy.common.notFoundText} action={<Button asChild><Link to="/library">{copy.common.toLibrary}</Link></Button>} />;
}
