import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
  return `${(bytes / 1024 ** unit).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${["B", "KB", "MB", "GB", "TB"][unit]}`;
};
export const formatDate = (value: string | Date | null) =>
  value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
