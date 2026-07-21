import { useEffect, useState } from "react";
import { IconPencil, IconCheck, IconX } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { lyricsApi, type LyricsEdit } from "../lib/api";

// Genius-style community lyrics: anyone proposes an edit, the artist owner or an
// admin reviews it. Owners/admins see the pending queue right on the track page.
export default function LyricsEdits({
  trackId,
  current,
  canModerate,
  onApplied,
}: {
  trackId: string;
  current: string | null;
  canModerate: boolean;
  onApplied: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<LyricsEdit[]>([]);

  useEffect(() => {
    if (canModerate) lyricsApi.edits(trackId).then(setPending).catch(() => setPending([]));
    else setPending([]);
  }, [trackId, canModerate]);

  if (!user) return null;

  const submit = async () => {
    if (!draft.trim()) return;
    try {
      const res = await lyricsApi.propose(trackId, draft.trim());
      setOpen(false);
      setDraft("");
      if (res.applied) {
        setNotice("текст обновлён");
        onApplied();
      } else {
        setNotice("правка отправлена на модерацию");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "ошибка");
    }
  };

  const review = async (id: string, fn: (id: string) => Promise<unknown>, applied: boolean) => {
    await fn(id).catch(() => {});
    setPending((p) => p.filter((e) => e.id !== id));
    if (applied) onApplied();
  };

  return (
    <div className="flex flex-col gap-3">
      {!open ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setOpen(true);
              setDraft(current ?? "");
              setNotice(null);
            }}
            className="flex items-center gap-1 text-sm text-muted hover:text-text"
          >
            <IconPencil size={15} /> {current ? "предложить правку" : "добавить текст"}
          </button>
          {notice && <span className="font-mono text-xs text-muted">{notice}</span>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            placeholder={"текст или LRC ([mm:ss.xx] строка)"}
            className="w-full rounded-card border border-border bg-surface p-3 font-mono text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void submit()}
              className="rounded-card bg-text px-3 py-1.5 text-sm font-medium text-bg"
            >
              {canModerate ? "сохранить" : "отправить на модерацию"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
            >
              отмена
            </button>
          </div>
        </div>
      )}

      {canModerate && pending.length > 0 && (
        <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-wide text-muted">
            правки от комьюнити · {pending.length}
          </p>
          {pending.map((e) => (
            <div key={e.id} className="flex flex-col gap-2 border-t border-border pt-2">
              <p className="text-xs text-muted">@{e.username}</p>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs">
                {e.content}
              </pre>
              <div className="flex gap-2">
                <button
                  onClick={() => review(e.id, lyricsApi.approve, true)}
                  className="flex items-center gap-1 rounded-card bg-text px-2.5 py-1 text-xs font-medium text-bg"
                >
                  <IconCheck size={14} /> принять
                </button>
                <button
                  onClick={() => review(e.id, lyricsApi.reject, false)}
                  className="flex items-center gap-1 rounded-card border border-border px-2.5 py-1 text-xs hover:bg-surface-hover"
                >
                  <IconX size={14} /> отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
