/**
 * BIOTRACK — Coaching Chat System Tests
 * Tests for thread key logic, message building, daily brief appending,
 * ChatInput component, and ThreadDisplay component.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Pure function implementations mirroring App.jsx ─────────────────────────

const threadKey = (coachId, llmId) => `thread_${coachId}_${llmId}`;

// Build the full messages array for the LLM call
const buildSeedMessages = (dailyResponse, dailyPrompt, todaySnap, existingThread, newMsg) => {
  if (dailyResponse) {
    return [
      { role:"user",      content:`${todaySnap}\n\n${dailyPrompt}` },
      { role:"assistant", content:dailyResponse },
      ...(existingThread || []).map(m => ({ role:m.role, content:m.content })),
      { role:"user",      content:newMsg },
    ];
  }
  // No prior daily coaching — seed with data + user question
  return [
    { role:"user", content:`${todaySnap}\n\n${newMsg}` },
  ];
};

// Append a daily brief result to a persistent thread
const appendDailyBrief = (existingThread, response, dateKey) => {
  return [...(existingThread || []), {
    role:"assistant",
    content:response,
    type:"daily",
    date:dateKey,
    ts:new Date().toISOString(),
  }];
};

// ─── ChatInput component ──────────────────────────────────────────────────────

function ChatInput({ onSend, disabled, coachName }) {
  const [draft, setDraft] = useState("");
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim()) { onSend(draft.trim()); setDraft(""); }
    }
  };
  return (
    <div data-testid="chat-input-area">
      <textarea
        data-testid="chat-input"
        value={draft}
        onChange={e=>setDraft(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled}
        placeholder={`Ask ${coachName}...`}
      />
      <button
        data-testid="send-btn"
        onClick={()=>{ if(draft.trim()){ onSend(draft.trim()); setDraft(""); } }}
        disabled={disabled || !draft.trim()}
      >SEND</button>
    </div>
  );
}

// ─── ThreadDisplay component ──────────────────────────────────────────────────

function ThreadDisplay({ messages, coachName, coachCol }) {
  return (
    <div data-testid="thread">
      {messages.map((m,i) => (
        <div key={i} data-testid={`msg-${i}`} data-role={m.role}>
          {m.role === "assistant" && <div data-testid={`msg-label-${i}`}>{coachName}</div>}
          <div data-testid={`msg-content-${i}`}>{m.content}</div>
          {m.type === "daily" && <div data-testid={`msg-type-${i}`}>DAILY</div>}
        </div>
      ))}
      {messages.length === 0 && <div data-testid="empty-thread">No messages</div>}
    </div>
  );
}

// ─── Thread key tests ─────────────────────────────────────────────────────────

describe("Chat thread — thread key format", () => {
  test("workout+claude → \"thread_workout_claude\"",  () => expect(threadKey("workout","claude")).toBe("thread_workout_claude"));
  test("sleep+gpt4 → \"thread_sleep_gpt4\"",          () => expect(threadKey("sleep","gpt4")).toBe("thread_sleep_gpt4"));
  test("food+gemini → \"thread_food_gemini\"",         () => expect(threadKey("food","gemini")).toBe("thread_food_gemini"));
  test("progress+grok → \"thread_progress_grok\"",    () => expect(threadKey("progress","grok")).toBe("thread_progress_grok"));
  test("no date suffix (key length < 30 for short ids)", () => {
    expect(threadKey("workout","claude").length).toBeLessThan(30);
  });
  test("always starts with \"thread_\"",              () => {
    expect(threadKey("celebrate","claude").startsWith("thread_")).toBe(true);
  });
  test("uses underscore separators",                   () => {
    const key = threadKey("sleep","gpt4");
    expect(key.split("_").length).toBe(3);
  });
});

// ─── Message building tests ───────────────────────────────────────────────────

describe("Chat thread — message building (buildSeedMessages)", () => {
  const snap       = "TODAY SNAPSHOT: weight 197 lbs, bodyFat 17.9%";
  const prompt     = "Analyze my workout data";
  const dailyResp  = "Here is your daily coaching analysis.";
  const userMsg    = "What should I eat tomorrow?";

  test("with dailyResponse: returns array of length >= 3",  () => {
    const msgs = buildSeedMessages(dailyResp, prompt, snap, [], userMsg);
    expect(msgs.length).toBeGreaterThanOrEqual(3);
  });

  test("first message role is \"user\"",                    () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg)[0].role).toBe("user");
  });

  test("first message content includes dailyPrompt",        () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg)[0].content).toContain(prompt);
  });

  test("first message content includes today's snapshot",   () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg)[0].content).toContain(snap);
  });

  test("second message role is \"assistant\"",              () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg)[1].role).toBe("assistant");
  });

  test("second message content === dailyResponse",          () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg)[1].content).toBe(dailyResp);
  });

  test("last message role is \"user\"",                     () => {
    const msgs = buildSeedMessages(dailyResp, prompt, snap, [], userMsg);
    expect(msgs[msgs.length - 1].role).toBe("user");
  });

  test("last message content === newUserMsg",               () => {
    const msgs = buildSeedMessages(dailyResp, prompt, snap, [], userMsg);
    expect(msgs[msgs.length - 1].content).toBe(userMsg);
  });

  test("without dailyResponse: returns array of length 1",  () => {
    expect(buildSeedMessages("", prompt, snap, [], userMsg).length).toBe(1);
  });

  test("without dailyResponse: only message has role user", () => {
    expect(buildSeedMessages("", prompt, snap, [], userMsg)[0].role).toBe("user");
  });

  test("without dailyResponse: content contains newMsg",    () => {
    expect(buildSeedMessages("", prompt, snap, [], userMsg)[0].content).toContain(userMsg);
  });

  test("existingThread messages inserted between seed and new message", () => {
    const thread = [
      { role:"user",      content:"prev user question", type:"qa" },
      { role:"assistant", content:"prev assistant reply", type:"qa" },
    ];
    const msgs = buildSeedMessages(dailyResp, prompt, snap, thread, userMsg);
    // seed user, seed assistant, thread[0], thread[1], new user = 5
    expect(msgs.length).toBe(5);
    expect(msgs[2].content).toBe("prev user question");
    expect(msgs[3].content).toBe("prev assistant reply");
    expect(msgs[4].content).toBe(userMsg);
  });

  test("existingThread with empty array still works",        () => {
    const msgs = buildSeedMessages(dailyResp, prompt, snap, [], userMsg);
    expect(msgs.length).toBe(3); // seed user, seed assistant, new user
  });
});

// ─── Daily brief appending tests ─────────────────────────────────────────────

describe("Chat thread — daily brief auto-append", () => {
  test("returns array with new entry appended",              () => {
    const result = appendDailyBrief([], "Coach response", "2026-05-02");
    expect(result.length).toBe(1);
  });

  test("new entry has role: \"assistant\"",                  () => {
    const entry = appendDailyBrief([], "resp", "2026-05-02")[0];
    expect(entry.role).toBe("assistant");
  });

  test("new entry has type: \"daily\"",                      () => {
    const entry = appendDailyBrief([], "resp", "2026-05-02")[0];
    expect(entry.type).toBe("daily");
  });

  test("new entry has correct date field",                   () => {
    const entry = appendDailyBrief([], "resp", "2026-05-02")[0];
    expect(entry.date).toBe("2026-05-02");
  });

  test("new entry has content matching response",            () => {
    const entry = appendDailyBrief([], "my response", "2026-05-02")[0];
    expect(entry.content).toBe("my response");
  });

  test("new entry has ts (timestamp)",                       () => {
    const entry = appendDailyBrief([], "resp", "2026-05-02")[0];
    expect(entry.ts).toBeTruthy();
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("existing messages are preserved",                    () => {
    const thread = [
      { role:"user", content:"hello", type:"qa" },
      { role:"assistant", content:"hi there", type:"qa" },
    ];
    const result = appendDailyBrief(thread, "daily brief", "2026-05-02");
    expect(result.length).toBe(3);
    expect(result[0].content).toBe("hello");
    expect(result[1].content).toBe("hi there");
  });

  test("returns new array (immutable — original thread unchanged)", () => {
    const thread = [{ role:"user", content:"x", type:"qa" }];
    const result = appendDailyBrief(thread, "resp", "2026-05-02");
    expect(result).not.toBe(thread);
    expect(thread.length).toBe(1);
    expect(result.length).toBe(2);
  });

  test("empty thread → array of length 1",                  () => {
    expect(appendDailyBrief([], "resp", "2026-05-02").length).toBe(1);
  });

  test("type is \"daily\" not \"qa\"",                       () => {
    const entry = appendDailyBrief([], "resp", "2026-05-02")[0];
    expect(entry.type).toBe("daily");
    expect(entry.type).not.toBe("qa");
  });
});

// ─── ChatInput component tests ────────────────────────────────────────────────

describe("ChatInput component", () => {
  const onSend = vi.fn();
  beforeEach(() => onSend.mockClear());

  test("renders textarea and send button",                   () => {
    render(<ChatInput onSend={onSend} disabled={false} coachName="WORKOUT COACH" />);
    expect(screen.getByTestId("chat-input")).toBeInTheDocument();
    expect(screen.getByTestId("send-btn")).toBeInTheDocument();
  });

  test("send button disabled when input is empty",           () => {
    render(<ChatInput onSend={onSend} disabled={false} coachName="WORKOUT COACH" />);
    expect(screen.getByTestId("send-btn")).toBeDisabled();
  });

  test("send button enabled when input has text",            async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} disabled={false} coachName="WORKOUT COACH" />);
    await user.type(screen.getByTestId("chat-input"), "Hello coach");
    expect(screen.getByTestId("send-btn")).not.toBeDisabled();
  });

  test("clicking send calls onSend with trimmed text",       async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} disabled={false} coachName="WORKOUT COACH" />);
    await user.type(screen.getByTestId("chat-input"), "My question");
    await user.click(screen.getByTestId("send-btn"));
    expect(onSend).toHaveBeenCalledWith("My question");
  });

  test("clicking send clears input",                         async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} disabled={false} coachName="WORKOUT COACH" />);
    await user.type(screen.getByTestId("chat-input"), "My question");
    await user.click(screen.getByTestId("send-btn"));
    expect(screen.getByTestId("chat-input")).toHaveValue("");
  });

  test("Enter key calls onSend",                             async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} disabled={false} coachName="WORKOUT COACH" />);
    await user.type(screen.getByTestId("chat-input"), "Question via enter");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("Question via enter");
  });

  test("Shift+Enter does not call onSend",                   async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} disabled={false} coachName="WORKOUT COACH" />);
    await user.type(screen.getByTestId("chat-input"), "multiline");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSend).not.toHaveBeenCalled();
  });

  test("disabled prop disables textarea",                    () => {
    render(<ChatInput onSend={onSend} disabled={true} coachName="WORKOUT COACH" />);
    expect(screen.getByTestId("chat-input")).toBeDisabled();
  });

  test("disabled prop disables send button",                 () => {
    render(<ChatInput onSend={onSend} disabled={true} coachName="WORKOUT COACH" />);
    expect(screen.getByTestId("send-btn")).toBeDisabled();
  });

  test("placeholder contains coachName",                     () => {
    render(<ChatInput onSend={onSend} disabled={false} coachName="FOOD COACH" />);
    expect(screen.getByTestId("chat-input")).toHaveAttribute("placeholder", expect.stringContaining("FOOD COACH"));
  });

  test("whitespace-only input does not call onSend",         async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} disabled={false} coachName="WORKOUT COACH" />);
    await user.type(screen.getByTestId("chat-input"), "   ");
    await user.click(screen.getByTestId("send-btn"));
    expect(onSend).not.toHaveBeenCalled();
  });
});

// ─── ThreadDisplay component tests ───────────────────────────────────────────

describe("ThreadDisplay component", () => {
  const sampleMessages = [
    { role:"user",      content:"What should I train today?", type:"qa" },
    { role:"assistant", content:"Based on your HRV of 52ms...", type:"qa" },
    { role:"assistant", content:"Your daily brief is ready.", type:"daily" },
  ];

  test("renders empty-thread when no messages",              () => {
    render(<ThreadDisplay messages={[]} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.getByTestId("empty-thread")).toBeInTheDocument();
    expect(screen.getByTestId("empty-thread")).toHaveTextContent("No messages");
  });

  test("renders each message in the thread",                 () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.getByTestId("msg-0")).toBeInTheDocument();
    expect(screen.getByTestId("msg-1")).toBeInTheDocument();
    expect(screen.getByTestId("msg-2")).toBeInTheDocument();
  });

  test("user message has data-role=\"user\"",                () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.getByTestId("msg-0")).toHaveAttribute("data-role", "user");
  });

  test("assistant message has data-role=\"assistant\"",      () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.getByTestId("msg-1")).toHaveAttribute("data-role", "assistant");
  });

  test("assistant message shows coachName label",            () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.getByTestId("msg-label-1")).toHaveTextContent("WORKOUT COACH");
  });

  test("user message does not show coachName label",         () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.queryByTestId("msg-label-0")).not.toBeInTheDocument();
  });

  test("daily-type message shows DAILY badge",               () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.getByTestId("msg-type-2")).toHaveTextContent("DAILY");
  });

  test("qa-type message does not show DAILY badge",          () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.queryByTestId("msg-type-1")).not.toBeInTheDocument();
  });

  test("3 messages renders 3 items",                         () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.getByTestId("msg-0")).toBeInTheDocument();
    expect(screen.getByTestId("msg-1")).toBeInTheDocument();
    expect(screen.getByTestId("msg-2")).toBeInTheDocument();
    expect(screen.queryByTestId("msg-3")).not.toBeInTheDocument();
  });

  test("message content is rendered",                        () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.getByTestId("msg-content-0")).toHaveTextContent("What should I train today?");
    expect(screen.getByTestId("msg-content-1")).toHaveTextContent("Based on your HRV of 52ms...");
  });

  test("empty-thread not shown when messages exist",         () => {
    render(<ThreadDisplay messages={sampleMessages} coachName="WORKOUT COACH" coachCol="#fbbf24" />);
    expect(screen.queryByTestId("empty-thread")).not.toBeInTheDocument();
  });
});
