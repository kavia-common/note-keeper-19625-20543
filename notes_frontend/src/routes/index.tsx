import { component$, useSignal, useTask$, $, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

/**
 * Types
 */
type Note = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
  updatedAt: number;
};

type Category = {
  id: string;
  name: string;
  count?: number;
};

/**
 * Helpers
 */
const uuid = () => (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const defaultCategories: Category[] = [
  { id: "all", name: "All" },
  { id: "work", name: "Work" },
  { id: "personal", name: "Personal" },
  { id: "ideas", name: "Ideas" },
  { id: "archive", name: "Archive" },
];

/**
 * PUBLIC_INTERFACE
 * Notes App - Ocean Professional themed UI with CRUD flows.
 */
export default component$(() => {
  // State signals
  const notesSig = useSignal<Note[]>([]);
  const categoriesSig = useSignal<Category[]>(defaultCategories);
  const activeCategorySig = useSignal<string>("all");
  const searchSig = useSignal<string>("");
  const selectedNoteIdSig = useSignal<string | null>(null);

  // Editor state
  const editorTitleSig = useSignal<string>("");
  const editorContentSig = useSignal<string>("");
  const editorCategorySig = useSignal<string>("work");
  const isEditingSig = useSignal<boolean>(false);

  // Load from localStorage
  useVisibleTask$(() => {
    try {
      const raw = localStorage.getItem("notes.data");
      if (raw) {
        const parsed = JSON.parse(raw) as Note[];
        notesSig.value = parsed;
      } else {
        // Seed a friendly welcome note
        const welcome: Note = {
          id: uuid(),
          title: "Welcome to Ocean Notes",
          content:
            "This elegant workspace helps you create, edit, and organize your notes.\n\nUse the sidebar to filter by category, and the toolbar to add or search notes.\nEnjoy the soft pastel vibe!",
          category: "personal",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        notesSig.value = [welcome];
      }
    } catch {
      // ignore
    }
  });

  // Persist to localStorage when notes change
  useTask$(({ track }) => {
    track(() => notesSig.value);
    try {
      localStorage.setItem("notes.data", JSON.stringify(notesSig.value));
    } catch {
      // ignore
    }
  });

  // Derived: filtered notes
  const filteredNotesSig = useSignal<Note[]>([]);
  useTask$(({ track }) => {
    const notes = track(() => notesSig.value);
    const cat = track(() => activeCategorySig.value);
    const term = track(() => searchSig.value.trim().toLowerCase());

    const res = [...notes]
      .filter((n) => (cat === "all" ? true : n.category === cat))
      .filter(
        (n) =>
          !term ||
          n.title.toLowerCase().includes(term) ||
          n.content.toLowerCase().includes(term),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);

    filteredNotesSig.value = res;
  });

  // Category counts
  const categoryCount = (catId: string) => {
    if (catId === "all") return notesSig.value.length;
    return notesSig.value.filter((n) => n.category === catId).length;
  };

  // Select a note to edit/view
  const selectNote = $((id: string) => {
    selectedNoteIdSig.value = id;
    const found = notesSig.value.find((n) => n.id === id);
    if (found) {
      editorTitleSig.value = found.title;
      editorContentSig.value = found.content;
      editorCategorySig.value = found.category;
      isEditingSig.value = true;
    } else {
      isEditingSig.value = false;
    }
  });

  // Reset editor to new note
  const resetEditor = $(() => {
    selectedNoteIdSig.value = null;
    editorTitleSig.value = "";
    editorContentSig.value = "";
    editorCategorySig.value = "work";
    isEditingSig.value = false;
  });

  // Create new note
  const createNote = $(async () => {
    const title = editorTitleSig.value.trim() || "Untitled";
    const newNote: Note = {
      id: uuid(),
      title,
      content: editorContentSig.value,
      category: editorCategorySig.value || "work",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    notesSig.value = [newNote, ...notesSig.value];
    selectedNoteIdSig.value = newNote.id;
    isEditingSig.value = true;
  });

  // Update current note
  const updateNote = $(async () => {
    const id = selectedNoteIdSig.value;
    if (!id) return;
    const idx = notesSig.value.findIndex((n) => n.id === id);
    if (idx === -1) return;
    const updated: Note = {
      ...notesSig.value[idx],
      title: editorTitleSig.value.trim() || "Untitled",
      content: editorContentSig.value,
      category: editorCategorySig.value,
      updatedAt: Date.now(),
    };
    const next = [...notesSig.value];
    next[idx] = updated;
    notesSig.value = next;
  });

  // Delete current note
  const deleteNote = $(async () => {
    const id = selectedNoteIdSig.value;
    if (!id) return;
    notesSig.value = notesSig.value.filter((n) => n.id !== id);
    await resetEditor();
  });

  return (
    <div class="app">
      {/* Top Navigation */}
      <header class="topnav">
        <div class="brand">
          <div class="brand-badge">N</div>
          <div>
            <div style="font-size:.95rem;">Ocean Notes</div>
            <div class="helper" style="margin-top:-4px;">Elegant. Focused. Yours.</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" onClick$={() => resetEditor()}>
            New
          </button>
          <button
            class="btn btn-primary"
            onClick$={() => (isEditingSig.value ? updateNote() : createNote())}
          >
            {isEditingSig.value ? "Save" : "Create"}
          </button>
          <button
            class="btn btn-ghost"
            onClick$={() => {
              if (selectedNoteIdSig.value) deleteNote();
            }}
            disabled={!selectedNoteIdSig.value}
            style={{ opacity: selectedNoteIdSig.value ? "1" : ".5" }}
          >
            Delete
          </button>
        </div>
      </header>

      {/* Body */}
      <div class="app-inner">
        {/* Sidebar */}
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="helper" style="font-weight:700;">Categories</div>
            <span class="badge">Total {notesSig.value.length}</span>
          </div>
          <div class="category-list">
            {categoriesSig.value.map((c) => (
              <div
                key={c.id}
                class={
                  "category-item " + (activeCategorySig.value === c.id ? "active" : "")
                }
                onClick$={() => (activeCategorySig.value = c.id)}
              >
                <span>{c.name}</span>
                <span class="badge">{categoryCount(c.id)}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <section class="main">
          <div class="toolbar">
            <input
              class="input"
              placeholder="Search notes..."
              value={searchSig.value}
              onInput$={(ev) => (searchSig.value = (ev.target as HTMLInputElement).value)}
              style="min-width:240px; flex:1;"
            />
            <div style="flex: 1;" />
            <select
              class="select"
              value={activeCategorySig.value}
              onChange$={(ev) =>
                (activeCategorySig.value = (ev.target as HTMLSelectElement).value)
              }
              style="max-width:220px;"
            >
              {categoriesSig.value.map((c) => (
                <option key={c.id} value={c.id}>
                  {"Filter: " + c.name}
                </option>
              ))}
            </select>
          </div>

          <div class="content">
            {/* Notes list */}
            <div class="notes-list">
              {filteredNotesSig.value.length === 0 && (
                <div class="helper" style="padding:.75rem;">
                  No notes yet. Click “New” to create your first note.
                </div>
              )}
              {filteredNotesSig.value.map((n) => (
                <div
                  key={n.id}
                  class={
                    "note-card " + (selectedNoteIdSig.value === n.id ? "active" : "")
                  }
                  onClick$={() => selectNote(n.id)}
                >
                  <div class="note-title">{n.title || "Untitled"}</div>
                  <div class="note-actions">
                    <span class="badge" style="background:#fce7f3;color:#9d174d;">
                      {n.category}
                    </span>
                  </div>
                  <div class="note-meta">
                    {new Date(n.updatedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Editor */}
            <div class="editor">
              <div class="helper" style="font-weight:700;">
                {isEditingSig.value ? "Edit Note" : "Create Note"}
              </div>
              <input
                class="input"
                placeholder="Note title"
                value={editorTitleSig.value}
                onInput$={(ev) =>
                  (editorTitleSig.value = (ev.target as HTMLInputElement).value)
                }
              />
              <select
                class="select"
                value={editorCategorySig.value}
                onChange$={(ev) =>
                  (editorCategorySig.value = (ev.target as HTMLSelectElement).value)
                }
              >
                {categoriesSig.value
                  .filter((c) => c.id !== "all")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <textarea
                class="textarea"
                placeholder="Write your note..."
                value={editorContentSig.value}
                onInput$={(ev) =>
                  (editorContentSig.value = (ev.target as HTMLTextAreaElement).value)
                }
              />
              <div style="display:flex; gap:.5rem; flex-wrap: wrap;">
                <button class="btn btn-secondary" onClick$={() => resetEditor()}>
                  Clear
                </button>
                <button
                  class="btn btn-primary"
                  onClick$={() => (isEditingSig.value ? updateNote() : createNote())}
                >
                  {isEditingSig.value ? "Save Changes" : "Create Note"}
                </button>
                <button
                  class="btn btn-ghost"
                  onClick$={() => {
                    if (selectedNoteIdSig.value) deleteNote();
                  }}
                  disabled={!selectedNoteIdSig.value}
                  style={{ opacity: selectedNoteIdSig.value ? "1" : ".5" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Ocean Notes",
  meta: [
    {
      name: "description",
      content:
        "Elegant notes app with Ocean Professional theme. Create, edit, delete, and view your notes with a refined UI.",
    },
  ],
};
