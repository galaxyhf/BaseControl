import { TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
export const QueryError = ({ error }: { error: Error | null }) =>
  error ? (
    <div
      role="alert"
      className="my-4 flex items-start gap-3 rounded-lg border border-warning/25 bg-warning/5 p-4 text-sm"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
      {error.message}
    </div>
  ) : null;
export const TableSkeleton = () => (
  <div className="space-y-3 p-6" aria-label="Carregando dados">
    {Array.from({ length: 5 }, (_, index) => (
      <Skeleton key={index} className="h-12 w-full" />
    ))}
  </div>
);
