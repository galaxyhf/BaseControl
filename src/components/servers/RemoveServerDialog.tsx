"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SavedServer } from "@/lib/database/types";
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
import { fetchApi } from "@/lib/client";
export const RemoveServerDialog = ({
  server,
  close,
}: {
  server: SavedServer;
  close: () => void;
}) => {
  const [confirmation, setConfirmation] = useState("");
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/servers/${server.id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmation }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["servers"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cadastro removido. Databases externas preservadas.");
      close();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <AlertDialog
      open
      onOpenChange={(value) => {
        if (!value && !mutation.isPending) close();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover servidor?</AlertDialogTitle>
          <AlertDialogDescription>
            O cadastro e as credenciais de {server.name} serão removidos. Nenhuma database externa
            será excluída. A auditoria será preservada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Label htmlFor="remove-confirmation">Para confirmar, digite: {server.name}</Label>
        <Input
          id="remove-confirmation"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={confirmation !== server.name || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Removendo..." : "Remover servidor"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
