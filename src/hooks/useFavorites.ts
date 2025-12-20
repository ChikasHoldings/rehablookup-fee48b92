import { useState, useEffect, useCallback } from 'react';

const FAVORITES_STORAGE_KEY = 'treatment-center-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Storage quota exceeded or unavailable
    }
  }, [favorites]);

  const toggleFavorite = useCallback((centerId: string) => {
    setFavorites(prev => {
      if (prev.includes(centerId)) {
        return prev.filter(id => id !== centerId);
      }
      return [...prev, centerId];
    });
  }, []);

  const isFavorite = useCallback((centerId: string) => {
    return favorites.includes(centerId);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    favoritesCount: favorites.length
  };
}
