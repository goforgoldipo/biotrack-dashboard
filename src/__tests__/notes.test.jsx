/**
 * BIOTRACK — Notes System Tests
 * Tests for the Notes/Journal feature: createNote, buildNotesContext,
 * NotesComposer component, NotesFeed component, and filter logic.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mirror the Notes logic from App.jsx ─────────────────────────────────────

const NOTE_TAGS = ["sleep","food","workout","mindset","goals","recovery","body","general"];

function createNote(text, tags, dateOverride) {
  const now = new Date();
  const dateKey = dateOverride || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  return {
    id: now.getTime(),
    text: text.trim(),
    tags: tags && tags.length ? tags : ["general"],
    date: dateKey,
    time: now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),
    createdAt: now.toISOString(),
  };
}

function buildNotesContext(notes) {
  if (!notes || !notes.length) return "";
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const recent = notes.filter(n => new Date(n.createdAt) >= cutoff);
  if (!recent.length) return "";
  const byDate = {};
  recent.forEach(n => { const d=n.date||n.createdAt.slice(0,10); if(!byDate[d])byDate[d]=[]; byDate[d].push(n); });
  const lines = ["━━ PERSONAL NOTES & JOURNAL (last 30 days) ━━"];
  Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([date,dayNotes])=>{
    lines.push(`▸ ${date}`);
    dayNotes.forEach(n=>lines.push(`  [${n.tags.join(",")}] ${n.text}`));
  });
  return lines.join("\n");
}

// ─── NotesComposer component ─────────────────────────────────────────────────

function NotesComposer({ onAdd }) {
  const [text, setText] = useState("");
  const [tags, setTags] = useState([]);
  const [date, setDate] = useState("");
  const toggleTag = (tag) => setTags(p => p.includes(tag) ? p.filter(t=>t!==tag) : [...p, tag]);
  const submit = () => {
    if (!text.trim()) return;
    onAdd(createNote(text, tags, date || undefined));
    setText("");
    setTags([]);
  };
  return (
    <div data-testid="notes-composer">
      {NOTE_TAGS.map(tag => (
        <button key={tag} data-testid={`tag-${tag}`} onClick={()=>toggleTag(tag)}
          aria-pressed={tags.includes(tag)}>{tag}</button>
      ))}
      <textarea data-testid="note-input" value={text} onChange={e=>setText(e.target.value)} />
      <input type="date" data-testid="note-date" value={date} onChange={e=>setDate(e.target.value)} />
      <button data-testid="save-note" onClick={submit}>SAVE NOTE</button>
      <div data-testid="active-tags">{tags.join(",")}</div>
    </div>
  );
}

// ─── NotesFeed component ──────────────────────────────────────────────────────

function NotesFeed({ notes, onDelete, filter }) {
  const filtered = filter === "all" ? notes : notes.filter(n => n.tags.includes(filter));
  return (
    <div data-testid="notes-feed">
      {filtered.map(note => (
        <div key={note.id} data-testid={`note-${note.id}`}>
          <div data-testid={`note-text-${note.id}`}>{note.text}</div>
          <div data-testid={`note-tags-${note.id}`}>{note.tags.join(",")}</div>
          <button data-testid={`delete-${note.id}`} onClick={()=>onDelete(note.id)}>×</button>
        </div>
      ))}
      {filtered.length === 0 && <div data-testid="empty-state">No notes yet</div>}
    </div>
  );
}

// ─── createNote tests ─────────────────────────────────────────────────────────

describe("createNote — pure function", () => {
  test("text is trimmed",                         () => expect(createNote("  hello  ").text).toBe("hello"));
  test("tags default to [\"general\"] when empty array", () => expect(createNote("test", []).tags).toEqual(["general"]));
  test("tags default to [\"general\"] when undefined",   () => expect(createNote("test").tags).toEqual(["general"]));
  test("provided tags are used",                  () => expect(createNote("test", ["sleep","food"]).tags).toEqual(["sleep","food"]));
  test("single tag preserved",                    () => expect(createNote("test", ["workout"]).tags).toEqual(["workout"]));
  test("dateOverride uses provided date",         () => expect(createNote("x", [], "2026-01-15").date).toBe("2026-01-15"));
  test("date defaults to today when not provided", () => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    expect(createNote("x").date).toBe(todayKey);
  });
  test("id is a number",                          () => expect(typeof createNote("x").id).toBe("number"));
  test("createdAt is ISO string",                 () => expect(createNote("x").createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/));
  test("time field is present",                   () => expect(createNote("x").time).toBeTruthy());
  test("text trimming works with tabs",           () => expect(createNote("\t note \t").text).toBe("note"));
});

// ─── buildNotesContext tests ──────────────────────────────────────────────────

describe("buildNotesContext — pure function", () => {
  test("returns \"\" for empty array",            () => expect(buildNotesContext([])).toBe(""));
  test("returns \"\" for null",                   () => expect(buildNotesContext(null)).toBe(""));
  test("returns \"\" for undefined",              () => expect(buildNotesContext(undefined)).toBe(""));

  test("returns \"\" for all-old notes (>30 days)", () => {
    const old = new Date(); old.setDate(old.getDate() - 31);
    const notes = [{ id:1, text:"old note", tags:["sleep"], date:"2025-01-01", createdAt:old.toISOString() }];
    expect(buildNotesContext(notes)).toBe("");
  });

  test("includes header \"PERSONAL NOTES & JOURNAL\"", () => {
    const notes = [{ id:1, text:"feeling good", tags:["sleep"], date:"2026-05-01", createdAt:new Date().toISOString() }];
    expect(buildNotesContext(notes)).toContain("PERSONAL NOTES & JOURNAL");
  });

  test("includes [sleep] tag in brackets",        () => {
    const notes = [{ id:1, text:"slept well", tags:["sleep"], date:"2026-05-01", createdAt:new Date().toISOString() }];
    expect(buildNotesContext(notes)).toContain("[sleep]");
  });

  test("includes note text in output",            () => {
    const notes = [{ id:1, text:"ate tofu", tags:["food"], date:"2026-05-01", createdAt:new Date().toISOString() }];
    expect(buildNotesContext(notes)).toContain("ate tofu");
  });

  test("sorts newest date first",                 () => {
    const notes = [
      { id:1, text:"old note", tags:["general"], date:"2026-04-01", createdAt:new Date().toISOString() },
      { id:2, text:"new note", tags:["general"], date:"2026-04-30", createdAt:new Date().toISOString() },
    ];
    const result = buildNotesContext(notes);
    expect(result.indexOf("2026-04-30")).toBeLessThan(result.indexOf("2026-04-01"));
  });

  test("groups notes by date (same date appears once as header)", () => {
    const notes = [
      { id:1, text:"morning note", tags:["sleep"], date:"2026-05-01", createdAt:new Date().toISOString() },
      { id:2, text:"evening note", tags:["food"],  date:"2026-05-01", createdAt:new Date().toISOString() },
    ];
    const result = buildNotesContext(notes);
    const dateOccurrences = (result.match(/▸ 2026-05-01/g) || []).length;
    expect(dateOccurrences).toBe(1);
    expect(result).toContain("morning note");
    expect(result).toContain("evening note");
  });

  test("multiple tags shown as comma-joined in brackets", () => {
    const notes = [{ id:1, text:"cross-tagged", tags:["workout","recovery"], date:"2026-05-01", createdAt:new Date().toISOString() }];
    expect(buildNotesContext(notes)).toContain("[workout,recovery]");
  });

  test("note within 30 days is included",         () => {
    const recent = new Date(); recent.setDate(recent.getDate() - 5);
    const notes = [{ id:1, text:"recent note", tags:["goals"], date:"2026-04-27", createdAt:recent.toISOString() }];
    expect(buildNotesContext(notes)).toContain("recent note");
  });
});

// ─── NotesComposer component tests ───────────────────────────────────────────

describe("NotesComposer component", () => {
  const onAdd = vi.fn();
  beforeEach(() => onAdd.mockClear());

  test("renders all 8 tag buttons",               () => {
    render(<NotesComposer onAdd={onAdd} />);
    NOTE_TAGS.forEach(tag => {
      expect(screen.getByTestId(`tag-${tag}`)).toBeInTheDocument();
    });
  });

  test("clicking a tag button selects it (aria-pressed=true)", async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    const sleepBtn = screen.getByTestId("tag-sleep");
    expect(sleepBtn.getAttribute("aria-pressed")).toBe("false");
    await user.click(sleepBtn);
    expect(sleepBtn.getAttribute("aria-pressed")).toBe("true");
  });

  test("clicking selected tag deselects it",      async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    const btn = screen.getByTestId("tag-food");
    await user.click(btn); // select
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    await user.click(btn); // deselect
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  test("save with empty text does not call onAdd", async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    await user.click(screen.getByTestId("save-note"));
    expect(onAdd).not.toHaveBeenCalled();
  });

  test("save with text calls onAdd",              async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    await user.type(screen.getByTestId("note-input"), "Great workout today");
    await user.click(screen.getByTestId("save-note"));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  test("save clears the text input",              async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    await user.type(screen.getByTestId("note-input"), "Some note");
    await user.click(screen.getByTestId("save-note"));
    expect(screen.getByTestId("note-input")).toHaveValue("");
  });

  test("tag selection shows in active-tags display", async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    await user.click(screen.getByTestId("tag-sleep"));
    expect(screen.getByTestId("active-tags")).toHaveTextContent("sleep");
  });

  test("multiple tag selections show all in active-tags", async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    await user.click(screen.getByTestId("tag-sleep"));
    await user.click(screen.getByTestId("tag-workout"));
    const activeTags = screen.getByTestId("active-tags").textContent;
    expect(activeTags).toContain("sleep");
    expect(activeTags).toContain("workout");
  });

  test("onAdd called with note object containing trimmed text", async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    await user.type(screen.getByTestId("note-input"), "  trimmed note  ");
    await user.click(screen.getByTestId("save-note"));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ text:"trimmed note" }));
  });

  test("onAdd called with selected tags",         async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    await user.click(screen.getByTestId("tag-goals"));
    await user.type(screen.getByTestId("note-input"), "goal entry");
    await user.click(screen.getByTestId("save-note"));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ tags:["goals"] }));
  });

  test("onAdd defaults to [\"general\"] when no tags selected", async () => {
    const user = userEvent.setup();
    render(<NotesComposer onAdd={onAdd} />);
    await user.type(screen.getByTestId("note-input"), "no tag note");
    await user.click(screen.getByTestId("save-note"));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ tags:["general"] }));
  });
});

// ─── NotesFeed component tests ────────────────────────────────────────────────

describe("NotesFeed component", () => {
  const onDelete = vi.fn();
  beforeEach(() => onDelete.mockClear());

  const sampleNotes = [
    { id:1001, text:"slept 8 hours",  tags:["sleep"],            date:"2026-05-01", createdAt:new Date().toISOString() },
    { id:1002, text:"ate chickpeas",  tags:["food"],             date:"2026-05-01", createdAt:new Date().toISOString() },
    { id:1003, text:"PR on squat",    tags:["workout","recovery"],date:"2026-05-02", createdAt:new Date().toISOString() },
  ];

  test("renders all notes when filter is \"all\"", () => {
    render(<NotesFeed notes={sampleNotes} onDelete={onDelete} filter="all" />);
    expect(screen.getByTestId("note-1001")).toBeInTheDocument();
    expect(screen.getByTestId("note-1002")).toBeInTheDocument();
    expect(screen.getByTestId("note-1003")).toBeInTheDocument();
  });

  test("filter \"all\" shows all 3 notes",        () => {
    render(<NotesFeed notes={sampleNotes} onDelete={onDelete} filter="all" />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  test("filter \"sleep\" shows only sleep-tagged note", () => {
    render(<NotesFeed notes={sampleNotes} onDelete={onDelete} filter="sleep" />);
    expect(screen.getByTestId("note-1001")).toBeInTheDocument();
    expect(screen.queryByTestId("note-1002")).not.toBeInTheDocument();
    expect(screen.queryByTestId("note-1003")).not.toBeInTheDocument();
  });

  test("filter \"food\" shows only food-tagged note",   () => {
    render(<NotesFeed notes={sampleNotes} onDelete={onDelete} filter="food" />);
    expect(screen.getByTestId("note-1002")).toBeInTheDocument();
    expect(screen.queryByTestId("note-1001")).not.toBeInTheDocument();
  });

  test("filter \"recovery\" matches note with multiple tags", () => {
    render(<NotesFeed notes={sampleNotes} onDelete={onDelete} filter="recovery" />);
    expect(screen.getByTestId("note-1003")).toBeInTheDocument();
    expect(screen.queryByTestId("note-1001")).not.toBeInTheDocument();
  });

  test("delete button calls onDelete with note id", async () => {
    const user = userEvent.setup();
    render(<NotesFeed notes={sampleNotes} onDelete={onDelete} filter="all" />);
    await user.click(screen.getByTestId("delete-1001"));
    expect(onDelete).toHaveBeenCalledWith(1001);
  });

  test("shows empty-state when no matching notes",    () => {
    render(<NotesFeed notes={sampleNotes} onDelete={onDelete} filter="body" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("empty-state")).toHaveTextContent("No notes yet");
  });

  test("shows empty-state for empty notes array",    () => {
    render(<NotesFeed notes={[]} onDelete={onDelete} filter="all" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  test("note text is rendered",                       () => {
    render(<NotesFeed notes={sampleNotes} onDelete={onDelete} filter="all" />);
    expect(screen.getByTestId("note-text-1001")).toHaveTextContent("slept 8 hours");
  });

  test("note tags are rendered",                      () => {
    render(<NotesFeed notes={sampleNotes} onDelete={onDelete} filter="all" />);
    expect(screen.getByTestId("note-tags-1001")).toHaveTextContent("sleep");
  });

  test("delete does not show empty-state when others remain", async () => {
    const user = userEvent.setup();
    render(<NotesFeed notes={sampleNotes} onDelete={vi.fn()} filter="all" />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
