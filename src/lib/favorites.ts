const STORAGE_KEY = "datapipe-favorites";

export interface Favorite {
  id: string;
  type: "page" | "dataset" | "query";
  label: string;
  href: string;
  addedAt: string;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getFavorites(): Favorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Favorite[];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: Favorite[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function addFavorite(fav: Omit<Favorite, "id" | "addedAt">): void {
  const favorites = getFavorites();
  if (favorites.some((f) => f.href === fav.href)) return;
  const newFav: Favorite = {
    ...fav,
    id: generateId(),
    addedAt: new Date().toISOString(),
  };
  favorites.push(newFav);
  saveFavorites(favorites);
  window.dispatchEvent(new CustomEvent("favorites-changed"));
}

export function removeFavorite(id: string): void {
  const favorites = getFavorites().filter((f) => f.id !== id);
  saveFavorites(favorites);
  window.dispatchEvent(new CustomEvent("favorites-changed"));
}

export function removeFavoriteByHref(href: string): void {
  const favorites = getFavorites().filter((f) => f.href !== href);
  saveFavorites(favorites);
  window.dispatchEvent(new CustomEvent("favorites-changed"));
}

export function isFavorite(href: string): boolean {
  return getFavorites().some((f) => f.href === href);
}

export function clearFavorites(): void {
  saveFavorites([]);
  window.dispatchEvent(new CustomEvent("favorites-changed"));
}
