"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Unplug } from "lucide-react";
import { OperationCard } from "@/components/operations/OperationCard";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { QueryError } from "@/components/shared/QueryState";
import type { DatabaseInfo, DatabaseSession, OperationRecord } from "@/lib/database/types";
import { fetchApi } from "@/lib/client";
export interface OperationTarget {
  action: "DROP_DATABASE" | "TERMINATE_DATABASE_CONNECTIONS" | "TERMINATE_SESSION";
  databases: DatabaseInfo[];
  session?: DatabaseSession;
}
export const OperationDialog = ({
  target,
  serverId,
  close,
  onSuccess,
}: {
  target: OperationTarget;
  serverId: string;
  close: () => void;
  onSuccess?: () => void;
}) => {
  const [confirmation, setConfirmation] = useState("");
  const [terminate, setTerminate] = useState(false);
  const client = useQueryClient();
  const [queued, setQueued] = useState<OperationRecord | null>(null);
  const { data: operations = [] } = useQuery({
    queryKey: ["operations"],
    queryFn: () => fetchApi<OperationRecord[]>("/api/operations"),
    enabled: !!queued,
  });
  const destructive = target.action === "DROP_DATABASE";
  const names = target.databases.map((d) => d.name);
  const count = names.length;
  const connections = target.databases.reduce((n, d) => n + d.connections, 0);
  const phrase = count === 1 ? names[0] : `DELETE ${count} DATABASES`;
  const mutation = useMutation({
    mutationFn: () =>
      fetchApi<OperationRecord>("/api/operations", {
        method: "POST",
        body: JSON.stringify({
          action: target.action,
          serverId,
          names,
          confirmation: destructive ? confirmation : "TERMINATE",
          terminate,
          sessionId: target.session?.id,
        }),
      }),
    onSuccess: (operation) => {
      setQueued({
        ...operation,
        items: names.map((databaseName, index) => ({
          id: `${operation.id}-${index}`,
          databaseName,
          status: "pending",
          message: null,
          duration: null,
        })),
      });
      void client.invalidateQueries({ queryKey: ["operations"] });
      onSuccess?.();
    },
  });
  if (queued) {
    const operation = operations.find((item) => item.id === queued.id) ?? queued;
    const active = ["pending", "running"].includes(operation.status);
    return (
      <AlertDialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {active ? "Operação em andamento" : "Resultado da operação"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {active
                ? "Acompanhe o progresso em tempo real. Você pode fechar e continuar trabalhando."
                : "Confira o resultado de cada database abaixo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <OperationCard operation={operation} />
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog
      open
      onOpenChange={(v) => {
        if (!v && !mutation.isPending) close();
      }}
    >
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <AlertDialogHeader>
          <div
            className={`mb-2 grid size-10 place-items-center rounded-lg ${destructive ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}
          >
            {destructive ? <ShieldAlert size={21} /> : <Unplug size={21} />}
          </div>
          <AlertDialogTitle>
            {destructive
              ? `Excluir ${count === 1 ? "database" : `${count} databases`} permanentemente?`
              : target.session
                ? "Encerrar conexão?"
                : "Encerrar conexões?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? "Esta operação não pode ser desfeita. Todos os dados armazenados nas databases abaixo serão perdidos."
              : "As sessões selecionadas serão encerradas imediatamente. Usuários conectados podem perder operações em andamento."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="max-h-44 overflow-auto rounded-md border bg-muted/40 p-3">
          {names.map((name) => (
            <p className="break-all py-1 font-mono text-xs" key={name}>
              {name}
            </p>
          ))}
        </div>
        {target.session ? (
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <dt className="text-muted-foreground">Usuário</dt>
            <dd>{target.session.username}</dd>
            <dt className="text-muted-foreground">Aplicação</dt>
            <dd>{target.session.application || "—"}</dd>
            <dt className="text-muted-foreground">Sessão</dt>
            <dd>{target.session.id}</dd>
          </dl>
        ) : (
          <p className="text-xs text-warning">
            {connections} conexões ativas{" "}
            {destructive ? "nas databases selecionadas." : "serão encerradas."}
          </p>
        )}
        {destructive && (
          <>
            <label className="flex items-start gap-2 text-xs leading-5">
              <Checkbox
                className="mt-0.5"
                checked={terminate}
                onCheckedChange={(v) => setTerminate(v === true)}
              />
              Encerrar automaticamente todas as conexões antes da exclusão.
            </label>
            <div className="space-y-2">
              <Label htmlFor="destructive-confirmation">
                Para confirmar, digite: <span className="font-mono font-semibold">{phrase}</span>
              </Label>
              <Input
                id="destructive-confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={count === 1 ? "Digite o nome da database" : phrase}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </>
        )}
        <QueryError error={mutation.error} />
        {count > 1000 && (
          <p role="alert" className="text-xs text-warning">
            Selecione até 1.000 databases por operação.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={
              mutation.isPending || count > 1000 || (destructive && confirmation !== phrase)
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "Enfileirando..."
              : destructive
                ? count === 1
                  ? "Excluir permanentemente"
                  : `Excluir ${count} databases`
                : target.session
                  ? "Encerrar conexão"
                  : `Encerrar ${connections} conexões`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
