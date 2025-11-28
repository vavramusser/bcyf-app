// lib/divisioncolors.ts

import { Division } from "../types/event_types";

const DIVISION_COLORS: Record<Division, string> = {
  "Dairy": "#4A90E2",
  "Beef": "#8B4513",
  "Sheep": "#E8E8E8",
  "Goats": "#D4A574",
  "Swine": "#FFB6C1",
  "Rabbits": "#DEB887",
  "Pocket Pets": "#98D8C8",
  "Poultry": "#F4A460",
  "Dogs": "#A0522D",
  "Cats": "#DAA520",
  "Equine": "#8B7355",
  "Llamas and Alpacas": "#C8A2C8"
};

export function getDivisionColor(division?: Division): string {
  if (!division) return "#888";
  return DIVISION_COLORS[division] || "#888";
}

export function divisionTint(division?: Division, opacity: number = 0.12): string {
  const color = getDivisionColor(division);
  // Convert hex to rgba with opacity
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}