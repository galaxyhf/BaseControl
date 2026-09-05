"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  CheckCircle2,
  Database,
  KeyRound,
  Monitor,
  Moon,
  Save,
  ShieldCheck,
  Sun,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { QueryError } from "@/components/shared/QueryState";
import { useApp } from "@/components/shared/Providers";
import { usePreferences, type Preferences } from "@/hooks/use-data";
import { fetchApi } from "@/lib/client";
import { cn } from "@/lib/utils";
const SettingsForm = ({ initial }: { initial: Preferences }) => {
  const { configured } = useApp();
  const { setTheme } = useTheme();
  const client = useQueryClient();
  const [value, setValue] = useState(initial);
  const mutation = useMutation({
    mutationFn: () =>
      fetchApi<Preferences>("/api/settings", { method: "PUT", body: JSON.stringify(value) }),
    onSuccess: (data) => {
      client.setQueryData(["settings"], data);
      setTheme(data.theme);
      toast.success("Preferências salvas.");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="max-w-3xl space-y-5">
      <Card className="gap-5 p-6 shadow-none">
        <div>
          <h2 className="text-sm font-semibold">Aparência</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha como o BaseControl aparece neste dispositivo.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "light", label: "Claro", icon: Sun },
            { value: "dark", label: "Escuro", icon: Moon },
            { value: "system", label: "Sistema", icon: Monitor },
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() => {
                setValue((v) => ({ ...v, theme: theme.value as Preferences["theme"] }));
                setTheme(theme.value);
              }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-lg border p-5 text-xs",
                value.theme === theme.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "text-muted-foreground",
              )}
            >
              <theme.icon size={22} />
              {theme.label}
            </button>
          ))}
        </div>
      </Card>
      <Card className="gap-5 p-6 shadow-none">
        <div>
          <h2 className="text-sm font-semibold">Atualização de dados</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Controle a frequência das consultas no servidor aberto.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Label>Atualização automática</Label>
          <Select
            value={String(value.refreshInterval)}
            onValueChange={(v) =>
              setValue((p) => ({
                ...p,
                refreshInterval: Number(v) as Preferences["refreshInterval"],
              }))
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                [0, "Desativada"],
                [15, "15 segundos"],
                [30, "30 segundos"],
                [60, "1 minuto"],
                [300, "5 minutos"],
              ].map(([v, label]) => (
                <SelectItem key={v} value={String(v)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Consultas globais são executadas sob demanda. Operações em andamento recebem atualizações
          por SSE.
        </p>
      </Card>
      <Button disabled={!configured || mutation.isPending} onClick={() => mutation.mutate()}>
        <Save size={14} />
        {mutation.isPending ? "Salvando..." : "Salvar preferências"}
      </Button>
    </div>
  );
};
export const SettingsPage = () => {
  const { configured } = useApp();
  const { data, error } = usePreferences();
  return (
    <>
      <PageHeader
        eyebrow="Preferências do workspace"
        title="Configurações"
        description="Personalize sua experiência e configure o ambiente de administração."
      />
      <QueryError error={error} />
      <Tabs defaultValue={configured ? "preferences" : "setup"}>
        <TabsList className="mb-6">
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
          <TabsTrigger value="setup">Ambiente</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>
        <TabsContent value="preferences">
          <SettingsForm
            key={JSON.stringify(data)}
            initial={data || { refreshInterval: 30, theme: "system" }}
          />
        </TabsContent>
        <TabsContent value="setup">
          <div className="max-w-3xl space-y-5">
            <Card className="gap-4 p-6 shadow-none">
              <div className="flex items-center gap-3">
                <Database className="size-5 text-primary" />
                <h2 className="text-sm font-semibold">Banco interno · Neon PostgreSQL</h2>
                {configured && <CheckCircle2 className="ml-auto size-4 text-success" />}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                O BaseControl utiliza um banco PostgreSQL dedicado para guardar conexões
                criptografadas, operações e auditoria.
              </p>
              <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
                <li>
                  Copie <code className="text-foreground">.env.example</code> para{" "}
                  <code className="text-foreground">.env.local</code>.
                </li>
                <li>
                  Preencha <code className="text-foreground">DATABASE_URL</code> com a conexão do
                  Neon e <code className="text-foreground">DATABASE_URL_UNPOOLED</code> com a
                  conexão direta para migrations.
                </li>
                <li>
                  Gere uma chave de 32 bytes e configure{" "}
                  <code className="text-foreground">BASECONTROL_ENCRYPTION_KEY</code>. Guarde-a com
                  segurança.
                </li>
                <li>Aplique as migrations, crie o administrador e inicie a aplicação.</li>
              </ol>
              <div className="overflow-auto rounded-md border bg-muted/50 p-4 font-mono text-xs leading-7">
                <p>pnpm install</p>
                <p>pnpm db:migrate</p>
                <p>pnpm admin:create</p>
                <p>pnpm dev</p>
              </div>
            </Card>
            <Card className="gap-3 p-6 shadow-none">
              <div className="flex items-center gap-3">
                <Terminal size={19} className="text-primary" />
                <h2 className="text-sm font-semibold">Execução das operações</h2>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Em um processo Node.js persistente, o worker inicia junto da aplicação. Para
                executá-lo separadamente, configure <code>BASECONTROL_WORKER=external</code> e
                execute <code>pnpm worker</code>.
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Hospedagens serverless exigem um worker persistente externo, saída TCP aos
                servidores e suporte a SSE. Docker não é necessário.
              </p>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="security">
          <div className="max-w-3xl space-y-4">
            {[
              {
                icon: KeyRound,
                title: "Credenciais protegidas",
                text: "Senhas dos servidores usam AES-256-GCM com chave do ambiente. A chave não deve ser alterada sem um processo de recriptografia.",
              },
              {
                icon: ShieldCheck,
                title: "Operações com confirmação",
                text: "Databases de sistema e templates são protegidas também no backend. Exclusões exigem confirmação exata, passam por limite de tentativas e são auditadas.",
              },
              {
                icon: Monitor,
                title: "Acesso ao ambiente",
                text: "Autenticação administrativa, sessões de 8 horas, cookies HttpOnly e SameSite Strict. Em produção, configure HTTPS e a lista de hosts autorizados.",
              },
            ].map((item) => (
              <Card key={item.title} className="gap-3 p-6 shadow-none">
                <div className="flex items-center gap-3">
                  <item.icon className="size-5 text-primary" />
                  <h2 className="text-sm font-semibold">{item.title}</h2>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item.text}</p>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};
