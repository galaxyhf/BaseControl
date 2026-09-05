"use client";
import { ThemeProvider } from "next-themes";

export const ThemeRoot = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    {children}
  </ThemeProvider>
);
