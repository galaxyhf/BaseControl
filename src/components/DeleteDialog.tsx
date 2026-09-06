import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface DeleteDialogProps {
  names: string[];
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteDialog = ({ names, onCancel, onConfirm }: DeleteDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} className="dialog" aria-labelledby="delete-title" onCancel={onCancel}>
      <div className="flex gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-400">
          <AlertTriangle size={18} />
        </div>
        <div>
          <h2 id="delete-title" className="font-medium text-zinc-100">
            Excluir {names.length} base{names.length === 1 ? "" : "s"}?
          </h2>
          <p className="mt-1 text-sm leading-5 text-zinc-400">
            Esta ação é permanente e encerrará conexões ativas antes da exclusão.
          </p>
        </div>
      </div>
      <div className="mt-4 max-h-28 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
        {names.map((name) => (
          <div className="truncate py-0.5" key={name}>
            {name}
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="button secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button danger" type="button" onClick={onConfirm}>
          Excluir permanentemente
        </button>
      </div>
    </dialog>
  );
};
