// types/index.ts

export * from "./event_types";
import { FairItem } from "./event_types";
import { getAllClasses } from "../lib/database";

// This will be loaded from the database
export let ALL_ITEMS: FairItem[] = [];

// Load data on app start
export async function loadAllItems() {
  ALL_ITEMS = await getAllClasses();
  return ALL_ITEMS;
}