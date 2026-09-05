export const PageHeader = ({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) => (
  <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);
