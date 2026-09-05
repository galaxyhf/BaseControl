"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Database, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/client";
import { QueryError } from "@/components/shared/QueryState";
export const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <section className="flex flex-col justify-between border-r bg-card p-8 md:p-12">
        <div className="flex items-center gap-3 text-xl font-semibold">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-white">
            <Database size={21} />
          </span>
          BaseControl
        </div>
        <div className="mx-auto w-full max-w-sm py-16">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
            Workspace administrativo
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo de volta.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Entre para administrar sua infraestrutura com segurança e clareza.
          </p>
          <form
            className="mt-8 space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError(null);
              try {
                await fetchApi("/api/auth", {
                  method: "POST",
                  body: JSON.stringify({ email, password }),
                });
                router.replace("/dashboard");
                router.refresh();
              } catch (error) {
                setError(error as Error);
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <QueryError error={error} />
            <Button className="w-full" disabled={pending}>
              {pending ? "Entrando..." : "Acessar workspace"}
              <ArrowRight size={15} />
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Acesso restrito a administradores autorizados.
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} BaseControl
        </p>
      </section>
      <section className="relative hidden flex-col justify-center overflow-hidden bg-[#111111] px-16 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(#555 1px, transparent 1px), linear-gradient(90deg, #555 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="relative max-w-lg">
          <span className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] text-white/60">
            <ShieldCheck size={13} />
            Infraestrutura sob controle
          </span>
          <h2 className="text-5xl font-medium leading-[1.18] tracking-[-2px]">
            Uma visão central.
            <br />
            <span className="text-[#76a3dc]">Controle completo.</span>
          </h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/50">
            PostgreSQL e SQL Server em um único workspace. Monitore conexões, administre databases e
            acompanhe cada operação.
          </p>
          <div className="mt-12 flex gap-8 border-t border-white/10 pt-7 text-xs text-white/50">
            <span>Credenciais criptografadas</span>
            <span>Auditoria integrada</span>
          </div>
        </div>
      </section>
    </main>
  );
};
