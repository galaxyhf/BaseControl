import { Database, type LucideIcon } from "lucide-react";
export const EmptyState = ({
  title,
  description,
  icon: Icon = Database,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) => (
  <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-5 flex size-14 items-center justify-center rounded-xl border border-border bg-muted/60 shadow-sm">
      <Icon className="size-6 text-muted-foreground" strokeWidth={1.5} />
    </div>
    <h3 className="text-sm font-semibold">{title}</h3>
    {description && (
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    )}
    {children && <div className="mt-5">{children}</div>}
  </div>
);
