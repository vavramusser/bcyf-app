// types/event_types.ts

export const DIVISIONS = [
  "Dairy",
  "Beef",
  "Sheep",
  "Goats",
  "Swine",
  "Rabbits",
  "Pocket Pets",
  "Poultry",
  "Dogs",
  "Cats",
  "Equine",
  "Llamas and Alpacas"
] as const;

export type Division = typeof DIVISIONS[number];

export const DAYS = [
  "Monday",
  "Tuesday", 
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
] as const;

export type DayName = typeof DAYS[number];

export type FairItem = {
  id: string;
  kind: "Class" | "Event";
  title: string;
  day: DayName;
  division?: Division;
  location: string;
  
  // For classes (exhibitor competitions)
  classNumber?: number;
  classType?: string;
  order?: number;  // Position in sequence for the day
  time?: string;   // If we have specific time, otherwise estimated
  
  // For events (demonstrations, shows, etc)
  eventType?: string;
};