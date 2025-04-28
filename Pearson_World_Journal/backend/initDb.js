const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./waypoints.db');

// Create waypoints table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS waypoints (
    _id TEXT PRIMARY KEY,
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