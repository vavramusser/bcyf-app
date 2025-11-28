// lib/upNext.ts

import { FairItem, DayName } from '../types/event_types';
import { toZonedTime } from 'date-fns-tz';

const DAY_ORDER: Record<DayName, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

const EASTERN_TZ = 'America/New_York';

// Parse a time string like "8:30 AM" or "~8:30 AM" into minutes since midnight IN EASTERN TIME
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  
  const cleaned = timeStr.replace('~', '').trim();
  const match = cleaned.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

// Get the day name for a Date in Eastern timezone
function getDayName(date: Date): DayName | null {
  const zonedDate = toZonedTime(date, EASTERN_TZ);
  const days: DayName[] = ['Sunday' as any, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[zonedDate.getDay()];
  
  // Check if it's a valid fair day (Monday-Saturday)
  if (DAY_ORDER[dayName as DayName] !== undefined) {
    return dayName as DayName;
  }
  return null;
}

export interface UpNextItem extends FairItem {
  status: 'happening-now' | 'up-next' | 'coming-soon';
  minutesUntil?: number;
}

export function getUpNextEvents(allEvents: FairItem[], currentDate: Date = new Date(), testMode: boolean = false): UpNextItem[] {
  // In test mode, treat the date as already being in Eastern time
  // Otherwise, convert to Eastern
  const easternDate = testMode ? currentDate : toZonedTime(currentDate, EASTERN_TZ);
  const currentDay = getDayName(testMode ? currentDate : new Date());
  
  // Get current time as minutes since midnight
  const currentMinutes = easternDate.getHours() * 60 + easternDate.getMinutes();
  
  console.log('Current Eastern time:', easternDate.toLocaleTimeString(), 'Minutes:', currentMinutes);
  
  if (!currentDay) {
    // Not a fair day (Sunday or invalid)
    return [];
  }
  
  const upNext: UpNextItem[] = [];
  
  allEvents.forEach(event => {
    if (event.day !== currentDay) return; // Only show today's events
    
    // Parse event time as Eastern time (since all fair events are in Eastern)
    const eventMinutes = parseTimeToMinutes(event.time);
    if (eventMinutes === null) return; // Skip events without times
    
    // Calculate difference: positive = future, negative = past
    const minutesDiff = eventMinutes - currentMinutes;
    
    console.log(`Event: ${event.title} at ${event.time} (${eventMinutes} min) - Diff: ${minutesDiff} min`);
    
    // Happening now: started within the last 60 minutes and ends within 15 minutes from now
    if (minutesDiff >= -60 && minutesDiff <= 15) {
      upNext.push({
        ...event,
        status: 'happening-now',
        minutesUntil: minutesDiff
      });
    }
    // Up next: starts more than 15 min away but within 30 minutes
    else if (minutesDiff > 15 && minutesDiff <= 30) {
      upNext.push({
        ...event,
        status: 'up-next',
        minutesUntil: minutesDiff
      });
    }
    // Coming soon: starts more than 30 min away but within 2 hours
    else if (minutesDiff > 30 && minutesDiff <= 120) {
      upNext.push({
        ...event,
        status: 'coming-soon',
        minutesUntil: minutesDiff
      });
    }
  });
  
  // Sort by time
  upNext.sort((a, b) => {
    const timeA = parseTimeToMinutes(a.time) ?? 9999;
    const timeB = parseTimeToMinutes(b.time) ?? 9999;
    return timeA - timeB;
  });
  
  return upNext;
}

export function getEasternTime(date: Date = new Date()): Date {
  return toZonedTime(date, EASTERN_TZ);
}

export function formatEasternTime(dateInput: Date): string {
  const easternDate = toZonedTime(dateInput, EASTERN_TZ);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = days[easternDate.getDay()];
  const monthName = months[easternDate.getMonth()];
  const dayOfMonth = easternDate.getDate();
  
  let hours = easternDate.getHours();
  const minutes = easternDate.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  const minutesStr = minutes.toString().padStart(2, '0');
  
  return `${dayName}, ${monthName} ${dayOfMonth} • ${hours}:${minutesStr} ${ampm}`;
}