"use client";

import { useState, useEffect } from "react";
import CommentPanel from "@/components/CommentPanel";
import { getCommentCount } from "@/lib/comments";

export default function CommentButton({ datasetId }: { datasetId: string }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCommentCount(datasetId));
  }, [datasetId, open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-accent hover:border-accent transition-colors"
      >
        <span>&#128172;</span>
        <span>Comments</span>
        {count > 0 && (
          <span className="bg-accent/20 text-accent text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            {count}
          </span>
        )}
      </button>
      <CommentPanel
        datasetId={datasetId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
