"use client";
import { createContext, useContext, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
const AppContext = createContext({ configured: false, name: "Administrador", email: "" });
export const useApp = () => useContext(AppContext);
export const Providers = ({
  children,
  configured,
  name,
  email,
}: {
  children: React.ReactNode;
  configured: boolean;
  name: string;
  email: string;
}) => {
  const { resolvedTheme } = useTheme();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AppContext.Provider value={{ configured, name, email }}>
        <TooltipProvider delayDuration={250}>
          {children}
          <Toaster
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            richColors
            closeButton
            position="bottom-right"
          />
        </TooltipProvider>
      </AppContext.Provider>
    </QueryClientProvider>
  );
};
