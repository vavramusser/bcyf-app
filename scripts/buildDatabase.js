// scripts/buildDatabase.js

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Parse CSV data
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((header, i) => {
      row[header.trim()] = values[i] || '';
    });
    return row;
  });
}

// Create database
const dbPath = path.join(__dirname, '../assets/bcyf.db');
console.log('Database will be created at:', dbPath);

// Make sure assets directory exists
const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('Created assets directory');
}

// Delete old database if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Deleted old database');
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  }
  console.log('Database created successfully');
});

db.serialize(() => {
  console.log('Creating tables...');
  
  // Create sessions table
  db.run(`
    CREATE TABLE sessions (
      session_id TEXT PRIMARY KEY,
      department TEXT,
      day TEXT,
      location TEXT,
      session_start_time TEXT,
      session_end_time TEXT,
      session_name TEXT,
      session_description TEXT
    )
  `, (err) => {
    if (err) console.error('Error creating sessions table:', err);
    else console.log('Sessions table created');
  });

  // Create classes table
  db.run(`
    CREATE TABLE classes (
      class_id TEXT PRIMARY KEY,
      department TEXT,
      class_number INTEGER,
      class_title TEXT,
      class_description TEXT,
      session_id TEXT,
      program_order INTEGER,
      class_group TEXT,
      class_subgroup TEXT,
      class_subsubgroup TEXT,
      class_champion TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    )
  `, (err) => {
    if (err) console.error('Error creating classes table:', err);
    else console.log('Classes table created');
  });

  // Create division_events table
  db.run(`
    CREATE TABLE division_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      departments TEXT,
      event_type TEXT,
      day TEXT,
      location TEXT,
      event_start TEXT,
      event_end TEXT,
      event_end_estimate TEXT,
      event_title TEXT,
      event_description TEXT
    )
  `, (err) => {
    if (err) console.error('Error creating division_events table:', err);
    else console.log('Division events table created');
  });

  // Create exhibitor_reminders table
  db.run(`
    CREATE TABLE exhibitor_reminders (
      reminder_id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT,
      day TEXT,
      location TEXT,
      event_start TEXT,
      event_end TEXT,
      event_end_estimate TEXT,
      event_title TEXT,
      event_description TEXT
    )
  `, (err) => {
    if (err) console.error('Error creating exhibitor_reminders table:', err);
    else console.log('Exhibitor reminders table created');
  });

  // Load sessions
  const sessionsPath = path.join(__dirname, '../sessions.csv');
  console.log('\nLoading sessions from:', sessionsPath);
  
  if (!fs.existsSync(sessionsPath)) {
    console.error('ERROR: Sessions file not found!');
    process.exit(1);
  }
  
  const sessions = parseCSV(sessionsPath);
  console.log(`Found ${sessions.length} sessions`);
  
  const sessionStmt = db.prepare(`
    INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  sessions.forEach((s, i) => {
    sessionStmt.run(
      s.session_id,
      s.department,
      s.day,
      s.location,
      s.session_start_time,
      s.session_end_time || '',
      s.session_name,
      s.session_description || '',
      (err) => {
        if (err) console.error(`Error inserting session ${i}:`, err);
      }
    );
  });
  sessionStmt.finalize();
  console.log(`Inserted ${sessions.length} sessions`);

  // Load classes from all division files
  const divisionFiles = [
    'beef.csv',
    'cats.csv',
    'dairy.csv',
    'dogs.csv',
    'equine.csv',
    'goats.csv',
    'llamas_alpacas.csv',
    'pocket_pets.csv',
    'poultry.csv',
    'rabbits.csv',
    'sheep.csv',
    'swine.csv'
  ];

  const classStmt = db.prepare(`
    INSERT INTO classes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalClasses = 0;
  divisionFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`\nLoading ${file}...`);
      const classes = parseCSV(filePath);
      
      classes.forEach((c, i) => {
        classStmt.run(
          c.class_id,
          c.department,
          c.class_number || null,
          c.class_title,
          c.class_description || '',
          c.session_id,
          parseInt(c.program_order) || null,
          c.class_group || '',
          c.class_subgroup || '',
          c.class_subsubgroup || '',
          c.class_champion || '',
          (err) => {
            if (err) console.error(`Error inserting class ${i} from ${file}:`, err);
          }
        );
        totalClasses++;
      });
      console.log(`  Loaded ${classes.length} classes`);
    } else {
      console.warn(`  WARNING: ${file} not found, skipping`);
    }
  });
  
  classStmt.finalize();
  console.log(`\nTotal classes loaded: ${totalClasses}`);

  // Load division events
  const divisionEventsPath = path.join(__dirname, '../division_events.csv');
  if (fs.existsSync(divisionEventsPath)) {
    console.log('\nLoading division events...');
    const divisionEvents = parseCSV(divisionEventsPath);
    
    const divEventStmt = db.prepare(`
      INSERT INTO division_events (departments, event_type, day, location, event_start, event_end, event_end_estimate, event_title, event_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    divisionEvents.forEach((e, i) => {
      divEventStmt.run(
        e.department,
        e.event_type,
        e.day,
        e.location,
        e.session_start,
        e.event_end || '',
        e.event_end_estimate || '',
        e.event_title,
        e.event_description || '',
        (err) => {
          if (err) console.error(`Error inserting division event ${i}:`, err);
        }
      );
    });
    
    divEventStmt.finalize();
    console.log(`Loaded ${divisionEvents.length} division events`);
  }

  // Load exhibitor reminders
  const exhibitorRemindersPath = path.join(__dirname, '../exhibitor_reminders.csv');
  if (fs.existsSync(exhibitorRemindersPath)) {
    console.log('\nLoading exhibitor reminders...');
    const reminders = parseCSV(exhibitorRemindersPath);
    
    const reminderStmt = db.prepare(`
      INSERT INTO exhibitor_reminders (department, day, location, event_start, event_end, event_end_estimate, event_title, event_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    reminders.forEach((r, i) => {
      reminderStmt.run(
        r.department,
        r.day,
        r.location,
        r.event_start,
        r.event_end || '',
        r.event_end_estimate || '',
        r.event_title,
        r.event_description || '',
        (err) => {
          if (err) console.error(`Error inserting reminder ${i}:`, err);
        }
      );
    });
    
    reminderStmt.finalize();
    console.log(`Loaded ${reminders.length} exhibitor reminders`);
  }
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
    process.exit(1);
  }
  console.log('\n✅ Database created successfully at:', dbPath);
  console.log('Run the test script to verify: node scripts/testDatabase.js');
});