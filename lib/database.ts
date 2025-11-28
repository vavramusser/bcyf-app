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
    
    // Create SQLite directory
    try {
      await makeDirectoryAsync(dbDir, { intermediates: true });
      console.log('SQLite directory created/verified');
    } catch (error: any) {
      // Directory might already exist, that's okay
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
    
    // Copy database
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

export async function getAllClasses(): Promise<FairItem[]> {
  const database = await initDatabase();
  
  if (!database) {
    console.log('Database not available, using sample data');
    return getSampleData();
  }
  
  try {
    const result = await database.getAllAsync<any>(`
      SELECT 
        c.class_id as id,
        c.class_number as classNumber,
        c.class_title as title,
        c.department as division,
        c.class_group as classType,
        c.program_order as programOrder,
        s.day,
        s.location,
        s.session_start_time as sessionStartTime,
        s.session_end_time as sessionEndTime
      FROM classes c
      LEFT JOIN sessions s ON c.session_id = s.session_id
      WHERE s.day IS NOT NULL
      ORDER BY c.program_order
    `);

    console.log(`Loaded ${result.length} classes from database`);

    return result.map(row => ({
      id: row.id,
      kind: 'Class' as const,
      title: row.title,
      day: row.day as DayName,
      division: row.division,
      location: row.location,
      classNumber: row.classNumber || undefined,
      classType: row.classType || undefined,
      order: row.programOrder || undefined,
      time: estimateClassTime(row.sessionStartTime, row.programOrder),
    }));
  } catch (error) {
    console.error('Error querying database:', error);
    return getSampleData();
  }
}

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
      classType: "Market",
      order: 1,
      time: "8:30 AM"
    },
    {
      id: "2",
      kind: "Class",
      title: "Senior Division Sheep Showmanship",
      day: "Monday",
      division: "Sheep",
      location: "Show Arena",
      classNumber: 215,
      classType: "Showmanship",
      order: 1,
      time: "4:00 PM"
    },
  ];
}