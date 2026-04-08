"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addComment,
  getComments,
  resolveComment,
  deleteComment,
} from "@/lib/comments";
import type { Comment } from "@/lib/comments";

interface CommentPanelProps {
  datasetId: string;
  open: boolean;
  onClose: () => void;
}

export default function CommentPanel({
  datasetId,
  open,
  onClose,
}: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const refreshComments = useCallback(() => {
    setComments(getComments(datasetId));
  }, [datasetId]);

  useEffect(() => {
    if (open) refreshComments();
  }, [open, refreshComments]);

  const handleAdd = () => {
    if (!text.trim()) return;
    addComment(datasetId, text.trim(), undefined, replyTo ?? undefined);
    setText("");
    setReplyTo(null);
    refreshComments();
  };

  const handleResolve = (id: string) => {
    resolveComment(id);
    refreshComments();
  };

  const handleDelete = (id: string) => {
    deleteComment(id);
    refreshComments();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  if (!open) return null;

  // Group comments: top-level and replies
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = (parentId: string) =>
    comments.filter((c) => c.parentId === parentId);

  const filtered = topLevel.filter((c) => {
    if (filter === "open") return !c.resolved;
    if (filter === "resolved") return c.resolved;
    return true;
  });

  const severityColors: Record<string, string> = {
    open: "text-accent",
    resolved: "text-success",
  };

  return (
    <div className="fixed right-0 top-16 bottom-0 w-96 bg-bg-card border-l border-border-subtle shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#128172;</span>
          <h3 className="text-sm font-semibold text-text-primary">Comments</h3>
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
            {comments.filter((c) => !c.resolved).length} open
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-text-muted hover:text-text-primary transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border-subtle">
        {(["all", "open", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-muted hover:text-text-secondary"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {filtered.length === 0 && (
          <p className="text-text-muted text-sm text-center py-8">
            No comments yet. Start a conversation below.
          </p>
        )}
        {filtered.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <CommentBubble
              comment={comment}
              onResolve={() => handleResolve(comment.id)}
              onDelete={() => handleDelete(comment.id)}
              onReply={() => setReplyTo(comment.id)}
            />
            {/* Replies */}
            {replies(comment.id).map((reply) => (
              <div key={reply.id} className="ml-6">
                <CommentBubble
                  comment={reply}
                  onResolve={() => handleResolve(reply.id)}
                  onDelete={() => handleDelete(reply.id)}
                  onReply={() => setReplyTo(comment.id)}
                  isReply
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="border-t border-border-subtle px-4 py-3">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-2 py-1 bg-accent/5 rounded-lg">
            <span className="text-xs text-accent">
              Replying to comment...
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment..."
            rows={2}
            className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent placeholder-text-muted resize-none"
          />
          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            className="self-end px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentBubble({
  comment,
  onResolve,
  onDelete,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  onResolve: () => void;
  onDelete: () => void;
  onReply: () => void;
  isReply?: boolean;
}) {
  const timeAgo = formatTimeAgo(comment.timestamp);

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        comment.resolved
          ? "bg-success/5 border-success/20"
          : "bg-bg-secondary border-border-subtle hover:border-accent/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
            {comment.author.charAt(0)}
          </div>
          <span className="text-xs font-medium text-text-primary">
            {comment.author}
          </span>
          <span className="text-[10px] text-text-muted">{timeAgo}</span>
        </div>
        {comment.resolved && (
          <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
            Resolved
          </span>
        )}
      </div>
      {comment.cellRef && (
        <span className="inline-block mt-1 text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded font-mono">
          {comment.cellRef}
        </span>
      )}
      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
        {comment.text}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {!isReply && (
          <button
            onClick={onReply}
            className="text-[10px] text-text-muted hover:text-accent transition-colors"
          >
            Reply
          </button>
        )}
        <button
          onClick={onResolve}
          className="text-[10px] text-text-muted hover:text-success transition-colors"
        >
          {comment.resolved ? "Unresolve" : "Resolve"}
        </button>
        <button
          onClick={onDelete}
          className="text-[10px] text-text-muted hover:text-danger transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
