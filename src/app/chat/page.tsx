"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface DatasetMeta {
  id: string;
  name: string;
  headers: string[];
  columnTypes: Record<string, string>;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function generateSuggestedQuestions(
  headers: string[],
  columnTypes: Record<string, string>
): string[] {
  const numericCols = headers.filter((h) => columnTypes[h] === "number");
  const stringCols = headers.filter((h) => columnTypes[h] === "string");
  const suggestions: string[] = [];

  if (numericCols.length > 0) {
    suggestions.push(`What is the average ${numericCols[0].replace(/_/g, " ")}?`);
  }
  if (numericCols.length > 1) {
    suggestions.push(
      `Compare ${numericCols[0].replace(/_/g, " ")} and ${numericCols[1].replace(/_/g, " ")}`
    );
  }
  if (stringCols.length > 0 && numericCols.length > 0) {
    suggestions.push(
      `Which ${stringCols[0].replace(/_/g, " ")} has the highest ${numericCols[0].replace(/_/g, " ")}?`
    );
  }
  suggestions.push("Summarize the key trends in this data");
  if (numericCols.length > 0) {
    suggestions.push(`Are there any anomalies in ${numericCols[0].replace(/_/g, " ")}?`);
  }

  return suggestions.slice(0, 5);
}

export default function ChatPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load datasets
  useEffect(() => {
    fetch("/api/datasets")
      .then((res) => res.json())
      .then((data: DatasetMeta[]) => {
        setDatasets(data);
        if (data.length > 0) {
          setSelectedId(data[data.length - 1].id);
        }
      })
      .catch(() => {});
  }, []);

  // Generate suggested questions when dataset changes
  useEffect(() => {
    const ds = datasets.find((d) => d.id === selectedId);
    if (ds) {
      setSuggestedQuestions(generateSuggestedQuestions(ds.headers, ds.columnTypes));
    }
  }, [selectedId, datasets]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !selectedId || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: selectedId, message: text.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.error || "Something went wrong"}` },
        ]);
        return;
      }

      // Stream the response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return updated;
          });
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Failed to connect to AI service." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const selectedDataset = datasets.find((d) => d.id === selectedId);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Data Analyst</h1>
          <p className="text-sm text-text-muted mt-1">
            Ask questions about your data in natural language
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="chat-dataset" className="text-sm text-text-secondary">
            Dataset:
          </label>
          <select
            id="chat-dataset"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setMessages([]);
            }}
            className="bg-bg-card border border-border-subtle text-text-primary px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {datasets.length === 0 && (
              <option value="">No datasets available</option>
            )}
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-bg-card rounded-xl border border-border-subtle overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent-subtle flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Chat with your Data
              </h2>
              <p className="text-sm text-text-muted mb-6 max-w-md">
                {selectedDataset
                  ? `Ask anything about "${selectedDataset.name}" — trends, comparisons, anomalies, and more.`
                  : "Select a dataset to get started."}
              </p>
              {suggestedQuestions.length > 0 && selectedDataset && (
                <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-xs bg-bg-secondary border border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent/30 px-3 py-2 rounded-lg transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-accent text-white"
                    : "bg-bg-secondary border border-border-subtle text-text-primary"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none text-text-primary [&_strong]:text-text-primary [&_li]:text-text-primary [&_p]:text-text-primary [&_th]:text-text-primary [&_td]:text-text-secondary [&_table]:text-sm [&_code]:bg-bg-card [&_code]:px-1 [&_code]:rounded">
                    <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-bg-secondary border border-border-subtle rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-text-muted text-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  Analyzing...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border-subtle p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedDataset
                  ? `Ask about ${selectedDataset.name}...`
                  : "Select a dataset first..."
              }
              disabled={!selectedId || loading}
              className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !selectedId || loading}
              className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent text-white text-sm font-medium rounded-lg transition-colors"
            >
              Send
            </button>
          </form>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Powered by Llama 3.3 via Groq
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
              >
                Clear chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
