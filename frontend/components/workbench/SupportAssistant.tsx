import { useEffect, useState } from "react";

type ChatModelOption = {
  value: string;
  label: string;
};

type SupportAssistantProps = {
  chatInput: string;
  chatBusy: boolean;
  chatIncludeAll: boolean;
  chatModel: string;
  chatModelOptions: ChatModelOption[];
  chatHistory: Array<{ id: number; role: "user" | "assistant"; text: string; at: string }>;
  setChatInput: (value: string) => void;
  setChatIncludeAll: (value: boolean) => void;
  setChatModel: (value: string) => void;
  clearChatHistory: () => void;
  runContextChat: () => Promise<void>;
};

export function SupportAssistant({
  chatInput,
  chatBusy,
  chatIncludeAll,
  chatModel,
  chatModelOptions,
  chatHistory,
  setChatInput,
  setChatIncludeAll,
  setChatModel,
  clearChatHistory,
  runContextChat
}: SupportAssistantProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatView, setChatView] = useState<"normal" | "maximized" | "minimized">("normal");

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setChatOpen(false);
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  return (
    <>
      <button
        className="chat-fab"
        aria-label={chatOpen ? "Close support assistant" : "Open support assistant"}
        title={chatOpen ? "Close support assistant" : "Open support assistant"}
        onClick={() => setChatOpen((v) => !v)}
      >
        <span className="chat-fab-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path d="M10 3.25c3.87 0 7 2.73 7 6.1 0 3.38-3.13 6.11-7 6.11-.76 0-1.49-.11-2.16-.31l-3.27 1.3.93-2.78C4.56 12.56 3 11.05 3 9.35c0-3.37 3.13-6.1 7-6.1Z" />
            <path d="M7.35 9.35h.01M10 9.35h.01M12.65 9.35h.01" />
          </svg>
        </span>
        <span className="chat-fab-indicator" aria-hidden="true" />
      </button>

      {chatOpen && (
        <section className={`chat-popup ${chatView === "maximized" ? "maximized" : ""} ${chatView === "minimized" ? "minimized" : ""}`}>
          <div className="chat-popup-head">
            <div className="chat-popup-title">
              <div className="chat-brand-mark">AI</div>
              <div className="chat-brand-copy">
                <div className="chat-brand-name">Support Assistant</div>
                <div className="chat-brand-sub">Workflow-aware help for the active stage</div>
              </div>
            </div>
            <div className="chat-popup-actions">
              <span className="panel-badge badge-slate">Context aware</span>
              {chatBusy && <span className="panel-badge badge-amber">Thinking</span>}
              <button
                className="chat-icon-btn"
                title={chatView === "maximized" ? "Restore" : "Maximize"}
                aria-label={chatView === "maximized" ? "Restore chat window" : "Maximize chat window"}
                onClick={() => setChatView((v) => (v === "maximized" ? "normal" : "maximized"))}
              >
                {chatView === "maximized" ? (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3 5h8v8H3zM5 3h8v8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3 3h10v10H3z" />
                  </svg>
                )}
              </button>
              <button
                className="chat-icon-btn"
                title={chatView === "minimized" ? "Expand" : "Minimize"}
                aria-label={chatView === "minimized" ? "Expand chat window" : "Minimize chat window"}
                onClick={() => setChatView((v) => (v === "minimized" ? "normal" : "minimized"))}
              >
                {chatView === "minimized" ? (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3 7h10M3 11h10M3 3h10" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3 8h10" />
                  </svg>
                )}
              </button>
              <button className="chat-icon-btn danger" title="Close" aria-label="Close chat window" onClick={() => setChatOpen(false)}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          </div>
          {chatView !== "minimized" && <div className="chat-popup-body chat-assistant-body">
            <div className="assistant-thread">
              {chatHistory.length === 0 && !chatBusy && <div className="assistant-empty">Ask about coverage, blockers, handoff readiness, or validation results.</div>}
              {chatHistory.map((m) => (
                <div key={m.id} className={`assistant-msg ${m.role === "user" ? "user" : "assistant"}`}>
                  <div className="assistant-role">{m.role === "user" ? "You" : "Assistant"}</div>
                  <div className="assistant-bubble">{m.text}</div>
                  <div className="assistant-time">{m.at}</div>
                </div>
              ))}
              {chatBusy && (
                <div className="assistant-msg assistant">
                  <div className="assistant-role">Assistant</div>
                  <div className="assistant-bubble assistant-bubble--loading">
                    <span className="assistant-dot" />
                    <span className="assistant-dot" />
                    <span className="assistant-dot" />
                  </div>
                </div>
              )}
            </div>

            <div className="chat-controls">
              <div className="chat-controls-left">
                <label className="checkbox-line">
                  <input type="checkbox" checked={chatIncludeAll} onChange={(e) => setChatIncludeAll(e.target.checked)} />
                  Use full workflow context
                </label>
                <label className="chat-model-line">
                  <span>Assistant model</span>
                  <select className="chat-model-select" value={chatModel} onChange={(e) => setChatModel(e.target.value)}>
                    {chatModelOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="secondary-btn" onClick={clearChatHistory} disabled={chatBusy || chatHistory.length === 0}>
                Clear chat
              </button>
            </div>

            <div className="assistant-composer">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!chatBusy && chatInput.trim()) void runContextChat();
                  }
                }}
                placeholder="Ask about mappings, field coverage, validation issues, or next actions..."
              />
              <button className="header-btn assistant-send-btn" onClick={runContextChat} disabled={chatBusy || !chatInput.trim()}>
                Send
              </button>
            </div>
          </div>}
        </section>
      )}
    </>
  );
}
