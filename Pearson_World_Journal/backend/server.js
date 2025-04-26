const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WAYPOINTS_FILE = path.join(__dirname, 'waypoints.json');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Make sure the 'uploads' folder exists
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
    }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'));
    }
  },
});


const app = express();

// Ensure waypoints.json exists
if (!fs.existsSync(WAYPOINTS_FILE)) {
  fs.writeFileSync(WAYPOINTS_FILE, '[]', 'utf-8');
  console.log('✅ Created empty waypoints.json');
}

// Load waypoints from JSON file
function loadWaypoints() {
  try {
    const data = fs.readFileSync(WAYPOINTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load waypoints:', err);
    return [];
  }
}

// Save waypoints to JSON file
function saveWaypoints(data) {
  fs.writeFileSync(WAYPOINTS_FILE, JSON.stringify(data, null, 2));
}

let waypoints = loadWaypoints();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Get all waypoints
app.get('/api/waypoints', (req, res) => {
  res.json(waypoints);
});

// Add a new waypoint
app.post('/api/waypoints', (req, res) => {
  const { lat, lng, title, description, image } = req.body;
  const newWaypoint = { 
    _id: uuidv4(),
    lat,
    lng,
    title: title || '',
    description: description || '',
    image: image || '',
    images: [] // keep the images array if you want
  };
  waypoints.push(newWaypoint);
  saveWaypoints(waypoints);
  res.status(201).json(newWaypoint);
});

// Delete a waypoint
app.delete('/api/waypoints/:id', (req, res) => {
  const { id } = req.params;
  const index = waypoints.findIndex(wp => wp._id === id);

  if (index !== -1) {
    const waypoint = waypoints[index];

    // 🆕 Delete associated image(s) if they exist
    if (waypoint.image) {
      const imagePath = path.join(__dirname, 'uploads', path.basename(waypoint.image));
      fs.unlink(imagePath, err => {
        if (err) console.error('Failed to delete image:', err.message);
        else console.log('Deleted image:', imagePath);
      });
    }

    if (Array.isArray(waypoint.images)) {
      waypoint.images.forEach(imageUrl => {
        const imagePath = path.join(__dirname, 'uploads', path.basename(imageUrl));
        fs.unlink(imagePath, err => {
          if (err) console.error('Failed to delete image:', err.message);
          else console.log('Deleted image:', imagePath);
        });
      });
    }

    waypoints.splice(index, 1);
    saveWaypoints(waypoints);
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Update a waypoint
// Update a waypoint
app.put('/api/waypoints/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const waypoint = waypoints.find(wp => wp._id === id);

  if (waypoint) {
    // Check if the image is being updated
    if (updatedData.image && updatedData.image !== waypoint.image) {
      if (waypoint.image) {
        const oldImagePath = path.join(__dirname, 'uploads', path.basename(waypoint.image));
        fs.unlink(oldImagePath, err => {
          if (err) console.error('Failed to delete old image:', err.message);
          else console.log('Deleted old image:', oldImagePath);
        });
      }
    }

    // Apply updates
    Object.assign(waypoint, updatedData);
    saveWaypoints(waypoints);
    res.json(waypoint);
  } else {
    res.status(404).send('Waypoint not found');
  }
});


// Handle multiple file uploads
app.post('/api/upload', upload.array('images', 10), (req, res) => {
    // Assuming 'images' is the name field for the uploaded files
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }
  
    // Map the uploaded files to URLs (you can adjust the URL generation as per your setup)
    const fileUrls = req.files.map(file => `/uploads/${file.filename}`);
  
    res.json({ urls: fileUrls });
});

// Endpoint to handle image deletion
app.delete('/api/delete-image', (req, res) => {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }
  
    // Assuming the images are stored in the 'uploads' folder on the server
    const imagePath = path.join(__dirname, 'uploads', path.basename(imageUrl)); // Extract file name from URL and construct full path
  
    // Delete the file from the server
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error('Error deleting image:', err);
        return res.status(500).json({ message: 'Failed to delete image' });
      }
  
      res.status(200).json({ message: 'Image deleted successfully' });
    });
  });

app.listen(3001, () => console.log("Server running on http://localhost:3001"));