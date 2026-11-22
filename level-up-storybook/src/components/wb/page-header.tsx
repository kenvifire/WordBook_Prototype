export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-lg text-muted-foreground">{description}</p>}
      </div>
      {children}
    </header>
  );
}
