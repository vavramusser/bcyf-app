// lib/favorites.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@bcyf_favorites';

export async function getFavorites(): Promise<Set<string>> {
  try {
    const json = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!json) return new Set();
    const arr = JSON.parse(json) as string[];
    return new Set(arr);
  } catch (error) {
    console.error('Error loading favorites:', error);
    return new Set();
  }
}

export async function toggleFavorite(id: string): Promise<Set<string>> {
  const favs = await getFavorites();
  if (favs.has(id)) {
    favs.delete(id);
  } else {
    favs.add(id);
  }
  
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
  } catch (error) {
    console.error('Error saving favorites:', error);
  }
  
  return favs;
}