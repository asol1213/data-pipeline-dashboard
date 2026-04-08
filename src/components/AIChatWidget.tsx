"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreaming("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreaming(full);
      }

      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: full }]);
      setStreaming("");
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function quickAsk(q: string) {
    setInput(q);
    setTimeout(() => {
      const form = document.getElementById("ai-widget-form") as HTMLFormElement;
      form?.requestSubmit();
    }, 50);
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-110"
        style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
        title="AI Data Assistant"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[420px] h-[560px] rounded-2xl shadow-2xl shadow-black/40 border border-[var(--border)] overflow-hidden flex flex-col"
          style={{ background: "var(--bg-primary, var(--background, #0a0a0a))" }}>

          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <div>
                <p className="text-white font-semibold text-sm">AI Data Assistant</p>
                <p className="text-white/60 text-[10px]">Knows all your datasets</p>
              </div>
            </div>
            <button onClick={() => { setMessages([]); setStreaming(""); }} className="text-white/60 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors">Clear</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="text-center py-8">
                <p className="text-[var(--muted,#a1a1aa)] text-sm mb-3">Ask me anything about your data</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[
                    "Which dataset has the highest revenue?",
                    "Compare churn rates across datasets",
                    "What are the key anomalies?",
                    "Summarize all datasets",
                  ].map((q) => (
                    <button key={q} onClick={() => quickAsk(q)} className="px-2.5 py-1 text-xs rounded-full border border-[var(--border)] text-[var(--muted,#a1a1aa)] hover:text-[var(--foreground,#fff)] hover:border-blue-500/50 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "border border-[var(--border)]"
                }`} style={msg.role === "assistant" ? { background: "var(--card, #18181b)", color: "var(--foreground, #fff)" } : {}}>
                  {msg.role === "assistant" ? (
                    <div className="chat-markdown text-sm leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm border border-[var(--border)]" style={{ background: "var(--card, #18181b)", color: "var(--foreground, #fff)" }}>
                  <div className="chat-markdown text-sm leading-relaxed">
                    <ReactMarkdown>{streaming}</ReactMarkdown>
                    <span className="inline-block w-1 h-3.5 bg-blue-500 ml-0.5 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {loading && !streaming && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2 border border-[var(--border)]" style={{ background: "var(--card, #18181b)" }}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <form id="ai-widget-form" onSubmit={send} className="px-3 py-2 border-t border-[var(--border)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your data..."
                className="flex-1 px-3 py-2 rounded-lg text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style={{ background: "var(--card, #18181b)", color: "var(--foreground, #fff)" }}
              />
              <button type="submit" disabled={loading || !input.trim()} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-[9px] text-[var(--muted,#71717a)] mt-1 text-center">Powered by Llama 3.3 via Groq — knows all {5} datasets</p>
          </form>
        </div>
      )}
    </>
  );
}
