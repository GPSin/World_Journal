const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Use an absolute path for database file on Render
const dbPath = path.join(__dirname, 'waypoints.db');
const db = new sqlite3.Database(dbPath)

// Create waypoints table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS waypoints (
    id TEXT PRIMARY KEY,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    images TEXT, -- Will store JSON string of image paths
    journalText TEXT
  )`);
});

console.log('Database initialized with full waypoint structure.');
db.close();