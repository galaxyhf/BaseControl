import { redirect } from "next/navigation";
import { getUser } from "@/lib/security/auth";
import { Providers } from "@/components/shared/Providers";
import { AppShell } from "@/components/layout/AppShell";
const WorkspaceLayout = async ({ children }: { children: React.ReactNode }) => {
  const configured = Boolean(process.env.DATABASE_URL);
  const user = configured ? await getUser() : null;
  if (configured && !user) redirect("/login");
  return (
    <Providers
      configured={configured}
      name={user?.name || "Ambiente local"}
      email={user?.email || "Configuração inicial"}
    >
      <AppShell>{children}</AppShell>
    </Providers>
  );
};
export default WorkspaceLayout;
