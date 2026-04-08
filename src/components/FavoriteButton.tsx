"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isFavorite,
  addFavorite,
  removeFavoriteByHref,
} from "@/lib/favorites";

interface FavoriteButtonProps {
  href: string;
  label: string;
  type?: "page" | "dataset" | "query";
}

export default function FavoriteButton({
  href,
  label,
  type = "page",
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [animating, setAnimating] = useState(false);

  const sync = useCallback(() => {
    setFavorited(isFavorite(href));
  }, [href]);

  useEffect(() => {
    sync();
    window.addEventListener("favorites-changed", sync);
    return () => window.removeEventListener("favorites-changed", sync);
  }, [sync]);

  function toggle() {
    setAnimating(true);
    if (favorited) {
      removeFavoriteByHref(href);
    } else {
      addFavorite({ type, label, href });
    }
    setFavorited(!favorited);
    setTimeout(() => setAnimating(false), 300);
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-bg-card transition-colors"
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <span
        className={`text-lg leading-none transition-transform duration-200 ${
          animating ? "scale-125" : "scale-100"
        }`}
        style={{
          color: favorited ? "#facc15" : "var(--text-muted)",
          display: "inline-block",
        }}
      >
        {favorited ? "\u2605" : "\u2606"}
      </span>
    </button>
  );
}
