// Updated server.js implementing typo fixes, proper update handling, and improvements.

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const cron = require('node-cron');

const app = express();

const WAYPOINTS_FILE = path.join(__dirname, 'waypoints.json');
const WAYPOINTS_TEMPLATE = path.join(__dirname, 'waypoints.template.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DELETED_UPLOADS_DIR = path.join(__dirname, 'deleted_uploads');
const PORT = process.env.PORT || 3001;

// Ensure required folders exist
[UPLOADS_DIR, DELETED_UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created folder: ${dir}`);
  }
});

// Ensure waypoints.json exists
if (!fs.existsSync(WAYPOINTS_FILE)) {
  if (fs.existsSync(WAYPOINTS_TEMPLATE)) {
    fs.copyFileSync(WAYPOINTS_TEMPLATE, WAYPOINTS_FILE);
    console.log('✅ Created waypoints.json from template');
  } else {
    fs.writeFileSync(WAYPOINTS_FILE, '[]', 'utf-8');
    console.log('✅ Created empty waypoints.json');
  }
}

// Load and save helpers
function loadWaypoints() {
  try {
    const data = fs.readFileSync(WAYPOINTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load waypoints:', err);
    return [];
  }
}

function saveWaypoints(data) {
  fs.writeFileSync(WAYPOINTS_FILE, JSON.stringify(data, null, 2));
}

let waypoints = loadWaypoints();

// Multer setup
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type.'));
  },
});

// Middleware
app.use(cors({ origin: 'https://world-journal.vercel.app', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Routes
app.get('/', (req, res) => res.send('🌍 World Journal API is running!'));

app.get('/api/waypoints', (req, res) => res.json(waypoints));

app.post('/api/waypoints', (req, res) => {
  const { lat, lng, title, description, image } = req.body;
  const newWaypoint = {
    _id: uuidv4(),
    lat,
    lng,
    title: title || '',
    description: description || '',
    image: image || '',
    images: [],
  };
  waypoints.push(newWaypoint);
  saveWaypoints(waypoints);
  res.status(201).json(newWaypoint);
});

app.put('/api/waypoints/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const index = waypoints.findIndex(wp => wp._id === id);

  if (index !== -1) {
    const waypoint = waypoints[index];

    if (updatedData.image && updatedData.image !== waypoint.image) {
      if (waypoint.image) {
        const oldImagePath = path.join(UPLOADS_DIR, path.basename(waypoint.image));
        fs.unlink(oldImagePath, err => {
          if (err) console.error('Failed to delete old image:', err);
        });
      }
    }

    waypoints[index] = { ...waypoint, ...updatedData };
    saveWaypoints(waypoints);
    res.json(waypoints[index]);
  } else {
    res.status(404).send('Waypoint not found');
  }
});

app.delete('/api/waypoints/:id', (req, res) => {
  const { id } = req.params;
  const index = waypoints.findIndex(wp => wp._id === id);

  if (index !== -1) {
    const waypoint = waypoints[index];

    // Delete single image
    if (waypoint.image) {
      const imgPath = path.join(UPLOADS_DIR, path.basename(waypoint.image));
      fs.unlink(imgPath, err => err && console.error('Delete image failed:', err));
    }

    // Delete multiple images
    if (Array.isArray(waypoint.images)) {
      waypoint.images.forEach(url => {
        const imgPath = path.join(UPLOADS_DIR, path.basename(url));
        fs.unlink(imgPath, err => err && console.error('Delete image failed:', err));
      });
    }

    waypoints.splice(index, 1);
    saveWaypoints(waypoints);
    res.sendStatus(200);
  } else {
    res.status(404).send('Waypoint not found');
  }
});

app.post('/api/upload', upload.array('images', 10), (req, res) => {
  if (!req.files?.length) return res.status(400).send('No files uploaded.');
  const urls = req.files.map(file => `/uploads/${file.filename}`);
  res.json({ urls });
});

app.delete('/api/delete-image', (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ message: 'Image URL is required' });

  const fileName = path.basename(imageUrl);
  const sourcePath = path.join(UPLOADS_DIR, fileName);
  const destPath = path.join(DELETED_UPLOADS_DIR, fileName);

  fs.rename(sourcePath, destPath, err => {
    if (err) {
      console.error('Error moving image:', err);
      return res.status(500).json({ message: 'Failed to move image' });
    }
    console.log('Moved image to deleted_uploads:', fileName);
    res.status(200).json({ message: 'Image moved successfully' });
  });
});

app.post('/api/restore-image', (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ message: 'Image URL is required' });

  const fileName = path.basename(imageUrl);
  const sourcePath = path.join(DELETED_UPLOADS_DIR, fileName);
  const destPath = path.join(UPLOADS_DIR, fileName);

  fs.rename(sourcePath, destPath, err => {
    if (err) {
      console.error('Error restoring image:', err);
      return res.status(500).json({ message: 'Failed to restore image' });
    }
    console.log('Restored image:', fileName);
    res.status(200).json({ message: 'Image restored successfully' });
  });
});

// Cleanup deleted_uploads folder
cron.schedule('0 2 * * *', () => {
  fs.readdir(DELETED_UPLOADS_DIR, (err, files) => {
    if (err) return console.error('Cleanup failed:', err);

    files.forEach(file => {
      const filePath = path.join(DELETED_UPLOADS_DIR, file);
      if (isFileOlderThan(filePath, 7)) {
        fs.unlink(filePath, err => {
          if (err) console.error('Error deleting old file:', filePath, err);
          else console.log('🧹 Deleted old image:', filePath);
        });
      }
    });
  });
});

function isFileOlderThan(filePath, days) {
  const stats = fs.statSync(filePath);
  const now = new Date();
  const modifiedTime = new Date(stats.mtime);
  return (now - modifiedTime) / (1000 * 60 * 60 * 24) > days;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});