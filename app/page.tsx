"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Kind = "file" | "link" | "note";
type Item = {
  id: string;
  kind: Kind;
  title: string;
  detail: string;
  tags: string[];
  createdAt: number;
  size?: number;
  mime?: string;
};

const starterItems: Item[] = [
  {
    id: "welcome-note",
    kind: "note",
    title: "Welcome to Dropzone",
    detail: "Your private inbox for the things you want to keep close. Everything stays on this device.",
    tags: ["start-here"],
    createdAt: Date.now(),
  },
];

const kindLabel: Record<Kind, string> = { file: "File", link: "Link", note: "Note" };

function openFileStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("dropzone-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function persistFile(id: string, file: File) {
  const db = await openFileStore();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    transaction.objectStore("files").put(file, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function readFile(id: string): Promise<Blob | null> {
  const db = await openFileStore();
  const result = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction("files", "readonly").objectStore("files").get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result ?? null;
}

async function discardFile(id: string) {
  const db = await openFileStore();
  const transaction = db.transaction("files", "readwrite");
  transaction.objectStore("files").delete(id);
  db.close();
}

function formatDate(value: number) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function iconFor(kind: Kind, mime?: string) {
  if (kind === "link") return "↗";
  if (kind === "note") return "≡";
  if (mime?.startsWith("image/")) return "◫";
  if (mime?.includes("pdf")) return "P";
  return "⌑";
}

export default function Home() {
  const [items, setItems] = useState<Item[]>(starterItems);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Kind | "starred">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [composer, setComposer] = useState<Kind | null>(null);
  const [dragging, setDragging] = useState(false);
  const [starred, setStarred] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("dropzone-items");
    const savedStars = localStorage.getItem("dropzone-stars");
    if (saved) setItems(JSON.parse(saved));
    if (savedStars) setStarred(JSON.parse(savedStars));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("dropzone-items", JSON.stringify(items));
    localStorage.setItem("dropzone-stars", JSON.stringify(starred));
  }, [items, starred, ready]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === "Escape") {
        setComposer(null);
        setSelected(null);
      }
      if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && document.activeElement?.tagName === "BODY") {
        setComposer("note");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const allTags = useMemo(
    () => [...new Set(items.flatMap((item) => item.tags))].sort(),
    [items],
  );

  const visible = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return items
      .filter((item) => filter === "all" || (filter === "starred" ? starred.includes(item.id) : item.kind === filter))
      .filter((item) => !needle || `${item.title} ${item.detail} ${item.tags.join(" ")}`.toLowerCase().includes(needle))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [items, filter, query, starred]);

  const selectedItem = items.find((item) => item.id === selected) ?? null;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function addFiles(files: FileList | File[]) {
    const pairs = Array.from(files).map((file) => ({ file, id: crypto.randomUUID() }));
    const next = pairs.map<Item>(({ file, id }) => ({
      id,
      kind: "file",
      title: file.name,
      detail: file.type || "Document",
      tags: [],
      createdAt: Date.now(),
      size: file.size,
      mime: file.type,
    }));
    if (!next.length) return;
    await Promise.all(pairs.map(({ id, file }) => persistFile(id, file)));
    setItems((current) => [...next, ...current]);
    flash(`${next.length} ${next.length === 1 ? "item" : "items"} added`);
  }

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    const detail = String(data.get("detail") || "").trim();
    const tags = String(data.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
    if (!composer || (!title && !detail)) return;
    setItems((current) => [
      {
        id: crypto.randomUUID(),
        kind: composer,
        title: title || (composer === "link" ? detail.replace(/^https?:\/\//, "") : "Untitled note"),
        detail,
        tags,
        createdAt: Date.now(),
      },
      ...current,
    ]);
    setComposer(null);
    flash(`${kindLabel[composer]} saved`);
  }

  function removeItem(id: string) {
    void discardFile(id);
    setItems((current) => current.filter((item) => item.id !== id));
    setStarred((current) => current.filter((item) => item !== id));
    setSelected(null);
    flash("Moved out of Dropzone");
  }

  function toggleStar(id: string) {
    setStarred((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function openStoredFile(item: Item) {
    const blob = await readFile(item.id);
    if (!blob) {
      flash("This file is no longer available on this device");
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.title;
    anchor.target = "_blank";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const counts = {
    all: items.length,
    file: items.filter((item) => item.kind === "file").length,
    link: items.filter((item) => item.kind === "link").length,
    note: items.filter((item) => item.kind === "note").length,
    starred: starred.length,
  };

  return (
    <main
      className={`app-shell ${dragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
    >
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">D</span><span>Dropzone</span></div>
        <button className="new-drop" onClick={() => fileInput.current?.click()}><span>＋</span> New drop</button>
        <input ref={fileInput} className="sr-only" type="file" multiple onChange={(event) => event.target.files && addFiles(event.target.files)} />
        <nav aria-label="Library filters">
          <p className="nav-label">Library</p>
          {(["all", "file", "link", "note", "starred"] as const).map((key) => (
            <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>
              <span className="nav-icon">{key === "all" ? "⌘" : key === "file" ? "⌑" : key === "link" ? "↗" : key === "note" ? "≡" : "☆"}</span>
              <span>{key === "all" ? "Everything" : key[0].toUpperCase() + key.slice(1) + (key === "file" || key === "link" || key === "note" ? "s" : "")}</span>
              <span className="count">{counts[key]}</span>
            </button>
          ))}
        </nav>
        <div className="tag-list">
          <p className="nav-label">Tags</p>
          {allTags.slice(0, 6).map((tag, index) => (
            <button key={tag} onClick={() => setQuery(tag)}><i style={{ background: ["#fd8d72", "#ffcb62", "#6fd6a7", "#7aa8ff"][index % 4] }} />{tag}</button>
          ))}
          {!allTags.length && <span className="tag-empty">Tags appear here</span>}
        </div>
        <div className="privacy"><span>⌾</span><div><strong>Private by default</strong><small>Stored on this device</small></div></div>
      </aside>

      <section className="workspace">
        <header>
          <div className="search-wrap"><span>⌕</span><input ref={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your dropzone..." aria-label="Search items" /><kbd>⌘ K</kbd></div>
          <button className="avatar" aria-label="Account menu">YO</button>
        </header>

        <div className="content">
          <div className="title-row">
            <div><p className="eyebrow">YOUR PRIVATE INBOX</p><h1>{filter === "all" ? "Everything" : filter[0].toUpperCase() + filter.slice(1)}</h1><p>{visible.length} {visible.length === 1 ? "item" : "items"} · right where you left them</p></div>
            <div className="quick-actions">
              <button onClick={() => setComposer("note")}><span>≡</span> Note</button>
              <button onClick={() => setComposer("link")}><span>↗</span> Link</button>
              <button className="primary" onClick={() => fileInput.current?.click()}><span>＋</span> Add files</button>
            </div>
          </div>

          <button className="drop-pad" onClick={() => fileInput.current?.click()}>
            <span className="drop-icon">↓</span>
            <span><strong>Drop anything here</strong><small>Files, images, PDFs, or click to browse</small></span>
            <kbd>⌘ V</kbd>
          </button>

          <div className="section-bar"><h2>Recent</h2><span>{query && `Results for “${query}”`}</span></div>
          <div className="item-list">
            {visible.map((item) => (
              <article key={item.id} className={selected === item.id ? "selected" : ""} onClick={() => setSelected(item.id)}>
                <div className={`item-icon ${item.kind}`}>{iconFor(item.kind, item.mime)}</div>
                <div className="item-main"><strong>{item.title}</strong><span>{item.kind === "file" ? `${item.detail}${item.size ? ` · ${formatSize(item.size)}` : ""}` : item.detail}</span></div>
                <div className="chips">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                <span className="kind">{kindLabel[item.kind]}</span>
                <time>{formatDate(item.createdAt)}</time>
                <button className={`star ${starred.includes(item.id) ? "on" : ""}`} onClick={(event) => { event.stopPropagation(); toggleStar(item.id); }} aria-label="Toggle favorite">{starred.includes(item.id) ? "★" : "☆"}</button>
              </article>
            ))}
            {!visible.length && <div className="empty"><span>⌕</span><h3>Nothing here yet</h3><p>Try another search, or drop something new.</p></div>}
          </div>
        </div>
      </section>

      {dragging && <div className="drag-overlay"><div><span>↓</span><h2>Release to drop</h2><p>Your files stay on this device</p></div></div>}

      {composer && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setComposer(null)}>
          <form className="composer" onSubmit={addEntry}>
            <div className="modal-title"><span className={`item-icon ${composer}`}>{iconFor(composer)}</span><div><p>NEW {kindLabel[composer].toUpperCase()}</p><h2>{composer === "note" ? "Capture a thought" : "Save a link"}</h2></div><button type="button" onClick={() => setComposer(null)}>×</button></div>
            <label>{composer === "note" ? "Title" : "Name"}<input name="title" autoFocus placeholder={composer === "note" ? "A useful thought..." : "Design inspiration"} /></label>
            <label>{composer === "note" ? "Note" : "URL"}{composer === "note" ? <textarea name="detail" rows={6} placeholder="Write anything..." /> : <input name="detail" type="url" required placeholder="https://" />}</label>
            <label>Tags <input name="tags" placeholder="work, ideas, read-later" /></label>
            <div className="modal-actions"><button type="button" onClick={() => setComposer(null)}>Cancel</button><button className="save" type="submit">Save to Dropzone</button></div>
          </form>
        </div>
      )}

      {selectedItem && (
        <aside className="detail-panel">
          <button className="close-detail" onClick={() => setSelected(null)}>×</button>
          <div className={`detail-icon ${selectedItem.kind}`}>{iconFor(selectedItem.kind, selectedItem.mime)}</div>
          <p className="eyebrow">{kindLabel[selectedItem.kind]}</p>
          <h2>{selectedItem.title}</h2>
          <p className="detail-copy">{selectedItem.detail}</p>
          <div className="detail-tags">{selectedItem.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
          {selectedItem.kind === "link" && <a href={selectedItem.detail} target="_blank" rel="noreferrer">Open link ↗</a>}
          {selectedItem.kind === "file" && <button className="open-file" onClick={() => void openStoredFile(selectedItem)}>Open file ↗</button>}
          <div className="detail-meta"><span>Added</span><strong>{new Date(selectedItem.createdAt).toLocaleString()}</strong>{selectedItem.size && <><span>Size</span><strong>{formatSize(selectedItem.size)}</strong></>}</div>
          <button className="delete" onClick={() => removeItem(selectedItem.id)}>Remove from Dropzone</button>
        </aside>
      )}

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}
