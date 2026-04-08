export interface Comment {
  id: string;
  datasetId: string;
  author: string;
  text: string;
  timestamp: string;
  cellRef?: string;
  resolved: boolean;
  parentId?: string;
}

const COMMENTS_KEY = "pipeline_comments";

function getAllComments(): Comment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Comment[];
  } catch {
    return [];
  }
}

function saveAllComments(comments: Comment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
}

export function addComment(
  datasetId: string,
  text: string,
  cellRef?: string,
  parentId?: string
): Comment {
  const comment: Comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    datasetId,
    author: "Andrew Arbo",
    text,
    timestamp: new Date().toISOString(),
    cellRef,
    resolved: false,
    parentId,
  };
  const all = getAllComments();
  all.push(comment);
  saveAllComments(all);
  return comment;
}

export function getComments(datasetId: string): Comment[] {
  return getAllComments().filter((c) => c.datasetId === datasetId);
}

export function resolveComment(id: string): void {
  const all = getAllComments();
  const comment = all.find((c) => c.id === id);
  if (comment) {
    comment.resolved = !comment.resolved;
    saveAllComments(all);
  }
}

export function deleteComment(id: string): void {
  const all = getAllComments().filter((c) => c.id !== id && c.parentId !== id);
  saveAllComments(all);
}

export function getCommentCount(datasetId: string): number {
  return getComments(datasetId).filter((c) => !c.resolved).length;
}
