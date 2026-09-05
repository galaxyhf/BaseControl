import type { Metadata } from "next";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist/700.css";
import "@fontsource/geist-mono/400.css";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "BaseControl · Controle da sua infraestrutura", template: "%s · BaseControl" },
  description: "Administração centralizada de PostgreSQL e Microsoft SQL Server.",
};
const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="pt-BR" suppressHydrationWarning>
    <body>{children}</body>
  </html>
);
export default RootLayout;
