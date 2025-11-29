// lib/database.ts

import * as SQLite from 'expo-sqlite';
import { documentDirectory, makeDirectoryAsync, copyAsync } from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { FairItem, DayName } from '../types/event_types';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase() {
  if (Platform.OS === 'web') {
    console.warn('Database not available on web');
    return null;
  }
  
  if (db) return db;
  
  try {
    console.log('Initializing database...');
    
    const dbName = 'bcyf.db';
    const dbAsset = require('../assets/bcyf.db');
    
    const asset = Asset.fromModule(dbAsset);
    await asset.downloadAsync();
    
    console.log('Asset downloaded, local URI:', asset.localUri);
    
    if (!asset.localUri) {
      throw new Error('Could not get local URI for database asset');
    }
    
    if (!documentDirectory) {
      throw new Error('Document directory is not available');
    }
    
    const dbDir = `${documentDirectory}SQLite`;
    const dbPath = `${dbDir}/${dbName}`;
    
    console.log('Document directory:', documentDirectory);
    console.log('Target database path:', dbPath);
    
    try {
      await makeDirectoryAsync(dbDir, { intermediates: true });
      console.log('SQLite directory created/verified');
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
    
    console.log('Copying database to app directory...');
    await copyAsync({
      from: asset.localUri,
      to: dbPath
    });
    console.log('Database copied successfully');
    
    console.log('Opening database...');
    db = await SQLite.openDatabaseAsync(dbName);
    console.log('Database opened successfully!');
    
    const tables = await db.getAllAsync('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('Database tables:', tables);
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return null;
  }
}

// Estimate time for a class based on session start and its order
function estimateClassTime(sessionStart: string, order: number | null): string | undefined {
  if (!sessionStart || !order) return sessionStart || undefined;
  
  const match = sessionStart.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return sessionStart;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  const minutesPerClass = 5;
  const additionalMinutes = (order - 1) * minutesPerClass;
  
  const totalMinutes = hours * 60 + minutes + additionalMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  const displayHours = newHours === 0 ? 12 : newHours > 12 ? newHours - 12 : newHours;
  const displayAmPm = newHours >= 12 ? 'PM' : 'AM';
  const displayMinutes = newMinutes.toString().padStart(2, '0');
  
  return `~${displayHours}:${displayMinutes} ${displayAmPm}`;
}

export async function getAllClasses(): Promise<FairItem[]> {
  const database = await initDatabase();
  
  if (!database) {
    console.log('Database not available, using sample data');
    return getSampleData();
  }
  
  try {
    const allItems: FairItem[] = [];

    // Load exhibitor classes
    const classes = await database.getAllAsync<any>(`
      SELECT 
        c.class_id as id,
        c.class_number as classNumber,
        c.class_title as title,
        c.department as division,
        c.class_group as classGroup,
        c.class_subgroup as classSubgroup,
        c.class_subsubgroup as classSubsubgroup,
        c.program_order as programOrder,
        c.session_id as sessionId,
        s.day,
        s.location,
        s.session_start_time as sessionStartTime,
        s.session_end_time as sessionEndTime
      FROM classes c
      LEFT JOIN sessions s ON c.session_id = s.session_id
      WHERE s.day IS NOT NULL
      ORDER BY c.program_order
    `);

    classes.forEach(row => {
      allItems.push({
        id: row.id,
        kind: 'Class' as const,
        title: row.title,
        day: row.day as DayName,
        division: row.division,
        location: row.location,
        classNumber: row.classNumber || undefined,
        classGroup: row.classGroup || undefined,
        classSubgroup: row.classSubgroup || undefined,
        classSubsubgroup: row.classSubsubgroup || undefined,
        order: row.programOrder || undefined,
        time: estimateClassTime(row.sessionStartTime, row.programOrder),
        sessionId: row.sessionId,
      } as any);
    });

    // Load division events
    const divisionEvents = await database.getAllAsync<any>(`
      SELECT 
        event_id as id,
        departments,
        event_type as eventType,
        day,
        location,
        event_start as eventStart,
        event_title as title,
        event_description as description
      FROM division_events
    `);

    divisionEvents.forEach(row => {
      // Keep departments as semicolon-separated string
      allItems.push({
        id: `div_event_${row.id}`,
        kind: 'Event' as const,
        title: row.title,
        day: row.day as DayName,
        divisions: row.departments, // Store all divisions together
        location: row.location,
        time: row.eventStart,
        eventType: row.eventType,
        description: row.description,
      } as any);
    });

    // Load exhibitor reminders
    const reminders = await database.getAllAsync<any>(`
      SELECT 
        reminder_id as id,
        department as division,
        day,
        location,
        event_start as eventStart,
        event_title as title,
        event_description as description
      FROM exhibitor_reminders
    `);

    reminders.forEach(row => {
      allItems.push({
        id: `reminder_${row.id}`,
        kind: 'Reminder' as const,
        title: row.title,
        day: row.day as DayName,
        division: row.division,
        location: row.location || 'TBD',
        time: row.eventStart,
        description: row.description,
      } as any);
    });

    console.log(`Loaded ${classes.length} classes, ${divisionEvents.length} division events, ${reminders.length} reminders`);

    return allItems;
  } catch (error) {
    console.error('Error querying database:', error);
    return getSampleData();
  }
}

export async function getSessionInfo(sessionId: string): Promise<{
  sessionName: string;
  sessionStartTime: string;
  totalClasses: number;
} | null> {
  const database = await initDatabase();
  
  if (!database) {
    return null;
  }
  
  try {
    const session = await database.getFirstAsync<any>(`
      SELECT session_name, session_start_time
      FROM sessions
      WHERE session_id = ?
    `, [sessionId]);
    
    const countResult = await database.getFirstAsync<{ total: number }>(`
      SELECT COUNT(*) as total
      FROM classes
      WHERE session_id = ?
    `, [sessionId]);
    
    if (!session) return null;
    
    return {
      sessionName: session.session_name,
      sessionStartTime: session.session_start_time,
      totalClasses: countResult?.total || 0,
    };
  } catch (error) {
    console.error('Error getting session info:', error);
    return null;
  }
}

function getSampleData(): FairItem[] {
  return [
    {
      id: "1",
      kind: "Class",
      title: "Market Hogs",
      day: "Tuesday",
      division: "Swine",
      location: "Show Arena",
      classNumber: 301,
      order: 1,
      time: "8:30 AM"
    },
  ];
}