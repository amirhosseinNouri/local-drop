"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  kind: "file" | "text";
  name: string;
  content: string | null;
  mime: string | null;
  size: number;
  created_at: number;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleString();
}

export default function HomeClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: Item[] };
      setItems(data.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  async function uploadFiles(files: FileList | File[]) {
    setBusy(true);
    setErr(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/items", { method: "POST", body: fd });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `Upload failed (${res.status})`);
        }
      }
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitText() {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Failed (${res.status})`);
      }
      setText("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setErr(null);
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    } catch (e) {
      setItems(prev);
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function copyText(content: string) {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // fallback: noop
    }
  }

  return (
    <main className="flex flex-1 w-full max-w-3xl mx-auto flex-col gap-6 px-4 sm:px-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          LocalDrop
        </h1>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </header>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) {
            uploadFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
        }`}
      >
        <p className="text-sm">
          <span className="font-medium">Drop files</span> or click to choose
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Up to 1 GB per file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              uploadFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      {/* Text input */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste text to share…"
          rows={3}
          className="w-full resize-y bg-transparent outline-none text-sm placeholder:text-zinc-400"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={submitText}
            disabled={busy || !text.trim()}
            className="px-3 py-1.5 text-sm rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-50"
          >
            Share text
          </button>
        </div>
      </div>

      {err && (
        <div className="text-sm text-red-600 dark:text-red-400">{err}</div>
      )}

      {/* List */}
      <ul className="flex flex-col gap-2">
        {items.length === 0 && (
          <li className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
            Nothing shared yet.
          </li>
        )}
        {items.map((it) => (
          <li
            key={it.id}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate text-sm">{it.name}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {it.kind === "file"
                    ? `${formatBytes(it.size)} · ${it.mime ?? "file"}`
                    : `${formatBytes(it.size)} · text`}
                  {" · "}
                  {formatTime(it.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {it.kind === "file" ? (
                  <a
                    href={`/api/files/${it.id}?download=1`}
                    className="px-2 py-1 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Download
                  </a>
                ) : (
                  <button
                    onClick={() => copyText(it.content ?? "")}
                    className="px-2 py-1 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Copy
                  </button>
                )}
                <button
                  onClick={() => remove(it.id)}
                  className="px-2 py-1 text-xs rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Delete
                </button>
              </div>
            </div>
            {it.kind === "text" && it.content && (
              <pre className="text-xs whitespace-pre-wrap break-words bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-2 max-h-48 overflow-auto">
                {it.content}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
