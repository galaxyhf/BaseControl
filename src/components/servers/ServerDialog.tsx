"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Database, Plug, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/components/shared/Providers";
import { QueryError } from "@/components/shared/QueryState";
import { fetchApi } from "@/lib/client";
import type { ConnectionConfig, ConnectionResult, SavedServer } from "@/lib/database/types";
import { useConnectServer } from "@/hooks/use-connect-server";
import { connectionSchema, editConnectionSchema } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";
export const ServerDialog = ({
  open,
  onOpenChange,
  server,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server?: SavedServer;
}) => {
  const { configured } = useApp();
  const connect = useConnectServer();
  const client = useQueryClient();
  const [form, setForm] = useState<ConnectionConfig>({
    type: server?.type || "postgres",
    name: server?.name || "",
    host: server?.host || "",
    port: server?.port || 5432,
    username: server?.username || "",
    password: "",
    initialDatabase: server?.initialDatabase || "",
    ssl: server?.ssl ?? true,
    timeout: server?.timeout || 15,
  });
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const change = <K extends keyof ConnectionConfig>(key: K, value: ConnectionConfig[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setResult(null);
    setError(null);
  };
  const action = useMutation({
    mutationFn: async (mode: "test" | "save" | "connect") => {
      setError(null);
      const parsed = (server ? editConnectionSchema : connectionSchema).safeParse(form);
      if (!parsed.success)
        throw new Error(
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · "),
        );
      if (mode === "test") {
        setResult(
          await fetchApi<ConnectionResult>("/api/servers/test", {
            method: "POST",
            body: JSON.stringify({ ...form, serverId: server?.id }),
          }),
        );
        return;
      }
      const saved = await fetchApi<SavedServer>(
        server ? `/api/servers/${server.id}` : "/api/servers",
        { method: server ? "PATCH" : "POST", body: JSON.stringify(form) },
      );
      await client.invalidateQueries({ queryKey: ["servers"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      await client.invalidateQueries({ queryKey: ["server", saved.id] });
      toast.success(server ? "Conexão atualizada." : "Servidor cadastrado com segurança.");
      onOpenChange(false);
      if (mode === "connect") {
        connect.mutate(saved.id);
      }
    },
    onError: (error) => setError(error),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!action.isPending) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-lg border bg-muted">
            <Database className="size-5 text-primary" />
          </div>
          <DialogTitle>{server ? "Editar conexão" : "Adicionar servidor"}</DialogTitle>
          <DialogDescription>Conecte sua infraestrutura ao BaseControl.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action.mutate("save");
          }}
          className="space-y-5"
        >
          <fieldset disabled={action.isPending} className="space-y-5">
            <div>
              <Label className="mb-2 block">Tipo do banco</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["postgres", "sqlserver"] as const).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => {
                      setForm((f) => ({ ...f, type, port: type === "postgres" ? 5432 : 1433 }));
                      setResult(null);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left text-sm",
                      form.type === type
                        ? "border-primary bg-primary/5 text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    <Database size={20} />
                    <span className="font-medium">
                      {type === "postgres" ? "PostgreSQL" : "SQL Server"}
                    </span>
                    {form.type === type && <CheckCircle2 className="ml-auto size-4" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="server-name">Nome da conexão</Label>
              <Input
                id="server-name"
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
                placeholder="Ex.: PostgreSQL Produção"
                required
                maxLength={80}
              />
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <div className="space-y-2">
                <Label htmlFor="server-host">Host</Label>
                <Input
                  id="server-host"
                  value={form.host}
                  onChange={(e) => change("host", e.target.value)}
                  placeholder="db.empresa.com"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-port">Porta</Label>
                <Input
                  id="server-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => change("port", Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="server-user">Usuário</Label>
                <Input
                  id="server-user"
                  value={form.username}
                  onChange={(e) => change("username", e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-password">Senha</Label>
                <Input
                  id="server-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => change("password", e.target.value)}
                  autoComplete="new-password"
                  placeholder={server ? "Manter senha atual" : "••••••••"}
                  required={!server}
                />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-3">
              <div className="space-y-2">
                <Label htmlFor="server-database">
                  Database inicial <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="server-database"
                  value={form.initialDatabase}
                  onChange={(e) => change("initialDatabase", e.target.value)}
                  placeholder={form.type === "postgres" ? "postgres" : "master"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server-timeout">Timeout (seg.)</Label>
                <Input
                  id="server-timeout"
                  type="number"
                  min={3}
                  max={60}
                  value={form.timeout}
                  onChange={(e) => change("timeout", Number(e.target.value))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.ssl} onCheckedChange={(v) => change("ssl", v === true)} />
              Utilizar conexão SSL / TLS
            </label>
          </fieldset>
          <div className="flex gap-2 rounded-md bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />A senha é criptografada no servidor e
            nunca é retornada ao navegador.
          </div>
          {!configured && (
            <p className="text-xs text-warning">
              Configure o Neon e crie seu administrador em Configurações para habilitar conexões.
            </p>
          )}
          <QueryError error={error} />
          {result && (
            <div
              role="status"
              className="rounded-md border border-success/20 bg-success/5 p-3 text-sm text-success"
            >
              {result.message}
              <p className="mt-1 text-xs">{result.version}</p>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="mr-auto"
              disabled={!configured || action.isPending}
              onClick={() => action.mutate("test")}
            >
              <Plug size={14} />
              {action.isPending && action.variables === "test" ? "Testando..." : "Testar conexão"}
            </Button>
            <Button type="submit" variant="outline" disabled={!configured || action.isPending}>
              Salvar servidor
            </Button>
            <Button
              type="button"
              disabled={!configured || action.isPending}
              onClick={() => action.mutate("connect")}
            >
              {action.isPending && action.variables !== "test" ? "Salvando..." : "Conectar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
