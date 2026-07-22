import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// App-wide styled replacements for window.confirm / window.prompt.
// Promise-based: const ok = await confirm("удалить?"); const v = await prompt("название", old);

type ConfirmState = {
  kind: "confirm";
  message: string;
  action?: string;
  resolve: (ok: boolean) => void;
};
type PromptState = {
  kind: "prompt";
  message: string;
  initial: string;
  resolve: (value: string | null) => void;
};
type DialogState = ConfirmState | PromptState;

type DialogsApi = {
  confirm: (message: string, action?: string) => Promise<boolean>;
  prompt: (message: string, initial?: string) => Promise<string | null>;
};

const Ctx = createContext<DialogsApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback(
    (message: string, action?: string) =>
      new Promise<boolean>((resolve) => setDialog({ kind: "confirm", message, action, resolve })),
    [],
  );
  const prompt = useCallback(
    (message: string, initial = "") =>
      new Promise<string | null>((resolve) =>
        setDialog({ kind: "prompt", message, initial, resolve }),
      ),
    [],
  );

  const close = (result: boolean | string | null) => {
    if (!dialog) return;
    if (dialog.kind === "confirm") dialog.resolve(Boolean(result));
    else dialog.resolve(typeof result === "string" ? result : null);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ confirm, prompt }}>
      {children}
      {dialog && <DialogCard dialog={dialog} onClose={close} />}
    </Ctx.Provider>
  );
}

function DialogCard({
  dialog,
  onClose,
}: {
  dialog: DialogState;
  onClose: (r: boolean | string | null) => void;
}) {
  const [value, setValue] = useState(dialog.kind === "prompt" ? dialog.initial : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => onClose(dialog.kind === "prompt" ? value : true);

  return (
    <div
      className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(null);
      }}
    >
      <div className="w-full max-w-sm animate-scale-in rounded-card border border-border bg-bg p-5 shadow-xl">
        <p className="text-sm">{dialog.message}</p>
        {dialog.kind === "prompt" && (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="mt-3 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => onClose(null)}
            className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
          >
            отмена
          </button>
          <button
            onClick={submit}
            className="rounded-card bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            {dialog.kind === "confirm" ? (dialog.action ?? "ок") : "сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDialogs(): DialogsApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDialogs must be used within DialogProvider");
  return ctx;
}
