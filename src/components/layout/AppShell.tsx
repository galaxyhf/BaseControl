"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sun,
  Workflow,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "@/components/shared/Providers";
import { GlobalSearch } from "./GlobalSearch";
import { useOperations } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/client";
const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/servers", label: "Servidores", icon: Server },
  { href: "/databases", label: "Databases", icon: Database },
  { href: "/operations", label: "Operações", icon: Workflow },
  { href: "/audit", label: "Auditoria", icon: ShieldCheck },
  { href: "/settings", label: "Configurações", icon: Settings },
];
export const Logo = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex items-center gap-2.5">
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
      <Database size={18} strokeWidth={2} />
    </span>
    {!compact && (
      <span className="text-lg font-semibold tracking-[-.7px]">
        Base<span className="text-primary">Control</span>
        <span className="ml-1 align-top text-[9px] font-normal text-muted-foreground">®</span>
      </span>
    )}
  </div>
);
export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { configured, name, email } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const { data: operations = [] } = useOperations();
  const running = operations.filter((o) => ["pending", "running"].includes(o.status)).length;
  const active = links.find((l) => pathname.startsWith(l.href)) || links[0];
  const nav = (compact: boolean) => (
    <>
      <div
        className={cn("flex h-[76px] items-center border-b px-6", compact && "justify-center px-0")}
      >
        <Link href="/dashboard" aria-label="BaseControl dashboard">
          <Logo compact={compact} />
        </Link>
      </div>
      <div className="flex flex-1 flex-col px-3 py-6">
        {!compact && (
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
            Workspace
          </p>
        )}
        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  onClick={() => setMobile(false)}
                  href={href}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    compact && "justify-center px-0",
                  )}
                >
                  <Icon className="size-[17px] shrink-0" />
                  {!compact && (
                    <>
                      <span>{label}</span>
                      {href === "/operations" && running > 0 && (
                        <span className="ml-auto rounded bg-primary/10 px-1.5 text-[10px] text-primary">
                          {running}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </TooltipTrigger>
              {compact && <TooltipContent side="right">{label}</TooltipContent>}
            </Tooltip>
          ))}
        </nav>
        <div className="mt-auto pt-8">
          {!compact && (
            <div className="mb-5 rounded-lg border bg-background/50 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium">
                <ShieldCheck className="size-4 text-primary" />
                Controle com segurança
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                Credenciais criptografadas.
                <br />
                Cada operação, rastreável.
              </p>
              <Link
                href="/settings"
                className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary"
              >
                Configurar ambiente <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden h-9 w-full items-center gap-3 rounded-md px-3 text-xs text-muted-foreground hover:bg-accent lg:flex"
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <>
                <PanelLeftClose size={17} />
                Recolher menu
              </>
            )}
          </button>
        </div>
      </div>
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 border-t px-5",
          compact && "justify-center px-0",
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md border bg-background text-[10px] font-semibold">
          BC
        </span>
        {!compact && (
          <div>
            <p className="text-[11px] font-medium">BaseControl</p>
            <p className="text-[10px] text-muted-foreground">Workspace administrativo</p>
          </div>
        )}
      </div>
    </>
  );
  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-sidebar lg:flex",
          collapsed ? "w-[72px]" : "w-[232px]",
        )}
      >
        {nav(collapsed)}
      </aside>
      <div className={cn("transition-[padding]", collapsed ? "lg:pl-[72px]" : "lg:pl-[232px]")}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b bg-background/95 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobile} onOpenChange={setMobile}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Abrir menu">
                  <Menu size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[260px] flex-col gap-0 p-0">
                <SheetTitle className="sr-only">Navegação</SheetTitle>
                {nav(false)}
              </SheetContent>
            </Sheet>
            <span className="hidden text-xs text-muted-foreground sm:block">Workspace</span>
            <ChevronRight className="hidden size-3 text-muted-foreground sm:block" />
            <span className="text-xs font-medium">{active.label}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="outline"
              onClick={() => setSearch(true)}
              className="h-9 justify-start gap-2 text-xs text-muted-foreground md:w-64"
            >
              <Search className="size-3.5" />
              <span className="hidden md:inline">Buscar servidor ou database...</span>
              <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] md:inline">
                Ctrl K
              </kbd>
            </Button>
            <div className="h-5 border-l" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Trocar tema">
                  <Sun className="size-4 dark:hidden" />
                  <Moon className="hidden size-4 dark:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[
                  { value: "light", label: "Claro", icon: Sun },
                  { value: "dark", label: "Escuro", icon: Moon },
                  { value: "system", label: "Sistema", icon: Monitor },
                ].map((t) => (
                  <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value)}>
                    <t.icon size={15} />
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto gap-2 px-1">
                  <span className="grid size-8 place-items-center rounded-full border bg-muted text-xs font-semibold">
                    {name
                      .split(" ")
                      .slice(0, 2)
                      .map((s) => s[0])
                      .join("")}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-2">
                  <p className="text-xs font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings size={15} />
                  Configurações
                </DropdownMenuItem>
                {configured && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await fetchApi("/api/auth", { method: "DELETE" });
                        router.push("/login");
                        router.refresh();
                      } catch (error) {
                        toast.error((error as Error).message);
                      }
                    }}
                  >
                    <LogOut size={15} />
                    Sair
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1600px] p-4 pb-20 md:p-8 md:pb-20">
          {!configured && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Configure o banco interno para começar a gerenciar sua infraestrutura.
              </span>
              <Link href="/settings" className="flex items-center gap-1 font-medium text-primary">
                Configurar BaseControl <ChevronRight size={13} />
              </Link>
            </div>
          )}
          {children}
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-8 py-4 text-[10px] text-muted-foreground">
          <span>
            BaseControl <span className="mx-2">/</span> Infraestrutura sob controle.
          </span>
          <span className="flex items-center gap-1.5">
            <Activity size={11} />
            {configured ? "Workspace autenticado" : "Aguardando configuração"}
            <span className="mx-2">·</span>v0.1.0
          </span>
        </footer>
      </div>
      <GlobalSearch open={search} onOpenChange={setSearch} />
    </div>
  );
};
