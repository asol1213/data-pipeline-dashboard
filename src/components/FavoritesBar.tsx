"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getFavorites, clearFavorites, removeFavorite } from "@/lib/favorites";
import type { Favorite } from "@/lib/favorites";

export default function FavoritesBar() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const sync = useCallback(() => {
    setFavorites(getFavorites());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("favorites-changed", sync);
    return () => window.removeEventListener("favorites-changed", sync);
  }, [sync]);

  if (favorites.length === 0) return null;

  const shown = favorites.slice(0, 8);

  return (
    <div className="border-b border-border-subtle bg-bg-secondary/60 px-4 sm:px-6 lg:px-8 py-2 animate-tooltip">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted font-medium mr-1">
          Favorites:
        </span>
        {shown.map((fav) => (
          <span
            key={fav.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20 card-hover cursor-pointer group"
          >
            <Link href={fav.href} className="hover:underline">
              {fav.label}
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                removeFavorite(fav.id);
              }}
              className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-danger text-xs leading-none"
              aria-label={`Remove ${fav.label} from favorites`}
            >
              &times;
            </button>
          </span>
        ))}
        {favorites.length > 0 && (
          <button
            onClick={clearFavorites}
            className="text-xs text-text-muted hover:text-danger transition-colors ml-auto"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
