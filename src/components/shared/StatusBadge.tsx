import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
const labels: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  unknown: "Não verificado",
  disconnected: "Desconectado",
  pending: "Pendente",
  running: "Em andamento",
  success: "Sucesso",
  partial: "Parcial",
  failed: "Falha",
};
export const StatusBadge = ({ status }: { status: string }) => (
  <Badge
    variant="outline"
    className={cn(
      "gap-1.5 text-[11px] font-medium",
      ["online", "success"].includes(status)
        ? "border-success/20 bg-success/8 text-success"
        : ["failed", "offline", "partial"].includes(status)
          ? "border-warning/20 bg-warning/8 text-warning"
          : status === "running"
            ? "border-primary/20 bg-primary/8 text-primary"
            : "bg-muted text-muted-foreground",
    )}
  >
    <span className="size-1.5 rounded-full bg-current" />
    {labels[status] || status}
  </Badge>
);
